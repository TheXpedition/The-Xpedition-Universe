import {FOOD_BY_ID} from './public/juegos/world-foods.mjs';
import {freshnessFor} from './public/juegos/world-food-freshness.mjs';

export const unitAge=({age,at},time,rate=1)=>age+Math.max(0,time-at)*rate;
export function normalizeFoodUnits(raw,quantity,defaultAt){
 let saved=raw;
 if(typeof raw==='string')try{saved=JSON.parse(raw);}catch{saved=[];}
 const units=Array.isArray(saved)?saved.filter(unit=>unit&&Number.isFinite(unit.at)&&Number.isFinite(unit.age)&&unit.age>=0).slice(0,quantity):[];
 return units.concat(Array.from({length:quantity-units.length},()=>({age:0,at:Number(defaultAt)})));
}

export function takeOldestUnits(units,quantity,time,rate=1){
 units.sort((a,b)=>unitAge(b,time,rate)-unitAge(a,time,rate));
 return units.splice(0,quantity).map(unit=>({age:unitAge(unit,time,rate),at:time}));
}

export async function readFoodRows(db,userId,time){
 const rows=await db.all('SELECT food_id,quantity,updated,freshness FROM world_food_inventory WHERE user_id=? AND quantity>0 ORDER BY food_id',userId);
 return foodItems(rows,time);
}

export function foodItems(rows,time){
 return rows.filter(row=>Object.hasOwn(FOOD_BY_ID,row.food_id)).map(row=>{
  const quantity=Number(row.quantity),age=Math.max(...normalizeFoodUnits(row.freshness,quantity,row.updated).map(unit=>unitAge(unit,time)));
  const freshness=freshnessFor(row.food_id,age);
  return {foodId:row.food_id,quantity,...(freshness?{freshness}:{})};
 });
}

export async function inventoryUnits(db,userId,foodId,time){
 const lock=db.kind==='postgres'?' FOR UPDATE':'';
 const row=await db.one('SELECT quantity,updated,freshness FROM world_food_inventory WHERE user_id=? AND food_id=?'+lock,userId,foodId);
 return normalizeFoodUnits(row?.freshness,Number(row?.quantity||0),row?.updated??time);
}

export async function saveInventoryUnits(db,userId,foodId,units,time){
 if(!units.length){await db.run('DELETE FROM world_food_inventory WHERE user_id=? AND food_id=?',userId,foodId);return;}
 await db.run(
  'INSERT INTO world_food_inventory(user_id,food_id,quantity,updated,freshness) VALUES(?,?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET quantity=excluded.quantity,updated=excluded.updated,freshness=excluded.freshness',
  userId,foodId,units.length,time,JSON.stringify(units)
 );
}

export async function addInventoryUnits(db,userId,foodId,units,time){
 const held=await inventoryUnits(db,userId,foodId,time);
 await saveInventoryUnits(db,userId,foodId,[...held,...units],time);
}
