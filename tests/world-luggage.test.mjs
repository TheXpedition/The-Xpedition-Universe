import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {openDatabase} from '../database.mjs';
import {createSurvivalStore} from '../world-survival-service.mjs';
import {mountSurvivalPanel} from '../public/juegos/world-survival-ui.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {LUGGAGE,LUGGAGE_BY_ID,mergeLuggageShared} from '../public/juegos/world-luggage.mjs';
import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';
import {createWorldPlayer,worldPath,stepWorld,hasFloor,nearestPortal} from '../public/juegos/world-motion.mjs';
import {interactionPoint,objectAction} from '../public/juegos/world-interactions.mjs';
import {worldContext} from '../public/juegos/world-context.mjs';
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'xp-luggage-')),db=await openDatabase(dir);t.after(async()=>{await db.close();await fs.rm(dir,{recursive:true,force:true});});const a={id:'a'},b={id:'b'};for(const u of[a,b])await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',u.id,u.id,u.id,u.id+'@example.invalid','Dani','',Date.now());const context={near:()=>true,team:'Equipo 1'},store=createSurvivalStore({db});await store.ready;return {dir,db,store,a,b,context};}
test('shared suitcase has exactly one winner, survives reload and never recreates claimed items',async t=>{
 const {db,store,a,b,context}=await fixture(t),input={action:'take-luggage',id:'cabin-red-case',itemKey:'resource:coat',quantity:1};
 const result=await Promise.allSettled([store.act(a,{...input,requestId:'a'},context),store.act(b,{...input,requestId:'b'},context)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.match(result.find(r=>r.status==='rejected').reason.message,/ya recogió/);
 const sa=await store.snapshot(a,context),sb=await store.snapshot(b,context);assert.equal((sa.personal.items.coat||0)+(sb.personal.items.coat||0),1);assert.equal(sa.shared.luggage['cabin-red-case'].items['resource:coat'],undefined);assert.deepEqual(sa.shared.luggage,sb.shared.luggage);
 const reloaded=createSurvivalStore({db});await reloaded.ready;await assert.rejects(reloaded.act(b,input,context),/ya recogió/);
 assert.deepEqual((await reloaded.luggage(b,'cabin-grey-case',context)).luggage.items,LUGGAGE_BY_ID['cabin-grey-case'].contents,'other bags retain their own stock');
});
test('luggage requires proximity, rejects fabricated loot and rolls back when personal inventory is full',async t=>{
 const {db,store,a,context}=await fixture(t),input={action:'take-luggage',id:'cabin-grey-case',itemKey:'resource:battery',quantity:2};
 await assert.rejects(store.luggage(a,input.id,{near:()=>false}),/Acércate/);await assert.rejects(store.act(a,input,{near:()=>false}),/Acércate/);
 await assert.rejects(store.luggage(a,'constructor',context),/inexistente/);await assert.rejects(store.act(a,{...input,id:'toString'},context),/inexistente/);
 await assert.rejects(store.act(a,{...input,itemKey:'resource:wood'},context),/no pertenece/);await assert.rejects(store.act(a,{...input,quantity:0},context),/cantidad entera/);
 await store.snapshot(a,context);await db.run('UPDATE world_survival_state SET state=? WHERE id=?',JSON.stringify({items:{stone:40},charges:{},equipment:{},cooldowns:{},receipts:[]}),'user:a');
 const before=(await store.luggage(a,input.id,context)).luggage;await assert.rejects(store.act(a,input,context),/llena/);assert.deepEqual((await store.luggage(a,input.id,context)).luggage,before);
 await assert.rejects(store.act(a,{action:'restock-luggage'},context),/Dirección/);
});
test('food is transferred only to the picker, empty stock persists, and staff restocking is explicit',async t=>{
 const {store,a,b,context}=await fixture(t),bag='cabin-travel-case';
 for(const [itemKey,quantity]of Object.entries(LUGGAGE_BY_ID[bag].contents))await store.act(a,{action:'take-luggage',id:bag,itemKey,quantity,requestId:itemKey},context);
 assert.deepEqual((await store.luggage(b,bag,context)).luggage.items,{});assert.equal((await store.snapshot(b,context)).food.length,0);assert.equal((await store.snapshot(a,context)).food.find(f=>f.foodId==='apple').quantity,2);
 await assert.rejects(store.act(a,{action:'take-luggage',id:bag,itemKey:'food:apple',quantity:2,requestId:'food:apple'},context),/procesada/);
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps,(await store.snapshot(b,context)).shared);assert.equal(maps['avion-interior'].props.find(p=>p.survival?.id===bag).survival.remaining,0);
 await store.act(a,{action:'restock-luggage',id:bag},{...context,staff:true});assert.deepEqual((await store.luggage(b,bag,context)).luggage.items,LUGGAGE_BY_ID[bag].contents);
});
test('aircraft door, return and every luggage approach are on reachable floor, with the E anchor at the stair entrance',()=>{
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps);for(const id of ['avion','avion-interior']){const map=maps[id],p=map.props.find(p=>p.id===(id==='avion'?'enter-aircraft':'exit-aircraft')),actor=createWorldPlayer(id);actor.path=worldPath(map,actor,p.portal);for(let i=0;i<1500&&actor.path.length;i++)stepWorld(actor,{},.05,map);assert.equal(nearestPortal(actor,map)?.id,p.id);const context=worldContext(actor,nearestPortal(actor,map),null,maps,map);assert.equal(context.label,id==='avion'?'Entrar':'Salir');assert(context.anchor.y<map.walkBand[0]*map.height,'prompt sits on the visible doorway, above the walk lane');const back=maps[p.portal.zone].spawns[p.portal.toSpawn];assert(hasFloor(maps[p.portal.zone],back.x,back.y));}
 for(const bag of LUGGAGE){const map=maps[bag.zone],p=map.props.find(p=>p.survival?.id===bag.id),point=interactionPoint(map,p),actor=createWorldPlayer(map.id);assert(hasFloor(map,point.x,point.y));actor.path=worldPath(map,actor,point);for(let i=0;i<1500&&actor.path.length;i++)stepWorld(actor,{},.05,map);assert(Math.hypot(actor.x-point.x,actor.y-point.y)<50,bag.id);assert.equal(worldContext(actor,nearestPortal(actor,map),{prop:p,action:objectAction(p)},maps,map).label,'Abrir',bag.id+' is not shadowed by the exit door');}
});
test('luggage UI stays compact, shows individual PNG items and removes another player’s pickup in place',async()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main'),calls=[],id='cabin-red-case',data={personal:{items:{battery:2}},food:[],shared:{},luggage:{id,name:'Maleta de ropa',items:{'resource:coat':1,'resource:cloth':2},revision:0}};
 const panel=mountSurvivalPanel(root,{data,context:{kind:'luggage',id},onAction:async input=>{calls.push(input);return {...data,luggage:{...data.luggage,items:{'resource:cloth':2},revision:1}};}});
 assert.equal(root.querySelectorAll('.luggage-layout>section').length,2);assert(root.querySelector('.luggage-header img'));assert.equal(root.querySelectorAll('.survival-tabs button').length,0);root.querySelector('[data-item="resource:coat"]').click();const save=[...root.querySelectorAll('[data-survival-action]')].find(b=>JSON.parse(b.dataset.survivalAction).action==='take-luggage');assert(save);save.click();await new Promise(r=>setImmediate(r));assert.equal(calls[0].quantity,1);assert.equal(calls[0].id,id);assert.equal(root.querySelector('[data-item="resource:coat"]'),null);
 const scroll=root.querySelector('[data-scroll=content]');scroll.scrollTop=70;panel.update({shared:{luggage:{[id]:{items:{},revision:2,remaining:0}}}});assert(root.querySelector('.luggage-empty'));assert.equal(root.querySelector('[data-scroll=content]').scrollTop,70);panel.destroy();dom.window.close();
});
test('out-of-order broadcasts and action replies cannot restore an item someone already took',()=>{const id='cabin-red-case',newer={luggage:{[id]:{revision:3,items:{},remaining:0}}},older={luggage:{[id]:{revision:2,items:{'resource:coat':1},remaining:1}}};assert.deepEqual(mergeLuggageShared(newer,older).luggage[id],newer.luggage[id]);assert.equal(mergeLuggageShared(older,newer).luggage[id].remaining,0);});
test('reused suitcase sprites are real transparent PNGs with recorded source and no opaque background',async()=>{
 for(const name of ['maleta-roja.png','maleta-gris.png']){const file=new URL('../public/juegos/survival/'+name,import.meta.url),m=await sharp(await fs.readFile(file)).metadata();assert(m.hasAlpha);assert.equal(m.format,'png');const {data,info}=await sharp(await fs.readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(data[3],0);assert(data.some((n,i)=>i%4===3&&n>240));assert(info.width>60);}
 const provenance=JSON.parse(await fs.readFile(new URL('../design/apocalypse/aircraft-interior-source.json',import.meta.url)));assert.equal(provenance.generator,'Built-in image_gen');assert(!WORLD_MAPS['avion-interior'].provisionalArtwork);assert.notEqual(WORLD_MAPS['avion-interior'].illustration.url,WORLD_MAPS['tren-pasajeros'].illustration.url);
});
