import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../database.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';

test('Staff can clear states, restore needs and heal self or a player in the same World zone',async()=>{
 const player='care-player',outside='care-outside',route='/api/world/staff/player-care';
 const actors=[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:900,y:700},
  {id:player,character:'bruno',zone:'base',x:950,y:700,
   wellness:{conditions:[{id:'sprain',severity:48}],hygiene:{body:70},medicines:{water:2}}},
  {id:outside,character:'kareli',zone:'comida',x:950,y:700}
 ];
 const initial=createVitals({health:62,hunger:44,energy:55,sleep:66,stress:28,lastEatAt:321});
 const f=await liveFixture('staff-player-care',actors,{setup:async db=>{
  for(const id of [STAFF_ID,player])await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?)',id,JSON.stringify(initial),Date.now());
 }});
 const care=(target,action,as=STAFF_ID)=>f.call(route,as,'POST',{target,action});
 const view=()=>f.call('/api/world/health',player);
 try{
  await f.connect(STAFF_ID);
  const peer=await f.connect(player);
  await f.connect(outside);
  assert.equal((await care(player,'restore-health',player)).status,403);
  assert.equal((await care(outside,'restore-health')).status,409);
  assert.equal((await care(player,'unknown')).status,400);
  assert((await view()).body.conditions.some(c=>c.id==='sprain'));

  const clear=await care(player,'clear-states');
  assert.equal(clear.status,200,clear.error);
  assert.deepEqual(await f.until(()=>peer.messages.find(m=>m.type==='wellness'&&!m.body.conditions.length)).then(m=>m.body.conditions),[]);
  const cleared=await view();
  assert.equal(cleared.vitals.health,62);
  assert.equal(cleared.vitals.hunger,44);
  assert.equal(cleared.body.hygiene.body,70);
  assert.equal(cleared.body.medicines.water,2);

  const needs=await care(player,'restore-needs');
  assert.equal(needs.status,200,needs.error);
  const {health,hunger,energy,sleep,stress}=(await view()).vitals;
  assert.deepEqual({health,hunger,energy,sleep,stress},{health:62,hunger:100,energy:100,sleep:100,stress:0});

  const healed=await care(STAFF_ID,'restore-health');
  assert.equal(healed.status,200,healed.error);
  const self=(await f.call('/api/world/vitals',STAFF_ID)).vitals;
  assert.equal(self.health,100);
  assert.equal(self.hunger,44);
  assert.equal(self.stress,28);

  const db=await openDatabase(f.dataDir);
  try{
   const saved=JSON.parse((await db.one('SELECT state FROM world_vitals WHERE user_id=?',player)).state);
   assert.equal(saved.lastEatAt,321);
   assert.equal(saved.hunger,100);
   assert.deepEqual(JSON.parse((await db.one('SELECT state FROM world_wellness WHERE user_id=?',player)).state).conditions,[]);
  }finally{await db.close();}
 }finally{await f.close();}
});
