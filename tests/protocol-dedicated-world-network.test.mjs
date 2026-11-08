import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';

const KEY='xpedition-dedicated-world-test-secret-32-characters-long';
test('real World and real independent engine share 18-player ceremonies without changing the existing browser WebSocket', {timeout:120000},async()=>{
 let dedicated,database,fixture;
 try{
  fixture=await liveFixture('dedicated-world-network',[
   {id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:700},
   {id:'dedicated-human',character:'bruno',zone:'base',x:1100,y:700},
   {id:'dedicated-observer',character:'dani',zone:'base',x:1200,y:700,spectator:true}
  ],{beforeSpawn:async folder=>{
   database=await openDatabase(folder);
   dedicated=await startProtocolDedicatedServer({host:'127.0.0.1',port:0,database,secret:KEY});
   return {PROTOCOL_ENGINE_REMOTE_ENABLED:'true',PROTOCOL_SERVICE_URL:'http://127.0.0.1:'+dedicated.port,PROTOCOL_BRIDGE_SECRET:KEY};
  }});
  const staff=await fixture.connect(STAFF_ID),human=await fixture.connect('dedicated-human'),observer=await fixture.connect('dedicated-observer');
  const peers=[staff,human,observer];
  const wait=async fn=>fixture.until(fn,30000);
  const plan=await fixture.call('/api/world/x-protocol/start-plan',STAFF_ID);
  assert.equal(plan.status,200,'World STAFF menu must reach the independent engine');
  assert.equal(plan.connected,1,'real World human participants must arrive through the bridge');
  assert.equal(plan.missing,17);
  assert.equal((await fixture.call('/api/world/x-protocol/start-live','dedicated-human','POST',{fillBots:true})).status,403);
  const started=await fixture.call('/api/world/x-protocol/start-live',STAFF_ID,'POST',{fillBots:true});
  assert.equal(started.status,200,JSON.stringify(started));
  assert.ok(started.ceremonyId);
  await wait(()=>peers.every(p=>p.messages.some(m=>m.type==='protocol-start')));
  for(const p of peers)assert.equal(p.socket.readyState,WebSocket.OPEN,'The World socket must stay alive while the new engine runs');
  const invite=await fixture.call('/api/world/bootstrap','dedicated-human');
  assert.equal(invite.protocolInvite,'/juegos/x-protocol/');
  for(const p of peers)fixture.send(p,{type:'protocol-subscribe'});
  const latest=p=>p.messages.filter(m=>m.type==='protocol-state').at(-1)?.episode;
  await wait(()=>peers.every(p=>latest(p)?.phase==='ELIMINATION_LOADING'));
  assert.equal(latest(staff).roster.length,18);
  assert.equal(latest(staff).roster.filter(p=>!p.bot).length,1);
  assert.equal(latest(staff).staff,true);
  assert.equal(latest(observer).roster.length,18);
  for(const [index,p] of peers.entries())fixture.send(p,{type:'protocol-ready',ceremonyId:started.ceremonyId,requestId:'ready-'+index});
  await wait(()=>peers.every((p,index)=>p.messages.some(m=>m.type==='protocol-ready-ack'&&m.ceremonyId===started.ceremonyId&&m.requestId==='ready-'+index&&m.accepted===true)));
  await wait(()=>peers.every(p=>latest(p)?.phase==='INTRO_VIDEO'));
  // Repeated readiness after losing a server ACK must be idempotent and
  // still reach the browser through Virginia's dedicated bridge.
  const staffAckCount=staff.messages.filter(m=>m.type==='protocol-ready-ack').length;
  fixture.send(staff,{type:'protocol-ready',ceremonyId:started.ceremonyId,requestId:'ready-0'});
  await wait(()=>staff.messages.filter(m=>m.type==='protocol-ready-ack').length>staffAckCount);
  assert.equal(latest(staff).id,started.ceremonyId);
  assert.equal(latest(human).cinematic.url,'/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4');
  // A temporary Render-to-Render bridge outage must NOT destroy the existing
  // browser WebSockets, reset the ceremony, or lose the player's subscription.
  const priorUpdates=human.messages.filter(m=>m.type==='protocol-state').length;
  const room=await dedicated.rooms.get('');
  for(const peer of [...room.peers])peer.close(1012,'Test independent engine bridge reconnection');
  await wait(()=>room.peers.size>=1);
  await wait(()=>human.messages.filter(m=>m.type==='protocol-state').length>priorUpdates);
  assert.equal(human.socket.readyState,WebSocket.OPEN);
  assert.equal(latest(human).id,started.ceremonyId);
  const performance=await fixture.call('/api/world/x-protocol/performance',STAFF_ID);
  assert.equal(performance.status,200);
  assert.equal(performance.statsPreserved,true);
  const paused=await fixture.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type:'pause'});
  assert.equal(paused.status,200);
  await wait(()=>latest(human)?.paused===true);
  const resumed=await fixture.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type:'resume'});
  assert.equal(resumed.status,200);
  await wait(()=>latest(human)?.paused===false);
  const cancelled=await fixture.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type:'cancel',ceremonyId:started.ceremonyId});
  assert.equal(cancelled.status,200);
  await wait(()=>peers.every(p=>p.messages.some(m=>m.type==='protocol-return')));
  await wait(()=>peers.every(p=>p.socket.readyState===WebSocket.OPEN));
  assert.equal((await fixture.call('/api/world/bootstrap','dedicated-human')).protocolInvite,null);
  const row=await database.one('SELECT state FROM world_environment WHERE id=?','x-protocol');
  assert.equal(JSON.parse(row.state).id,started.ceremonyId);
  assert.equal(JSON.parse(row.state).roster.length,18);
  let ended=false;
  for(let attempt=0;attempt<100;attempt++){
   const current=await fixture.call('/api/world/x-protocol/performance',STAFF_ID);
   if(current.phase==='ELIMINATION_FINISHED'){ended=true;break;}
   await new Promise(resolve=>setTimeout(resolve,65));
  }
  assert.equal(ended,true,'first cancellation must fully finish before starting a second episode');
  // Regression: STAFF may start directly from the World home menu while
  // their World WebSocket is offline; HTTP auth remains valid.
  staff.socket.close(1000);
  await wait(()=>staff.socket.readyState===WebSocket.CLOSED);
  const next=await fixture.call('/api/world/x-protocol/start-live',STAFF_ID,'POST',{fillBots:true});
  assert.equal(next.status,200,'HTTP-only STAFF should launch the separate engine: '+JSON.stringify(next));
  assert.notEqual(next.ceremonyId,started.ceremonyId);
  await wait(()=>human.messages.some(m=>m.type==='protocol-start'&&m.ceremonyId===next.ceremonyId));
  const secondEnd=await fixture.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type:'cancel',ceremonyId:next.ceremonyId});
  assert.equal(secondEnd.status,200);
 }finally{
  await fixture?.close();
  await dedicated?.close();
  await database?.close();
 }
});
