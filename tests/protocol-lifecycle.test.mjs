import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createProtocolService} from '../world-protocol-service.mjs';
import {protocolResults} from '../world-protocol-results.mjs';
import {createEpisode} from '../public/juegos/last-grip/engine.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';
import {WORLD_CHARACTERS} from '../public/juegos/world-characters.mjs';

test('finished Last Grip results survive duplicate ceremony starts, cancellation, reopening and result selection',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'protocol-lifecycle-')),db=await openDatabase(folder),staffId='92354719-8816-4e25-9199-0dc9a99f7da1';
 let time=Date.now(),service,starts=0;const messages=[];
 const staff={user:{id:staffId,name:'Staff'},characterId:'maria-villegas',direct:true,vitals:{health:100,hunger:100,energy:100,sleep:100,stress:0},zone:{id:'base'},p:{x:600,y:700},ws:{readyState:1}};
 const clients=new Map([['staff',staff]]),action=input=>service.handle(staff,{type:'protocol-action',action:input});
 const control=async(input,user=staff.user)=>{const res={};await service.handleHttp({method:'POST'},res,new URL('http://test/api/world/x-protocol/control'),user,{body:async()=>input,json:(_res,data)=>{res.data=data;}});return res.data;};
 const current=async()=>JSON.parse((await db.one('SELECT state FROM world_environment WHERE id=?','x-protocol')).state);
 const make=()=>createProtocolService({db,clients,send:(_c,value)=>messages.push(value),can:async user=>user.id===staffId,now:()=>time,beforeStart:async()=>{starts++;}});
 try{
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',staffId,'Staff','staff','staff@example.invalid','Dani',time);
  await db.run('INSERT INTO world_preferences(user_id,character_id,updated) VALUES(?,?,?)',staffId,'maria-villegas',time);
  const grip=createEpisode({id:'completed-real-challenge',now:time-1000});grip.phase='finished';grip.roster=SHELTER_PARTICIPANTS.map(characterId=>({id:'grip:'+characterId,characterId,name:WORLD_CHARACTERS.find(p=>p.id===characterId).name,bot:true}));grip.winner='grip:joseserna';grip.completedId=grip.id;grip.completedAt=time-1000;grip.qualifiers=[grip.winner,...grip.roster.filter(p=>p.id!==grip.winner).slice(0,5).map(p=>p.id)];grip.round={final:true,members:grip.qualifiers,duration:120,effort:120,falls:grip.qualifiers.slice(1).map((id,i)=>({id,seconds:110-i*10}))};
  await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?)','last-grip',JSON.stringify(grip),time);
  service=make();await service.ready;await service.handle(staff,{type:'protocol-subscribe'});
  await action({type:'open'});const id=(await current()).id;await action({type:'open'});assert.equal((await current()).id,id);
  await action({type:'fillBots'});await action({type:'start',ceremonyId:id,expectedPhase:'LOBBY'});await action({type:'start',ceremonyId:id,expectedPhase:'LOBBY'});
  assert.equal(starts,1);assert.equal(service.phase(),'ELIMINATION_LOADING');assert.equal((await current()).events.filter(e=>e.phase==='ELIMINATION_LOADING').length,1);
  await assert.rejects(action({type:'cancel',ceremonyId:'previous-ceremony'}),/ceremonia anterior/);
  await assert.rejects(control({type:'cancel'},{id:'outsider'}),/Solo Dirección/);await control({type:'pause'});await control({type:'pause'});await control({type:'resume'});await control({type:'resume'});await control({type:'pause'});clients.clear();await control({type:'cancel',ceremonyId:id,expectedPhase:'RESULTS_SELECTION'});clients.set('staff',staff);const returned=await current();await action({type:'cancel',ceremonyId:id});assert.equal((await current()).phaseAt,returned.phaseAt);
  for(let i=0;i<10&&service.phase()!=='ELIMINATION_FINISHED';i++){time+=1000;await new Promise(resolve=>setTimeout(resolve,70));}
  assert.equal(service.phase(),'ELIMINATION_FINISHED');await assert.rejects(action({type:'start'}),/resultado del reto sigue guardado/);
  const sources=await protocolResults(db,time);assert.equal(sources.length,1);assert.equal(sources[0].ranking.length,18);assert.equal(sources[0].ranking[0].characterId,'joseserna');
  await action({type:'open'});const fresh=await current();assert.notEqual(fresh.id,id);await action({type:'fillBots'});await service.close();service=null;
  const selection=await current();selection.phase='RESULTS_SELECTION';selection.phaseAt=selection.clock;await db.run('UPDATE world_environment SET state=? WHERE id=?',JSON.stringify(selection),'x-protocol');
  service=make();await service.ready;await service.handle(staff,{type:'protocol-subscribe'});await action({type:'resume'});await action({type:'results',sourceId:sources[0].id});await action({type:'results',sourceId:sources[0].id});
  const revealed=await current();assert.equal(revealed.source.name,'The Last Grip');assert.equal(revealed.roster.find(p=>p.id===revealed.winner).characterId,'joseserna');assert.notEqual(revealed.winner,grip.winner);assert.equal(revealed.ranking.length,18);assert.equal(revealed.phase,'RESULTS_REVEAL');assert.equal((await protocolResults(db,time))[0].challengeId,grip.id);
  await service.close();service=null;const waiting=await current();waiting.phase='INTRO_VIDEO';waiting.phaseAt=waiting.clock;waiting.at=time;waiting.speech=null;await db.run('UPDATE world_environment SET state=? WHERE id=?',JSON.stringify(waiting),'x-protocol');
  await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated','x-protocol-media',JSON.stringify({intro:{url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',duration:120},eliminations:{}}),time);
  service=make();await service.ready;await service.handle(staff,{type:'protocol-subscribe'});await service.handle(staff,{type:'protocol-viewer',visible:true});await action({type:'resume'});
  const videoKey=messages.filter(m=>m.type==='protocol-state').at(-1).episode.cinematic.key;
  await service.handle(staff,{type:'protocol-media-failed',key:videoKey});
  for(let i=0;i<4;i++){time+=1000;await new Promise(resolve=>setTimeout(resolve,70));}
  assert.equal(service.phase(),'INTRO_VIDEO','a playback failure cannot skip the intro');
  await service.handle(staff,{type:'protocol-media-ended',key:videoKey});time+=1000;await new Promise(resolve=>setTimeout(resolve,80));assert.equal(service.phase(),'CEREMONY_STAGE_VISIBLE');
 }finally{if(service)await service.close();await db.close();assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(folder,{recursive:true,force:true});}
});
