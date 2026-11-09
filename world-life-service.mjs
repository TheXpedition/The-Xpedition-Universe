import {createWellness,CONDITION_BY_ID} from './public/juegos/world-wellness.mjs';
import {createVitals,vitalsSnapshot} from './public/juegos/world-vitals.mjs';
const FALLBACK_CAUSES={starvation:'falta de alimento',dehydration:'deshidratación',exposure:'exposición prolongada',illness:'una complicación de salud'};
export const lifeCauseLabel=value=>CONDITION_BY_ID[value]?.name||FALLBACK_CAUSES[value]||'una complicación de salud';
const decode=value=>{try{return JSON.parse(value);}catch{return {};}};
export function createWorldLife({db,now=Date.now,send,room,broadcast,clientFor,clients=()=>[],canDirect,isNurse,healthStore,vitalsStore,foodStore,json,body,fail,onRevive,onDeath,resetInventory=async()=>{}}){
 let tail=Promise.resolve();const serial=fn=>{const operation=tail.then(fn);tail=operation.catch(()=>{});return operation;};
 const getClient=id=>clientFor({id}),ownBody=async id=>getClient(id)?.wellness||await healthStore.loadBody(id);
 const lifeFor=value=>({...createWellness(value).life});
 function halt(c,state){c.input={x:0,y:0};c.p.path=[];c.p.moving=false;c.p.z=0;c.p.grounded=true;c.pendingObject=null;c.pendingSeatSlot=undefined;c.atSeat=false;c.seat=null;c.action=null;c.sleeping=false;c.state=state;}
 async function observeInner(c){
  const life=c.wellness?.life;if(!life)return;const was=c.lastObservedLife;
  if(life.status==='dead'){
   halt(c,'dead');if(!life.zone||!life.x&&!life.y){life.zone=c.zone.id;life.x=c.p.x;life.y=c.p.y;}if(!life.at)life.at=now();
   if(was!=='dead'){await onDeath?.(c);const id='death:'+c.user.id+':'+life.at,cause=lifeCauseLabel(life.cause),text=c.user.name+' ha fallecido debido a '+cause+'.';await db.transaction(async()=>{await healthStore.saveBody(c.user.id,c.wellness);await vitalsStore.save(c.user.id,c.vitals);const result=await db.run('INSERT INTO world_chat(id,zone,sender,text,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING',id,life.zone,c.user.id,text,now());if(result.changes){const packet={type:'system-chat',message:{id,zone:life.zone,userId:c.user.id,name:c.user.name,text,cause,kind:'death',created:now(),x:life.x,y:life.y}};room?.(c,packet);}});notifyDeceasedChanged();}
  }else if(life.status==='fainted')halt(c,'fainted');else if(was==='fainted'&&c.state==='fainted')c.state='idle';
  c.lastObservedLife=life.status;const signature=JSON.stringify([life.status,life.cause,life.at,life.corpse,life.vomitUntil,Math.floor(c.vitals.sleep)]);if(signature!==c.lastLifeWire){c.lastLifeWire=signature;send?.(c,{type:'life',life:{...life,causeLabel:lifeCauseLabel(life.cause)},vitals:vitalsSnapshot(c.vitals)});}
 }
 function observe(c){if(c.lifePending)return c.lifePending;c.lifePending=observeInner(c).finally(()=>c.lifePending=null);return c.lifePending;}
 async function listCorpses(zone){const values=await db.all('SELECT w.user_id,w.state,u.name,p.character_id FROM world_wellness w JOIN users u ON u.id=w.user_id LEFT JOIN world_preferences p ON p.user_id=w.user_id'),result=[];for(const row of values){const value=createWellness(decode(row.state)),life=value.life;if(life.status!=='dead'||!life.corpse||life.zone!==zone)continue;result.push({id:row.user_id,userId:row.user_id,name:row.name,characterId:row.character_id||'dani',zone,x:life.x,y:life.y,z:0,facing:1,moving:false,walk:0,grounded:true,state:'dead',corpse:true,life:{...life,causeLabel:lifeCauseLabel(life.cause)},seatId:null,seatSlot:null,action:null,reaction:null,staff:false});}return result;}
 async function morgue(user,input){
  if(!await canDirect(user)&&!await isNurse(user.id))fail(403,'Solo Enfermería o Dirección puede llevar un cuerpo a la morgue.');if(typeof input?.target!=='string'||!await db.one('SELECT id FROM users WHERE id=?',input.target))fail(400,'Selecciona un cuerpo.');const target=getClient(input.target),value=target?.wellness||await healthStore.loadBody(input.target),life=value.life,c=getClient(user.id);if(life.status!=='dead'||!life.corpse)fail(409,'Ese cuerpo ya no está en el lugar.');if(!c||c.zone.id!==life.zone||Math.hypot(c.p.x-life.x,c.p.y-life.y)>230)fail(409,'Acércate al cuerpo para llevarlo a la morgue.');value.life.corpse=false;await healthStore.saveBody(input.target,value);if(target){target.wellness=value;send?.(target,{type:'life',life:{...life,causeLabel:lifeCauseLabel(life.cause)},vitals:vitalsSnapshot(target.vitals)});}broadcast?.({type:'corpse-removed',target:input.target,zone:life.zone});return {ok:true,target:input.target};
 }
 function notifyDeceasedChanged(){
  for(const client of clients())if(client.direct)send?.(client,{type:'life-deceased-changed'});
 }
 async function listDeceased(user){
  if(!await canDirect(user))fail(403,'Solo Dirección puede consultar la lista de fallecidos.');
  const rows=await db.all('SELECT w.user_id,w.state,u.name,p.character_id FROM world_wellness w JOIN users u ON u.id=w.user_id LEFT JOIN world_preferences p ON p.user_id=w.user_id');
  const players=[];
  for(const row of rows){
   const life=getClient(row.user_id)?.wellness?.life||lifeFor(decode(row.state));
   if(life.status==='dead')players.push({id:row.user_id,name:row.name,characterId:row.character_id,at:life.at,zone:life.zone,causeLabel:lifeCauseLabel(life.cause)});
  }
  return {players:players.sort((a,b)=>b.at-a.at||a.name.localeCompare(b.name))};
 }
 async function revive(user,input){
  if(!await canDirect(user))fail(403,'Solo Dirección puede autorizar un nuevo inicio.');
  if(typeof input?.target!=='string'||!await db.one('SELECT id FROM users WHERE id=?',input.target))fail(400,'Selecciona una cuenta registrada.');
  const mode=input.mode===undefined?'reset':input.mode;
  if(mode!=='reset'&&mode!=='keep')fail(400,'Selecciona cómo revivir al participante.');
  const target=getClient(input.target);
  await target?.lifePending;
  const current=target?.wellness||await healthStore.loadBody(input.target);
  if(current.life.status!=='dead'||input.deathAt!==undefined&&input.deathAt!==current.life.at)fail(409,'El registro de fallecimiento cambió. Actualiza la lista.');
  if(target?.careBusy||target?.eating||target?.tradeBusy)fail(409,'Espera a que termine la acción pendiente.');
  if(target)target.careBusy=true;
  try{
   await target?.persisting;
   const inventoryReset=mode==='reset';
   const fresh=createWellness(inventoryReset?{}:{medicines:current.medicines,pajamasOwned:current.pajamasOwned,clothingCondition:current.clothingCondition,baseClothingCondition:current.baseClothingCondition,clothing:current.clothing});
   const vitals=createVitals();
   await db.transaction(async()=>{
    if(inventoryReset){
     await resetInventory(input.target);
     await db.run('DELETE FROM world_food_inventory WHERE user_id=?',input.target);
    }
    await healthStore.saveBody(input.target,fresh);
    await vitalsStore.save(input.target,vitals);
    await db.run("UPDATE world_preferences SET last_zone='base',x=0,y=0,updated=? WHERE user_id=?",now(),input.target);
    await db.run('DELETE FROM world_actors WHERE user_id=?',input.target);
   });
   if(target){
    target.wellness=fresh;target.vitals=vitals;
    if(inventoryReset)target.hasPerishable=false;
    target.lastObservedLife='alive';target.lastLifeWire='';halt(target,'idle');
    await onRevive?.(target,{body:fresh,vitals});
    send?.(target,{type:'life-revived',life:{...fresh.life},body:fresh,vitals:vitalsSnapshot(vitals),inventoryReset});
   }
   broadcast?.({type:'corpse-removed',target:input.target,zone:current.life.zone});
   notifyDeceasedChanged();
   return {ok:true,target:input.target,life:{...fresh.life},inventoryReset};
  }finally{if(target)target.careBusy=false;}
 }
 return {observe,listCorpses,lifeFor,
  async handle(req,res,url,user){const p=url.pathname;if(!p.startsWith('/api/world/life'))return false;if(!user)fail(401,'Entra con tu cuenta.');let result;if(p==='/api/world/life'&&req.method==='GET'){const value=await ownBody(user.id);result={life:{...value.life,causeLabel:lifeCauseLabel(value.life.cause)},canRevive:await canDirect(user)};}else if(p==='/api/world/life/deceased'&&req.method==='GET')result=await listDeceased(user);else if(p==='/api/world/life/morgue'&&req.method==='POST')result=await serial(()=>body(req).then(input=>morgue(user,input)));else if(p==='/api/world/life/revive'&&req.method==='POST')result=await serial(()=>body(req).then(input=>revive(user,input)));else fail(405,'Acción de salud no disponible.');json(res,result);return true;}
 };
}
