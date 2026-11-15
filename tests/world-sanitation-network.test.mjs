import test from 'node:test';import assert from 'node:assert/strict';import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {applyWorldBeds} from '../public/juegos/world-beds.mjs';import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';import {applySanitationProps,sanitationMenu} from '../public/juegos/world-sanitation.mjs';import {worldPath,hasFloor,clearPoint} from '../public/juegos/world-motion.mjs';import {seedConstructedShelters} from './helpers/world-shelter-fixtures.mjs';
test('both shelters reserve bedrooms for beds and move sanitation to a walkable corral',()=>{
 const maps=structuredClone(WORLD_MAPS);
 buildSurvivalProps(maps,{upgrades:{left:true,right:true}});applySanitationProps(maps);
 applyWorldBeds(maps,{'refugio-1':9,'dormitorio-2':9});
 for(const [bedroom,number] of [['refugio-1',1],['dormitorio-2',2]]){
  const room=maps[bedroom],corral=maps['corral-refugio-'+number],workshop=maps['taller-refugio-'+number];
  assert.equal(room.props.filter(p=>p.sleepBed).length,9);
  assert(!room.props.some(p=>p.sanitation||p.survival?.kind==='chest'||p.survival?.kind==='bench'));
  assert.equal(workshop.props.filter(p=>p.survival?.kind==='chest').length,2);
  const basket=corral.props.find(p=>p.sanitation),point=basket.approaches[0];
  assert(hasFloor(corral,point.x,point.y));assert(clearPoint(corral,point.x,point.y));
  assert(worldPath(corral,{x:corral.spawn[0],y:corral.spawn[1]},point).length);
  assert(sanitationMenu(basket,{state:'dirty'}).includes('sanitation-clean'));
  assert(!sanitationMenu(basket,{state:'clean'}).includes('data-kind="clean"'));
 }
});
test('a toilet accepts the actual action messages, seats one user, refuses simultaneous occupancy and completes soil/clean cycles',async()=>{const maps=structuredClone(WORLD_MAPS);applySanitationProps(maps);const p=maps['corral-refugio-1'].props.find(p=>p.sanitation),point=p.approaches[0],actors=[{id:STAFF_ID,character:'maria-villegas',zone:'corral-refugio-1',...point},{id:'bath-b',character:'bruno',zone:'corral-refugio-1',...point}],f=await liveFixture('sanitation',actors,{setup:db=>seedConstructedShelters(db,actors)});try{const a=await f.connect(STAFF_ID),b=await f.connect('bath-b');let mark=a.messages.length;f.send(a,{type:'interact',objectId:p.id,bedActivity:'urinate'});await f.until(()=>a.messages.slice(mark).find(m=>m.type==='sanitation-active'));assert(a.messages.slice(mark).some(m=>(m.players||[]).some(p=>p.userId===STAFF_ID&&p.state==='sit'&&p.activity==='sanitation')));const bm=b.messages.length;f.send(b,{type:'interact',objectId:p.id,bedActivity:'defecate'});await f.until(()=>b.messages.slice(bm).some(m=>m.type==='error'&&/ocupada/.test(m.message)));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-finished'));assert(a.messages.slice(mark).some(m=>m.type==='object'&&m.value.state==='urine'&&!m.value.occupant));mark=a.messages.length;f.send(a,{type:'interact',objectId:p.id,bedActivity:'clean'});await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-active'));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='sanitation-finished'));await f.until(()=>a.messages.slice(mark).some(m=>m.type==='object'&&m.value.state==='clean'&&!m.value.occupant));}finally{await f.close();}});
