import test from 'node:test';import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';import {openDatabase} from '../database.mjs';import {createShelterService} from '../world-shelter-service.mjs';
import {SHELTER_MATERIALS,shelterSupplyProp} from '../public/juegos/world-shelters.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {seedConstructedShelters} from './helpers/world-shelter-fixtures.mjs';import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';
import {SHELTERS} from '../public/juegos/world-shelter-layout.mjs';
import {nearestPortal} from '../public/juegos/world-motion.mjs';
const material=SHELTER_MATERIALS[0],point=shelterSupplyProp(material,WORLD_MAPS[material.zone]);

test('members share the new patio, walk to each room and never unlock the rival shelter',async()=>{
 const [left,right]=SHELTERS,door=WORLD_MAPS.base.props.find(p=>p.portal?.zone===left.entry).portal;
 const actors=[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:door.x,y:door.y},
  {id:'patio-a',character:'bruno',home:'left',zone:'base',x:door.x,y:door.y},
  {id:'patio-b',character:'daelly',home:'left',zone:'base',x:door.x,y:door.y}];
 const f=await liveFixture('shelter-visits',actors,{setup:db=>seedConstructedShelters(db,actors)});
 try{
  const a=await f.connect('patio-a'),b=await f.connect('patio-b');
  const actor=peer=>peer.messages.flatMap(m=>m.players||[]).findLast(p=>p.userId==='patio-a');
  const enter=async(peer,from,to)=>{
   const door=WORLD_MAPS[from].props.find(p=>p.portal?.zone===to).portal;
   f.send(peer,{type:'walk',x:door.x,y:door.y});
   await f.until(()=>actor(peer)?.zone===from&&nearestPortal(actor(peer),from)?.zone===to);
   f.send(peer,{type:'enter',zone:to});await f.until(()=>actor(peer)?.zone===to);
  };
  f.send(b,{type:'enter',zone:left.entry});await f.until(()=>b.messages.some(m=>m.type==='zone'&&m.zone===left.entry));
  await enter(a,'base',left.entry);
  await f.until(()=>actor(b)?.zone===left.entry);
  const boot=await f.call('/api/world/bootstrap','patio-a');
  assert(boot.zones.filter(z=>Object.values(left.rooms).includes(z.id)).every(z=>z.canEnter));
  assert(boot.zones.filter(z=>Object.values(right.rooms).includes(z.id)).every(z=>!z.canEnter));
  for(const room of [left.rooms.cocina,left.rooms.huerto,left.rooms.dormitorio]){
   await enter(a,left.entry,room);
   await enter(a,room,left.entry);
  }
 }finally{await f.close();}
});

test('Staff playing María can enter through either shelter door without unlocking it for other characters',async()=>{
 for(const [outside,inside,built] of [['base','patio-refugio-1',true],['refugio-2','patio-refugio-2',false]]){
  const {x,y}=WORLD_MAPS[outside].props.find(p=>p.portal?.zone===inside).portal;
  const resident={id:'builder',character:'alice',home:'right',zone:outside,x,y};
  const f=await liveFixture('maria-shelter-door',[{id:STAFF_ID,character:'maria-villegas',zone:outside,x,y},resident],
   {setup:built?db=>seedConstructedShelters(db,[resident]):undefined});
  try{
   const maria=await f.connect(STAFF_ID),builder=await f.connect(resident.id);
   const latest=p=>p.messages.filter(m=>m.type==='zone'||m.type==='welcome').at(-1).zone;
   const bootstrap=await f.call('/api/world/bootstrap',STAFF_ID);
   const housing=bootstrap.shelters.shelters.find(s=>s.entry===inside);
   assert.equal(housing.built,built);
   assert(bootstrap.zones.find(z=>z.id===inside).canEnter);
   f.send(maria,{type:'enter',zone:inside});
   await f.until(()=>latest(maria)===inside);
   f.send(builder,{type:'enter',zone:inside});
   await f.until(()=>builder.messages.some(m=>m.type==='error'&&m.message.includes(built?'no tiene acceso':'construir')));
   assert.equal(latest(builder),outside);
   const fresh=await f.call('/api/world/bootstrap',STAFF_ID);
   assert.equal(fresh.profile.lastZone,inside);
   assert.equal(fresh.shelters.shelters.find(s=>s.entry===inside).built,built);
  }finally{await f.close();}
 }
});

test('refuge fridges start empty and only hold food their own team deposits',async()=>{
 const [home,rivalHome]=SHELTERS,zone=home.rooms.cocina,fridge=WORLD_MAPS[zone].props.find(p=>p.id==='kitchen-fridge');
 const rivalZone=rivalHome.rooms.cocina,rivalFridge=WORLD_MAPS[rivalZone].props.find(p=>p.id==='kitchen-fridge');
 const kitchen=WORLD_MAPS.cocina.props.find(p=>p.id==='kitchen-fridge');
 const actors=[
  {id:STAFF_ID,character:'maria-villegas',zone:'cocina',...kitchen.approach},
  {id:'fridge-resident',character:'bruno',home:'left',zone,...fridge.approach},
  {id:'fridge-rival',character:'alice',home:'right',zone:rivalZone,...rivalFridge.approach}
 ];
 const f=await liveFixture('refuge-fridge',actors,{setup:async db=>{
  await seedConstructedShelters(db,actors);
  await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?)',actors[1].id,'apple',1,Date.now());
 }});
 const resident=actors[1].id,rival=actors[2].id;
 const slot=(data,teamId='left')=>data.teams.find(team=>team.id===teamId).slots.find(item=>item.foodId==='apple').quantity;
 try{
  await f.connect(STAFF_ID);await f.connect(resident);await f.connect(rival);
  const initial=await f.call('/api/world/fridge',resident);
  assert.equal(initial.status,200);assert.deepEqual(initial.teams.map(t=>t.id),['left']);
  assert(initial.teams[0].slots.every(item=>item.quantity===0));
  const camp=await f.call('/api/world/fridge',STAFF_ID);
  assert.equal(slot(camp),3);assert.equal(slot(camp,'right'),3);
  const wrong=await f.call('/api/world/fridge/deposit',resident,'POST',{teamId:'right',foodId:'apple'});
  assert.equal(wrong.status,403);
  const stored=await f.call('/api/world/fridge/deposit',resident,'POST',{teamId:'left',foodId:'apple'});
  assert.equal(stored.status,200);assert.equal(slot(stored),1);
  assert(!stored.inventory.items.some(item=>item.foodId==='apple'));
  const takeFromRival=await f.call('/api/world/fridge/take',rival,'POST',{teamId:'left',foodId:'apple'});
  assert.equal(takeFromRival.status,403);
  assert.equal(slot(await f.call('/api/world/fridge',rival),'right'),0);
  const taken=await f.call('/api/world/fridge/take',resident,'POST',{teamId:'left',foodId:'apple'});
  assert.equal(taken.status,200);assert.equal(slot(taken),0);
  assert.equal(taken.inventory.items.find(item=>item.foodId==='apple').quantity,1);
  assert.equal(slot(await f.call('/api/world/fridge',STAFF_ID)),slot(camp));
 }finally{await f.close();}
});

test('Direction can teleport staff into either unfinished shelter without unlocking it for participants',async()=>{
 const f=await liveFixture('staff-shelter-visit',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:700},{id:'visitor',character:'bruno',zone:'base',x:1000,y:700}]);
 try{const staff=await f.connect(STAFF_ID),participant=await f.connect('visitor'),last=p=>p.messages.filter(m=>m.type==='zone'||m.type==='welcome').at(-1);
  for(const zone of ['refugio-1','dormitorio-2']){f.send(staff,{type:'teleport',target:STAFF_ID,zone});await f.until(()=>last(staff)?.zone===zone);assert.equal((await f.call('/api/world/bootstrap',STAFF_ID)).profile.lastZone,zone);assert.equal((await f.call('/api/world/shelters',STAFF_ID)).shelters.shelters.some(s=>s.built),false);}
  f.send(staff,{type:'teleport',target:'visitor',zone:'refugio-1'});await f.until(()=>staff.messages.some(m=>m.type==='error'&&m.message.includes('construir')));assert.equal(last(participant).zone,'base');
  f.send(participant,{type:'teleport',target:'visitor',zone:'dormitorio-2'});await f.until(()=>participant.messages.some(m=>m.type==='error'));assert.equal(last(participant).zone,'base');
 }finally{await f.close();}
});
test('completed refuge permits its member to use the chest, rejects the other group and rejects switching to unowned characters without stripping valid membership',async()=>{
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps);const chest=maps['taller-refugio-1'].props.find(p=>p.survival?.id==='chest-left'),actors=[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:1700},{id:'resident',character:'bruno',zone:'taller-refugio-1',...chest.approach},{id:'other-resident',character:'alice',zone:'base',x:1000,y:1700}],f=await liveFixture('shelter-completed',actors,{setup:db=>seedConstructedShelters(db,[{id:'resident',character:'bruno'},{id:'other-resident',character:'alice',home:'right'}])});
 try{const staff=await f.connect(STAFF_ID),a=await f.connect('resident');await f.connect('other-resident');const residentChest=await f.call('/api/world/survival/storage?teamId=left','resident');assert.equal(residentChest.status,200,JSON.stringify(residentChest));assert.equal((await f.call('/api/world/survival/storage?teamId=left','other-resident')).status,403);assert.equal((await f.call('/api/world/survival/storage?teamId=left',STAFF_ID)).status,403);const r=await f.call('/api/world/preferences','resident','PUT',{characterId:'dani'});assert.equal(r.status,403,'Switching to an unowned character must remain forbidden');assert.equal((await f.call('/api/world/survival/storage?teamId=left','resident')).status,200,'The original purchased character must retain their own chest');assert(!staff.messages.some(m=>m.type==='error'));}finally{await f.close();}
});
test('real World enforces personal supplies, fixed character assignment, contribution proximity and locked interior/chest; saved material survives process closure',async()=>{
 const f=await liveFixture('shelter-network',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:700},{id:'builder-a',character:'bruno',zone:material.zone,x:point.x,y:point.y},{id:'builder-b',character:'alice',zone:material.zone,x:point.x+60,y:point.y}]);let stopped=false;
 try{const staff=await f.connect(STAFF_ID),a=await f.connect('builder-a'),b=await f.connect('builder-b'),view=p=>p.messages.filter(m=>m.shelters).at(-1)?.shelters,latest=p=>p.messages.filter(m=>m.type==='welcome'||m.type==='zone').at(-1);
  assert.equal(view(a).shelters[0].built,false);assert.equal(view(a).stock.nails,18);assert.equal(view(staff).available.length,0);assert(view(staff).race);assert.equal(view(a).race,undefined);
  assert.equal((await f.call('/api/world/shelters/assign','builder-a','POST',{characterId:'bruno',home:'left'})).status,403);
  assert.equal((await f.call('/api/world/shelters/assign',STAFF_ID,'POST',{characterId:'bruno',home:'right'})).status,409);
  assert.equal(view(a).home,'left');assert.equal(view(b).home,'right');assert.equal(view(a).shelters[0].members.length,9);assert.equal(view(b).shelters[1].members.length,9);
  f.send(a,{type:'interact',objectId:point.id});await f.until(()=>view(a)?.inventory.includes('nails'));assert.equal(view(a).stock.nails,17);assert(!view(a).available.includes('nails'));assert(view(b).available.includes('nails'));
  const revision=view(a).revision;f.send(a,{type:'interact',objectId:point.id});await f.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('Ya recogiste')));assert.equal(view(a).revision,revision);
  assert.equal((await f.call('/api/world/shelters/contribute','builder-a','POST',{home:'left'})).status,409);
  assert.equal((await f.call('/api/world/survival/storage?teamId=left',STAFF_ID)).status,403);assert.equal((await f.call('/api/world/survival/storage?teamId=left','builder-b')).status,403);
  f.send(staff,{type:'teleport',target:'builder-a',zone:'base'});await f.until(()=>latest(a)?.zone==='base');const door=WORLD_MAPS.base.props.find(p=>p.portal?.zone==='patio-refugio-1').portal;
  f.send(a,{type:'walk',x:door.x,y:door.y});await f.until(()=>a.messages.some(m=>m.type==='move'&&m.players.some(p=>p.zone==='base'&&p.userId==='builder-a'&&Math.hypot(p.x-door.x,p.y-door.y)<140)),20000);
  const donate=await f.call('/api/world/shelters/contribute','builder-a','POST',{home:'left'});assert.equal(donate.status,200,JSON.stringify(donate));assert.equal(donate.added,1);assert.equal(donate.shelters.shelters[0].counts.nails,1);assert.equal(donate.shelters.inventory.length,0);
  f.send(a,{type:'enter',zone:'patio-refugio-1'});await f.until(()=>a.messages.some(m=>m.type==='error'&&m.message.includes('construir este refugio')));assert.equal(latest(a).zone,'base');
  await f.close();stopped=true;const db=await openDatabase(f.dataDir),s=createShelterService({db});try{await s.ready;const saved=await s.snapshot({id:'builder-a'});assert.equal(saved.home,'left');assert.equal(saved.stock.nails,17);assert(saved.delivered.includes('nails'));assert.equal(saved.shelters[0].counts.nails,1);assert(!saved.shelters[0].built);}finally{await s.close();await db.close();}
 }finally{if(!stopped)await f.close();}
});
test('Direction can move a participant out of their old shelter or leave them without one',async()=>{
 const actors=[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:1700},{id:'moving-resident',character:'bruno',zone:'refugio-1',x:900,y:700}];
 const f=await liveFixture('change-shelter',actors,{setup:db=>seedConstructedShelters(db,actors.slice(1))});
 try{
  const resident=await f.connect('moving-resident');
  const change=(characterId,home)=>f.call('/api/world/shelters/assign',STAFF_ID,'POST',{characterId,home});
  assert.equal((await change('alice',null)).status,200,'free a place in Refugio 2');
  const moved=await change('bruno','right');
  assert.equal(moved.status,200,moved.error);
  assert.equal(moved.shelters.housing.find(p=>p.characterId==='bruno').home,'right');
  await f.until(()=>resident.messages.some(m=>m.type==='zone'&&m.zone==='base'));
  await f.until(()=>resident.messages.some(m=>m.type==='shelters'&&m.shelters.home==='right'));
  const boot=await f.call('/api/world/bootstrap','moving-resident');
  assert.equal(boot.zones.find(z=>z.id==='refugio-1').canEnter,false);
  assert.equal(boot.zones.find(z=>z.id==='dormitorio-2').canEnter,true);
  const removed=await change('bruno',null);
  assert.equal(removed.status,200,removed.error);
  const view=(await f.call('/api/world/shelters','moving-resident')).shelters;
  assert.equal(view.home,null);
  assert.equal(view.eligible,false);
  assert(view.shelters.every(s=>s.built&&s.percent===100));
 }finally{await f.close();}
});

test('the relocated dock planks are independently available to both shelter teams',async()=>{
 const material=SHELTER_MATERIALS.find(m=>m.id==='planks'),zone=material.zone;
 const point=shelterSupplyProp(material,WORLD_MAPS[zone]);
 const f=await liveFixture('relocated-planks',[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:1000,y:700},
  {id:'planks-left',character:'bruno',zone,x:point.x,y:point.y},
  {id:'planks-right',character:'alice',zone,x:point.x+45,y:point.y}
 ]);
 try{
  const a=await f.connect('planks-left'),b=await f.connect('planks-right');
  const view=p=>p.messages.filter(m=>m.shelters).at(-1)?.shelters;
  assert(view(a).available.includes('planks')&&view(b).available.includes('planks'));
  f.send(a,{type:'interact',objectId:point.id});
  await f.until(()=>view(a)?.inventory.includes('planks'));
  assert(!view(a).available.includes('planks'));
  assert(view(b).available.includes('planks'));
  f.send(b,{type:'interact',objectId:point.id});
  await f.until(()=>view(b)?.inventory.includes('planks'));
 }finally{await f.close();}
});
