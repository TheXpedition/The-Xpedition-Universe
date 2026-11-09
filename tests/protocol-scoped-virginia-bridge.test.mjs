import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';

const secret='world-scope-bridge-test-secret-with-32-chars';
const scope='3e5bfaf1-856d-4456-ad80-02c950a0d89d';

test('Virginia initializes and accepts the scoped World server used by ceremony history', {timeout:60000},async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'protocol-scoped-'));
 let db,server,ws;
 try{
  db=await openDatabase(folder);
  // A scoped ceremony may only be started for an existing World room.
  const owner='123e4567-e89b-12d3-a456-426614174000';
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',owner,'Owner','owner','owner@example.invalid','Dani',1);
  await db.run('INSERT INTO world_servers(id,name,creator,enabled,settings,created,updated) VALUES(?,?,?,1,?,?,?)',scope,'Scoped Virginia test',owner,JSON.stringify({autoBots:true}),Date.now(),Date.now());
  server=await startProtocolDedicatedServer({port:0,host:'127.0.0.1',database:db,secret});
  const root='http://127.0.0.1:'+server.port;
  const response=await fetch(root+'/bridge/status',{headers:{'x-protocol-bridge-secret':secret,'x-protocol-scope':scope},signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,200,await response.text().catch(()=>'')); 
  // Query again because status was read for the assertion message only on failure.
  const state=await (await fetch(root+'/bridge/status',{headers:{'x-protocol-bridge-secret':secret,'x-protocol-scope':scope}})).json();
  assert.equal(state.phase,'CLOSED');
  ws=new WebSocket('ws://127.0.0.1:'+server.port+'/bridge/live?scope='+scope,{headers:{'x-protocol-bridge-secret':secret},handshakeTimeout:20000});
  const packet=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Scoped WebSocket did not deliver status')),20000);
   ws.once('message',raw=>{clearTimeout(timeout);resolve(JSON.parse(String(raw)));});
   ws.once('error',error=>{clearTimeout(timeout);reject(error);});
  });
  assert.equal(packet.type,'status');assert.equal(packet.state.phase,'CLOSED');
 }finally{ws?.terminate();await server?.close();await db?.close();await fs.rm(folder,{recursive:true,force:true});}
});
