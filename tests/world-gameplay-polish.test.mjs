import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {openDatabase} from '../database.mjs';
import {createSurvivalStore} from '../world-survival-service.mjs';
import {createWellness} from '../public/juegos/world-wellness.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {GATHER_NODES,RESOURCES,buildSurvivalProps,resourceArt} from '../public/juegos/world-survival-catalog.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {hasFloor,clearPoint} from '../public/juegos/world-motion.mjs';
import {actionAnchor} from '../public/juegos/world-context.mjs';
import {newGatherRound,resolveGatherNode} from '../public/juegos/world-gather-layout.mjs';
import {fishingCatch} from '../public/juegos/world-fishing.mjs';
import {mountPrayerPanel,PRAYER_REASONS} from '../public/juegos/world-prayer.mjs';
import {mountClinicPanel} from '../public/juegos/world-clinic-ui.mjs';
import {mountFoodPanel} from '../public/juegos/world-food-ui.mjs';
import {AvatarBank} from '../public/juegos/world-scene.mjs';
import {standActor} from '../world-actor-motion.mjs';
import {sleepPoseBounds,SLEEP_WIDTH_RATIOS} from '../public/juegos/world-sleep-art.mjs';
const next=()=>new Promise(r=>setImmediate(r));
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'xp-polish-')),db=await openDatabase(dir);t.after(async()=>{await db.close();await fs.rm(dir,{recursive:true,force:true});});let time=1800000000000;const user={id:'p'},ctx={staff:true,team:'Equipo 1',near:()=>true,body:createWellness({conditions:[{id:'depression',severity:35}]}),vitals:createVitals({stress:70,health:80})};await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)','p','P','p','p@example.invalid','Dani','',time);const store=createSurvivalStore({db,now:()=>time,random:()=>.3});await store.ready;return {db,store,user,ctx,act:i=>store.act(user,i,ctx),advance:n=>time+=n};}

test('sleeping figures keep character scale when the mattress grows, and waking never selects folded chair frames',()=>{
 assert.equal(Object.keys(SLEEP_WIDTH_RATIOS).length,22);
 for(const id of Object.keys(SLEEP_WIDTH_RATIOS)){const p={characterId:id,x:500,y:700},image={width:371,height:171},a=sleepPoseBounds(p,220,image,{x:500,y:800,artWidth:300}),b=sleepPoseBounds(p,220,image,{x:500,y:800,artWidth:600});assert.equal(a.width,b.width);assert(a.width<=220*1.03);assert(a.width>=220*.85);}
 const id='maria-villegas',actor={state:'sleep',sleeping:true,seat:{stand:{x:500,y:850}},p:{x:500,y:650,path:[],z:0},input:{x:0,y:0}};standActor(actor,20000);assert.equal(actor.action,null);assert.equal(actor.actionFrom,null);assert.equal(actor.p.y,850);
 const bank=new AvatarBank(),atlas={width:2560,height:2000};bank.cache.set(id,atlas);bank.sleepCache.set(id,{width:371,height:171});const calls=[],ctx=new Proxy({drawImage:(...a)=>calls.push(a)},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 for(const t of [20,20.2,20.5]){bank.draw(ctx,{...actor.p,...actor,characterId:id,grounded:true,moving:false,facing:-1},220,t);assert.equal(calls.at(-1)[1],0);assert.equal(calls.at(-1)[2],400,'upright idle row, not a sit/stand mesh');}
});

test('crafting stations stay indoors and light prompts anchor to the actual lamp, clear of the gardens',()=>{
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps);
 const benches=Object.values(maps).flatMap(m=>m.props.filter(p=>p.survival?.kind==='bench').map(p=>({map:m,prop:p})));assert.equal(benches.length,2);
 for(const {map,prop}of benches){assert(['refugio-1','dormitorio-2'].includes(map.id));assert(prop.survival.painted);assert(hasFloor(map,prop.approach.x,prop.approach.y));assert(clearPoint(map,prop.approach.x,prop.approach.y));}
 for(const map of Object.values(maps))for(const lamp of map.props.filter(p=>p.lightPoint))assert.deepEqual(actionAnchor(lamp),lamp.lightPoint);
 const base=maps.base,garden=base.props.find(p=>p.survival?.kind==='garden'),lamp=base.props.find(p=>p.lightPoint);assert(Math.abs(garden.x-lamp.approach.x)>base.width*.1);
});

test('random resource rounds change both stock and authored hiding spots while keeping every pickup reachable',()=>{
 const nodes=newGatherRound(GATHER_NODES,{},()=>.3),shared={nodes},maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps,shared);let moved=0;
 for(const original of GATHER_NODES){const n=resolveGatherNode(original,shared),p=maps[n.zone].props.find(p=>p.survival?.id===n.id);assert(p);assert.equal(Object.keys(n.loot).length,1);if(n.x!==original.x)moved++;assert(hasFloor(maps[n.zone],p.approach.x,p.approach.y));assert(clearPoint(maps[n.zone],p.approach.x,p.approach.y));assert(/<(?:img|svg)\b/.test(resourceArt(Object.keys(n.loot)[0]))||resourceArt(Object.keys(n.loot)[0]).includes('image'));}
 assert(moved>20);for(const r of RESOURCES)assert(/<(?:img|svg)\b/.test(resourceArt(r.id))||resourceArt(r.id).includes('image'));
});

test('staff alone can schedule new scavenging rounds, and automatic restocking waits for depletion and its interval',async t=>{
 const f=await fixture(t);await assert.rejects(f.store.act(f.user,{action:'restock-gather',randomize:true},{...f.ctx,staff:false}),/Dirección/);await assert.rejects(f.store.act(f.user,{action:'configure-gather',enabled:true,minutes:10},{...f.ctx,staff:false}),/Dirección/);
 await f.act({action:'configure-gather',enabled:true,minutes:10});await f.act({action:'restock-gather',randomize:true});f.advance(11*60000);await f.store.tick();assert.equal(f.store.public().gatherRound,1,'do not erase uncollected supplies');
 for(const n of GATHER_NODES)await f.act({action:'gather',id:n.id});await f.store.tick();assert.equal(f.store.public().gatherRound,2);assert(Object.values(f.store.public().nodes).every(n=>n.remaining===1));
 const restarted=createSurvivalStore({db:f.db,now:()=>1800000000000+11*60000});await restarted.ready;assert.equal(restarted.public().gatherAuto,true);assert.equal(restarted.public().gatherRound,2);
});

test('crafted fishing rods substantially improve fish odds but keep salvage and empty catches possible',async t=>{
 const counts={basic:0,improved:0};for(const [key,improved]of [['basic',false],['improved',true]])for(let i=0;i<1000;i++){let call=0;const caught=fishingCatch(improved,()=>call++? .4:i/1000);if(caught?.kind==='food')counts[key]++;}assert.equal(counts.basic,140);assert.equal(counts.improved,640);assert.equal(fishingCatch(true,()=>.7),null);assert.equal(fishingCatch(true,()=>.9).kind,'resource');
 const f=await fixture(t);assert.equal((await f.store.snapshot(f.user)).personal.items.flashlight,undefined,'a new player must make or find a flashlight');
 let caught=await f.store.catchFishing(f.user,f.ctx);assert.equal(caught.catch.kind,'resource');assert.equal(caught.personal.items.scrap,1);
 await f.act({action:'grant',id:'fishing-rod'});caught=await f.store.catchFishing(f.user,f.ctx);assert.equal(caught.catch.kind,'food');assert.equal(caught.food.find(i=>i.foodId==='river-fish').quantity,1);await assert.rejects(f.store.catchFishing(f.user,{...f.ctx,near:()=>false}),/Acércate/);
 await assert.rejects(f.act({action:'craft',id:'walkie'}),/Herramientas/);
});

test('discard removes only owned inventory, enforces quantities and cannot double-spend or modify communal stock',async t=>{
 const f=await fixture(t);await f.act({action:'grant',id:'wood',quantity:3});const results=await Promise.allSettled([f.act({action:'discard',itemKey:'resource:wood',quantity:2}),f.act({action:'discard',itemKey:'resource:wood',quantity:2})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.store.snapshot(f.user)).personal.items.wood,1);await assert.rejects(f.act({action:'discard',itemKey:'resource:wood',quantity:-1}),/entera/);await assert.rejects(f.act({action:'discard',itemKey:'food:apple'}),/cantidad/);assert.equal(f.store.public().chestCounts.left,0);
});

test('prayer is available at church contacts, eases stress only, and is rate limited without curing a diagnosis',async t=>{
 const f=await fixture(t),condition=structuredClone(f.ctx.body.conditions),health=f.ctx.vitals.health;await assert.rejects(f.store.act(f.user,{action:'pray',reason:'peace'},{...f.ctx,near:()=>false}),/Acércate/);await assert.rejects(f.act({action:'pray',reason:'invalid'}),/intención/);
 const result=await f.act({action:'pray',reason:'pregnancy'});assert.equal(result.vitals.stress,64);assert.equal(result.vitals.health,health);assert.deepEqual(result.body.conditions,condition);assert.equal(result.body.reproductive.pregnant,false);await assert.rejects(f.act({action:'pray',reason:'peace'}),/calma/);f.advance(10*60000);await f.act({action:'pray',reason:'peace'});assert.equal(f.ctx.vitals.stress,58);
 for(const id of ['iglesia','iglesia-interior']){const p=WORLD_MAPS[id].props.find(p=>p.prayer);assert(p);assert(hasFloor(WORLD_MAPS[id],p.approach.x,p.approach.y));}
});

test('prayer intentions require a deliberate confirmation; participant clinic tabs stay private even after role changes',async()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main'),calls=[];let panel=mountPrayerPanel(root,{onPray:async i=>{calls.push(i);return {message:'Estrés: −6.'};}});assert.equal(root.querySelectorAll('[data-prayer]').length,PRAYER_REASONS.length);root.querySelector('[data-prayer=food]').click();assert.equal(calls.length,0);root.querySelector('.prayer-start').click();await next();assert.deepEqual(calls,[{reason:'food'}]);panel.destroy();
 panel=mountClinicPanel(root,{mode:'notebook',data:{staff:false,nurse:false,record:{patient:{userId:'p'},history:[]}}});assert.equal(root.querySelector('[data-clinic-tab=library]'),null);assert.equal(root.querySelector('[data-clinic-tab=record]'),null);panel.update({nurse:true});root.querySelector('[data-clinic-tab=library]').click();assert(root.querySelector('.clinic-library'));panel.update({nurse:false});assert.equal(root.querySelector('.clinic-library'),null);panel.destroy();
 const food=mountFoodPanel(root,{mode:'inventory',data:{inventory:{capacity:48,items:[{foodId:'river-fish',quantity:1}]}},onDiscard:async input=>{calls.push(input);return {inventory:{capacity:48,items:[]}};}});root.querySelector('[data-food-id=river-fish]').click();root.querySelector('[data-food-action=discard]').click();await next();assert.deepEqual(calls.at(-1),{foodId:'river-fish'});assert.equal(root.querySelector('[data-food-id=river-fish]'),null);food.destroy();dom.window.close();
});
