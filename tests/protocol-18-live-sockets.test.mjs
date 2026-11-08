import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

const secret='isolated-socket-load-test-secret-32-characters-long';
test('18 real WebSocket contestants receive ceremony state and director pause/resume on time', {timeout:180000},async()=>{
 let f,dedicated,database;
 const players=SHELTER_PARTICIPANTS.map((character,i)=>({
  id:'load-player-'+String(i+1).padStart(2,'0'),character,zone:'base',x:900+i*10,y:700
 }));
 const actors=[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:750,y:700},...players];
 try{
  f=await liveFixture('protocol-18-live-sockets',actors,{beforeSpawn:async folder=>{
   database=await openDatabase(folder);
   dedicated=await startProtocolDedicatedServer({host:'127.0.0.1',port:0,database,secret});
   return {
    PROTOCOL_ENGINE_REMOTE_ENABLED:'true',
    PROTOCOL_SERVICE_URL:'http://127.0.0.1:'+dedicated.port,
    PROTOCOL_BRIDGE_SECRET:secret
   };
  }});
  const peers=[];
  for(const actor of actors)peers.push(await f.connect(actor.id));
  const plan=await f.call('/api/world/x-protocol/start-plan',STAFF_ID);
  assert.equal(plan.status,200,JSON.stringify(plan));
  assert.equal(plan.expected,18,'Season should have exactly 18 eligible characters');
  assert.equal(plan.connected,18,'Every one of the 18 logged-in users must reach the remote engine');
  const startedAt=Date.now();
  const started=await f.call('/api/world/x-protocol/start-live',STAFF_ID,'POST',{fillBots:false});
  assert.equal(started.status,200,JSON.stringify(started));
  const episodeId=started.ceremonyId;
  assert(episodeId);
  await f.until(()=>peers.every(p=>p.messages.some(m=>m.type==='protocol-start'&&m.ceremonyId===episodeId)),25000);
  const startDeliveryMs=Date.now()-startedAt;
  for(const peer of peers)f.send(peer,{type:'protocol-subscribe'});
  const last=peer=>peer.messages.filter(m=>m.type==='protocol-state').at(-1)?.episode;
  await f.until(()=>peers.every(p=>last(p)?.id===episodeId&&last(p).roster?.length===18),25000);
  const all=peers.map(p=>last(p));
  assert(all.every(s=>s.roster.every(p=>!p.bot)),'No placeholder bots: 18 human-user WebSocket sessions');
  async function measureDirector(type,expected){
   const start=Date.now();
   const response=await f.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type});
   assert.equal(response.status,200,type+' command rejected: '+JSON.stringify(response));
   await f.until(()=>peers.every(p=>last(p)?.paused===expected),25000);
   const elapsed=Date.now()-start;
   assert(elapsed<5000,type+' took '+elapsed+' ms to reach all 19 real sockets');
   return elapsed;
  }
  const pauseDeliveryMs=await measureDirector('pause',true);
  const resumeDeliveryMs=await measureDirector('resume',false);
  assert(peers.every(p=>p.socket.readyState===1),'All sockets remain open after 18-person ceremony and director actions');
  console.log('PROTOCOL_18_PLAYER_LATENCY',JSON.stringify({players:18,sockets:peers.length,startDeliveryMs,pauseDeliveryMs,resumeDeliveryMs,authority:'isolated-dedicated-server',data:'test-only'}));
 }finally{
  await f?.close();
  await dedicated?.close();
  await database?.close();
 }
});
