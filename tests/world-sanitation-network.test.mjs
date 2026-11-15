import test from 'node:test';import assert from 'node:assert/strict';import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {applyWorldBeds} from '../public/juegos/world-beds.mjs';import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';import {applySanitationProps,sanitationMenu} from '../public/juegos/world-sanitation.mjs';import {worldPath,hasFloor,clearPoint} from '../public/juegos/world-motion.mjs';import {seedConstructedShelters} from './helpers/world-shelter-fixtures.mjs';
test('the chests stay clear of sanitation, all nine beds and the workbench in both shelters',()=>{
 const maps=structuredClone(WORLD_MAPS);
 buildSurvivalProps(maps,{upgrades:{left:true,right:true}});
 applyWorldBeds(maps,{'refugio-1':9,'dormitorio-2':9});applySanitationProps(maps);
 for(const id of ['refugio-1','dormitorio-2']){
  const map=maps[id],basket=map.props.find(p=>p.sanitation),bench=map.props.find(p=>p.survival?.kind==='bench');
  const beds=map.props.filter(p=>p.sleepBed),chests=map.props.filter(p=>p.survival?.kind==='chest');
  assert.equal(beds.length,9);assert.equal(chests.length,2);
  for(const chest of chests){
   const chestTop=chest.y*.62+8-chest.w*2/3,basketBottom=(basket.y+basket.h*.25)*.62;
   assert(chestTop>basketBottom+20);
   assert(beds.every(bed=>chest.x-chest.w/2>bed.x+bed.artWidth/2+10));
   assert(Math.hypot(bench.approach.x-chest.approach.x,bench.approach.y-chest.approach.y)>250);
  }
  for(const point of [basket.approaches[0],...chests.map(p=>p.approach)]){
   assert(hasFloor(map,point.x,point.y));assert(clearPoint(map,point.x,point.y));
   assert(worldPath(map,{x:map.spawn[0],y:map.spawn[1]},point).length);
  }
  const menu=sanitationMenu(basket,{state:'dirty'});
  assert(menu.includes('sanitation-defecate'));assert(menu.includes('sanitation-urinate'));assert(menu.includes('sanitation-clean'));
  assert(!sanitationMenu(basket,{state:'clean'}).includes('data-kind="clean"'));
 }
});
test('a toilet accepts the actual action messages, seats one user, refuses simultaneous occupancy and completes soil/clean cycles',async()=>{const maps=structuredClone(WORLD_MAPS);applySanitationProps(maps);const p=maps['refugio-1'].props.find(p=>p.sanitation),point=p.approaches[0],actors=[{id:STAFF_ID,character:'maria-villegas',zone:'refugio-1',...point},{id:'bath-b',character:'bruno',zone:'refugio-1',...point}],f=await liveFixture('sanitation',actors,{setup:db=>seedConstructedShelters(db,actors)});try{const a=await f.connect(STAFF_ID),b=await f.connect('bath-b');let mark=a.messages.length;f.send(a,{type:'interact',objectId:p.id,bedActivity:'urinate'});await f.until(()=>a.messages.slice(mark).find(m=>m.type==='sanitation-active'));assert(a.messages.slice(mark).some(m=>(m.players||[]).some(p=>p.userId===STAFF_ID&&p.state==='sit'&&p.activity==='sanitation')));const bm=b.messages.length;f.send(b,{type:'interact',objectId:p.id,bedActivity:'defecate'});await f.until(()=>b.messages.slice(bm).some(m=>m.type==='error'&&/ocupada/.test(m.message)));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-finished'));assert(a.messages.slice(mark).some(m=>m.type==='object'&&m.value.state==='urine'&&!m.value.occupant));mark=a.messages.length;f.send(a,{type:'interact',objectId:p.id,bedActivity:'clean'});await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-active'));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-finished'));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='object'&&m.value.state==='clean'&&!m.value.occupant));}finally{await f.close();}});
