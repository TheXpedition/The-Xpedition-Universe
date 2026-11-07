import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';
import {createProtocolRemoteProxy} from '../protocol-remote-proxy.mjs';

const STAFF='92354719-8816-4e25-9199-0dc9a99f7da1';
const secret='a-unique-shared-test-secret-that-is-at-least-thirty-two-characters';
const until=async(fn,ms=9000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,45));}assert.fail('Dedicated protocol bridge did not satisfy condition');};

test('separate HTTP/WebSocket ceremony engine owns one 18-cast episode and preserves World sockets, stats and authority', {timeout:70000},async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'protocol-dedicated-'));
 const db=await openDatabase(folder),now=Date.now();
 let dedicated,proxy,gateway;
 const connections=new Map(),outbound=[];
 const send=(c,data)=>outbound.push({userId:c.user.id,...data});
 const ws={readyState:1};
 const staff={user:{id:STAFF,name:'STAFF'},characterId:'maria-villegas',direct:true,ws,zone:{id:'base'},p:{x:200,y:100},vitals:{health:100,hunger:100,energy:100,sleep:100,stress:0}};
 connections.set(ws,staff);
 try{
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',STAFF,'STAFF','staff-test-dedicated','staff-dedicated@example.invalid','Maria',now);
  await db.run('INSERT INTO world_preferences(user_id,character_id,updated) VALUES(?,?,?)',STAFF,'maria-villegas',now);
  dedicated=await startProtocolDedicatedServer({host:'127.0.0.1',port:0,database:db,secret,engineWorker:'false'});
  const root='http://127.0.0.1:'+dedicated.port;
  assert.equal((await (await fetch(root+'/api/health')).json()).service,'x-protocol-dedicated');
  assert.equal((await fetch(root+'/api/world/x-protocol/start-plan')).status,403,'direct browser calls cannot bypass World authentication');
  proxy=createProtocolRemoteProxy({db,clients:connections,send,can:async()=>true,serviceURL:root,secret,scope:'',beforeStart:async()=>{}});
  await proxy.attach(staff);
  await until(async()=>{const r=await dedicated.rooms.get('');return r?.members?.has(STAFF)===true;});
  gateway=http.createServer(async(req,res)=>{
   try{
    const u=new URL(req.url,'http://gateway.invalid');
    const actor=staff.user;
    const body=async request=>{let raw='';for await(const part of request)raw+=part;return JSON.parse(raw||'{}');};
    if(await proxy.handleHttp(req,res,u,actor,{body,json:(response,value)=>response.end(JSON.stringify(value))}))return;
    res.writeHead(404);res.end();
   }catch(e){res.writeHead(e.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
  });
  await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+gateway.address().port;
  const plan=await (await fetch(url+'/api/world/x-protocol/start-plan')).json();
  assert.equal(plan.expected,18);
  assert.equal(plan.connected,0);
  const begin=await fetch(url+'/api/world/x-protocol/start-live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fillBots:true})});
  const started=await begin.json();
  assert.equal(begin.status,200,JSON.stringify(started));
  await until(()=>outbound.some(x=>x.type==='protocol-start'&&x.userId===STAFF));
  await until(()=>proxy.phase()==='ELIMINATION_LOADING');
  assert.equal(proxy.enrolled(STAFF),true);
  const current=await db.one('SELECT state FROM world_environment WHERE id=?','x-protocol');
  assert.equal(JSON.parse(current.state).roster.length,18);
  assert.equal(ws.readyState,1,'the World browser socket remains connected without changes');
  await proxy.handle(staff,{type:'protocol-subscribe'});
  await until(()=>outbound.some(x=>x.type==='protocol-state'&&x.episode?.id===started.ceremonyId));
  const state=outbound.filter(x=>x.type==='protocol-state').at(-1);
  assert.equal(state.episode.roster.length,18);
  assert.equal(state.episode.staff,true);
  const perf=await fetch(url+'/api/world/x-protocol/performance');
  assert.equal(perf.status,200);
  assert.equal((await perf.json()).statsPreserved,true);
  const cancel=await fetch(url+'/api/world/x-protocol/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'cancel',ceremonyId:started.ceremonyId})});
  assert.equal(cancel.status,200);
  await until(()=>outbound.some(x=>x.type==='protocol-return'));
  await until(()=>proxy.phase()==='ELIMINATION_FINISHED');
 }finally{
  await proxy?.close();
  await new Promise(resolve=>gateway?gateway.close(resolve):resolve());
  await dedicated?.close();
  await db.close();
  await fs.rm(folder,{recursive:true,force:true});
 }
});
