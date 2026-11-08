import test from 'node:test';
import assert from 'node:assert/strict';
import {ProtocolReadyDelivery} from '../public/juegos/x-protocol/ready-delivery.mjs';

test('offline readiness remains pending and retries with identical correlation after reconnect',()=>{
 const queued=new Map(),sent=[];let open=false,sequence=0;
 const ready=new ProtocolReadyDelivery({
  send:packet=>{sent.push({...packet,open});return open;},
  newId:()=>String(++sequence),
  setTimer:(fn)=>{const id=++sequence;queued.set(id,fn);return id;},
  clearTimer:id=>queued.delete(id),
  retryMs:10
 });
 ready.begin('ceremony-1');
 assert.deepEqual(sent.map(p=>p.open),[false]);
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'wrong',requestId:'1',accepted:true}),false);
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'ceremony-1',requestId:'wrong',accepted:true}),false);
 open=true;ready.reconnect();
 assert.equal(sent.length,2);
 assert.equal(sent[0].requestId,sent[1].requestId,'idempotent retry must use same request ID');
 assert.equal(sent[1].ceremonyId,'ceremony-1');
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'ceremony-1',requestId:sent[0].requestId,accepted:true}),true);
 assert.equal(queued.size,0,'server ACK cancels all readiness retries');
 ready.reconnect();
 assert.equal(sent.length,3,'reconnected World must reconfirm readiness after motor recovers state');
 assert.notEqual(sent[2].requestId,sent[1].requestId,'new World connection must use fresh ACK correlation');
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'ceremony-1',requestId:sent[1].requestId,accepted:true}),false,'stale ACK from old WebSocket cannot clear retry');
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'ceremony-1',requestId:sent[2].requestId,accepted:true}),true);
 ready.cancel();
});

test('repeated timer expiry resends readiness after a lost ACK, never accepting another ceremony ACK',()=>{
 const queued=new Map(),sent=[];let next=0;
 const ready=new ProtocolReadyDelivery({
  send:packet=>sent.push({...packet}),
  newId:()=>String(++next),
  setTimer:fn=>{const id=++next;queued.set(id,fn);return id;},
  clearTimer:id=>queued.delete(id)
 });
 ready.begin('old');
 let pending=queued.values().next().value;queued.clear();pending();
 assert.equal(sent.length,2);
 assert.equal(sent[0].requestId,sent[1].requestId);
 ready.begin('new');
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'old',requestId:sent[0].requestId,accepted:true}),false);
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'new',requestId:sent.at(-1).requestId,accepted:false}),false);
 assert.equal(ready.acknowledge({type:'protocol-ready-ack',ceremonyId:'new',requestId:sent.at(-1).requestId,accepted:true}),true);
 ready.cancel();
 assert.equal(queued.size,0);
});
