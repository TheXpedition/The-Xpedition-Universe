import {SEED_MEMORIALS,buildMemorialProps} from './public/juegos/world-memorials.mjs';
export function createWorldMemorials({db,maps,broadcast=()=>{}}){
 let tail=Promise.resolve();
 async function list(){
  const rows=await db.all('SELECT id,user_id,name,created FROM world_memorials ORDER BY created,id');
  const people=new Set(),entries=[...SEED_MEMORIALS];
  for(const row of rows){
   const identity=row.user_id||'name:'+row.name.normalize('NFKC').trim().toLocaleLowerCase('es');
   if(people.has(identity))continue;
   people.add(identity);entries.push({id:row.id,name:row.name,created:Number(row.created)});
  }
  return entries;
 }
 async function refresh(){const entries=await list();buildMemorialProps(maps,entries);broadcast({type:'memorials',entries});return entries;}
 function record(user,at){const job=tail.then(async()=>{await db.run('INSERT INTO world_memorials(id,user_id,name,created) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM world_memorials WHERE user_id=?) ON CONFLICT(id) DO NOTHING','person:'+user.id,user.id,String(user.name).slice(0,100),at,user.id);return refresh();});tail=job.catch(()=>{});return job;}
 return {list,refresh,record};
}
