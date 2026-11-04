import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createFoodStore,FOOD_INVENTORY_CAPACITY} from '../world-food-service.mjs';
import {FOOD_CATALOG} from '../public/juegos/world-foods.mjs';
const first=FOOD_CATALOG[0].id;
const stock=(snapshot,door,food=first)=>snapshot.teams.find(t=>t.id===door).slots.find(s=>s.foodId===food).quantity;
const quantity=(snapshot,food=first)=>snapshot.inventory.items.find(item=>item.foodId===food)?.quantity||0;
test('assigned shelter selects one food compartment even if an older team label differs',async()=>{const {db,store}=await fixture();try{const value=await store.snapshot('a',{team:'Equipo 2',teamId:'left'});assert(value.teams.find(t=>t.id==='left').canTake);assert(!value.teams.find(t=>t.id==='right').canTake);await assert.rejects(store.take('a',{teamId:'right',foodId:first},{team:'Equipo 2',teamId:'left'}),e=>e.status===403);await store.take('a',{teamId:'left',foodId:first},{team:'Equipo 2',teamId:'left'});}finally{await db.close();}});
const error=status=>e=>e.status===status;
async function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-foods-')),db=await openDatabase(dir);for(const id of ['a','b','staff'])await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','',1000);return {dir,db,store:createFoodStore({db,now:()=>1000})};}

test('both doors seed the full food catalog once; staff stock changes persist after reopen without touching private inventories',async()=>{
 const fixtureData=await fixture();let {db,store}=fixtureData;try{const initial=await store.snapshot('a',{team:'Equipo 1'});assert.equal(initial.teams.length,2);for(const team of initial.teams){assert.equal(team.slots.length,FOOD_CATALOG.length);assert(team.slots.every(item=>item.quantity===3));}assert.equal(initial.inventory.capacity,48);assert(initial.teams[0].canTake&&!initial.teams[1].canTake);
  await store.take('a',{teamId:'left',foodId:first},{team:'Equipo 1'});await store.manage('staff',{action:'empty',teamId:'left'},{staff:true});await db.close();db=await openDatabase(fixtureData.dir);store=createFoodStore({db});const reopened=await store.snapshot('a',{team:'Equipo 1'});assert(reopened.teams[0].slots.every(item=>item.quantity===0));assert.equal(stock(reopened,'right'),3);assert.equal(quantity(reopened),1);await store.manage('staff',{action:'fill'},{staff:true});const refilled=await store.snapshot('a');assert.equal(stock(refilled,'left'),3);assert.equal(quantity(refilled),1,'refilling the shared fridge cannot change a personal bag');
 }finally{await db.close();}
});

test('team allocation and personal inventory are enforced on the server, including staff-only stock management',async()=>{
 const {db,store}=await fixture();try{const item={teamId:'left',foodId:first};await assert.rejects(store.take('a',item,{team:''}),error(403));await assert.rejects(store.take('a',item,{team:'Equipo 2'}),error(403));await assert.rejects(store.manage('a',{action:'fill'},{staff:false}),error(403));
  await store.take('a',item,{team:'  EQUIPO   1 '});assert.equal(quantity(await store.snapshot('a')),1);assert.equal(quantity(await store.snapshot('b')),0);await store.manage('staff',{action:'rename',teamId:'left',name:'Aurora'},{staff:true});await assert.rejects(store.take('a',item,{team:'Equipo 1'}),error(403));await store.take('a',item,{team:'Aurora'});await store.take('b',{teamId:'right',foodId:first},{staff:true});assert.equal(quantity(await store.snapshot('a')),2);assert.equal(quantity(await store.snapshot('b')),1);await assert.rejects(store.manage('staff',{action:'rename',teamId:'right',name:' AURORA '},{staff:true}),error(409));
  for(const bad of [-1,1.5,100,'3',NaN])await assert.rejects(store.manage('staff',{action:'set',teamId:'left',foodId:first,quantity:bad},{staff:true}),error(400));await assert.rejects(store.take('a',{teamId:'left',foodId:'__proto__'},{staff:true}),error(400));await assert.rejects(store.take('a',{teamId:'unknown',foodId:first},{staff:true}),error(400));
 }finally{await db.close();}
});

test('two simultaneous requests for the last shared item give it to only one account',async()=>{
 const {db,store}=await fixture();try{await store.manage('staff',{action:'set',teamId:'left',foodId:first,quantity:1},{staff:true});const other=createFoodStore({db}),results=await Promise.allSettled([store.take('a',{teamId:'left',foodId:first},{team:'Equipo 1'}),other.take('b',{teamId:'left',foodId:first},{team:'Equipo 1'})]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===409).length,1);const a=await store.snapshot('a'),b=await store.snapshot('b');assert.equal(stock(a,'left'),0);assert.equal(quantity(a)+quantity(b),1);
 }finally{await db.close();}
});

test('only owned food can be eaten; a full reserve or failed nutrition write preserves the item and transaction',async()=>{
 const {db,store}=await fixture();try{let calls=0;await assert.rejects(store.consume('b',first,()=>{calls++;return {applied:true};}),error(409));assert.equal(calls,0);await store.take('a',{teamId:'left',foodId:first},{team:'Equipo 1'});
  const full=await store.consume('a',first,async()=>({applied:false,reason:'full'}));assert.equal(full.applied,false);assert.equal(quantity(await store.snapshot('a')),1);
  await assert.rejects(store.consume('a',first,async food=>{assert.equal(food,FOOD_CATALOG[0]);await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?)','a','{"health":12}',1000);throw Error('nutrition write aborted');}),/aborted/);assert.equal(await db.one('SELECT state FROM world_vitals WHERE user_id=?','a'),undefined);assert.equal(quantity(await store.snapshot('a')),1);
  const eaten=await store.consume('a',first,async food=>{await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?)','a',JSON.stringify({health:40+food.health}),1000);return {applied:true,vitals:{health:40+food.health}};});assert(eaten.applied);assert.equal(eaten.vitals.health,40+FOOD_CATALOG[0].health);assert.equal(quantity(await store.snapshot('a')),0);assert.equal(stock(await store.snapshot('a'),'left'),2,'eating consumes the personal item without taking a second portion from the fridge');await assert.rejects(store.consume('a',first,async()=>({applied:true})),error(409));
 }finally{await db.close();}
});

test('personal capacity counts portions across stacks and concurrent requests cannot overflow it',async()=>{
 const {db,store}=await fixture();try{await store.manage('staff',{action:'set',teamId:'left',foodId:first,quantity:99},{staff:true});const results=await Promise.allSettled(Array.from({length:49},()=>store.take('a',{teamId:'left',foodId:first},{team:'Equipo 1'})));assert.equal(results.filter(result=>result.status==='fulfilled').length,FOOD_INVENTORY_CAPACITY);assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===409).length,1);assert.equal(quantity(await store.snapshot('a')),48);assert.equal(stock(await store.snapshot('a'),'left'),51);await store.consume('a',first,async()=>({applied:true}));await store.take('a',{teamId:'left',foodId:first},{team:'Equipo 1'});assert.equal(quantity(await store.snapshot('a')),48);
 }finally{await db.close();}
});

test('staff add and remove quantities atomically without changing other products or private food',async()=>{
 const {db,store}=await fixture();try{await store.manage('staff',{action:'adjust',teamId:'left',foodId:first,amount:5},{staff:true});assert.equal(stock(await store.snapshot('a'),'left'),8);await store.manage('staff',{action:'adjust',teamId:'left',foodId:first,amount:-2},{staff:true});const result=await store.snapshot('a');assert.equal(stock(result,'left'),6);assert.equal(stock(result,'right'),3);assert.equal(quantity(result),0);for(const amount of [-7,94])await assert.rejects(store.manage('staff',{action:'adjust',teamId:'left',foodId:first,amount},{staff:true}),error(409));await assert.rejects(store.manage('a',{action:'adjust',teamId:'left',foodId:first,amount:1}),error(403));assert.equal(stock(await store.snapshot('a'),'left'),6);
 }finally{await db.close();}
});
