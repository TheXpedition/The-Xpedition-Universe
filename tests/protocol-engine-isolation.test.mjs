import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createProtocol,applyProtocol} from '../public/juegos/x-protocol/engine.mjs';
import {createProtocolEngineRuntime} from '../protocol-engine-runtime.mjs';

function state(){
 const s=createProtocol({id:'isolation-episode',now:0});
 s.phase='INTRO_VIDEO';s.media.intro={url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',duration:15070};
 s.phaseAt=0;s.clock=3000;s.at=3000;
 s.roster=[{id:'player-1',characterId:'dani',name:'Dani',bot:false,connected:true,assetsReady:true,score:64},
           {id:'player-2',characterId:'bruno',name:'Bruno',bot:false,connected:true,assetsReady:true,score:45}];
 s.source={id:'challenge-123',name:'The Last Grip',episode:1};
 s.ranking=[{id:'player-1',place:1,score:64},{id:'player-2',place:2,score:45}];
 s.secret.advInventory=[{id:'adv-1',owner:'player-1',ref:'extra_votes'}];
 s.events.push({phase:'PERFORMANCE_RECORDED',clock:2999});
 s.effects={elimination:false,bets:false,inventory:false};
 return s;
}

test('isolated worker and original inline engine agree on cinematic phase, score, inventory, stats, and final transition',async()=>{
 const inline=createProtocolEngineRuntime({enabled:false});
 const isolated=createProtocolEngineRuntime({enabled:true,timeoutMs:5000});
 try{
  const original=state();
  const [local,remote]=await Promise.all([inline.tick(original,3100,{introComplete:false}),isolated.tick(original,3100,{introComplete:false})]);
  assert.deepEqual(remote,local,'isolating calculations must not alter gameplay or player statistics');
  assert.deepEqual(original,state(),'original server state must stay immutable during tick');
  const [localEnd,remoteEnd]=await Promise.all([inline.tick(local,3150,{introComplete:true}),isolated.tick(remote,3150,{introComplete:true})]);
  assert.deepEqual(remoteEnd,localEnd,'completed video must produce the same synchronized stage');
  assert.equal(remoteEnd.phase,'CEREMONY_STAGE_VISIBLE');
  assert.deepEqual(remoteEnd.ranking,state().ranking);
  assert.deepEqual(remoteEnd.secret.advInventory,state().secret.advInventory);
  const info=isolated.metrics();
  assert.equal(info.workerActive,true);
  assert.equal(info.workerTicks,2);
  assert.equal(info.fallbackTicks,0);
  assert.equal(info.failovers,0);
  assert(Number.isFinite(info.averageTickMs));
 }finally{await isolated.close();await inline.close();}
});

test('if dedicated protocol worker crashes, existing inline engine continues without losing ceremony data',async()=>{
 class CrashingWorker extends EventEmitter{
  postMessage(){throw Error('worker unavailable');}
  async terminate(){return 1;}
 }
 const runtime=createProtocolEngineRuntime({enabled:true,makeWorker:()=>new CrashingWorker()});
 try{
  const result=await runtime.tick(state(),3150,{introComplete:true});
  assert.equal(result.phase,'CEREMONY_STAGE_VISIBLE');
  assert.equal(result.secret.advInventory[0].id,'adv-1');
  assert.equal(result.ranking[0].score,64);
  assert.equal(runtime.metrics().workerActive,false);
  assert.equal(runtime.metrics().fallbackTicks,1);
  assert.equal(runtime.metrics().failovers,1);
  assert.match(runtime.metrics().lastWorkerError,/worker unavailable/);
 }finally{await runtime.close();}
});

test('identical random seed makes bot nomination match in the separate engine and original engine',async()=>{
 const s=createProtocol({id:'bot-rng-parity',now:3000});
 s.phase='WINNER_NOMINATION';s.clock=3000;s.at=3000;s.phaseAt=0;s.deadline=15000;
 s.roster=Array.from({length:5},(_,i)=>({id:'bot-'+i,characterId:'member-'+i,name:'Bot '+i,bot:true,connected:true,seat:i,assetsReady:true}));
 s.ranking=s.roster.map((p,i)=>({id:p.id,place:i+1}));s.winner='bot-0';s.nominees=['bot-4'];
 const a=createProtocolEngineRuntime({enabled:true,timeoutMs:5000});
 const b=createProtocolEngineRuntime({enabled:false});
 try{
  const seed=20261106;
  const inlineSeed=()=>{let v=seed>>>0;return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};};
  const remote=await a.tick(s,3100,{seed}),local=await b.tick(s,3100,{random:inlineSeed()});
  assert.deepEqual(remote,local,'STAFF nomination and bot choice must be identical with the same seed');
  assert.equal(remote.nominees.length,2);
 }finally{await a.close();await b.close();}
});
