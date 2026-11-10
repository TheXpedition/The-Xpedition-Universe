import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createShelterService} from '../world-shelter-service.mjs';
import {SHELTERS,SHELTER_ROSTERS,SHELTER_MATERIALS,SHELTER_PARTICIPANTS,shelterForCharacter,shelterSupplyProp,buildShelterProps} from '../public/juegos/world-shelters.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {worldPath,hasFloor,clearPoint} from '../public/juegos/world-motion.mjs';
import {createVitalsStore} from '../world-vitals-service.mjs';import {createHealthStore} from '../world-health-service.mjs';
const atMaterial=m=>({...shelterSupplyProp(m,WORLD_MAPS[m.zone]),zone:m.zone,alive:true});
const atDoor=home=>{const s=SHELTERS.find(s=>s.id===home);return {...WORLD_MAPS[s.outside].props.find(p=>p.portal?.zone===s.inside).portal,zone:s.outside,alive:true};};
async function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-shelters-')),db=await openDatabase(dir),ids=[...SHELTER_PARTICIPANTS,'maria-villegas','isabel','dani','dua-lingo'];for(const id of ids){await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani',1000);await db.run('INSERT INTO world_preferences(user_id,character_id,updated) VALUES(?,?,?)',id,id,1000);await db.run('INSERT INTO world_character_reservations(character_id,user_id,updated) VALUES(?,?,?)',id,id,1000);}const s=createShelterService({db,now:()=>1000});await s.ready;return {dir,db,s,async close(){await s.close();await db.close();const absolute=path.resolve(dir);assert(absolute.startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(absolute,{recursive:true,force:true});}};}
test('the replacement cast recovers legacy deliveries once and preserves both original shelters',async()=>{
 const f=await fixture();let restored,restarted;
 try{
  const [first,duplicate,moved,notDelivered]=SHELTER_MATERIALS;
  const read=async()=>JSON.parse((await f.db.one('SELECT state FROM world_environment WHERE id=?','shelters')).state);
  const old=await read();
  old.owners={peggy:'former-peggy',joseserna:'former-jose',alice:'alice'};
  old.collected={peggy:{[first.id]:100,[duplicate.id]:100,[notDelivered.id]:140},joseserna:{[moved.id]:100},gabrielsab:{[duplicate.id]:200},alice:{[moved.id]:300}};
  old.delivered={peggy:{[first.id]:110,[duplicate.id]:120},joseserna:{[moved.id]:{at:130,home:'right'}},gabrielsab:{[duplicate.id]:{at:220,home:'right'}},alice:{[moved.id]:{at:320,home:'left'}}};
  await f.db.run('UPDATE world_environment SET state=?,updated=? WHERE id=?',JSON.stringify(old),140,'shelters');
  restored=createShelterService({db:f.db,now:()=>1000});
  await restored.ready;
  const g=await restored.snapshot({id:'gabrielsab'}),a=await restored.snapshot({id:'alice'});
  assert.deepEqual(g.delivered.sort(),[first.id,duplicate.id].sort());
  assert.deepEqual(a.delivered,[moved.id]);
  assert(g.available.includes(notDelivered.id));
  assert.equal(g.shelters[1].counts[first.id],1);
  assert.equal(g.shelters[1].counts[duplicate.id],1);
  assert.equal(g.shelters[1].counts[moved.id],1);
  assert.equal(g.shelters[0].counts[moved.id],1);
  assert.equal(g.stock[first.id],17);
  assert.equal(g.stock[notDelivered.id],18);
  await assert.rejects(restored.collect({id:'gabrielsab'},first.id,atMaterial(first)),/Ya recogiste/);
  const saved=await read();
  assert.deepEqual(saved.owners,old.owners);
  assert.deepEqual(saved.delivered.peggy,old.delivered.peggy);
  assert.deepEqual(saved.delivered.joseserna,old.delivered.joseserna);
  assert.equal(saved.delivered.gabrielsab[first.id].creditedFrom,'peggy');
  assert.equal(saved.delivered.alice[moved.id].restoredCredit.creditedFrom,'joseserna');
  restarted=createShelterService({db:f.db,now:()=>2000});
  await restarted.ready;
  assert.deepEqual(await read(),saved);
 }finally{await restarted?.close();await restored?.close();await f.close();}
});
test('exactly ten unique materials occupy the requested ten zones, on reachable floor',()=>{assert.equal(SHELTER_MATERIALS.length,10);assert.equal(new Set(SHELTER_MATERIALS.map(m=>m.zone)).size,10);for(const m of SHELTER_MATERIALS){const map=WORLD_MAPS[m.zone],p=shelterSupplyProp(m,map);assert(hasFloor(map,p.x,p.y));assert(clearPoint(map,p.x,p.y));assert(worldPath(map,{x:map.spawn[0],y:map.spawn[1]},p).length,m.zone);}});
test('pickups are personal, one per participant, atomic against double clicks, and excluded roles cannot forge them',async()=>{const f=await fixture();try{
 const a={id:'bruno'},b={id:'alice'},m=SHELTER_MATERIALS[0];assert.equal((await f.s.snapshot(a)).shelters[0].built,false);assert.equal((await f.s.snapshot(a)).available.length,10);
 const attempts=await Promise.allSettled([f.s.collect(a,m.id,atMaterial(m)),f.s.collect(a,m.id,atMaterial(m))]);assert.equal(attempts.filter(p=>p.status==='fulfilled').length,1);assert(!((await f.s.snapshot(a)).available.includes(m.id)));assert((await f.s.snapshot(b)).available.includes(m.id));await f.s.collect(b,m.id,atMaterial(m));
 for(const id of ['maria-villegas','isabel','dani','dua-lingo']){assert.equal((await f.s.snapshot({id})).available.length,0);await assert.rejects(f.s.collect({id},m.id,atMaterial(m)),e=>e.status===403);}
 await assert.rejects(f.s.collect(a,SHELTER_MATERIALS[1].id,atMaterial(m)),e=>e.status===409);
 const maps=structuredClone(WORLD_MAPS);buildShelterProps(maps,await f.s.snapshot(a));assert(!maps[m.zone].props.some(p=>p.shelterSupply===m.id));buildShelterProps(maps,await f.s.snapshot({id:'carmine'}));assert.equal(maps[m.zone].props.filter(p=>p.shelterSupply===m.id).length,1);
 }finally{await f.close();}});
test('fixed cast assignments keep all 18 homes without staff and preserve construction, vitals and supplies',async()=>{
 const f=await fixture();let reloaded;try{
  assert.equal(SHELTER_ROSTERS.left.length,9);assert.equal(SHELTER_ROSTERS.right.length,9);
  assert.equal(new Set([...SHELTER_ROSTERS.left,...SHELTER_ROSTERS.right]).size,18);
  for(const character of SHELTER_ROSTERS.left)assert.equal(shelterForCharacter(character),'left');
  for(const character of SHELTER_ROSTERS.right)assert.equal(shelterForCharacter(character),'right');
  const people=SHELTER_ROSTERS.left;
  for(const id of people){
   const view=await f.s.snapshot({id});assert.equal(view.home,'left');assert.equal(view.shelters[0].members.length,9);
   assert.equal(view.shelters[1].members.length,9);
   assert.equal(f.s.teamFor({id},id),'left');
   for(const m of SHELTER_MATERIALS)await f.s.collect({id},m.id,atMaterial(m));
   await assert.rejects(f.s.contribute({id},'right',atDoor('right')),e=>e.status===409||e.status===403);
   const result=await f.s.contribute({id},'left',atDoor('left'));assert.equal(result.added,10);
  }
  const user={id:people[0]},view=await f.s.snapshot(user);
  assert.equal(view.shelters[0].percent,100);assert(view.shelters[0].built);
  await f.s.assertAccess(user,'refugio-1');
  await assert.rejects(f.s.assertAccess(user,'dormitorio-2'),e=>e.status===403);
  await assert.rejects(f.s.assertAccess({id:'maria-villegas'},'refugio-1'),e=>e.status===403);
  const other={id:SHELTER_ROSTERS.right[0]};
  await f.s.collect(other,SHELTER_MATERIALS[2].id,atMaterial(SHELTER_MATERIALS[2]));
  const vitals=createVitalsStore({db:f.db}),health=createHealthStore({db:f.db});
  await vitals.save(user.id,{health:61,hunger:37,energy:42,sleep:55,stress:29});
  const body=await health.loadBody(user.id);body.wetness=23;await health.saveBody(user.id,body);
  await f.db.run('INSERT INTO world_survival_state(id,state,updated) VALUES(?,?,?)','user:'+user.id,JSON.stringify({items:{rope:3,plank:4}}),1000);
  const savedView=await f.s.snapshot(user);await f.s.close();
  reloaded=createShelterService({db:f.db,now:()=>999999});await reloaded.ready;
  assert.deepEqual(await reloaded.snapshot(user),savedView);
  assert.deepEqual((await reloaded.snapshot(other)).inventory,[SHELTER_MATERIALS[2].id]);
  assert.equal((await vitals.load(user.id)).hunger,37);
  assert.equal((await health.loadBody(user.id)).wetness,23);
  assert.deepEqual(JSON.parse((await f.db.one('SELECT state FROM world_survival_state WHERE id=?','user:'+user.id)).state).items,{rope:3,plank:4});
 }finally{await reloaded?.close();await f.close();}
});

test('eliminated participants lose access but portraits and saved contributions remain',async()=>{
 const f=await fixture();try{
  const material=SHELTER_MATERIALS[0];
  await f.s.collect({id:'bruno'},material.id,atMaterial(material));
  await f.s.contribute({id:'bruno'},'left',atDoor('left'));
  const before=await f.s.snapshot({id:'bruno'});
  await f.db.run('INSERT INTO world_seasons(id,name,state,updated) VALUES(?,?,?,1)','antarctica-1','Apocalypse','{}');
  await f.db.run('INSERT INTO world_contestants(season,user_id,status,updated) VALUES(?,?,?,1)','antarctica-1','bruno','eliminated');
  await f.db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,1)','x-protocol-exclusions',JSON.stringify(['alice']));
  const after=await f.s.snapshot({id:'bruno'});
  assert.equal(after.eligible,false);
  assert.equal(after.home,null);
  assert.equal(after.shelters[0].members.length,9);
  assert.equal(after.shelters[1].members.length,9);
  assert.equal(after.shelters[0].members.find(p=>p.characterId==='bruno').active,false);
  assert.equal(after.shelters[1].members.find(p=>p.characterId==='alice').active,false);
  assert.deepEqual(after.shelters[0].counts,before.shelters[0].counts);
  assert.equal((await f.s.identity({id:'alice'})).active,false);
 }finally{await f.close();}
});
test('housing overrides survive reload and prior deliveries remain in their original shelters',async()=>{
 const f=await fixture();let reloaded;
 try{
  const resident={id:'bruno'},oldMaterial=SHELTER_MATERIALS[0],newMaterial=SHELTER_MATERIALS[1];
  await f.s.collect(resident,oldMaterial.id,atMaterial(oldMaterial));
  await f.s.contribute(resident,'left',atDoor('left'));
  // Older records used a timestamp rather than storing the delivery destination.
  const row=await f.db.one('SELECT state FROM world_environment WHERE id=?','shelters');
  const saved=JSON.parse(row.state);saved.delivered.bruno[oldMaterial.id]=1000;
  await f.db.run('UPDATE world_environment SET state=? WHERE id=?',JSON.stringify(saved),'shelters');
  await f.s.assign({characterId:'alice',home:null});
  await f.s.assign({characterId:'bruno',home:'right'});
  await f.s.collect(resident,newMaterial.id,atMaterial(newMaterial));
  await f.s.contribute(resident,'right',atDoor('right'));
  reloaded=createShelterService({db:f.db});await reloaded.ready;
  const view=await reloaded.snapshot(resident);
  assert.equal(view.home,'right');
  assert.equal(reloaded.teamFor(resident,'bruno'),'right');
  assert.equal(view.shelters[0].counts[oldMaterial.id],1);
  assert.equal(view.shelters[1].counts[oldMaterial.id],0);
  assert.equal(view.shelters[1].counts[newMaterial.id],1);
  assert.equal((await reloaded.snapshot({id:'alice'})).home,null);
 }finally{await reloaded?.close();await f.close();}
});
