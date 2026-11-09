import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';
import {serverTablePrefix} from '../world-server-store.mjs';

test('deleted World rooms are refused without recreating their purged database tables or starting protocol ticks',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-room-gone-'));
 const db=await openDatabase(dir);
 const secret='world-entry-recovery-dedicated-key-12345';
 let service;
 const scope='41e30919-8a2b-4b26-bde1-74988b121edf';
 try {
  service=await startProtocolDedicatedServer({host:'127.0.0.1',port:0,database:db,secret});
  const res=await fetch('http://127.0.0.1:'+service.port+'/bridge/status',{headers:{'x-protocol-bridge-secret':secret,'x-protocol-scope':scope}});
  assert.equal(res.status,410);
  assert.match((await res.json()).error,/eliminada/);
  assert.equal(service.rooms.size,0);
  const name=serverTablePrefix(scope)+'world_shop_items';
  const table=await db.one("SELECT name FROM sqlite_master WHERE type='table' AND name=?",name);
  assert.equal(table,undefined,'Deleted room must not have its tables recreated by stale ceremony requests');
  const health=await fetch('http://127.0.0.1:'+service.port+'/api/health');
  assert.equal(health.status,200,'Other World rooms and the protocol engine remain healthy');
 } finally {if(service)await service.close();await db.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('World memory admission reserves emergency headroom without prematurely rejecting room entry',async()=>{
 const hub=await fs.readFile(new URL('../world-hub.mjs',import.meta.url),'utf8');
 assert.match(hub,/process\.availableMemory\(\)<64\*1024\*1024/);
 assert.match(hub,/reclaimIdleWorlds/);
 assert.match(hub,/World memory admission rejected:/);
});
