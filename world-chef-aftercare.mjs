import {createVitals} from './public/juegos/world-vitals.mjs';
import {createWellness} from './public/juegos/world-wellness.mjs';
export function createChefAftercare({db,clientFor,sendVitals,sendWellness,now=Date.now}){
 return async record=>{let applied=null;const c=clientFor({id:record.userId}),key='bonju-chef:care:'+record.id;
  await db.transaction(async()=>{if(await db.one('SELECT id FROM world_environment WHERE id=?',key))return;const [vr,br]=await Promise.all([db.one('SELECT state FROM world_vitals WHERE user_id=?',record.userId),db.one('SELECT state FROM world_wellness WHERE user_id=?',record.userId)]),v=createVitals(c?.vitals||JSON.parse(vr?.state||'{}')),b=createWellness(c?.wellness||JSON.parse(br?.state||'{}'));
   const weak=((100-v.energy)+(100-v.hunger)+(100-v.sleep))/300,energy=12+record.rounds*3+Math.round(weak*6);v.energy=Math.max(0,v.energy-energy);v.hunger=Math.max(0,v.hunger-3-record.rounds);v.sleep=Math.max(0,v.sleep-2-Math.floor(record.rounds/2));v.stress=Math.min(100,v.stress+4+Math.round(weak*4));
   if(v.energy<55){const old=b.conditions.find(q=>q.id==='fatigue'),severity=Math.min(65,25+(55-v.energy)*.6);if(old)old.severity=Math.max(old.severity,severity);else if(b.conditions.length<16)b.conditions.push({id:'fatigue',severity,age:0,treatment:0,careRate:0});}
   await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated=excluded.updated',record.userId,JSON.stringify(v),now());await db.run('INSERT INTO world_wellness(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated=excluded.updated',record.userId,JSON.stringify(b),now());await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)',key,JSON.stringify({energy,rounds:record.rounds}),now());applied={v,b};
  });if(c&&applied){c.vitals=applied.v;c.wellness=applied.b;sendVitals(c);sendWellness(c);}
 };
}
