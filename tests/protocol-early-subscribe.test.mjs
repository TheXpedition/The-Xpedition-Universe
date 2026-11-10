import test from 'node:test';
import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';

test('a subscription sent on WebSocket open reaches World on the first attempt',async()=>{
 const fixture=await liveFixture('protocol-early-subscribe',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:900,y:700}]);
 try{
  const peer=await fixture.connect(STAFF_ID,{initialMessage:{type:'protocol-subscribe'}});
  const packet=await fixture.until(()=>peer.messages.find(message=>message.type==='protocol-state'),3000);
  assert.equal(packet.episode.selfId,STAFF_ID);
 }finally{await fixture.close();}
});
