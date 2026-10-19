import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {createProgression,levelFor} from '../progression.mjs';
process.env.DATABASE_URL='';process.env.PERSISTENCE_MODE='local';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xpedition-economy-')),db=await openDatabase(dir);
const shop=JSON.parse(fs.readFileSync(new URL('../public/simulator/catalog.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url)));
let clock=Date.UTC(2026,9,19,16),queue=Promise.resolve();const serialize=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
const progression=createProgression({db,shop,catalog,body:async req=>req.payload,json:(res,result,status=200)=>Object.assign(res,{result,status}),fail:(status,message)=>{throw Object.assign(new Error(message),{status});},checkRate:()=>{},serialize,notify:()=>{},now:()=>clock});
const advance=seconds=>clock+=seconds*1000;
async function user(){const id=randomUUID();await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','Mi próxima aventura empieza aquí.',clock);const user=await db.one('SELECT * FROM users WHERE id=?',id);await progression.bootstrap(user);return user;}
async function request(user,url,method='GET',payload={}){const res={};try{const action=()=>progression.handle({method,payload},res,new URL(url,'https://test.invalid'),user);if(method==='GET')await action();else await serialize(action);return {status:res.status,...res.result};}catch(e){if(!e.status)throw e;return {status:e.status,error:e.message};}}
after(()=>db.close());

test('el catálogo incluye los 152 personajes, los 36 iniciales y solo cuatro regalos para reclamar',()=>{
 const chars=shop.items.filter(i=>i.kind==='character');assert.equal(chars.length,152);assert.equal(chars.filter(i=>i.starter).length,36);
 assert.deepEqual(chars.filter(i=>!i.starter&&!i.price).map(i=>i.name).sort(),['Alex Yohender','Daniel Sims','Lily Louvre','Vladimir']);
 assert(chars.find(i=>i.name==='Dua Lingo').starter);assert(!chars.find(i=>i.name==='Bonju').starter);
 const premium=['Bonju','Dios','Britney Britney','Jiafei','Heidi Cum','Ariana Glande','Chad Gil Pete','Candy Cookies','Vitany Glambert','Cassandra Louvre','Maria Isabel','Eduardo Buñuelo'];
 assert(chars.filter(i=>premium.includes(i.name)).every(i=>i.price>=220&&i.premium));assert(chars.filter(i=>!i.premium&&!i.starter&&i.price).every(i=>i.price===65));
 for(const i of chars)assert(['Ella / She','Él / He'].includes(i.pronouns));
 assert.equal(chars.find(i=>i.name==='Britney Britney').talent,'Hacer Playback');assert.equal(chars.find(i=>i.name==='Gustavo').talent,'Cobrar la Renta');assert.equal(chars.find(i=>i.name==='Emily Waldorf').talent,'Servir café en el aeropuerto');
});
test('bienvenida y visita diaria se acreditan una sola vez, sin mezclar tickets con monedas',async()=>{
 const u=await user();assert.deepEqual(await progression.wallet(u.id),{tickets:15,coins:80,xp:0,level:1,levelStart:0,nextLevelXP:60});
 await progression.bootstrap(u);await request(u,'/api/economy?surface=simulator');await request(u,'/api/economy?surface=simulator');assert.equal((await progression.wallet(u.id)).tickets,15);assert.equal((await progression.wallet(u.id)).coins,110);
});
test('biografía, pronombres, otros datos, seguimientos y Mi lista no se repiten al quitar y añadir',async()=>{
 const u=await user(),v=await user();const p={...u,bio:'Esta es mi historia.',pronouns:'Ella / She',gender_identity:'Mujer',orientation:'Bisexual'};
 for(let i=0;i<3;i++){await progression.profile(p,{avatar:'Violeta'});await progression.follow(u.id,v.id);await progression.follow(u.id,'char:dani');await progression.saved(u.id,['safari','antarctica']);}
 assert.equal((await progression.wallet(u.id)).tickets,15+20+40+2+10);assert.equal((await progression.wallet(v.id)).tickets,16);
});
test('reclamar, comprar en paralelo, precios del servidor y saldo insuficiente conservan la colección',async()=>{
 const u=await user();await request(u,'/api/economy?surface=simulator');
 await Promise.all([request(u,'/api/economy/buy','POST',{item:'character:vladimir'}),request(u,'/api/economy/buy','POST',{item:'character:vladimir'})]);
 assert.equal((await progression.wallet(u.id)).coins,110);assert.equal((await progression.wallet(u.id)).tickets,17);
 await Promise.all([request(u,'/api/economy/buy','POST',{item:'character:edwin',price:0}),request(u,'/api/economy/buy','POST',{item:'character:edwin',price:0})]);
 assert.equal((await progression.wallet(u.id)).coins,45);assert.equal((await progression.wallet(u.id)).tickets,19);
 assert.equal((await request(u,'/api/economy/buy','POST',{item:'character:bonju',price:0})).status,409);
 assert(!(await progression.view(u.id)).owned.includes('character:bonju'));assert.equal((await progression.wallet(u.id)).coins,45);
});
test('solo Antarctica está abierta al inicio, Safari se abre en 2, Traitor en 5 y World es la compra más cara',async()=>{
 const u=await user();assert(await progression.canPlay(u.id,'antarctica'));for(const m of ['safari','traitor','cruise','house','race','world','japan'])assert(!await progression.canPlay(u.id,m));
 await progression.grant(u.id,'qa:level2',{xp:60});assert.equal(levelFor(60),2);assert(await progression.canPlay(u.id,'safari'));
 await progression.grant(u.id,'qa:level5',{xp:520,coins:1500});assert(await progression.canPlay(u.id,'traitor'));assert(!await progression.canPlay(u.id,'house'));
 assert.equal((await request(u,'/api/economy/buy','POST',{item:'mode:house'})).status,200);assert(await progression.canPlay(u.id,'house'));
 assert(shop.modes.filter(m=>m.id!=='world').every(m=>m.price<shop.modes.find(m=>m.id==='world').price));assert(!await progression.canPlay(u.id,'japan'));
});
test('partidas privadas, una partida activa y conflictos de revisión impiden sobrescribir otra ventana',async()=>{
 const u=await user(),v=await user();assert.equal((await request(null,'/api/economy')).status,401);assert.equal((await request(u,'/api/game-runs','POST',{mode:'world'})).status,403);
 const started=await request(u,'/api/game-runs','POST',{mode:'antarctica'}),id=started.run.id;
 assert.equal((await request(u,'/api/game-runs','POST',{mode:'antarctica'})).status,409);assert.equal((await request(v,'/api/game-runs/'+id)).status,404);
 const snap={version:1,engine:'game',point:'setup',state:{vars:{selected18:['Dani','Dua Lingo']}}};
 assert.equal((await request(u,'/api/game-runs/'+id,'PUT',{revision:0,snapshot:snap,episode:0})).revision,1);
 assert.equal((await request(u,'/api/game-runs/'+id,'PUT',{revision:0,snapshot:{...snap,point:'stale'},episode:0})).status,409);
 assert.deepEqual((await request(u,'/api/game-runs/'+id)).run.snapshot,snap);
 assert.equal((await request(u,'/api/game-runs/'+id+'/abandon','POST')).status,200);assert.equal((await request(u,'/api/game-runs')).runs[0].status,'archived');
});
test('elecciones propias dan más XP que azar, la misma elección no se paga dos veces y los artículos deben pertenecer a la cuenta',async()=>{
 const u=await user(),run=(await request(u,'/api/game-runs','POST',{mode:'antarctica'})).run;
 advance(2);const a=await request(u,'/api/game-runs/'+run.id+'/decision','POST',{kind:'character',value:'Dani'});assert.equal(a.wallet.xp,4);
 advance(2);const repeat=await request(u,'/api/game-runs/'+run.id+'/decision','POST',{kind:'character',value:'Dani'});assert.equal(repeat.wallet.xp,4);
 advance(2);const b=await request(u,'/api/game-runs/'+run.id+'/decision','POST',{kind:'random',value:'Random Cast'});assert.equal(b.wallet.xp,5);
 advance(2);assert.equal((await request(u,'/api/game-runs/'+run.id+'/decision','POST',{kind:'character',value:'Jiafei'})).status,403);
});
test('tiempo activo limitado por el reloj del servidor y finalizaciones repetidas no duplican premios',async()=>{
 const u=await user(),run=(await request(u,'/api/game-runs','POST',{mode:'antarctica'})).run;
 assert.equal((await request(u,'/api/game-runs/'+run.id+'/finish','POST',{winner:'Dani'})).status,409);
 await request(u,'/api/economy/activity','POST',{surface:'simulator',route:'simuladores',seconds:999999,run:run.id});
 assert.equal(Number((await db.one('SELECT active_seconds FROM game_runs WHERE id=?',run.id)).active_seconds),0);
 for(let episode=1;episode<=4;episode++){advance(20);await request(u,'/api/economy/activity','POST',{surface:'simulator',route:'simuladores',seconds:20,run:run.id});assert.equal((await request(u,'/api/game-runs/'+run.id,'PUT',{revision:episode-1,episode,snapshot:{version:1,engine:'game',point:'core:6'}})).status,200);}
 const before=await progression.wallet(u.id);const won=await request(u,'/api/game-runs/'+run.id+'/finish','POST',{winner:'Dani'});assert(won.rewarded);assert.equal(won.wallet.tickets-before.tickets,43);assert.equal(won.wallet.level,2);
 const repeated=await request(u,'/api/game-runs/'+run.id+'/finish','POST',{winner:'Dani'});assert(repeated.alreadyFinished);assert.deepEqual(repeated.wallet,won.wallet);
});
test('Vs. The World congela los representantes elegidos y el bonus en solitario es mayor',async()=>{
 async function finishWorld(reps){const u=await user();await progression.grant(u.id,'qa:unlock',{xp:1320,coins:2000});await request(u,'/api/economy/buy','POST',{item:'mode:world'});const run=(await request(u,'/api/game-runs','POST',{mode:'world'})).run;
  for(let episode=1;episode<=4;episode++){advance(20);await request(u,'/api/economy/activity','POST',{surface:'simulator',route:'simuladores',seconds:20,run:run.id});await request(u,'/api/game-runs/'+run.id,'PUT',{revision:episode-1,episode,representatives:episode===1?reps:['Dua Lingo'],snapshot:{version:1,engine:'game',point:'world:renderTrack'}});}
  assert.deepEqual(JSON.parse((await db.one('SELECT representatives FROM game_runs WHERE id=?',run.id)).representatives),reps);
  const before=await progression.wallet(u.id),after=await request(u,'/api/game-runs/'+run.id+'/finish','POST',{winner:reps[0]});return after.wallet.tickets-before.tickets;
 }
 assert.equal(await finishWorld(['Dani']),100);assert.equal(await finishWorld(['Dani','Dua Lingo']),70);
});
test('publicaciones, comentarios y grupos tienen límites diarios y deduplican el contenido',async()=>{
 const u=await user();for(let i=0;i<10;i++)await progression.socialAction(u.id,'post','post-'+i,'Esta publicación contiene una historia.');assert.equal((await progression.wallet(u.id)).tickets,30);
 for(let i=0;i<10;i++)await progression.socialAction(u.id,'comment','same','Buen episodio');assert.equal((await progression.wallet(u.id)).tickets,32);
 for(let i=0;i<10;i++)await progression.socialAction(u.id,'group','same-members');assert.equal((await progression.wallet(u.id)).tickets,37);
});
test('monedas, inventario y partidas permanecen al reabrir la base de datos',async()=>{
 const u=await user();await request(u,'/api/economy/buy','POST',{item:'character:vladimir'});const run=(await request(u,'/api/game-runs','POST',{mode:'antarctica'})).run;const reopened=await openDatabase(dir);
 try{assert.equal((await reopened.one('SELECT tickets FROM user_progression WHERE user_id=?',u.id)).tickets,18);assert(await reopened.one('SELECT 1 FROM economy_inventory WHERE user_id=? AND item_id=?',u.id,'character:vladimir'));assert(await reopened.one('SELECT 1 FROM game_runs WHERE id=? AND user_id=?',run.id,u.id));}finally{await reopened.close();}
});
