import {test} from 'node:test';import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {interactionPoint,nearestInteraction} from '../public/juegos/world-interactions.mjs';
test('six real players use the three independent water entries in each waterfall zone and return to their own banks',async()=>{
 const people=[],cast=['maria-villegas','bruno','leandro','peggy','sallua','guillermo'];
 for(const zone of ['cascada-ribera','poza-cascada'])for(const prop of WORLD_MAPS[zone].props.filter(p=>p.activity==='swim')){const n=people.length,id=n===0?STAFF_ID:'water-'+n,point=interactionPoint(WORLD_MAPS[zone],prop);assert.equal(nearestInteraction(point,zone)?.prop.id,prop.id,'swim entry does not overlap the water collection prompt');people.push({id,character:cast[n],zone,...point,prop,point});}
 const f=await liveFixture('waterways-network',people);
 try{const peers=await Promise.all(people.map(p=>f.connect(p.id)));const latest=(peer,id)=>peer.messages.findLast(m=>m.type==='players')?.players?.find(p=>p.userId===id);
  for(let n=0;n<people.length;n++){const p=people[n],peer=peers[n];f.send(peer,{type:'interact',objectId:p.prop.id});await f.until(()=>latest(peer,p.id)?.swimming);const swim=latest(peer,p.id);assert.equal(swim.state,'swim');assert.equal(swim.y,p.prop.waterTarget.y);assert.equal(swim.x,p.prop.waterTarget.x);}
  for(let n=0;n<people.length;n++){const p=people[n],peer=peers[n];f.send(peer,{type:'water-return'});await f.until(()=>latest(peer,p.id)?.swimming===false);const land=latest(peer,p.id);assert.equal(land.state,'idle');assert(Math.hypot(land.x-p.point.x,land.y-p.point.y)<2);assert(land.grounded);}
 }finally{await f.close();}
});
