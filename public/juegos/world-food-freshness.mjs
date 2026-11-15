import {FOOD_BY_ID} from './world-foods.mjs';

const hour=3_600_000;
const byCategory={fruit:[6,18,30],vegetable:[8,24,36],meal:[3,9,15],protein:[3,9,15],dairy:[3,10,16]};
const lasting=new Set(['dry-beans','dry-chickpeas','dry-rice','canned-beans','canned-tuna']);
export const FRESHNESS_LABELS=Object.freeze({fresh:'Fresco',acceptable:'Aceptable',stale:'Rancio',rotten:'Podrido'});
export const REFRIGERATED_RATE=.25;
export function freshnessFor(foodId,age){
 const food=FOOD_BY_ID[foodId],limits=foodId==='cooked-rice'?byCategory.meal:byCategory[food?.category];
 if(!limits||lasting.has(foodId))return null;
 const i=limits.findIndex(limit=>age<limit*hour);
 return i===-1?'rotten':['fresh','acceptable','stale'][i];
}
export function freshnessRecovery(food,grade,random=Math.random){
 if(grade==='rotten')return {health:-9,hunger:0,energy:-4,spoilage:'rotten'};
 const illness=grade==='stale'&&random()<.32;
 const factor=grade==='acceptable'?.65:grade==='stale'?.40:1;
 return {
  health:food.raw?-6:illness?-5:grade==='stale'?0:food.health,
  hunger:Math.floor(food.hunger*factor),energy:Math.floor(food.energy*factor),
  ...(illness?{spoilage:'stale'}:{})
 };
}
