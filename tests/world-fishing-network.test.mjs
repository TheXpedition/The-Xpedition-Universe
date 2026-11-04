import {test} from 'node:test';import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {interactionPoint} from '../public/juegos/world-interactions.mjs';
test('cancelled casts give no reward and completing a cast does not impose the old minute-long wait',async()=>{
 const map=WORLD_MAPS['poza-cascada'],prop=map.props.find(p=>p.activity==='fish'),point=interactionPoint(map,prop),f=await liveFixture('fishing-flow',[{id:STAFF_ID,character:'maria-villegas',zone:map.id,...point}]);
 try{const a=await f.connect(STAFF_ID),latest=()=>a.messages.findLast(m=>m.type==='players')?.players.find(p=>p.userId===STAFF_ID),cast=()=>f.send(a,{type:'interact',objectId:prop.id});
  cast();await f.until(()=>latest()?.activity==='fish');f.send(a,{type:'input',x:1,y:0});f.send(a,{type:'input',x:0,y:0});await f.until(()=>latest()?.activity===null);await new Promise(r=>setTimeout(r,3800));assert.equal(a.messages.filter(m=>m.type==='interaction').length,0,'moving away before the cast completes cannot grant loot');
  cast();await f.until(()=>latest()?.activity==='fish');await f.until(()=>a.messages.some(m=>m.type==='interaction'),6000);await f.until(()=>latest()?.activity===null);const mark=a.messages.length;cast();await f.until(()=>a.messages.slice(mark).some(m=>m.type==='players'&&m.players.some(p=>p.userId===STAFF_ID&&p.activity==='fish')));assert(!a.messages.slice(mark).some(m=>m.type==='error'),'a new cast can start immediately');f.send(a,{type:'stand'});await f.until(()=>latest()?.activity===null);
 }finally{await f.close();}
});
