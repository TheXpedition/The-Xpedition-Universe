import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createProtocolService} from '../world-protocol-service.mjs';
import {createProtocol,applyProtocol,tickProtocol,protocolView} from '../public/juegos/x-protocol/engine.mjs';
import {EntryResources,prepareEntryResourcesForPlayback} from '../public/juegos/x-protocol/entry-loading.mjs';
import {createProtocolMedia} from '../world-protocol-media.mjs';
import {mapProtocolRanking} from '../world-protocol-results.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

test('all viewers finishing the intro releases the ceremony even if server clock was held for buffering',()=>{
 const state=createProtocol({now:0});
 state.media.intro={url:'/intro.mp4',duration:15070};
 state.phase='INTRO_VIDEO';state.phaseAt=0;state.clock=3000;state.at=3000;
 tickProtocol(state,3050);
 assert.equal(state.phase,'INTRO_VIDEO');
 tickProtocol(state,3100,{introComplete:true});
 assert.equal(state.phase,'CEREMONY_STAGE_VISIBLE');
});

test('staff start waits for viewer assets; recovered legacy loading has a bounded fallback',()=>{
 const s=createProtocol({now:0});s.roster=SHELTER_PARTICIPANTS.slice(0,5).map((characterId,i)=>({id:'p'+i,characterId,bot:i===0,connected:true,assetsReady:false}));s.phase='LOBBY';
 s.media.intro={url:'/intro.mp4',duration:15000};
 assert.equal(protocolView(s).entryMedia.url,'/intro.mp4');applyProtocol(s,{type:'start'},{staff:true});assert.equal(s.phase,'ELIMINATION_LOADING');
 s.phase='ELIMINATION_LOADING';s.clock=0;s.phaseAt=0;s.at=0;s.visitors=[{id:'viewer',connected:true,assetsReady:false}];
 for(let i=1;i<14;i++){tickProtocol(s,i*50);assert.equal(s.phase,'ELIMINATION_LOADING');}
 for(let time=700;time<=12000;time+=50)tickProtocol(s,time);assert.equal(s.phase,'INTRO_VIDEO');
});

test('out-of-order and failed resource jobs never acknowledge the wrong ceremony or delay the transition',async()=>{
 const deferred=new Map(),loader=new EntryResources(s=>new Promise((resolve,reject)=>deferred.set(s.id,{resolve,reject}))),a={id:'a',roster:[]},b={id:'b',roster:[]};
 const first=loader.prepare(a);await Promise.resolve();const next=loader.prepare(b);await Promise.resolve();
 deferred.get('a').resolve();assert.equal(await first,false);assert.equal(loader.isReady(b),false);
 deferred.get('b').resolve();assert.equal(await next,true);assert.equal(loader.isReady(b),true);assert.equal(loader.isReady(a),false);
 const c={id:'c',roster:[]},failed=loader.prepare(c);await Promise.resolve();deferred.get('c').reject(Error('offline'));assert.equal(await failed,true);assert.equal(loader.isReady(c),true);
 const timed=new EntryResources(()=>new Promise(()=>{}),{timeoutMs:5});assert.equal(await timed.prepare({id:'slow',roster:[]}),true);
});


test('Render ephemeral uploads are detected as missing and bundled intro remains available',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'protocol-media-'));
 try{
  const media=createProtocolMedia({canDirect:async()=>true,dataDir:dir});
  assert.equal(await media.available({url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4'}),true);
  const unavailable={url:'/api/world/x-protocol/media/12345678-1234-1234-1234-123456789abc.mp4'};
  assert.equal(await media.available(unavailable),false);
  const folder=path.join(dir,'protocol-media');
  await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,'12345678-1234-1234-1234-123456789abc.mp4'),'fake-video');
  assert.equal(await media.available(unavailable),true);
  await fs.rm(folder,{recursive:true,force:true});
  assert.equal(await media.available(unavailable),false);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

async function fixture(n=0){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'protocol-entry-')),db=await openDatabase(dir),clients=new Map(),messages=[],prepared=[];let now=1000,svc,busy=false;
 for(const [i,id] of ['staff','viewer',...Array.from({length:n},(_,i)=>'p'+i)].entries()){await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani',now);const characterId=id==='staff'?'maria-villegas':id==='viewer'?'dani':SHELTER_PARTICIPANTS[i-2];clients.set(id,{user:{id,name:id},characterId,direct:id==='staff',zone:{id:'base'},p:{x:500,y:700},vitals:{},ws:{readyState:1}});}
 svc=createProtocolService({db,clients,now:()=>now,send:(c,m)=>messages.push({user:c.user.id,...m}),prepareSpeech:text=>prepared.push(text),can:async u=>u.id==='staff',canParticipate:async u=>u.id.startsWith('p'),beforeStart:async()=>{if(busy)throw Error('reto activo');},autoBots:true});await svc.ready;
 return {db,svc,clients,messages,prepared,setBusy(v){busy=v;},advance:async ms=>{now+=ms;await new Promise(r=>setTimeout(r,80));},current:async()=>JSON.parse((await db.one('SELECT state FROM world_environment WHERE id=?','x-protocol'))?.state||'null'),
 async http(route,input,user='staff'){let value;await svc.handleHttp({method:input===undefined?'GET':'POST'},{},new URL('http://test/api/world/x-protocol/'+route),clients.get(user).user,{body:async()=>input,json:(_,v)=>value=v});return value;},
 async close(){await svc.close();await db.close();assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}};
}

test('staff starts with no humans, confirms bots, summons staff and spectators, and ignores stale or unauthenticated readiness',async()=>{
 const f=await fixture();try{
  assert.deepEqual(await f.http('start-plan'),{active:false,connected:0,expected:18,missing:18});
  await assert.rejects(f.http('start-live',{}),/Confirma/);await assert.rejects(f.http('start-live',{fillBots:false}),/cuatro/);assert.equal(await f.current(),null);
  await assert.rejects(f.http('start-live',{fillBots:true},'viewer'),/Dirección/);
  f.setBusy(true);await assert.rejects(f.http('start-live',{fillBots:true}),/reto activo/);assert.equal(await f.current(),null);f.setBusy(false);
  const start=await f.http('start-live',{fillBots:true}),s=await f.current();assert.equal(s.roster.length,18);assert(s.roster.every(p=>p.bot));assert.equal(s.phase,'ELIMINATION_LOADING');assert.deepEqual(new Set(f.messages.filter(m=>m.type==='protocol-start').map(m=>m.user)),new Set(['staff','viewer']));
  assert.equal(f.prepared.length,2);assert(f.prepared[0].startsWith('Bienvenidos'));assert(f.prepared[1].includes('resultados'));
  assert.equal(f.svc.entry('viewer'),'/juegos/x-protocol/');assert.equal((await f.http('start-live',{fillBots:true})).ceremonyId,start.ceremonyId,'double clicks must not create a second ceremony');
  const staff=f.clients.get('staff'),viewer=f.clients.get('viewer');
  await f.svc.handle(viewer,{type:'protocol-ready',ceremonyId:s.id});assert.equal((await f.current()).visitors.find(p=>p.id==='viewer').assetsReady,false,'the World socket cannot ACK before entering the loading page');
  for(const c of [staff,viewer])await f.svc.handle(c,{type:'protocol-subscribe'});
  await f.svc.handle(viewer,{type:'protocol-ready',ceremonyId:'old'});assert.equal((await f.current()).visitors.find(p=>p.id==='viewer').assetsReady,false);
  await f.svc.handle(staff,{type:'protocol-ready',ceremonyId:s.id,requestId:'request-staff-first'});
  const acknowledgements=()=>f.messages.filter(m=>m.user==='staff'&&m.type==='protocol-ready-ack'&&m.ceremonyId===s.id);
  assert.equal(acknowledgements().length,1,'server must confirm durable readiness to the staff browser');
  assert.equal(acknowledgements()[0].requestId,'request-staff-first');
  assert.equal(acknowledgements()[0].accepted,true);
  const revision=(await f.current()).revision;
  await f.svc.handle(staff,{type:'protocol-ready',ceremonyId:s.id,requestId:'request-staff-first'});
  assert.equal(acknowledgements().length,2,'server must resend an ACK when client retries after a lost response');
  assert.equal((await f.current()).revision,revision,'duplicate readiness cannot mutate ceremony again');
  await f.advance(1000);assert.equal(f.svc.phase(),'ELIMINATION_LOADING','every connected viewer must prepare before the shared intro');
  await f.svc.handle(viewer,{type:'protocol-ready',ceremonyId:s.id});await f.advance(50);assert.equal(f.svc.phase(),'INTRO_VIDEO');
 }finally{await f.close();}
});

test('STAFF can start a full-bot ceremony from World home without opening a World websocket first',async()=>{
 const f=await fixture();
 try{
  const staff=f.clients.get('staff');
  f.clients.delete('staff'); // World's home menu is an HTTP page, not a live socket.
  assert.deepEqual(await f.http('start-plan',undefined,'viewer').catch(error=>({error:error.message})),{error:'Solo Dirección inicia la ceremonia.'});
  f.clients.delete('viewer');
  let started=null;
  const post=async input=>{
   let result;
   await f.svc.handleHttp({method:'POST'},{},new URL('http://test/api/world/x-protocol/start-live'),staff.user,{body:async()=>input,json:(_,value)=>{result=value;}});
   return result;
  };
  started=await post({fillBots:true});
  const current=await f.current();
  assert.equal(current.phase,'ELIMINATION_LOADING');
  assert.equal(current.roster.length,18);
  assert.equal(current.roster.every(p=>p.bot),true);
  assert.equal(current.host,'staff');
  assert(current.visitors.some(p=>p.id==='staff'),'director must be in the live audience after joining');
  assert(current.loadingViewers.includes('staff'),'director must be counted in the shared entry barrier');
  assert.equal(f.svc.entry('staff'),'/juegos/x-protocol/','director can navigate to the ceremony page without a previous socket');
  assert.equal((await post({fillBots:true})).ceremonyId,started.ceremonyId,'repeat click must not create another ceremony');
  f.clients.set('staff',staff);
  await f.svc.handle(staff,{type:'protocol-subscribe'});
  await f.svc.handle(staff,{type:'protocol-ready',ceremonyId:started.ceremonyId});
  await f.advance(50);
  assert.equal(f.svc.phase(),'INTRO_VIDEO','the first real director socket must join and begin the intro');
 }finally{await f.close();}
});

test('dedicated engine telemetry is STAFF-only and preserves the published participant statistics',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(f.http('performance',undefined,'viewer'),/Dirección/);
  const data=await f.http('performance');
  assert.equal(data.engine.workerRequested,false);
  assert.equal(data.engine.workerActive,false);
  assert.equal(data.engine.ticks>=0,true);
  assert.equal(data.statsPreserved,true);
  assert.equal(data.phase,'CLOSED');
  assert.equal(data.cast,0);
 }finally{await f.close();}
});

test('staff can open, fill, start and recover the same ceremony through HTTP when the socket disconnects',async()=>{
 const f=await fixture();
 try{
  await assert.rejects(f.http('control',{type:'open'},'viewer'),/Solo Dirección/);
  const opened=await f.http('control',{type:'open'});
  assert.equal(opened.episode.phase,'LOBBY');
  assert.equal((await f.http('control',{type:'fillBots',ceremonyId:opened.episode.id})).episode.roster.length,18);
  const started=await f.http('control',{type:'start',ceremonyId:opened.episode.id});
  assert.equal(started.episode.phase,'ELIMINATION_LOADING');
  const paused=await f.http('control',{type:'pause',ceremonyId:opened.episode.id});
  assert.equal(paused.episode.paused,true);
  const resumed=await f.http('control',{type:'resume',ceremonyId:opened.episode.id});
  assert.equal(resumed.episode.paused,false);
  await f.http('control',{type:'cancel',ceremonyId:opened.episode.id});
  assert.equal((await f.current()).cancelled,true);
 }finally{await f.close();}
});

test('declining bots preserves exactly the real connected roster even on an auto-bots server',async()=>{
 const f=await fixture(4);try{assert.equal((await f.http('start-plan')).missing,14);const start=await f.http('start-live',{fillBots:false}),s=await f.current();assert.equal(s.id,start.ceremonyId);assert.equal(s.roster.length,4);assert(s.roster.every(p=>!p.bot));assert.equal(s.allowedCharacters.length,4);assert.equal(f.messages.filter(m=>m.type==='protocol-start').length,6);
  assert.throws(()=>mapProtocolRanking({ranking:[{characterId:'peggy'},...s.roster]},s.roster),/ganador/,'a reduced cast cannot inherit a missing winner’s victory');
 }finally{await f.close();}
});

test('World-to-ceremony navigation does not pause the loading barrier; a genuine host disconnection recovers on return',async()=>{
 const f=await fixture();try{await f.http('start-live',{fillBots:true});const host=f.clients.get('staff');f.clients.delete('staff');await f.advance(100);await f.advance(5000);assert.equal((await f.current()).paused,false,'brief page navigation is not a staff pause');await f.advance(10001);assert.equal((await f.current()).paused,true);f.clients.set('staff',host);await f.svc.handle(host,{type:'protocol-subscribe'});await f.advance(1100);assert.equal((await f.current()).paused,false,'reconnected staff automatically recovers the disconnection pause');
  await f.svc.handle(host,{type:'protocol-action',action:{type:'pause'}});await f.advance(100);assert.equal((await f.current()).paused,true,'an intentional staff pause remains intentional');
 }finally{await f.close();}
});

test('the intro waits for playable video, while stage artwork loads in parallel',async()=>{
 let finishArtwork,artworkFinished=false;
 const ready=prepareEntryResourcesForPlayback({artwork:()=>new Promise(resolve=>{finishArtwork=()=>{artworkFinished=true;resolve();};}),media:async()=>{},fonts:Promise.resolve()});
 await ready;assert.equal(artworkFinished,false,'large cast images must not hold the video behind the 0/1 barrier');
 finishArtwork();await new Promise(resolve=>setImmediate(resolve));assert.equal(artworkFinished,true);
});
