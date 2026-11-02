import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {openDatabase} from '../database.mjs';import {createWorldServers} from '../world-servers.mjs';
test('only staff can remove a confirmed server; it disappears from entry and can be restored with its saved data',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-archive-')),db=await openDatabase(dir),staff={id:'92354719-8816-4e25-9199-0dc9a99f7da1'},guest={id:'participant'};
 try{for(const user of [staff,guest])await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',user.id,user.id,user.id,user.id+'@example.invalid','Dani',1);await db.run('INSERT INTO casting_entries(season,user_id,direct_slot) VALUES(?,?,?)','apocalypse-ii',guest.id,1);
  const servers=createWorldServers({db,json:(res,value,status=200)=>Object.assign(res,{value,status}),fail:(status,message)=>{throw Object.assign(Error(message),{status});},body:async req=>req.input||{},access:async()=>({canPlay:true,configured:true,inline:true,publicEnabled:true}),now:()=>1000});
  const call=async(method,url,input,user=staff)=>{const res={};await servers.handle({method,input},res,new URL(url,'https://world.invalid'),user);return res.value;};
  const {server}=await call('POST','/api/world/servers',{name:'QA archive',autoBots:true});await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','archive-test-saved','{"kept":true}',1);
  await assert.rejects(call('DELETE','/api/world/servers/'+server.id,{confirm:true},guest),{status:403});await assert.rejects(call('DELETE','/api/world/servers/'+server.id,{}),{status:409});
  await call('DELETE','/api/world/servers/'+server.id,{confirm:true});assert.equal((await call('GET','/api/world/servers')).servers.length,0);await assert.rejects(servers.enter(staff,server.id),{status:404});await assert.rejects(servers.enter(guest,server.id),{status:404});
  assert.equal((await call('GET','/api/world/servers?archived=1')).servers[0].archived,true);assert.equal((await call('GET','/api/world/servers?archived=1',undefined,guest)).servers.length,0);
  await call('PATCH','/api/world/servers/'+server.id,{restore:true});const restored=await servers.get(server.id);assert.equal(restored.archived,false);assert.equal(restored.enabled,false);assert.equal(restored.autoBots,true);assert.equal((await db.one('SELECT state FROM world_environment WHERE id=?','archive-test-saved')).state,'{"kept":true}');
 }finally{await db.close();await fs.rm(dir,{recursive:true,force:true});}
});
