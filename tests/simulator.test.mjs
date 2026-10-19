import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
const root=new URL('../public/simulator/',import.meta.url),shop=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function engine(mode='antarctica',snapshot=null,all=false){
 const id=['house','traitor'].includes(mode)?mode:'game',html=fs.readFileSync(new URL(id+'/index.html',root),'utf8');
 const virtual=new VirtualConsole(),errors=[];virtual.on('jsdomError',e=>{if(!/Not implemented|Could not parse CSS/.test(e.message))errors.push(e.message);});
 const dom=new JSDOM(html,{url:'http://localhost/simulator/'+id+'/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:virtual}),w=dom.window;
 const owned=all?shop.items.filter(i=>!i.starter).map(i=>i.id):[];let last=null;
 const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const owns=(kind,value)=>{const k=key(value),i=shop.items.find(i=>i.id===kind+':'+(shop.aliases[k]||k));return !!i&&(i.starter||owned.includes(i.id));};
 const host={data:{shop,owned,wallet:{tickets:15,coins:10000,xp:2000,level:8}},user:{id:'qa'},run:{id:'qa-run',mode},owns,available:()=>true,readOnly:false,restoreSnapshot:snapshot,checkpoint:s=>last=JSON.parse(JSON.stringify(s)),openShop:()=>{},openMode:()=>{},home:()=>{},decision:()=>{},toast:message=>errors.push(message)};
 Object.defineProperty(w,'parent',{value:{XPSimulator:host}});w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.load=()=>{};
 w.addEventListener('error',e=>errors.push(e.error?.stack||e.message));
 const context=dom.getInternalVMContext();vm.runInContext(fs.readFileSync(new URL('bridge.js',root),'utf8'),context);
 for(const s of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)])if(!/src=/.test(s[1])&&s[2].trim())vm.runInContext(s[2],context);
 vm.runInContext(fs.readFileSync(new URL('engine.js',root),'utf8'),context);await pause(90);
 const $=s=>w.document.querySelector(s),select=(s,value,index=0)=>{const el=w.document.querySelectorAll(s)[index];assert(el,'Falta '+s);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));},click=s=>{const el=$(s);assert(el,'Falta '+s);assert(!el.disabled,'Desactivado '+s);el.click();};
 return {dom,w,context,$,select,click,errors,host,get snapshot(){return last;},close:()=>w.close()};
}
async function coreSetup(e){const names=shop.items.filter(i=>i.kind==='character'&&i.starter).slice(0,18).map(i=>i.name);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.select('#team1','Pingüinos');e.select('#team2','Focas');e.select('#team3','Krills');e.select('#comeback','Duelos');e.select('#finalMode','2 Finalistas');e.click('#nextBtn');e.click('#fillRandom3');e.click('#confirmTeams3');await pause(180);return names;}
test('el motor filtra los personajes, equipos y retos y permite reclamar sin sustituir el elenco seleccionado',async()=>{
 const e=await engine();try{const before=[...e.$('#castGrid select').options].map(o=>o.value);assert(before.includes('Dua Lingo'));assert(!before.includes('Jiafei'));assert(!before.includes('Vladimir'));assert(!before.includes('Britney Britney'));
  e.select('#castGrid select','Dani');e.host.data.owned.push('character:vladimir','character:edwin');e.w.XPBridge.refresh();assert.equal(e.$('#castGrid select').value,'Dani');assert([...e.$('#castGrid select').options].some(o=>o.value==='Edwin'));assert([...e.$('#castGrid select').options].some(o=>o.value==='Vladimir'));assert(![...e.$('#challengeSelect').options].some(o=>o.value==='La Bomba'));assert.deepEqual(e.errors,[]);
 }finally{e.close();}
});
test('Antarctica restaura elenco, equipos, episodio, resultados y Sets en una nueva instancia del motor',async()=>{
 const e=await engine();let saved,names;try{names=await coreSetup(e);assert.equal(e.$('.stage.active').id,'stage-3');saved=e.snapshot;assert.equal(saved.point,'core:3');assert.equal(saved.state.vars.selected18.length,18);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const resumed=await engine('antarctica',saved);try{assert.equal(resumed.$('.stage.active').id,'stage-3');const state=resumed.w.XPState.capture();assert.deepEqual(Array.from(state.vars.selected18),names);assert.deepEqual(Object.keys(state.vars.distribution3),['Pingüinos','Focas','Krills']);assert.equal(state.vars.episode,1);resumed.select('#challengeSelect','Estrategia');resumed.click('#runChallenge');assert(resumed.$('#immuneList').children.length>0);assert.deepEqual(resumed.errors,[]);}finally{resumed.close();}
});
test('Safari conserva sus 15 participantes y puede reanudar la distribución de equipos',async()=>{
 const e=await engine('safari');let saved;try{const names=shop.items.filter(i=>i.kind==='character'&&i.starter).slice(0,15).map(i=>i.name);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.select('#team1','Leones');e.select('#team2','Serpientes');e.select('#team3','Cebras');e.click('#nextBtn');await pause(130);saved=e.snapshot;assert.equal(saved.point,'build3TeamsBoard');assert.equal(saved.state.vars.selected18.length,15);}finally{e.close();}
 const r=await engine('safari',saved);try{assert.equal(r.$('.stage.active').id,'stage-2');r.click('#fillRandom3');r.click('#confirmTeams3');assert.equal(r.$('.stage.active').id,'stage-3');assert.equal(r.w.XPState.capture().vars.castSize,15);assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('Vs. The World tiene pronombres y talentos nuevos, limita el roster y restaura representantes y estadísticas',async()=>{
 const e=await engine('world',null,true);let saved;try{assert.equal(e.$('.stage.active').id,'stage-world-cast');const select=e.$('#stage-world-cast select');assert(select);select.value='Britney Britney';select.dispatchEvent(new e.w.Event('change',{bubbles:true}));const confirm=[...e.w.document.querySelectorAll('#stage-world-cast button')].find(b=>/confirmar|continuar|preparar/i.test(b.textContent));assert(confirm);confirm.click();await pause(130);saved=e.snapshot;assert.equal(saved.point,'world:renderStats');assert(saved.state.world.reps.includes('Britney Britney'));assert.equal(e.w.XPBridge.talents().britneybritney,'Hacer Playback');assert.equal(e.w.XPBridge.talents().eduardobunuelo,'Hacer flan');assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('world',saved,true);try{assert.equal(r.$('.stage.active').id,'stage-world-stats');assert(r.$('#stage-world-stats').textContent.includes('Britney Britney'));assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('The Traitor restaura roles, supervivientes y episodio en su propio motor',async()=>{
 const e=await engine('traitor');let saved;try{const names=shop.items.filter(i=>i.kind==='character'&&i.starter).slice(0,16).map(i=>i.name);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.click('#btnToTraitors');e.click('#randomTraitors');e.click('#btnStartGame');await pause(140);saved=e.snapshot;assert.equal(saved.point,'startEpisode');assert.equal(saved.state.vars.alive.length,16);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('traitor',saved);try{assert.equal(r.$('.stage.active').id,'stage-3');assert.equal(r.w.XPState.capture().vars.alive.length,16);assert(Object.values(r.w.XPState.capture().vars.roles).includes('Traidor'));assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('House conserva convivencia y relaciones al recuperar la primera semana',async()=>{
 const e=await engine('house');let saved;try{e.click('#randomCast');e.click('#nextBtn');e.click('#btnOpenDoors');await pause(130);saved=e.snapshot;assert.equal(saved.point,'runConvivenciaPhase');assert.equal(saved.state.vars.activePlayers.length,16);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('house',saved);try{assert.equal(r.$('.stage.active').id,'stage-convivencia');assert.equal(r.w.XPState.capture().vars.activePlayers.length,16);assert(Object.keys(r.w.XPState.capture().vars.relaciones).length);assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('un episodio terminado conserva sus resultados exactos y permite avanzar al segundo después de restaurarlo',async()=>{
 const e=await engine();let saved,results;try{await coreSetup(e);e.select('#challengeSelect','Estrategia');e.click('#runChallenge');e.click('#goVests');e.click('#randomVests');e.click('#confirmVests');e.click('#seeResults');e.click('#toTrack');await pause(150);saved=e.snapshot;results=e.$('#trkBody').textContent;assert.equal(saved.point,'core:6');assert.equal(saved.progress.completed,1);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('antarctica',saved);try{assert.equal(r.$('#trkBody').textContent,results);assert.equal(r.$('.stage.active').id,'stage-6');r.click('#nextEpisode');assert.equal(r.w.XPState.capture().vars.episode,2);assert.equal(r.$('.stage.active').id,'stage-3');assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('Race restaura sus quince duplas y la ruta desde un punto de control',async()=>{
 const e=await engine('race');let saved;try{const names=shop.items.filter(i=>i.kind==='character'&&i.starter).slice(0,30).map(i=>i.name);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.click('#nextBtn');e.click('#raceRandomPairs');e.click('#raceConfirmPairs');e.click('#raceIntroNext');await pause(150);saved=e.snapshot;assert.equal(saved.point,'raceRenderDestinations');assert.equal(saved.state.vars.raceSeason.teams.length,15);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('race',saved);try{assert.equal(r.$('.stage.active').id,'stage-race-destination');assert.equal(r.w.XPState.capture().vars.raceSeason.teams.length,15);assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('Cruise conserva sus 22 pasajeros y el reparto inicial en sus dos equipos',async()=>{
 const e=await engine('cruise');let saved;try{const names=shop.items.filter(i=>i.kind==='character'&&i.starter).slice(0,22).map(i=>i.name);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.select('#cruiseTeam1','Leones');e.select('#cruiseTeam2','Serpientes');e.click('#nextBtn');vm.runInContext('buildCruiseTeamsBoard();go("cruise-teams");',e.context);await pause(150);saved=e.snapshot;assert.equal(saved.point,'buildCruiseTeamsBoard');assert.equal(saved.state.vars.selected18.length,22);assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('cruise',saved);try{assert.equal(r.w.XPState.capture().vars.selected18.length,22);assert(r.$('#cruiseTeamsBoard'));assert.equal(r.$('.stage.active').id,'stage-cruise-teams');assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('las estadísticas editadas de World se recuperan aunque las vistas anteriores no estén reconstruidas',async()=>{
 const e=await engine('world',null,true);let saved,values,stats;try{e.select('#stage-world-cast select','Britney Britney');const confirm=[...e.w.document.querySelectorAll('#stage-world-cast button')].find(b=>/confirmar|continuar|preparar/i.test(b.textContent));confirm.click();const rows=[...e.w.document.querySelectorAll('#stage-world-stats .v3-stat-row')];assert(rows.length>=2);rows[0].querySelector('[data-rating="1"]').click();rows[1].querySelector('[data-rating="4"]').click();await pause(450);saved=e.snapshot;values=[...e.w.document.querySelectorAll('#stage-world-stats .v3-stat-value')].map(f=>f.textContent);stats=JSON.stringify(e.w.XPState.capture().world.stats);assert(saved.forms.every(f=>f.scope==='stage-world-stats'));assert.deepEqual(e.errors,[]);}finally{e.close();}
 const r=await engine('world',saved,true);try{assert.deepEqual([...r.w.document.querySelectorAll('#stage-world-stats .v3-stat-value')].map(f=>f.textContent),values);assert.equal(JSON.stringify(r.w.XPState.capture().world.stats),stats);assert.deepEqual(r.errors,[]);}finally{r.close();}
});
test('Show de Talentos usa los catorce talentos solicitados también en las temporadas clásicas',async()=>{
 const e=await engine('antarctica',null,true);try{const requested=['Britney Britney','Gustavo','Edwin','Myke Z','Jiafei','Eduardo Buñuelo','Candy Cookies','Ashley','Emily Waldorf','Vladimir','Maria Luna','Gaba Hochbaum','Jared','Valery Ocampo'];const names=requested.concat(['Dani','Andromeda','Beto','Bayron']);names.forEach((n,i)=>e.select('#castGrid select',n,i));e.select('#team1','Pingüinos');e.select('#team2','Focas');e.select('#team3','Krills');e.select('#comeback','Duelos');e.select('#finalMode','2 Finalistas');e.click('#nextBtn');e.click('#fillRandom3');e.click('#confirmTeams3');e.select('#challengeSelect','Show de Talentos');e.click('#runChallenge');const text=e.$('#eventsList').textContent;for(const name of requested)assert(text.includes(shop.items.find(i=>i.name===name).talent),name+' no tiene su talento solicitado');assert.deepEqual(e.errors,[]);}finally{e.close();}
});
