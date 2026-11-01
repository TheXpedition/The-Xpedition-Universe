import {createVitals} from './public/juegos/world-vitals.mjs';
import {createWellness} from './public/juegos/world-wellness.mjs';
const randomFor=key=>{let v=2166136261;for(const c of key)v=Math.imul(v^c.charCodeAt(0),16777619);return (v>>>0)/4294967296;};
export function gripConsequences(record){
 const b=createVitals(record.baseline),weak=(100-b.energy)*.004+(100-b.sleep)*.003+(100-b.hunger)*.002+(100-b.health)*.002,r=randomFor(record.id),effort=Math.min(18,record.seconds/12);
 const energy=Math.round(9+effort+weak*10+r*5),hunger=Math.round(2+effort*.2+weak*3),sleep=Math.round(2+effort*.12),stress=Math.round(3+weak*5+(record.fell?4:1));
 const health=record.fell&&r+weak>.5?Math.min(12,Math.round(2+weak*6+r*5)):weak>.8?2:0,injury=health>=4?(weak>1&&r>.65?'sprain':'bruise'):null;
 return {energy,hunger,sleep,stress,health,injury,severity:injury?Math.min(55,18+health*2):0};
}
export function createGripAftercare({db,clientFor,sendVitals,sendWellness,send,now=Date.now}){
 let queue=Promise.resolve();
 return record=>{const next=queue.then(async()=>{const c=clientFor({id:record.userId}),key='last-grip:care:'+record.id;let applied=null;
  await db.transaction(async()=>{if(await db.one('SELECT id FROM world_environment WHERE id=?',key))return;
   const oldVitals=await db.one('SELECT state FROM world_vitals WHERE user_id=?',record.userId),oldBody=await db.one('SELECT state FROM world_wellness WHERE user_id=?',record.userId),v=createVitals(c?.vitals||JSON.parse(oldVitals?.state||'{}')),b=createWellness(c?.wellness||JSON.parse(oldBody?.state||'{}')),effect=gripConsequences(record);
   v.energy=Math.max(0,v.energy-effect.energy);v.hunger=Math.max(0,v.hunger-effect.hunger);v.sleep=Math.max(0,v.sleep-effect.sleep);v.stress=Math.min(100,v.stress+effect.stress);v.health=Math.max(1,v.health-effect.health);
   function condition(id,severity){const old=b.conditions.find(q=>q.id===id);if(old)old.severity=Math.max(old.severity,severity);else if(b.conditions.length<16)b.conditions.push({id,severity,age:0,treatment:0,careRate:0});}
   if(v.energy<=55)condition('fatigue',Math.min(60,25+(55-v.energy)*.55));if(effect.injury){condition(effect.injury,effect.severity);const part=randomFor(record.id+':part')>.5?'left-arm':'right-arm';if(!b.clinical.injuries.some(i=>i.part===part&&i.condition===effect.injury))b.clinical.injuries.push({part,condition:effect.injury});}
   const updated=now();await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated=excluded.updated',record.userId,JSON.stringify(v),updated);await db.run('INSERT INTO world_wellness(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated=excluded.updated',record.userId,JSON.stringify(b),updated);await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)',key,JSON.stringify({effect,recordId:record.id}),updated);applied={vitals:v,body:b,effect};
  });
  if(applied&&c){c.vitals=applied.vitals;c.wellness=applied.body;sendVitals(c);sendWellness(c);send(c,{type:'grip-aftercare',effect:applied.effect,vitals:applied.vitals});}return applied?.effect||null;
 });queue=next.catch(()=>{});return next;};
}
