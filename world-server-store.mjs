import {schema} from './database.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';

// Account balances and their reward ledger belong to the profile. Inventories,
// season progress, intro and character reservations belong to one World server.
const shared=new Set(['world_sessions','world_handoffs','world_servers','world_server_leases']);
const extra=new Set(['economy_inventory','game_runs','simulator_preferences','arcade_runs','arcade_access','moderation_actions']);
export const SERVER_TABLES=Object.freeze([...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(m=>m[1]).filter(name=>name.startsWith('world_')&&!shared.has(name)||extra.has(name)));
export async function serverDatabase(base,id,{leaseOwner}={}){
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))throw Error('Identificador de servidor inválido.');
 const prefix='wr_'+BigInt('0x'+id.replaceAll('-','')).toString(36)+'_',names=new Map(SERVER_TABLES.map(name=>[name,(base.kind==='postgres'?'xpedition.':'')+prefix+name]));
 const statements=schema.split(';').map(s=>s.trim()).filter(Boolean).filter(s=>{
  const table=/^CREATE TABLE IF NOT EXISTS (\w+)/.exec(s);if(table)return names.has(table[1]);
  const index=/^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+) ON (\w+)/.exec(s);
  if(index&&names.has(index[2])){names.set(index[1],prefix+index[1]);return true;}return false;
 });
 const pattern=new RegExp("'(?:''|[^'])*'|\\b(?:"+[...names.keys()].join('|')+")\\b",'g');
 const rewrite=sql=>sql.replace(pattern,token=>token.startsWith("'")?token:names.get(token));
 const fencing=new AsyncLocalStorage();
 async function fence(){if(!leaseOwner)return;const row=await base.one('SELECT owner,expires FROM world_server_leases WHERE server_id=?'+(base.kind==='postgres'?' FOR UPDATE':''),id);if(row?.owner!==leaseOwner||Number(row.expires)<=Date.now())throw Object.assign(Error('El servidor se está recuperando. Vuelve a entrar.'),{status:409});}
 await base.transaction(async()=>{
  await fence();
  const ddl=statements.map(sql=>rewrite(base.kind==='postgres'?sql.replace(/\bINTEGER\b/g,'BIGINT'):sql));
  if(base.kind==='postgres')for(const table of SERVER_TABLES){const name=names.get(table);ddl.push('ALTER TABLE '+name+' ENABLE ROW LEVEL SECURITY','REVOKE ALL ON TABLE '+name+' FROM PUBLIC');}
  // One round trip instead of hundreds during a room restart on hosted Postgres.
  if(base.exec)await base.exec(ddl.join(';')+';');else for(const sql of ddl)await base.run(sql);
 });
 const transaction=fn=>base.transaction(async()=>{await fence();return fencing.run(true,fn);});
 async function run(sql,...args){if(leaseOwner&&!fencing.getStore()&&/^\s*(?:INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE)/i.test(sql))return transaction(()=>base.run(rewrite(sql),...args));return base.run(rewrite(sql),...args);}
 return {kind:base.kind,serverId:id,one:(sql,...args)=>base.one(rewrite(sql),...args),all:(sql,...args)=>base.all(rewrite(sql),...args),run,transaction,close:()=>base.close()};
}
