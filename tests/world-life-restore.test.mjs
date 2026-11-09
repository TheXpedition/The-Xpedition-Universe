import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createWorldLife} from '../world-life-service.mjs';
import {createHealthStore} from '../world-health-service.mjs';
import {createWellness} from '../public/juegos/world-wellness.mjs';
import {deceasedParticipantsMarkup} from '../public/juegos/world-life-ui.mjs';

test('Direction lists deceased offline and morgue participants and chooses how to restore their inventories',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'world-life-restore-')));
 const healthStore=createHealthStore({db}),reset=[];
 try{
  for(const id of ['keep','reset','alive']){
   await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani',1);
   await healthStore.saveBody(id,createWellness({life:{status:id==='alive'?'alive':'dead',corpse:id==='reset',at:10,zone:'base'},medicines:{dressing:3}}));
   await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?)',id,'apple',4,1);
  }
  const service=createWorldLife({db,healthStore,clientFor:()=>null,canDirect:async user=>user.id==='staff',isNurse:async()=>false,body:async req=>req.input,json:(res,value)=>res.value=value,fail:(status,message)=>{throw Object.assign(Error(message),{status});},vitalsStore:{save:async()=>{}},resetInventory:async id=>reset.push(id)});
  async function call(endpoint,id='staff',input){
   const res={};
   await service.handle({method:input?'POST':'GET',input},res,new URL('http://test/api/world/life/'+endpoint),{id});
   return res.value;
  }
  await assert.rejects(call('deceased','alive'),{status:403});
  const {players}=await call('deceased');
  assert.deepEqual(players.map(p=>p.id),['keep','reset']);
  const markup=deceasedParticipantsMarkup(players);
  assert.match(markup,/Revivir desde 0/);
  assert.match(markup,/Revivir con su inventario completo/);
  await assert.rejects(call('revive','alive',{target:'keep',mode:'keep'}),{status:403});
  await assert.rejects(call('revive','staff',{target:'keep',mode:'keep',deathAt:9}),{status:409});
  for(const id of ['keep','reset']){
   const result=await call('revive','staff',{target:id,mode:id,deathAt:10});
   const saved=await healthStore.loadBody(id);
   const food=await db.one('SELECT quantity FROM world_food_inventory WHERE user_id=? AND food_id=?',id,'apple');
   assert.equal(result.inventoryReset,id==='reset');
   assert.equal(saved.life.status,'alive');
   assert.equal(saved.medicines.dressing,id==='keep'?3:0);
   assert.equal(food?.quantity??0,id==='keep'?4:0);
  }
  assert.deepEqual(reset,['reset']);
  assert.deepEqual((await call('deceased')).players,[]);
  await assert.rejects(call('revive','staff',{target:'keep',mode:'reset'}),{status:409});
 }finally{await db.close();}
});
