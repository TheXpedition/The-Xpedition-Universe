import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {createProgression} from '../progression.mjs';
import {createShowdownGame} from '../showdown-game.mjs';
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-showdown-')),db=await openDatabase(dataDir),shop=JSON.parse(fs.readFileSync(new URL('../public/simulator/catalog.json',import.meta.url))),characters=JSON.parse(fs.readFileSync(new URL('../public/showdown/characters.json',import.meta.url)));
let stamp=2000000000000;const events=[],pushes=[];const fail=(status,message)=>{throw Object.assign(new Error(message),{status});},json=(res,result,status=200)=>Object.assign(res,{result,status});let tail=Promise.resolve();
const serialize=fn=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;};
const context={db,shop,catalog:{characters},body:async req=>req.payload,checkRate(){},json,fail,serialize,notify:(...args)=>events.push(args),now:()=>stamp};
const progression=createProgression(context);const options={...context,progression,characters,messageView:async m=>({...m,sender:{id:m.sender,name:'Invitador'}}),pushNotifications:{notifyMessage:async m=>pushes.push(m)}};
let game=createShowdownGame(options);after(async()=>{await game.close();await db.close();});
async function user(coins=1500){const id=randomUUID();await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,'QA '+id.slice(0,5),id,id+'@example.invalid','Dani',stamp);await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,0,?,0)',id,coins);return {id,name:'QA '+id.slice(0,5),avatar:'Dani'};}
async function request(actor,path='',method='GET',payload={}){const res={setHeader(){}};try{const req={method,payload},url=new URL('http://localhost/api/showdown'+path);await game.handle(req,res,url,actor);return {status:res.status,...res.result};}catch(error){if(!error.status)throw error;return {status:error.status,error:error.message};}}
async function buy(actor){const res={};try{await progression.handle({method:'POST',payload:{item:'mode:showdown'}},res,new URL('http://localhost/api/economy/buy'),actor);return {status:res.status,...res.result};}catch(error){if(!error.status)throw error;return {status:error.status};}}
const make=(u,mode='solo',format=3)=>request(u,'/rooms','POST',{mode,format});
const choose=(u,id,c)=>request(u,'/rooms/'+id+'/character','POST',{character:c});
const starter=shop.items.filter(i=>i.kind==='character'&&i.starter).map(i=>i.id.replace('character:',''));

test('Showdown sustituye a Japan, cuesta exactamente 1000 una vez y está disponible en nivel 1 para cada jugador',async()=>{
 const mode=shop.modes.find(m=>m.id==='showdown');assert.equal(mode.price,1000);assert.equal(mode.noLevelRequirement,true);assert(!mode.upcoming);assert(!shop.modes.some(m=>m.id==='japan'));
 const actor=await user(),poor=await user(999);assert.equal((await request(null)).status,401);assert.equal((await make(actor)).status,403);assert.equal((await buy(poor)).status,409);
 assert.equal((await buy(actor)).wallet.coins,500);assert.equal((await buy(actor)).wallet.coins,500);assert.equal(await progression.canPlay(actor.id,'showdown'),true);assert.equal((await progression.wallet(actor.id)).level,1);
 assert.equal((await make(actor)).status,201);assert.equal((await request(actor)).owned,true);assert((await request(actor)).ownedCharacters.length>=30);
});

test('invitaciones llegan al chat y al aviso, no se duplican y cada invitado tiene que comprar antes de entrar',async()=>{
 const host=await user(),friend=await user(),outsider=await user();await buy(host);const {room}=await make(host,'multi');const token=room.shareUrl.split('/').at(-1);
 assert.equal((await request(outsider,'/rooms/'+room.id)).status,403);assert.equal((await request(friend,'/rooms/'+room.id+'?invite='+token)).preview.id,room.id);
 const invites=await Promise.all([request(host,'/rooms/'+room.id+'/invite','POST',{userId:friend.id}),request(host,'/rooms/'+room.id+'/invite','POST',{userId:friend.id})]);assert.equal(invites.filter(r=>r.alreadySent===false).length,1);assert.equal((await db.one("SELECT COUNT(*) AS n FROM messages WHERE type='showdown-invite'")).n,1);assert(events.some(([ids,type])=>ids.includes(friend.id)&&type==='showdown-invite'));assert.equal(pushes.length,1);
 assert.equal((await request(friend,'/rooms/'+room.id+'/join','POST',{token})).status,403);await buy(friend);
 const joined=await request(friend,'/rooms/'+room.id+'/join','POST',{token});assert.equal(joined.status,200);assert.equal(joined.room.people.length,2);
 assert.equal((await request(outsider,'/rooms/'+room.id+'/join','POST',{token:'fake'})).status,403);
 assert.equal((await request(outsider,'/rooms/'+room.id+'/chat')).status,403);
 const message=await request(friend,'/rooms/'+room.id+'/chat','POST',{id:randomUUID(),text:'Hola desde otro bracket.'});assert.equal(message.messages[0].text,'Hola desde otro bracket.');assert.equal((await request(host,'/rooms/'+room.id+'/chat')).messages[0].sender,friend.id);
});

test('elección de personajes, pago compartido y mínimo/máximo del elenco se validan en el servidor',async()=>{
 const host=await user(),friend=await user();await buy(host);await buy(friend);const {room}=await make(host,'multi'),id=room.id,token=room.shareUrl.split('/').at(-1);
 await choose(host,id,starter[0]);assert.equal((await request(host,'/rooms/'+id+'/start','POST',{fillBots:true})).status,409);
 await request(friend,'/rooms/'+id+'/join','POST',{token});assert.equal((await choose(friend,id,starter[0])).status,409);await choose(friend,id,starter[1]);
 assert.equal((await request(friend,'/rooms/'+id+'/start','POST',{fillBots:true})).status,403);assert.equal((await request(host,'/rooms/'+id+'/start','POST',{fillBots:false})).status,409);
 const started=await request(host,'/rooms/'+id+'/start','POST',{fillBots:true});assert.equal(started.status,200);assert.equal(started.room.players.length,18);assert.equal(started.room.groups.length,3);
 const state=game._cache.get(id).state;assert.equal(state.players.length,18);assert.equal(state.players.filter(p=>p.bot).length,16);
 assert.equal((await choose(friend,id,starter[2])).status,409);assert.equal((await request(host,'/rooms/'+id+'/action','POST',{type:'pause'})).status,403);
 const privateView=JSON.stringify((await request(host,'/rooms/'+id)).room);assert(!privateView.includes('random'));assert(!privateView.includes('tieOrder'));assert(!privateView.includes('rankingPoints'));assert(!privateView.includes('botHits'));
});

test('una sala nunca admite más de 18 personas y el propietario puede salir sin romperla',async()=>{
 const accounts=await Promise.all(Array.from({length:19},()=>user()));for(const u of accounts)await buy(u);const {room}=await make(accounts[0],'multi'),token=room.shareUrl.split('/').at(-1);
 for(const u of accounts.slice(1,18))assert.equal((await request(u,'/rooms/'+room.id+'/join','POST',{token})).status,200);
 assert.equal((await request(accounts[18],'/rooms/'+room.id+'/join','POST',{token})).status,409);
 assert.equal((await request(accounts[0],'/rooms/'+room.id+'/leave','POST')).status,200);const owner=(await request(accounts[1],'/rooms/'+room.id)).room;assert.equal(owner.host,accounts[1].id);assert.equal(owner.people.length,17);
});

test('guardado y reinicio mantienen personajes, estrellas, historial y campeón sin filtrar puntos privados',async()=>{
 const actor=await user(),friend=await user();await buy(actor);await buy(friend);let {room}=await make(actor,'multi'),id=room.id;await request(friend,'/rooms/'+id+'/join','POST',{token:room.shareUrl.split('/').at(-1)});await choose(actor,id,starter[0]);await choose(friend,id,starter[1]);await request(actor,'/rooms/'+id+'/start','POST',{fillBots:true});
 let state=game._cache.get(id).state;for(let n=0;n<15;n++){stamp=state.deadline;room=(await request(actor,'/rooms/'+id)).room;}
 const before=JSON.parse(JSON.stringify(game._cache.get(id).state));await game.close();game=createShowdownGame(options);
 room=(await request(actor,'/rooms/'+id)).room;state=game._cache.get(id).state;assert.equal(state.phase,before.phase);assert.deepEqual(state.track,before.track);assert.deepEqual(state.players.map(p=>p.stars),before.players.map(p=>p.stars));
 let guard=0;while(state.status==='running'&&guard++<200){stamp=state.deadline;room=(await request(actor,'/rooms/'+id)).room;}
 assert.equal(room.status,'finished');assert(room.winner||room.endedReason==='no-humans');assert.equal(Object.keys(room.track).length,18);assert(!JSON.stringify(room).includes('rankingPoints'));assert(room.winner?room.episodes.length===13:room.episodes.length<=13);assert((await progression.wallet(actor.id)).coins>500);
 await game.close();game=createShowdownGame(options);assert.equal((await request(actor,'/rooms/'+id)).room.winner,room.winner);
});

test('una transacción SQLite que falla no revierte operaciones concurrentes de otra petición',async()=>{
 const actor=await user();let entered,continueTx;const inside=new Promise(r=>entered=r),resume=new Promise(r=>continueTx=r);
 const transaction=db.transaction(async()=>{await db.run('UPDATE user_progression SET coins=100 WHERE user_id=?',actor.id);entered();await resume;throw new Error('rollback esperado');}).catch(()=>{});
 await inside;const outside=db.run('UPDATE user_progression SET tickets=77 WHERE user_id=?',actor.id);continueTx();await transaction;await outside;
 const row=await db.one('SELECT coins,tickets FROM user_progression WHERE user_id=?',actor.id);assert.equal(row.coins,1500);assert.equal(row.tickets,77);
});

test('solo el líder puede volver a simular; todos reciben el nuevo elenco vacío y se conserva la temporada anterior',async()=>{
 const owner=await user(),friend=await user();await buy(owner);await buy(friend);const {room}=await make(owner,'multi'),id=room.id;await request(friend,'/rooms/'+id+'/join','POST',{token:room.shareUrl.split('/').at(-1)});
 const old=game._cache.get(id).state;old.status='finished';old.phase='finished';old.endedReason='no-humans';old.track={saved:{s1:'ELIM'}};old.revision++;await game.flush();
 assert.equal((await request(friend,'/rooms/'+id+'/restart','POST')).status,403);
 const replay=await request(owner,'/rooms/'+id+'/restart','POST');assert.equal(replay.status,200);const next=replay.room.nextRoom;assert(next&&next!==id);assert.equal((await request(friend,'/rooms/'+id)).room.nextRoom,next);
 const lobby=(await request(friend,'/rooms/'+next)).room;assert.equal(lobby.status,'lobby');assert.equal(lobby.host,owner.id);assert.equal(lobby.players.length,2);assert(lobby.players.every(p=>p.character===null));assert.deepEqual(replay.room.track,{saved:{s1:'ELIM'}});
 assert.equal((await request(owner,'/rooms/'+id+'/restart','POST')).room.nextRoom,next);assert.equal((await progression.wallet(owner.id)).coins,500);assert.equal((await progression.wallet(friend.id)).coins,500);
});

test('solo guarda sus escenas manuales sin avanzar por el reloj y valida colección y conflictos de otra ventana',async()=>{
 const actor=await user();await buy(actor);const {room}=await make(actor),id=room.id,p='/rooms/'+id;const snapshot={version:1,stage:'cast',vars:{episode:1,advFormat:3,castSize:18,selected18:[],groups:{Rosa:[],Dorado:[],Rojo:[]},trackData:[],finalRank:{}},cast:characters.filter(c=>starter.includes(c.id)).slice(0,18).map(c=>c.name)};
 const saved=await request(actor,p+'/solo','POST',{revision:0,snapshot});assert.equal(saved.status,200);assert.equal(saved.revision,1);stamp+=100000;assert.deepEqual((await request(actor,p)).room.soloSnapshot,snapshot);assert.equal((await request(actor,p)).room.phase,'solo');
 assert.equal((await request(actor,p+'/solo','POST',{revision:0,snapshot})).status,409);
 const unowned=characters.find(c=>!starter.includes(c.id));assert.equal((await request(actor,p+'/solo','POST',{revision:1,snapshot:{...snapshot,cast:[unowned.name]}})).status,403);
 await game.close();game=createShowdownGame(options);assert.deepEqual((await request(actor,p)).room.soloSnapshot,snapshot);assert.equal((await progression.wallet(actor.id)).coins,500);
});

test('las seis salas abiertas siguen accesibles aunque haya muchas finalizadas; cerrar una libera el cupo sin borrar historial',async()=>{const owner=await user();await buy(owner);const active=[];for(let n=0;n<6;n++)active.push((await make(owner,'multi')).room.id);assert.equal((await make(owner,'multi')).status,409);for(let n=0;n<15;n++){const id=randomUUID(),snapshot={...game._cache.get(active[0]).state,id,status:'finished',phase:'finished'};await db.run('INSERT INTO showdown_rooms(id,host,mode,status,snapshot,secret,created,updated) VALUES(?,?,?,?,?,?,?,?)',id,owner.id,'multi','finished',JSON.stringify(snapshot),'test',stamp,stamp+100000+n);await db.run('INSERT INTO showdown_members(room,user_id,joined) VALUES(?,?,?)',id,owner.id,stamp);}const list=(await request(owner)).rooms;assert.equal(list.filter(r=>r.status==='lobby').length,6);assert(list.slice(0,6).every(r=>active.includes(r.id)));assert.equal((await request(owner,'/rooms/'+active[0])).status,200);assert.equal((await request(owner,'/rooms/'+active[0]+'/close','POST')).status,200);assert.equal((await make(owner,'multi')).status,201);assert.equal((await db.one('SELECT status FROM showdown_rooms WHERE id=?',active[0])).status,'closed');});
