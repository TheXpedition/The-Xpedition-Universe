import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';import {councilSeat} from '../public/juegos/council-layout.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-council-')),staff='92354719-8816-4e25-9199-0dc9a99f7da1',users=['council-a','council-b'];let child,base;const peers=[];
after(async()=>{peers.forEach(p=>p.s.close());if(child&&!child.killed)await new Promise(r=>{child.once('exit',r);child.kill();});});
const digest=s=>createHash('sha256').update(s).digest('hex');
async function until(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const r=fn();if(r)return r;await new Promise(r=>setTimeout(r,35));}throw Error('Council action did not complete');}
const latest=(peer,id)=>peer.messages.flatMap(m=>m.players||[]).filter(p=>p.userId===id).at(-1);
async function connect(id){await claimFixtureCharacter(base,id,{[users[0]]:'bruno',[users[1]]:'guillermo'}[id]);return new Promise((resolve,reject)=>{const peer={s:new WebSocket(base.replace('http:','ws:')+'/api/world/live?zone=eliminacion',{headers:{Origin:base,Cookie:'xp_world_session='+id}}),messages:[]};peers.push(peer);peer.s.on('error',reject);peer.s.on('message',r=>{const m=JSON.parse(r);peer.messages.push(m);if(m.type==='welcome')resolve(peer);});});}
test('real clients select exact left and right seats, reject an occupied slot, change chairs and stand in the aisle',async()=>{
 const db=await openDatabase(dir),start=councilSeat(2).stand;
 for(const [i,id]of [staff,...users].entries()){await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','',Date.now());await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',digest(id),id,Date.now()+3600000);await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',digest(id),digest(id),id,Date.now()+3600000);await db.run('INSERT INTO world_preferences(user_id,character_id,favorites,visited,last_zone,x,y,diary,updated) VALUES(?,?,?,?,?,?,?,?,?)',id,'dani','[]','["eliminacion"]','eliminacion',start.x+i*15,start.y+20,'',Date.now());}
 await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,?,?,?)','world',1,staff,Date.now());await db.close();
 child=spawn(process.execPath,[root+'/world-server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',PERSISTENCE_MODE:'local',DATA_DIR:dir,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{let out='',err='';const timer=setTimeout(()=>reject(Error(err||'Server did not start')),15000);child.stderr.on('data',d=>err+=d);child.stdout.on('data',d=>{out+=d;const m=out.match(/localhost:(\d+)/);if(m){base='http://127.0.0.1:'+m[1];clearTimeout(timer);resolve();}});});
 const [a,b]=await Promise.all(users.map(connect)),send=(p,m)=>p.s.send(JSON.stringify(m));
 send(a,{type:'interact',objectId:'seating-left',slot:1});await until(()=>latest(a,users[0])?.seatSlot===1);assert.equal(latest(a,users[0]).facing,1);
 send(b,{type:'interact',objectId:'seating-left',slot:1});await until(()=>b.messages.some(m=>m.type==='error'&&/ocupado/.test(m.message)));
 send(b,{type:'interact',objectId:'seating-right',slot:2});await until(()=>latest(b,users[1])?.seatId==='seating-right'&&latest(b,users[1])?.seatSlot===2,16000);assert.equal(latest(b,users[1]).facing,-1);
 send(a,{type:'interact',objectId:'seating-left',slot:2});await until(()=>latest(a,users[0])?.seatSlot===2);assert.equal(latest(a,users[0]).state,'sit');
 send(a,{type:'stand'});await until(()=>!latest(a,users[0])?.seatId&&latest(a,users[0])?.state==='idle');const p=latest(a,users[0]),stand=councilSeat(4).stand;assert(Math.hypot(p.x-stand.x,p.y-stand.y)<2);
});
