import {createVitals} from './public/juegos/world-vitals.mjs';
export function createVitalsStore({db,now=Date.now}){
 const decode=raw=>{try{return createVitals(JSON.parse(raw));}catch{return createVitals();}};
 return {
  async load(userId){const defaults=createVitals();await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING',userId,JSON.stringify(defaults),now());const row=await db.one('SELECT state FROM world_vitals WHERE user_id=?',userId);return decode(row?.state);},
  async save(userId,value){const state=createVitals(value);await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,updated=excluded.updated',userId,JSON.stringify(state),now());return state;}
 };
}
