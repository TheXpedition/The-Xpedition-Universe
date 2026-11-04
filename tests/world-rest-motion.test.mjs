import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movementKey,movementVector} from '../public/juegos/world-input.mjs';
import {stopActorMotion,standActor} from '../world-actor-motion.mjs';
import {normalizeWorldPlayer} from '../public/juegos/world-player-state.mjs';
import {worldPath} from '../public/juegos/world-motion.mjs';

test('Shift and Caps Lock do not leave a released movement key active',()=>{
 for(const letter of ['w','a','s','d']){const code='Key'+letter.toUpperCase(),held=new Set([movementKey({key:letter.toUpperCase(),code})]);held.delete(movementKey({key:letter,code}));assert.deepEqual(movementVector(held),{x:0,y:0,run:false});}
 assert.equal(movementKey({key:'W'}),movementKey({key:'w'}));
 assert.deepEqual(movementVector(new Set(['KeyA','ShiftRight'])),{x:-1,y:0,run:true});
});
test('standing repeatedly clears sleep, the seat, walking routes and queued interactions',()=>{
 const actor={p:{x:25,y:40,z:0,path:[],moving:false},input:{x:0,y:0}};
 for(let i=0;i<10;i++){
  Object.assign(actor,{seat:{propId:'bed',slot:0,stand:{x:60,y:100}},state:'sleep',sleeping:true,atSeat:true,input:{x:1,y:0},pendingObject:'bed',pendingSeatSlot:0});
  Object.assign(actor.p,{path:[{x:600,y:500}],moving:true,vz:30});
  assert(standActor(actor,i));assert.equal(actor.state,'idle');assert.equal(actor.sleeping,false);assert.equal(actor.seat,null);assert.equal(actor.atSeat,false);assert.deepEqual(actor.p.path,[]);assert.equal(actor.p.moving,false);assert.equal(actor.pendingObject,null);assert.equal(actor.pendingSeatSlot,undefined);assert.deepEqual(actor.input,{x:0,y:0});assert.equal(actor.p.x,60);assert.equal(actor.p.y,100);
  assert.equal(standActor(actor,i),false,'a second stand is harmless');
 }
 actor.state='sleep';actor.sleeping=true;actor.atSeat=true;actor.seat=null;standActor(actor,99);assert.equal(actor.sleeping,false);assert.equal(actor.atSeat,false);assert.equal(actor.state,'idle');
});
test('stop cancels both a floor route and an object approach without standing a resting actor',()=>{
 const c={p:{path:[{x:3,y:4}],moving:true},input:{x:1,y:1},pendingObject:'chair',pendingSeatSlot:2,state:'sleep',sleeping:true};stopActorMotion(c,10);assert.deepEqual(c.p.path,[]);assert.equal(c.pendingObject,null);assert.equal(c.lastInput,10);assert.equal(c.sleeping,true);
 const p=normalizeWorldPlayer({state:'idle',sleeping:true,seatId:'bed',seatSlot:0,moving:false});assert.equal(p.sleeping,false);assert.equal(p.seatId,null);
});
test('routes are rebuilt when an obstacle changes instead of keeping a stale navigation grid',()=>{
 const m={id:'revision-test',width:340,height:340,bounds:[0,0,340,340],floors:[[[0,0],[340,0],[340,340],[0,340]]],props:[],interactionRevision:1};
 const a={x:51,y:153},b={x:289,y:153};assert(worldPath(m,a,b).length);
 m.props.push({x:170,y:170,w:70,h:340,solid:true,height:100});m.interactionRevision++;
 assert.equal(worldPath(m,a,b).length,0);
 m.props=[];m.interactionRevision++;assert(worldPath(m,a,b).length);
});
