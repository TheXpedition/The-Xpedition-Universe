import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createWorldServers} from '../world-servers.mjs';
import {serverDatabase,serverTablePrefix} from '../world-server-store.mjs';

const STAFF={id:'92354719-8816-4e25-9199-0dc9a99f7da1'};
const GUEST={id:'participant'};
const makeService=(db,onDelete=async()=>{})=>createWorldServers({
 db,json:(res,value,status=200)=>Object.assign(res,{value,status}),
 fail:(status,message)=>{throw Object.assign(Error(message),{status});},
 body:async req=>req.input||{},
 access:async()=>({canPlay:true,configured:true,inline:true,publicEnabled:true}),
 onDelete,now:()=>1000
});
const call=(servers,method,url,input,user=STAFF)=>servers.handle({method,input},{},new URL(url,'https://world.invalid'),user)
 .then(()=>servers._lastResult);

test('permanent deletion removes only the confirmed room, leaves other room data and account balances intact, never restores',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-delete-')),db=await openDatabase(dir),stopped=[];
 try{
  for(const user of [STAFF,GUEST])await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',user.id,user.id,user.id,user.id+'@example.invalid','Dani',1);
  await db.run('INSERT INTO casting_entries(season,user_id,direct_slot) VALUES(?,?,?)','apocalypse-ii',GUEST.id,1);
  await db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,?,?,?)',GUEST.id,12345,500,2);
  const servers=createWorldServers({db,json:(res,value,status=200)=>Object.assign(res,{value,status}),fail:(status,message)=>{throw Object.assign(Error(message),{status});},body:async req=>req.input||{},access:async()=>({canPlay:true,configured:true,inline:true,publicEnabled:true}),now:()=>1000,onDelete:async id=>stopped.push(id)});
  const query=async(method,url,input,user=STAFF)=>{const res={};await servers.handle({method,input},res,new URL(url,'https://world.invalid'),user);return res.value;};
  const first=(await query('POST','/api/world/servers',{name:'Temporada a borrar',autoBots:true})).server;
  const second=(await query('POST','/api/world/servers',{name:'Temporada intacta',autoBots:false})).server;
  const scopedA=await serverDatabase(db,first.id),scopedB=await serverDatabase(db,second.id);
  await scopedA.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','saved','{"from":"A"}',1);
  await scopedB.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','saved','{"from":"B"}',1);
  await assert.rejects(query('DELETE','/api/world/servers/'+first.id,{confirm:true},GUEST),{status:403});
  await assert.rejects(query('DELETE','/api/world/servers/'+first.id,{}),{status:409});
  const deleted=await query('DELETE','/api/world/servers/'+first.id,{confirm:true});
  assert.equal(deleted.deleted,true);assert.deepEqual(stopped,[first.id]);
  assert.equal(await db.one('SELECT id FROM world_servers WHERE id=?',first.id),undefined);
  assert.equal(await db.one('SELECT name FROM sqlite_master WHERE type=? AND name=?','table',serverTablePrefix(first.id)+'world_environment'),undefined);
  assert.equal((await scopedB.one('SELECT state FROM world_environment WHERE id=?','saved')).state,'{"from":"B"}');
  assert.equal((await db.one('SELECT coins FROM user_progression WHERE user_id=?',GUEST.id)).coins,12345);
  assert.equal((await query('GET','/api/world/servers')).servers.length,1);
  assert.equal((await query('GET','/api/world/servers?archived=1')).servers.length,0);
  await assert.rejects(query('PATCH','/api/world/servers/'+first.id,{restore:true}),{status:404});
  await assert.rejects(servers.enter(GUEST,first.id),{status:404});
  assert((await query('GET','/api/world/servers')).servers.some(x=>x.id===second.id));
  const history=await db.one('SELECT action FROM moderation_actions WHERE subject=?',first.id);
  assert.equal(history.action,'world-server:delete');
 }finally{await db.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('an unsuccessful room shutdown leaves the original room and all its saved data playable',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-delete-fail-')),db=await openDatabase(dir);
 try{
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',STAFF.id,STAFF.id,STAFF.id,'staff@example.invalid','Dani',1);
  const servers=createWorldServers({db,json:(res,value,status=200)=>Object.assign(res,{value,status}),fail:(status,message)=>{throw Object.assign(Error(message),{status});},body:async req=>req.input||{},access:async()=>({canPlay:true,configured:true,inline:true,publicEnabled:true}),now:()=>1000,onDelete:async()=>{throw Error('Worker refused to stop');}});
  const query=async(method,url,input)=>{const res={};await servers.handle({method,input},res,new URL(url,'https://world.invalid'),STAFF);return res.value;};
  const first=(await query('POST','/api/world/servers',{name:'Temporada protegida'})).server;
  const scoped=await serverDatabase(db,first.id);
  await scoped.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','persist','{"kept":true}',1);
  await assert.rejects(query('DELETE','/api/world/servers/'+first.id,{confirm:true}),/Worker refused to stop/);
  assert.equal((await servers.get(first.id)).enabled,true);
  assert.equal((await scoped.one('SELECT state FROM world_environment WHERE id=?','persist')).state,'{"kept":true}');
 }finally{await db.close();await fs.rm(dir,{recursive:true,force:true});}
});
