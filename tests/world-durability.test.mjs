import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {openDatabase} from '../database.mjs';import {createSurvivalStore} from '../world-survival-service.mjs';import {createWellness,stepWellness} from '../public/juegos/world-wellness.mjs';import {createVitals} from '../public/juegos/world-vitals.mjs';import {syncClothing,wearGear,usableGear} from '../public/juegos/world-durability.mjs';
test('coats require an owned usable unit; weather and use wear gear only during online activity',()=>{
 const body=createWellness({clothing:'cold'}),empty={items:{}};syncClothing(empty,body);assert.equal(body.clothing,'heat');assert.equal(body.clothingOptions[1].owned,false);
 const gear={items:{coat:1,flashlight:1},equipment:{flashlight:true},charges:{flashlight:99999}},b=createWellness({clothing:'cold'});wearGear(gear,b,{seconds:60,moving:true,running:true,wetness:80,outside:1,now:1});assert(gear.condition.coat[0]<94);assert(gear.condition.flashlight[0]<100);assert(gear.condition.coat[0]<gear.condition.flashlight[0]);
 gear.condition.coat[0]=0;syncClothing(gear,b);assert.equal(b.clothing,'heat');assert.equal(usableGear(gear,'coat'),false);
 const a=createWellness(),v=createVitals({sleep:30,energy:30}),environment={weather:'clear',temperature:20,phase:'day'};
 const full=stepWellness(a,v,{seconds:5,environment,zone:'refugio-1',sleeping:true}),nap=stepWellness(a,v,{seconds:5,environment,zone:'refugio-1',sleeping:true,napping:true});assert(full.vitals.sleep>nap.vitals.sleep);assert(nap.vitals.sleep>v.sleep);
});
test('crafting, wear, storage, trade and mending conserve individual item condition without free repairs',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'xp-condition-')),db=await openDatabase(dir);t.after(async()=>{await db.close();await fs.rm(dir,{recursive:true,force:true});});
 const store=createSurvivalStore({db}),a={id:'condition-a'},b={id:'condition-b'},ctx={staff:true,team:'Equipo 1',near:()=>true,body:createWellness(),vitals:createVitals()};
 for(const u of [a,b])await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',u.id,u.id,u.id,u.id+'@example.invalid','Dani','',Date.now());
 const act=input=>store.act(a,input,ctx);assert.equal((await store.snapshot(a)).personal.items.coat,undefined);
 for(const [id,quantity]of Object.entries({cloth:8,rope:2}))await act({action:'grant',id,quantity});
 await act({action:'craft',id:'coat'});await act({action:'use',id:'coat'});assert.equal(ctx.body.clothing,'cold');
 await store.wear(a,ctx.body,{seconds:60,moving:true,outside:1});let state=(await store.snapshot(a)).personal;const condition=state.condition.coat[0];assert(condition<100);
 await act({action:'deposit',teamId:'left',itemKey:'resource:coat',quantity:1});assert.equal(ctx.body.clothing,'heat');await act({action:'withdraw',teamId:'left',itemKey:'resource:coat',quantity:1});assert.equal((await store.snapshot(a)).personal.condition.coat[0],condition);
 await store.transfer(a,b,'coat',1);assert.equal((await store.snapshot(b)).personal.condition.coat[0],condition);await store.transfer(b,a,'coat',1);assert.equal((await store.snapshot(a)).personal.condition.coat[0],condition);
 await assert.rejects(store.act(a,{action:'mend',id:'coat'},{...ctx,near:()=>false}),/Acércate/);await act({action:'mend',id:'coat'});assert.equal((await store.snapshot(a)).personal.condition.coat[0],100);
 await act({action:'grant',id:'fishing-rod',quantity:1});await store.catchFishing(a,{...ctx,zone:'puerto'});assert.equal((await store.snapshot(a)).personal.condition['fishing-rod'][0],97);
});
