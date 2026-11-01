// Condition is per physical unit. Moving items between inventories never repairs them.
export const DURABLE=Object.freeze({coat:{rate:.045,repair:{cloth:2}},'light-clothes':{rate:.035,repair:{cloth:1}},'fishing-rod':{use:3,repair:{rope:1,scrap:1}},toolkit:{use:1.5,repair:{scrap:2}},flashlight:{rate:.008,repair:{wire:1,scrap:1}},walkie:{rate:.006,repair:{wire:1,scrap:1}}});
const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(n)?n:100));
export function normalizeCondition(p){p.condition??={};p.items??={};p.equipment??={};p.charges??={};for(const id of Object.keys(DURABLE)){const quantity=Math.max(0,Math.min(99,Math.floor(p.items[id]||0))),old=Array.isArray(p.condition[id])?p.condition[id]:[];p.condition[id]=Array.from({length:quantity},(_,i)=>clamp(old[i]));if(!quantity){delete p.condition[id];delete p.equipment[id];delete p.charges[id];}}return p;}
export function itemCondition(p,id){normalizeCondition(p);return p.condition[id]?.[0]??0;}
export function usableGear(p,id){return (p.items?.[id]||0)>0&&(!DURABLE[id]||itemCondition(p,id)>0);}
export function resizeCondition(p,id,delta){if(!DURABLE[id])return;const units=p.condition[id]||[];if(delta<0)units.splice(0,-delta);else units.push(...Array(delta).fill(100));p.condition[id]=units;}
export function moveCondition(from,to,id,quantity){if(!DURABLE[id])return;normalizeCondition(from);normalizeCondition(to);const units=from.condition[id].slice(0,quantity);return units;}
export function wearUse(p,id,amount=DURABLE[id]?.use||0){if(!usableGear(p,id))return false;p.condition[id][0]=clamp(p.condition[id][0]-amount);if(!p.condition[id][0])p.equipment[id]=false;return true;}
export function clothingOptions(p,body={}){normalizeCondition(p);return [{id:'heat',owned:true,condition:Math.round(body.baseClothingCondition??100)},{id:'cold',owned:(p.items.coat||0)>0,condition:Math.round(itemCondition(p,'coat'))}];}
export function syncClothing(p,body){normalizeCondition(p);if(body.clothing==='cold'&&!usableGear(p,'coat'))body.clothing='heat';body.clothingCondition=body.clothing==='cold'?itemCondition(p,'coat'):(body.baseClothingCondition??100);body.clothingOptions=clothingOptions(p,body);return body;}
export function wearGear(p,body,{seconds=0,moving=false,running=false,wetness=0,outside=0,now=Date.now()}={}){
 normalizeCondition(p);seconds=Math.max(0,Math.min(60,Number(seconds)||0));const factor=(outside>.4?1:.25)*(moving?1:.5)*(running?1.5:1)*(wetness>55?1.8:1);
 body.baseClothingCondition=clamp(body.baseClothingCondition??100);
 if(body.clothing==='cold'&&usableGear(p,'coat'))p.condition.coat[0]=clamp(p.condition.coat[0]-seconds*DURABLE.coat.rate*factor);
 else body.baseClothingCondition=clamp(body.baseClothingCondition-seconds*DURABLE['light-clothes'].rate*factor);
 for(const id of ['flashlight','walkie'])if(p.equipment[id]&&p.charges[id]>now&&usableGear(p,id)){p.condition[id][0]=clamp(p.condition[id][0]-seconds*DURABLE[id].rate);if(!p.condition[id][0])p.equipment[id]=false;}
 return syncClothing(p,body);
}
