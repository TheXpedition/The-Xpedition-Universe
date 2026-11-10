import {SHELTERS,SHELTER_SIZE,SHELTER_MATERIALS,SHELTER_PARTICIPANTS,shelterForCharacter,shelterForZone,shelterSupplyProp} from './public/juegos/world-shelters.mjs';
import {portalDistance} from './public/juegos/front-world.mjs';
import {WORLD_MAPS} from './public/juegos/world-maps.mjs';
import {WORLD_CHARACTERS} from './public/juegos/world-characters.mjs';

const initial=()=>({version:1,revision:0,owners:{},assignments:{},collected:{},delivered:{},completed:{},audit:[]});
export function createShelterService({db,now=Date.now,onChange=async()=>{},fail=(status,message)=>{throw Object.assign(Error(message),{status});}}){
 let state=initial(),tail=Promise.resolve();
 const decode=row=>{let value;try{value=JSON.parse(row?.state);}catch{}if(value?.version!==1||!value.owners||!value.assignments||!value.collected||!value.delivered||!value.completed)fail(503,'El progreso de refugios no está disponible. Intenta de nuevo.');return value;};
 const ready=db.transaction(async()=>{
  await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING','shelters',JSON.stringify(state),now());
  state=decode(await db.one('SELECT state FROM world_environment WHERE id=?'+(db.kind==='postgres'?' FOR UPDATE':''),'shelters'));
  if(!restoreCastContributions(state))return;
  for(const {id} of SHELTERS)completeIfReady(state,id);
  state.revision++;
  await db.run('UPDATE world_environment SET state=?,updated=? WHERE id=?',JSON.stringify(state),now(),'shelters');
 });
 async function excludedMembers(){const rows=await db.all("SELECT p.character_id FROM world_contestants c JOIN world_preferences p ON p.user_id=c.user_id WHERE c.season=? AND c.status IN ('eliminated','spectator')",'antarctica-1'),raw=await db.one('SELECT state FROM world_environment WHERE id=?','x-protocol-exclusions');return new Set([...rows.map(r=>r.character_id),...(raw?JSON.parse(raw.state):[])]);}
 async function identity(user){
  const p=await db.one('SELECT character_id FROM world_preferences WHERE user_id=?',user.id),r=p&&await db.one('SELECT user_id FROM world_character_reservations WHERE character_id=?',p.character_id),contestant=await db.one('SELECT status FROM world_contestants WHERE season=? AND user_id=?','antarctica-1',user.id);
  return {characterId:p?.character_id,active:!!p&&!(await excludedMembers()).has(p.character_id)&&r?.user_id===user.id&&SHELTER_PARTICIPANTS.includes(p.character_id)&&(!contestant||contestant.status==='active')};
 }
 function bind(s,user,id){if(s.owners[id]&&s.owners[id]!==user.id)fail(409,'Este personaje ya tiene un participante vinculado a la construcción.');s.owners[id]=user.id;}
 const owned=(s,user,id)=>!s.owners[id]||s.owners[id]===user.id;
 const homeFor=(s,id)=>Object.hasOwn(s.housingOverrides||{},id)?s.housingOverrides[id]:shelterForCharacter(id);
 const members=(s,home)=>SHELTER_PARTICIPANTS.filter(id=>homeFor(s,id)===home);
 const characterName=id=>WORLD_CHARACTERS.find(c=>c.id===id)?.name||id;
 const deliveryHome=(id,delivery)=>typeof delivery==='number'?shelterForCharacter(id):delivery.home;
 function deliveries(s,home,material){
  return SHELTER_PARTICIPANTS.filter(id=>{
   const delivery=s.delivered[id]?.[material];
   return delivery&&(deliveryHome(id,delivery)===home||delivery.restoredCredit?.home===home);
  });
 }
 function progress(s,id){const done=s.completed[id],counts=Object.fromEntries(SHELTER_MATERIALS.map(m=>[m.id,done?SHELTER_SIZE:Math.min(SHELTER_SIZE,deliveries(s,id,m.id).length)])),total=Object.values(counts).reduce((a,b)=>a+b,0);return {counts,percent:done?100:Math.floor(total/(SHELTER_SIZE*SHELTER_MATERIALS.length)*100),built:!!done,completedAt:done?.at||null};}
 function restoreCastContributions(s){
  let changed=false;
  for(const [from,to] of [['peggy','gabrielsab'],['joseserna','alice']]){
   for(const {id} of SHELTER_MATERIALS){
    const previous=s.delivered[from]?.[id];
    if(!previous)continue;
    // Both legacy characters belonged to Refugio 2 before deliveries recorded their destination.
    const delivery=typeof previous==='number'?{at:previous,home:'right'}:previous;
    const current=s.delivered[to]?.[id];
    if(current&&(deliveryHome(to,current)===delivery.home||current.restoredCredit?.home===delivery.home))continue;
    const credit={...delivery,creditedFrom:from};
    s.delivered[to]??={};
    s.collected[to]??={};
    s.delivered[to][id]=current?{at:typeof current==='number'?current:current.at,home:deliveryHome(to,current),restoredCredit:credit}:credit;
    s.collected[to][id]??=s.collected[from]?.[id]||delivery.at;
    changed=true;
   }
  }
  return changed;
 }
 function completeIfReady(s,home){
  if(!s.completed[home]&&SHELTER_MATERIALS.every(m=>deliveries(s,home,m.id).length>=SHELTER_SIZE)){
   s.completed[home]={at:now(),contributors:[...new Set(SHELTER_MATERIALS.flatMap(m=>deliveries(s,home,m.id)))]};
  }
 }
 function view(s,user,person,staff=false,excluded=new Set()){
  const id=person.characterId,bound=owned(s,user,id),home=person.active?homeFor(s,id):null,eligible=person.active&&bound&&!!home;
  const shelters=SHELTERS.map(def=>({...def,...progress(s,def.id),required:SHELTER_SIZE,members:members(s,def.id).map(characterId=>({characterId,name:characterName(characterId),active:!excluded.has(characterId),occupied:!!s.owners[characterId]}))}));
  return {revision:s.revision,eligible,home,stock:Object.fromEntries(SHELTER_MATERIALS.map(m=>[m.id,18-SHELTER_PARTICIPANTS.filter(c=>s.collected[c]?.[m.id]).length])),available:eligible?SHELTER_MATERIALS.filter(m=>!s.collected[id]?.[m.id]).map(m=>m.id):[],inventory:bound?SHELTER_MATERIALS.filter(m=>s.collected[id]?.[m.id]&&!s.delivered[id]?.[m.id]).map(m=>m.id):[],delivered:bound?Object.keys(s.delivered[id]||{}):[],shelters,...(staff?{housing:SHELTER_PARTICIPANTS.map(characterId=>({characterId,name:characterName(characterId),home:homeFor(s,characterId)})),race:shelters[0].percent===shelters[1].percent?'Empate':shelters.find(s=>s.percent===Math.max(...shelters.map(t=>t.percent))).name+' va adelante'}:{})};
 }
 const mutate=fn=>{const task=tail.then(async()=>{await ready;let next;const result=await db.transaction(async()=>{next=decode(await db.one('SELECT state FROM world_environment WHERE id=?'+(db.kind==='postgres'?' FOR UPDATE':''),'shelters'));const result=await fn(next);next.revision++;await db.run('UPDATE world_environment SET state=?,updated=? WHERE id=?',JSON.stringify(next),now(),'shelters');return result;});state=next;return result;});tail=task.catch(()=>{});return task;};
 async function notify(){await onChange();}
 const validHome=id=>{if(!SHELTERS.some(s=>s.id===id))fail(400,'Selecciona Refugio 1 o Refugio 2.');return SHELTERS.find(s=>s.id===id);};
 async function participant(user,context={}){const person=await identity(user);if(!person.active)fail(403,'Solo los 18 participantes activos pueden recoger materiales o construir refugios.');if(context.alive===false)fail(409,'Debes estar consciente para construir.');return person;}
 return {ready,identity,
  async snapshot(user,{staff=false}={}){await ready;await tail;state=decode(await db.one('SELECT state FROM world_environment WHERE id=?','shelters'));return view(state,user,await identity(user),staff,await excludedMembers());},
  teamFor(_user,id){return homeFor(state,id);},
  canEnter(user,id,zone){const home=shelterForZone(zone);return !home||homeFor(state,id)===home.id&&!!state.completed[home.id];},
  async assertAccess(user,zone){await ready;if(!shelterForZone(zone))return;const person=await identity(user);if(!person.active||!this.canEnter(user,person.characterId,zone))fail(403,!!state.completed[shelterForZone(zone).id]?'Este personaje no tiene acceso a este refugio.':'Primero deben construir este refugio.');},
  async assign({characterId,home}={}){
   if(!SHELTER_PARTICIPANTS.includes(characterId))fail(400,'Selecciona un participante.');
   const destination=home===null?null:validHome(home);
   const result=await mutate(s=>{
    const previous=homeFor(s,characterId);
    if(home!==previous&&destination&&members(s,home).length>=SHELTER_SIZE)fail(409,destination.name+' no tiene plazas libres.');
    s.housingOverrides||={};
    s.housingOverrides[characterId]=home;
    return {message:characterName(characterId)+(destination?' ahora pertenece a '+destination.name: ' quedó sin refugio')+'.'};
   });
   await notify();
   return result;
  },
  async collect(user,materialId,context={}){const material=SHELTER_MATERIALS.find(m=>m.id===materialId);if(!material)fail(404,'Material inexistente.');const point=shelterSupplyProp(material,WORLD_MAPS[material.zone]);if(context.zone!==material.zone||!Number.isFinite(context.x)||!Number.isFinite(context.y)||Math.hypot(context.x-point.x,context.y-point.y)>125)fail(409,'Acércate al material para recogerlo.');const result=await mutate(async s=>{const person=await participant(user,context),id=person.characterId;if(!homeFor(s,id))fail(409,'Necesitas un refugio asignado para recoger materiales.');bind(s,user,id);if(s.collected[id]?.[materialId])fail(409,'Ya recogiste tu unidad de este material.');s.collected[id]||={};s.collected[id][materialId]=now();return {message:'Recogiste '+material.name.toLocaleLowerCase('es')+'. Una unidad para tu aporte al refugio.'};});await notify();return result;},
  async contribute(user,home,context={}){const def=validHome(home),portal=WORLD_MAPS[def.outside].props.find(p=>p.portal?.zone===def.inside)?.portal;if(context.zone!==def.outside||!portal||!Number.isFinite(context.x)||!Number.isFinite(context.y)||portalDistance(context,portal)>125)fail(409,'Acércate a la entrada de '+def.name+' para aportar.');const result=await mutate(async s=>{const person=await participant(user,context),id=person.characterId;bind(s,user,id);if(homeFor(s,id)!==home)fail(403,'Este personaje solo puede construir su refugio correspondiente.');if(s.completed[home])return {message:'El refugio ya está construido.',added:0};s.delivered[id]||={};let added=0;for(const m of SHELTER_MATERIALS)if(s.collected[id]?.[m.id]&&!s.delivered[id][m.id]&&deliveries(s,home,m.id).length<SHELTER_SIZE){s.delivered[id][m.id]={at:now(),home};added++;}completeIfReady(s,home);return {added,message:s.completed[home]?'¡'+def.name+' construido! Sus integrantes ya pueden entrar.':added?'Aportaste '+added+' material'+(added===1?'':'es')+' a '+def.name+'.':'Busca los materiales que aún te faltan. Cada integrante aporta uno de cada tipo.'};});await notify();return result;},
  async close(){await ready;await tail;}
 };
}
