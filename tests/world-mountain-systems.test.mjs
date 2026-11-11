import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {createWorldPlayer,worldPath,stepWorld,hasFloor,nearestPortal} from '../public/juegos/world-motion.mjs';
import {interactionPoint,objectAction} from '../public/juegos/world-interactions.mjs';
import {LUGGAGE} from '../public/juegos/world-luggage.mjs';
import {buildSurvivalProps,PROJECTS} from '../public/juegos/world-survival-catalog.mjs';
import {SEED_MEMORIALS,buildMemorialProps} from '../public/juegos/world-memorials.mjs';
import {SECURITY_CAMERAS} from '../public/juegos/world-surveillance.mjs';
import {createWorldSurveillance} from '../world-surveillance-service.mjs';
import {createWorldMemorials} from '../world-memorial-service.mjs';
import {openDatabase} from '../database.mjs';
test('bridge, four mountain stages, hut and cemetery gate have reachable round trips at the artwork',()=>{
 for(const [zone,to]of [['carretera-patrulla','montana-ladera'],['montana-ladera','caseta-montana'],['cementerio','cementerio-interior'],['cruce-comunicaciones','comunicaciones']]){
  const map=WORLD_MAPS[zone],door=map.props.find(p=>p.portal?.zone===to);assert(door?.hitRect,zone+' visible entrance');const actor=createWorldPlayer(zone);actor.path=worldPath(map,actor,door.portal);for(let t=0;t<1800&&actor.path.length;t++)stepWorld(actor,{},.05,map);assert.equal(nearestPortal(actor,map)?.zone,to);const target=WORLD_MAPS[to],arrival=target.spawns[door.portal.toSpawn];assert(hasFloor(target,arrival.x,arrival.y));assert(target.props.some(p=>p.portal?.zone===zone));
 }
 const stages=['montana-ladera','montana-escalinata','montana-cresta','montana-cima'];for(let i=1;i<stages.length;i++)assert.equal(WORLD_MAPS[stages[i-1]].props.find(p=>p.id==='road-east').portal.zone,stages[i]);assert(!WORLD_MAPS['montana-cima'].props.some(p=>p.id==='road-east'));
 assert(!WORLD_MAPS.comisaria.props.some(p=>p.portal?.zone==='comunicaciones'),'no hidden police-floor teleport');
});
test('mountain provisions are sparse finite stocks and the repair prompt sits on the confessional radio',()=>{
 const box=LUGGAGE.find(p=>p.id==='mountain-trail-chest'),shelf=LUGGAGE.find(p=>p.id==='mountain-hut-shelf');assert.equal(Object.values(box.contents).reduce((a,n)=>a+n,0),3);assert.equal(shelf.contents['resource:rope'],2);
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps,{projects:{radio:{ready:true}}});const radio=maps.confesionario.props.find(p=>p.survival?.id==='radio');assert(radio);assert.equal(PROJECTS.find(p=>p.id==='radio').zone,'confesionario');assert.equal(objectAction(radio).label,'Usar radio');assert(radio.contextAnchor.y<radio.approach.y);for(const id of ['mountain-trail-chest','mountain-hut-shelf','mountain-ridge-cache']){const def=LUGGAGE.find(p=>p.id===id),map=maps[def.zone],prop=map.props.find(p=>p.survival?.id===id),point=interactionPoint(map,prop);assert(hasFloor(map,point.x,point.y));}
});
test('five CCTV feeds show current public actors and zone speech, with no clinical or private fields',()=>{
 let t=10000;const map=WORLD_MAPS['comisaria-interior'],monitor=map.props.find(p=>p.surveillance),at=interactionPoint(map,monitor),viewer={user:{id:'viewer'},zone:{id:map.id},p:{...at},wellness:{life:{status:'alive'}}},actor={user:{id:'a'},zone:{id:'base'},p:{x:100,y:100},wellness:{life:{status:'alive'}}},secret={user:{id:'secret'},zone:{id:'confesionario',private:true},p:{x:2,y:3},wellness:{life:{status:'alive'}}},clients=new Map([[1,viewer],[2,actor],[3,secret]]),packets=[];
 const service=createWorldSurveillance({clients,send:(c,d)=>packets.push(d),now:()=>t,player:c=>({userId:c.user.id,name:c.user.id,zone:c.zone.id,x:c.p.x,y:c.p.y,characterId:'bruno',body:{secret:true},life:{cause:'secret'},inventory:{secret:true},state:'idle'}),fail:(status,m)=>{throw Object.assign(Error(m),{status});}});
 assert.equal(SECURITY_CAMERAS.length,5);assert.throws(()=>service.select(viewer,'refuge-west'),/Abre/);service.open(viewer);service.select(viewer,'refuge-west');let f=packets.at(-1);assert.deepEqual(f.players.map(p=>p.userId),['a']);for(const field of ['body','life','inventory'])assert(!(field in f.players[0]));assert.throws(()=>service.select(viewer,'confesionario'),/no tiene/);
 service.chat(actor,{id:'m',userId:'a',name:'A',text:'Hola desde el refugio',created:t,x:100,y:100});service.chat(actor,{id:'private',text:'SECRET',created:t,private:true});service.chat(secret,{id:'hidden',text:'SECRET',created:t});actor.p.x=240;t+=300;service.tick();f=packets.at(-1);assert.equal(f.players[0].x,240);assert.deepEqual(f.speech.map(m=>m.id),['m']);viewer.p.x+=400;t+=300;service.tick();assert.equal(packets.at(-1).type,'camera-closed');assert(!service.has('viewer'));
});
test('all 18 requested memorials remain and new fictional game deaths persist once across reload and revival',async()=>{
 const dir=fs.mkdtempSync(path.resolve('review/.memorial-test-')),db=await openDatabase(dir),maps=structuredClone(WORLD_MAPS);
 try{assert.equal(SEED_MEMORIALS.length,18);assert.equal(SEED_MEMORIALS[17].name,'Ima Ima Ame');const user={id:'memorial-test',name:'Participante de prueba'};await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',user.id,user.name,user.id,'memorial@example.invalid','Dani','',1);const store=createWorldMemorials({db,maps});await store.record(user,123);await Promise.all([store.record(user,456),createWorldMemorials({db,maps}).record({...user,name:'Nombre nuevo'},789)]);assert.equal((await db.all('SELECT id FROM world_memorials')).length,1);await db.run('INSERT INTO world_memorials(id,user_id,name,created) VALUES(?,?,?,?)','legacy-duplicate',user.id,user.name,900);const entries=await createWorldMemorials({db,maps}).refresh();assert.equal(entries.length,19);assert.equal(entries.at(-1).name,user.name);assert.equal(maps['cementerio-interior'].props.filter(p=>p.memorial).length,19);const grave=maps['cementerio-interior'].props.find(p=>p.memorial?.name===user.name);assert.equal(grave.painted,false);assert(grave.artWidth>0);assert(hasFloor(maps['cementerio-interior'],grave.approach.x,grave.approach.y));assert(!('cause'in entries.at(-1)));assert.equal((await db.all('SELECT id FROM users')).length,1,'seed memorials never create accounts');buildMemorialProps(maps,entries);assert.equal(maps['cementerio-interior'].props.filter(p=>p.memorial).length,19);
 }finally{await db.close();}
});
