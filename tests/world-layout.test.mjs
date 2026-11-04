import {test} from 'node:test';import assert from 'node:assert/strict';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {createWorldPlayer,worldPath,stepWorld,hasFloor,clearPoint} from '../public/juegos/world-motion.mjs';
import {interactionPoint,seatPosition,DISCOVERIES} from '../public/juegos/world-interactions.mjs';
import {WorldScene} from '../public/juegos/world-scene.mjs';
test('every field discovery is reachable by actual walking, including all cave galleries',()=>{
 let total=0;for(const map of Object.values(WORLD_MAPS))for(const p of map.props.filter(p=>p.discovery)){
  const target=interactionPoint(map,p),actor=createWorldPlayer(map.id);assert(target,p.id);actor.path=worldPath(map,actor,target);assert(actor.path.length,p.id+' route');
  for(let i=0;i<2200&&actor.path.length;i++)stepWorld(actor,{},.05,map);
  assert(Math.hypot(actor.x-target.x,actor.y-target.y)<65,p.id+' actual arrival');assert(!actor.falling,p.id+' stays on its ledge');total++;
 }assert.equal(total,Object.keys(DISCOVERIES).length);
});
test('all sixteen council seats face the presenter and each chair is individually clickable',()=>{
 const map=WORLD_MAPS.eliminacion,canvas={getContext:()=>({}),getBoundingClientRect:()=>({width:1440,height:810})},scene=new WorldScene(canvas,{quality:{renderHeight:810,lite:false}});scene.setZone(map.id);scene.camera.update({x:1800,y:1050,zoom:.3},1,true);
 const unique=new Set();for(const bank of map.props.filter(p=>p.seats))for(let slot=0;slot<bank.seats.length;slot++){
  const seat=seatPosition(bank,slot),target=interactionPoint(map,bank,slot);assert(hasFloor(map,target.x,target.y)&&clearPoint(map,target.x,target.y));assert.equal(seat.facing,Math.sign(map.presenter.x-seat.x));
  const q=scene.camera.project(seat.x,seat.y,75,scene.width,scene.height);assert.equal(scene.pickObject(q.x,q.y)?.id,bank.id);assert.equal(scene.pickSeat(q.x,q.y,bank),slot);unique.add(seat.x+','+seat.y);
 }assert.equal(unique.size,16);
});
