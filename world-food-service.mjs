import {FOOD_CATALOG,FOOD_BY_ID} from './public/juegos/world-foods.mjs';

export const FOOD_INVENTORY_CAPACITY=48;
const COMPARTMENTS=['left','right'],STATE_ID='camp-fridge';
const normalizeTeam=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
const stock=quantity=>Object.fromEntries(FOOD_CATALOG.map(food=>[food.id,quantity]));
const freshState=()=>({teams:[{id:'left',name:'Equipo 1'},{id:'right',name:'Equipo 2'}],stock:{left:stock(3),right:stock(3)}});

export function createFoodStore({db,now=Date.now,fail=(status,message)=>{throw Object.assign(new Error(message),{status});}}){
 let tail=Promise.resolve();
 const reject=(status,message)=>{fail(status,message);throw Object.assign(new Error(message),{status});};
 const foodFor=id=>typeof id==='string'&&Object.hasOwn(FOOD_BY_ID,id)?FOOD_BY_ID[id]:reject(400,'Selecciona un alimento válido.');
 const teamFor=id=>COMPARTMENTS.includes(id)?id:reject(400,'Selecciona una puerta de la nevera.');
 const validUser=id=>typeof id==='string'&&id.length>0?id:reject(401,'Inicia sesión para usar tu inventario.');
 const serial=fn=>{const operation=tail.then(()=>db.transaction(fn));tail=operation.catch(()=>{});return operation;};
 async function lockedState(){
  await db.run('INSERT INTO world_food_state(id,state,revision,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING',STATE_ID,JSON.stringify(freshState()),0,now());
  const row=await db.one('SELECT state,revision FROM world_food_state WHERE id=?'+(db.kind==='postgres'?' FOR UPDATE':''),STATE_ID);
  return {state:JSON.parse(row.state),revision:Number(row.revision)};
 }
 async function save(frame){frame.revision++;await db.run('UPDATE world_food_state SET state=?,revision=?,updated=? WHERE id=?',JSON.stringify(frame.state),frame.revision,now(),STATE_ID);}
 const canTake=(team,context)=>context.staff===true||(context.teamId!==undefined?context.teamId===team.id:!!normalizeTeam(context.team)&&normalizeTeam(context.team)===normalizeTeam(team.name));
 async function view(userId,context,frame){
  const items=(await db.all('SELECT food_id,quantity FROM world_food_inventory WHERE user_id=? AND quantity>0 ORDER BY food_id',userId)).filter(item=>Object.hasOwn(FOOD_BY_ID,item.food_id)).map(item=>({foodId:item.food_id,quantity:Number(item.quantity)}));
  return {revision:frame.revision,teams:frame.state.teams.map(team=>({...team,canTake:canTake(team,context),slots:FOOD_CATALOG.map(food=>({foodId:food.id,quantity:frame.state.stock[team.id]?.[food.id]||0}))})),inventory:{capacity:FOOD_INVENTORY_CAPACITY,items},staff:context.staff===true};
 }
 return {
  async forage(userId,foodId,quantity=1){validUser(userId);const food=foodFor(foodId);return serial(async()=>{const frame=await lockedState(),row=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',userId);if(!Number.isInteger(quantity)||quantity<1||quantity>2||Number(row.total)+quantity>FOOD_INVENTORY_CAPACITY)reject(409,'Tu inventario está lleno.');await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET quantity=world_food_inventory.quantity+excluded.quantity,updated=excluded.updated',userId,food.id,quantity,now());await save(frame);return view(userId,{},frame);});},
  async snapshot(userId,context={}){validUser(userId);return serial(async()=>view(userId,context,await lockedState()));},
  async transfer(fromId,toId,foodId,quantity=1){
   validUser(fromId);validUser(toId);const food=foodFor(foodId);if(fromId===toId||!Number.isInteger(quantity)||quantity<1||quantity>FOOD_INVENTORY_CAPACITY)reject(400,'Selecciona una cantidad válida para otra persona.');
   return serial(async()=>{const frame=await lockedState(),owned=await db.one('SELECT quantity FROM world_food_inventory WHERE user_id=? AND food_id=?',fromId,food.id),capacity=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',toId);if(Number(owned?.quantity||0)<quantity)reject(409,'Ya no tienes esa cantidad en tu inventario.');if(Number(capacity.total)+quantity>FOOD_INVENTORY_CAPACITY)reject(409,'El inventario de la otra persona no tiene espacio.');const changed=await db.run('UPDATE world_food_inventory SET quantity=quantity-?,updated=? WHERE user_id=? AND food_id=? AND quantity>=?',quantity,now(),fromId,food.id,quantity);if(!changed.changes)reject(409,'Ese alimento ya no está disponible.');await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET quantity=world_food_inventory.quantity+excluded.quantity,updated=excluded.updated',toId,food.id,quantity,now());await db.run('DELETE FROM world_food_inventory WHERE user_id=? AND food_id=? AND quantity=0',fromId,food.id);await save(frame);return {foodId:food.id,quantity};});
  },
  async take(userId,input={},context={}){
   validUser(userId);if(!input||typeof input!=='object'||Array.isArray(input))reject(400,'Selecciona un alimento y una puerta de la nevera.');const teamId=teamFor(input.teamId),food=foodFor(input.foodId);
   return serial(async()=>{const frame=await lockedState();await context.beforeTake?.(input);const rationFrame=frame,team=frame.state.teams.find(team=>team.id===teamId);if(!canTake(team,context))reject(403,'Esta puerta está reservada a su equipo. El STAFF puede asignarte un equipo.');
    const available=Number(frame.state.stock[teamId][food.id])||0;if(available<1)reject(409,'Este alimento ya se ha agotado.');
    const row=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',userId);if(Number(row.total)>=FOOD_INVENTORY_CAPACITY)reject(409,'Tu inventario está lleno. Puedes guardar hasta 48 alimentos.');
    frame.state.stock[teamId][food.id]=available-1;
    await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET quantity=world_food_inventory.quantity+1,updated=excluded.updated',userId,food.id,1,now());
    await save(frame);return view(userId,context,frame);
   });
  },
  async consume(userId,foodId,applyNutrition){
   validUser(userId);const food=foodFor(foodId);if(food.requiresCooking)reject(409,'Cocina este ingrediente en una fogata antes de comerlo.');if(typeof applyNutrition!=='function')reject(400,'No se pudo aplicar la recuperación de este alimento.');
   return serial(async()=>{const frame=await lockedState(),item=await db.one('SELECT quantity FROM world_food_inventory WHERE user_id=? AND food_id=?',userId,food.id);if(!item||Number(item.quantity)<1)reject(409,'Ese alimento no está en tu inventario.');
    const result=await applyNutrition(food);if(!result||result.applied!==true)return {food,applied:false,reason:result?.reason||'full',...(result?.vitals?{vitals:result.vitals}:{})};
    const update=await db.run('UPDATE world_food_inventory SET quantity=quantity-1,updated=? WHERE user_id=? AND food_id=? AND quantity>0',now(),userId,food.id);if(!update.changes)reject(409,'Ese alimento ya se ha consumido.');
    await db.run('DELETE FROM world_food_inventory WHERE user_id=? AND food_id=? AND quantity=0',userId,food.id);await save(frame);return {...result,food,applied:true};
   });
  },
  async manage(userId,input={},context={}){
   validUser(userId);if(context.staff!==true)reject(403,'Solo el STAFF puede gestionar la nevera.');
   if(!input||typeof input!=='object'||Array.isArray(input))reject(400,'Selecciona una acción válida para la nevera.');
   const action=input.action;if(!['fill','empty','set','adjust','rename'].includes(action))reject(400,'Selecciona una acción válida para la nevera.');
   const targets=input.teamId===undefined&&['fill','empty'].includes(action)?COMPARTMENTS:[teamFor(input.teamId)];
   if(action==='set'){foodFor(input.foodId);if(!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>99)reject(400,'La cantidad debe ser un entero entre 0 y 99.');}
   if(action==='adjust'){foodFor(input.foodId);if(!Number.isInteger(input.amount)||input.amount===0||Math.abs(input.amount)>99)reject(400,'Añade o quita entre 1 y 99 unidades.');}
   const name=action==='rename'&&typeof input.name==='string'?input.name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
   if(action==='rename'&&(!name||name.length>24||/[\u0000-\u001f\u007f]/.test(name)))reject(400,'Escribe un nombre de equipo de hasta 24 caracteres.');
   return serial(async()=>{const frame=await lockedState();
    for(const teamId of targets){if(action==='fill'||action==='empty')frame.state.stock[teamId]=stock(action==='fill'?3:0);if(action==='set')frame.state.stock[teamId][input.foodId]=input.quantity;
     if(action==='adjust'){const next=(Number(frame.state.stock[teamId][input.foodId])||0)+input.amount;if(next<0||next>99)reject(409,next<0?'No puedes quitar más unidades de las disponibles.':'Cada producto admite hasta 99 unidades por puerta.');frame.state.stock[teamId][input.foodId]=next;}
     if(action==='rename'){if(frame.state.teams.some(team=>team.id!==teamId&&normalizeTeam(team.name)===normalizeTeam(name)))reject(409,'Cada puerta necesita un nombre de equipo diferente.');frame.state.teams.find(team=>team.id===teamId).name=name;}}
    await save(frame);return view(userId,context,frame);
   });
  }
 };
}
