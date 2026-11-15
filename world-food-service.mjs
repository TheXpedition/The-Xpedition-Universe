import {REFRIGERATED_RATE,freshnessFor} from './public/juegos/world-food-freshness.mjs';
import {normalizeFoodUnits,takeOldestUnits,readFoodRows,inventoryUnits,saveInventoryUnits,addInventoryUnits,unitAge} from './world-food-inventory.mjs';
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
 // Shelter fridges share the inventory transaction, but keep their own stock.
 const fridgeStock=(frame,context)=>context.roomTeam?(frame.state.shelterStock??={}):frame.state.stock;
 function coldStock(frame,context,teamId){
  frame.state.freshness??={};
  const stores=frame.state.freshness[context.roomTeam?'shelters':'camp']??={};
  return stores[teamId]??={};
 }
 const canTake=(team,context)=>(!context.roomTeam||context.roomTeam===team.id)&&(context.staff===true||(context.teamId!==undefined?context.teamId===team.id:!!normalizeTeam(context.team)&&normalizeTeam(context.team)===normalizeTeam(team.name)));
 async function view(userId,context,frame){
  const supplies=context.roomTeam?frame.state.shelterStock:frame.state.stock;
  const items=await readFoodRows(db,userId,now());
  return {revision:frame.revision,teams:frame.state.teams.filter(team=>!context.roomTeam||team.id===context.roomTeam).map(team=>({...team,name:context.roomTeam?(team.id==='left'?'Refugio 1':'Refugio 2'):team.name,canTake:canTake(team,context),slots:FOOD_CATALOG.map(food=>({foodId:food.id,quantity:supplies?.[team.id]?.[food.id]||0}))})),inventory:{capacity:FOOD_INVENTORY_CAPACITY,items},staff:context.staff===true&&!context.roomTeam,roomTeam:context.roomTeam||undefined};
 }
 return {
  async forage(userId,foodId,quantity=1){
   validUser(userId);const food=foodFor(foodId);
   return serial(async()=>{
    const frame=await lockedState(),row=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',userId);
    if(!Number.isInteger(quantity)||quantity<1||quantity>2||Number(row.total)+quantity>FOOD_INVENTORY_CAPACITY)reject(409,'Tu inventario está lleno.');
    const time=now();await addInventoryUnits(db,userId,food.id,normalizeFoodUnits(null,quantity,time),time);
    await save(frame);return view(userId,{},frame);
   });
  },
  async snapshot(userId,context={}){validUser(userId);return serial(async()=>view(userId,context,await lockedState()));},
  async transfer(fromId,toId,foodId,quantity=1){
   validUser(fromId);validUser(toId);const food=foodFor(foodId);
   if(fromId===toId||!Number.isInteger(quantity)||quantity<1||quantity>FOOD_INVENTORY_CAPACITY)reject(400,'Selecciona una cantidad válida para otra persona.');
   return serial(async()=>{
    const frame=await lockedState(),time=now(),held=await inventoryUnits(db,fromId,food.id,time);
    const capacity=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',toId);
    if(held.length<quantity)reject(409,'Ya no tienes esa cantidad en tu inventario.');
    if(Number(capacity.total)+quantity>FOOD_INVENTORY_CAPACITY)reject(409,'El inventario de la otra persona no tiene espacio.');
    const moved=takeOldestUnits(held,quantity,time);
    await saveInventoryUnits(db,fromId,food.id,held,time);await addInventoryUnits(db,toId,food.id,moved,time);
    await save(frame);return {foodId:food.id,quantity};
   });
  },
  async take(userId,input={},context={}){
   validUser(userId);if(!input||typeof input!=='object'||Array.isArray(input))reject(400,'Selecciona un alimento y una puerta de la nevera.');const teamId=teamFor(input.teamId),food=foodFor(input.foodId);
   return serial(async()=>{const frame=await lockedState();await context.beforeTake?.(input);const team=frame.state.teams.find(team=>team.id===teamId);if(!canTake(team,context))reject(403,'Esta puerta está reservada a su equipo. El STAFF puede asignarte un equipo.');
    const compartment=fridgeStock(frame,context)[teamId],available=Number(compartment?.[food.id])||0;if(available<1)reject(409,'Este alimento ya se ha agotado.');
    const row=await db.one('SELECT COALESCE(SUM(quantity),0) AS total FROM world_food_inventory WHERE user_id=?',userId);if(Number(row.total)>=FOOD_INVENTORY_CAPACITY)reject(409,'Tu inventario está lleno. Puedes guardar hasta 48 alimentos.');
    const time=now(),cold=coldStock(frame,context,teamId),units=normalizeFoodUnits(cold[food.id],available,time);
    const moved=takeOldestUnits(units,1,time,REFRIGERATED_RATE);
    compartment[food.id]=available-1;
    if(units.length)cold[food.id]=units;else delete cold[food.id];
    await addInventoryUnits(db,userId,food.id,moved,time);
    await save(frame);return view(userId,context,frame);
   });
  },
  async deposit(userId,{teamId,foodId},context={}){
   validUser(userId);const target=teamFor(teamId),food=foodFor(foodId);
   return serial(async()=>{
    const frame=await lockedState(),team=frame.state.teams.find(team=>team.id===target);
    if(!canTake(team,context))reject(403,'La nevera está reservada a su equipo.');
    const supplies=fridgeStock(frame,context),compartment=supplies[target]??={};
    const amount=Number(compartment[food.id])||0;
    if(amount>=99)reject(409,'No caben más unidades de este alimento.');
    const time=now(),held=await inventoryUnits(db,userId,food.id,time);
    if(!held.length)reject(409,'Ese alimento no está en tu inventario.');
    const moved=takeOldestUnits(held,1,time),cold=coldStock(frame,context,target);
    cold[food.id]=normalizeFoodUnits(cold[food.id],amount,time).concat(moved);
    await saveInventoryUnits(db,userId,food.id,held,time);
    compartment[food.id]=amount+1;
    await save(frame);
    return view(userId,context,frame);
   });
  },
  async consume(userId,foodId,applyNutrition){
   validUser(userId);const food=foodFor(foodId);if(food.requiresCooking)reject(409,'Cocina este ingrediente en una fogata antes de comerlo.');if(typeof applyNutrition!=='function')reject(400,'No se pudo aplicar la recuperación de este alimento.');
   return serial(async()=>{
    const frame=await lockedState(),time=now(),held=await inventoryUnits(db,userId,food.id,time);
    if(!held.length)reject(409,'Ese alimento no está en tu inventario.');
    const [serving]=takeOldestUnits(held,1,time),freshness=freshnessFor(food.id,unitAge(serving,time));
    const result=await applyNutrition(food,freshness);
    if(!result||result.applied!==true)return {food,applied:false,reason:result?.reason||'full',...(result?.vitals?{vitals:result.vitals}:{})};
    await saveInventoryUnits(db,userId,food.id,held,time);await save(frame);
    return {...result,food,freshness,applied:true};
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
    for(const teamId of targets){
     const cold=coldStock(frame,{},teamId),time=now();
     if(action==='fill'||action==='empty'){
      const amount=action==='fill'?3:0;
      frame.state.stock[teamId]=stock(amount);
      frame.state.freshness.camp[teamId]=amount?Object.fromEntries(FOOD_CATALOG.map(food=>[food.id,normalizeFoodUnits(null,amount,time)])):{};
     }
     if(action==='set'||action==='adjust'){
      const previous=frame.state.stock[teamId][input.foodId]||0;
      const next=action==='set'?input.quantity:previous+input.amount;
      if(next<0||next>99)reject(409,next<0?'No puedes quitar más unidades de las disponibles.':'Cada producto admite hasta 99 unidades por puerta.');
      const units=normalizeFoodUnits(cold[input.foodId],previous,time);
      if(next<previous)takeOldestUnits(units,previous-next,time,REFRIGERATED_RATE);
      cold[input.foodId]=normalizeFoodUnits(units,next,time);
      frame.state.stock[teamId][input.foodId]=next;
     }
     if(action==='rename'){
      if(frame.state.teams.some(team=>team.id!==teamId&&normalizeTeam(team.name)===normalizeTeam(name)))reject(409,'Cada puerta necesita un nombre de equipo diferente.');
      frame.state.teams.find(team=>team.id===teamId).name=name;
     }
    }
    await save(frame);return view(userId,context,frame);
   });
  }
 };
}
