import {SEED_MEMORIALS,buildMemorialProps} from './public/juegos/world-memorials.mjs';
export function createWorldMemorials({db,maps,broadcast=()=>{}}){
 let tail=Promise.resolve();
 async function list(){const rows=await db.all('SELECT id,name,created FROM world_memorials ORDER BY created,id');return [...SEED_MEMORIALS,...rows.map(r=>({id:r.id,name:r.name,created:Number(r.created)}))];}
 async function refresh(){const entries=await list();buildMemorialProps(maps,entries);broadcast({type:'memorials',entries});return entries;}
 function record(user,at){const job=tail.then(async()=>{await db.run('INSERT INTO world_memorials(id,user_id,name,created) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING','death:'+user.id+':'+at,user.id,String(user.name).slice(0,100),at);return refresh();});tail=job.catch(()=>{});return job;}
 return {list,refresh,record};
}
