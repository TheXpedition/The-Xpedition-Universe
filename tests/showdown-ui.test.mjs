import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createShowdown,joinShowdown,selectShowdownCharacter,beginShowdown,tickShowdown,showdownPublicView} from '../showdown-engine.mjs';
import {SHOWDOWN_FORMATS,SHOWDOWN_CHALLENGES,SHOWDOWN_STATS,SHOWDOWN_SOCIAL_ACTIONS} from '../public/showdown/config.mjs';
const characters=JSON.parse(fs.readFileSync(new URL('../public/showdown/characters.json',import.meta.url)));
const runtime=fs.readFileSync(new URL('../public/showdown/simulator.js',import.meta.url),'utf8').replace("import('/showdown/config.mjs')",'Promise.resolve({})');
function renderer(){const dom=new JSDOM('<main id="main"></main><dialog id="modal"><div id="modalContent"></div></dialog><div id="toasts"></div>',{url:'http://localhost/#showdown',runScripts:'outside-only',pretendToBeVisual:true});const c=dom.getInternalVMContext();c.CSS={escape:s=>String(s)};vm.runInContext(`const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const state={route:'showdown',user:{id:'human'},profiles:[]};function startStream(){}function api(){}function time(){return '12:00';}function icon(){return '<svg></svg>';}function closeModal(){}function renderChrome(){}function norm(v){return String(v).toLowerCase();}function toast(){}function requireAuth(){return true;}`,c);vm.runInContext(fs.readFileSync(new URL('../public/showdown/stage.js',import.meta.url),'utf8'),c);vm.runInContext(runtime,c);vm.runInContext(fs.readFileSync(new URL('../public/showdown/experience.js',import.meta.url),'utf8'),c);c.qaConfig={SHOWDOWN_STATS,SHOWDOWN_SOCIAL_ACTIONS};vm.runInContext('sdUI.config=qaConfig',c);c.qaData={characters,formats:Object.values(SHOWDOWN_FORMATS),challenges:SHOWDOWN_CHALLENGES,ownedCharacters:characters.map(c=>c.id),owned:true,wallet:{coins:500},rooms:[]};vm.runInContext('sdUI.data=qaData',c);return {dom,c,render(view){c.qaView=view;vm.runInContext('sdUI.room=qaView;sdUI.offset=qaView.serverTime-Date.now();sdGameShell(qaView);sdAcceptRoom(qaView,true)',c);},eval:s=>vm.runInContext(s,c)};}

test('crear una sala con amigos abre el lobby y permite pasar al escenario cuando ambos están listos',async t=>{
 const ui=renderer();t.after(()=>ui.dom.window.close());
 const s=createShowdown({id:'new-lobby',host:'human',mode:'multi',now:Date.now()});
 joinShowdown(s,{id:'human',name:'Anfitrión'},Date.now());
 const calls=[];
 ui.c.api=async(path,options={})=>{
  calls.push({path,options});
  if(path==='/showdown')return ui.c.qaData;
  if(path==='/showdown/rooms')return {room:showdownPublicView(s,'human',Date.now(),characters)};
  if(path==='/showdown/rooms/new-lobby/chat')return {messages:[]};
  if(path==='/showdown/rooms/new-lobby')return {room:showdownPublicView(s,'human',Date.now(),characters)};
  if(path==='/showdown/rooms/new-lobby/start'){
   beginShowdown(s,characters,Date.now(),options.body);
   return {room:showdownPublicView(s,'human',Date.now(),characters)};
  }
  throw new Error('Petición inesperada: '+path);
 };
 ui.c.go=path=>{
  ui.dom.reconfigure({url:'http://localhost/#'+path});
  ui.c.navigation=ui.eval('renderShowdownSimulator()');
 };
 ui.eval('sdEntry(true)');
 const doc=ui.dom.window.document;
 doc.querySelector('[data-sd="create"][data-mode="multi"]').click();
 await new Promise(resolve=>setImmediate(resolve));
 assert(ui.c.navigation,'crear la sala navega a su URL');await ui.c.navigation;
 assert.equal(calls.find(c=>c.path==='/showdown/rooms').options.body.mode,'multi');
 assert(doc.querySelector('.sd-lobby'),'la sala reemplaza la pantalla de carga');
 assert(!doc.querySelector('.sd-loading'));assert(!doc.querySelector('.sd-error'));
 assert(doc.querySelector('[data-sd="character"]'));
 assert(doc.querySelector('[data-sd="copy-link"]'));assert(doc.querySelector('[data-sd="invite"]'));
 assert.equal(doc.querySelector('#sdFillBots').checked,false);
 assert.equal(doc.querySelector('[data-sd="start"]').disabled,true);
 doc.querySelector('[data-sd="chat-toggle"]').click();assert.equal(doc.querySelector('#sdChat').hidden,false);
 selectShowdownCharacter(s,'human',characters[0].id,characters);
 joinShowdown(s,{id:'friend',name:'Amiga'},Date.now());selectShowdownCharacter(s,'friend',characters[1].id,characters);
 ui.c.qaLobby=showdownPublicView(s,'human',Date.now(),characters);ui.eval('sdAcceptRoom(qaLobby)');
 assert.equal(doc.querySelectorAll('.sd-cast-slot').length,2);
 assert.equal(doc.querySelectorAll('[data-sd="character"]').length,1);
 assert.equal(doc.querySelector('#sdChat').hidden,false);
 assert.equal(doc.querySelector('[data-sd="start"]').disabled,false);
 doc.querySelector('#sdFillBots').checked=true;
 doc.querySelector('[data-sd="start"]').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.find(c=>c.path.endsWith('/start')).options.body.fillBots,true);
 assert.equal(s.status,'running');assert(doc.querySelector('#sdStage h1'));assert(!doc.querySelector('.sd-lobby'));
});

test('retomar una sala abre el lobby para invitados y staff sin bloquear el chat',async t=>{
 const s=createShowdown({id:'saved-lobby',host:'human',mode:'multi',now:Date.now()});
 for(const id of ['human','friend'])joinShowdown(s,{id,name:id},Date.now());
 for(const role of ['host','friend','spectator']){
  const ui=renderer();t.after(()=>ui.dom.window.close());
  const id=role==='host'?'human':role==='friend'?'friend':'staff';
  ui.eval('state.user.id='+JSON.stringify(id));
  const view=showdownPublicView(s,id,Date.now(),characters,{spectator:role==='spectator'});view.isStaff=role==='spectator';
  ui.c.api=async path=>path==='/showdown'?ui.c.qaData:path.endsWith('/chat')?{messages:[]}:{room:view};
  ui.dom.reconfigure({url:'http://localhost/#showdown/saved-lobby'});
  await ui.eval('renderShowdownSimulator()');
  const doc=ui.dom.window.document;
  assert(doc.querySelector('.sd-lobby'),role);assert(!doc.querySelector('.sd-loading'),role);
  doc.querySelector('[data-sd="chat-toggle"]').click();assert.equal(doc.querySelector('#sdChat').hidden,false,role);
  assert.equal(doc.querySelector('#sdChatText').disabled,false,role);
  if(role==='spectator'){
   assert(doc.querySelector('.sd-lobby.spectator'));assert(doc.querySelector('.sd-spectator-banner'));
   assert(!doc.querySelector('[data-sd="start"]'));assert.equal(doc.querySelectorAll('[data-sd="character"]').length,0);
  }else assert.equal(doc.querySelectorAll('[data-sd="character"]').length,1,role);
 }
});

test('todas las fases de los tres formatos tienen pantalla, reloj y acciones válidas, sin filtrar rankings ni track anticipado',()=>{
 for(const format of [2,3,4]){const ui=renderer(),s=createShowdown({id:'qa',host:'human',format,seed:47,now:1000});joinShowdown(s,{id:'human',name:'Usuario <QA>'},1000);selectShowdownCharacter(s,'human',characters[0].id,characters);beginShowdown(s,characters,1000,{fillBots:true});let n=0,at=1000;const phases=new Set();while(s.status==='running'&&n++<200){const view=showdownPublicView(s,'human',at,characters);ui.render(view);const doc=ui.dom.window.document;phases.add(s.phase);assert(doc.querySelector('#sdStage h1'),s.phase+' tiene título');assert(doc.querySelector('#sdClock'),s.phase+' tiene reloj');assert(!doc.querySelector('.sd-track-table'));assert(!doc.querySelector('script'));assert(!doc.body.innerHTML.includes('undefined'));assert(!doc.body.innerHTML.includes('[object Object]'));if(s.phase==='ranking'&&view.current.pool.includes('human')){const picks=doc.querySelectorAll('[data-sd="rank-pick"]');assert.equal(picks.length,view.current.pool.length-1);assert(![...picks].some(p=>p.dataset.id==='human'));}if(s.phase==='voteReveal'){at=s.phaseAt+9000;tickShowdown(s,at);ui.render(showdownPublicView(s,'human',at,characters));assert.equal(doc.querySelectorAll('.sd-star-transfer').length,1);}at=s.deadline;tickShowdown(s,at);}
  assert.equal(s.status,'finished');ui.render(showdownPublicView(s,'human',at,characters));assert(ui.dom.window.document.querySelector('.sd-champion'));ui.eval('sdUI.track=true;sdRenderStage(sdUI.room)');assert.equal(ui.dom.window.document.querySelectorAll('.sd-track-table tbody tr').length,18);assert(ui.dom.window.document.querySelector('[data-sd="download-track"]'));assert(phases.has('semifinalists'));assert(phases.has('wildcard'));assert(phases.has('ranking'));assert(phases.has('rival'));ui.dom.window.close();}
});

test('el ranking permite ordenar y corregir a todos en 15 segundos; las estrellas no reinician su animación en cada consulta',()=>{
 const ui=renderer(),s=createShowdown({id:'qa',host:'human',seed:9,now:1000});joinShowdown(s,{id:'human',name:'Usuario QA'},1000);selectShowdownCharacter(s,'human',characters[0].id,characters);beginShowdown(s,characters,1000,{fillBots:true});let at=1000,guard=0;while(s.phase!=='ranking'&&guard++<90){at=s.deadline;tickShowdown(s,at);}s.players.find(p=>p.id==='human').active=true;const r=s.rounds.united;if(!r.pool.includes('human'))r.pool.push('human');const view=showdownPublicView(s,'human',at,characters);ui.render(view);ui.eval('sdUI.ranking=sdUI.room.current.pool.filter(id=>id!==sdUI.room.me);sdDrawRanking()');assert.equal(ui.dom.window.document.querySelectorAll('[data-sd="rank-pick"]').length,0);assert(!ui.dom.window.document.querySelector('[data-sd="rank-confirm"]').disabled);assert.equal(ui.dom.window.document.querySelectorAll('.sd-ranking-order li').length,r.pool.length-1);
 const before=ui.dom.window.document.querySelector('.sd-player-bubble');ui.eval('sdPresence(sdUI.room)');assert.equal(ui.dom.window.document.querySelector('.sd-player-bubble'),before);ui.dom.window.close();
});

test('los gráficos de Bonju y todos los personajes existen; el retrato de los mensajes conserva transparencia',async()=>{
 const {default:sharp}=await import('sharp');const metadata=await sharp(fs.readFileSync(new URL('../public/showdown/art/bonju.webp',import.meta.url))).metadata();assert(metadata.hasAlpha);for(const c of characters){for(const p of [c.image,c.figure])assert(fs.existsSync(new URL('../public'+p,import.meta.url)),p);}const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert(page.indexOf('/showdown/stage.js')<page.indexOf('/showdown/simulator.js'));
});

test('presentación, estadísticas, Status, puestos y barra tienen pantalla completa y controles propios',()=>{const ui=renderer(),s=createShowdown({id:'qa-new',host:'human',mode:'multi',seed:91,now:1000});for(const [id,name,c]of [['human','Persona','dani'],['friend','Amiga','bayron']]){joinShowdown(s,{id,name},1000);selectShowdownCharacter(s,id,c,characters);}beginShowdown(s,characters,1000,{fillBots:true});const seen=new Set();let guard=0;while(s.status==='running'&&guard++<130){if(s.phase==='voteReveal')s.players.filter(p=>!p.bot).forEach(p=>p.stars=100);const v=showdownPublicView(s,'human',s.phaseAt+9000,characters);ui.render(v);seen.add(s.phase);const doc=ui.dom.window.document;assert(doc.querySelector('#sdStage h1'),s.phase);if(s.phase==='stats'){assert.equal(doc.querySelectorAll('.sd-stat-row').length,10);assert.equal(doc.querySelectorAll('.sd-stats-self .sd-figure').length,1);}if(s.phase==='status'){assert.equal(doc.querySelectorAll('.sd-status-roster>button').length,18);assert(!doc.querySelector('#sdPresence em'));}if(s.phase==='lipsync'&&v.current.duel.method==='gauge')assert(doc.querySelector('#sdGaugeTap'));tickShowdown(s,s.deadline);}for(const phase of ['presentation','stats','status','assign'])assert(seen.has(phase),phase);ui.dom.window.close();});

test('retomar y cerrar salas abiertas aparece antes del póster, y el chat de la sala no se cierra al actualizar',()=>{const ui=renderer();ui.eval("sdUI.data.rooms=Array.from({length:6},(_,i)=>({id:'room'+i,isHost:true,mode:'multi',status:'lobby',format:3,players:2,updated:1000}));sdEntry(true)");const doc=ui.dom.window.document;assert.equal(doc.querySelector('.sd-entry').firstElementChild.className,'sd-resume-panel');assert.equal(doc.querySelectorAll('.sd-resume-panel a').length,6);assert.equal(doc.querySelectorAll('.sd-resume-panel [data-sd="close-room"]').length,6);const s=createShowdown({id:'lobby',host:'human',mode:'multi',now:1000});joinShowdown(s,{id:'human',name:'QA'},1000);const view=showdownPublicView(s,'human',1000,characters);ui.c.qaLobby=view;ui.eval('sdUI.room=qaLobby;sdUI.chatOpen=true;sdLobby(qaLobby)');assert.equal(doc.querySelector('#sdChat').hidden,false);ui.eval('sdLobby(qaLobby)');assert.equal(doc.querySelector('#sdChat').hidden,false);ui.dom.window.close();});
