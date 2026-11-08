import test from 'node:test';
import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';

test('World player can log in and receive Welcome even when remote protocol engine refuses connections', {timeout:80000},async()=>{
 const f=await liveFixture('remote-protocol-offline-world-entry',[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:800,y:700},
  {id:'remote-engine-outage-player',character:'bruno',zone:'base',x:850,y:700}
 ],{beforeSpawn:async()=>({
  PROTOCOL_ENGINE_REMOTE_ENABLED:'true',
  PROTOCOL_SERVICE_URL:'http://127.0.0.1:1',
  PROTOCOL_BRIDGE_SECRET:'world-login-stays-online-without-remote-bridge'
 })});
 try{
  const player=await f.connect('remote-engine-outage-player');
  assert(player.messages.some(m=>m.type==='welcome'),'Disconnected ceremony must not block a player from World');
  assert.equal(player.socket.readyState,1,'World WebSocket must remain open');
  await new Promise(resolve=>setTimeout(resolve,1800));
  assert.equal(player.socket.readyState,1,'Async ceremony connection refusal must not kill the World room');
  const staff=await f.connect(STAFF_ID);
  assert(staff.messages.some(m=>m.type==='welcome'),'STAFF can also reconnect to World');
  assert.equal(staff.socket.readyState,1);
 }finally{await f.close();}
});