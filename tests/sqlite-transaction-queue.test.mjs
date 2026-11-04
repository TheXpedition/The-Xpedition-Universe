import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {openDatabase} from '../database.mjs';
test('a failed SQLite transaction start releases its queue so session reads can continue',async()=>{
 const dir=fs.mkdtempSync(path.join(import.meta.dirname,'../review/.sqlite-queue-')),a=await openDatabase(dir),b=await openDatabase(dir);await b.run('PRAGMA busy_timeout=20');let release,started;const gate=new Promise(r=>release=r),begun=new Promise(r=>started=r),hold=a.transaction(async()=>{started();await gate;});await begun;
 try{await assert.rejects(b.transaction(async()=>{}),/locked|busy/i);release();await hold;const value=await Promise.race([b.one('SELECT 1 AS ok'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Queue stayed blocked after BEGIN failed')),400))]);assert.equal(value.ok,1);await b.transaction(()=>b.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','queue-recovered','{}',1));assert.equal((await b.one('SELECT state FROM world_environment WHERE id=?','queue-recovered')).state,'{}');}
 finally{release();await hold;await a.close();await b.close();}
});
