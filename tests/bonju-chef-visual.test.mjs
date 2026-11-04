import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import sharp from 'sharp';
import {createChef,chefAction,chefView} from '../public/juegos/bonju-chef/engine.mjs';
import {CONTESTANTS,INGREDIENTS,RECIPES} from '../public/juegos/bonju-chef/data.mjs';
import {CAST_HEIGHTS} from '../public/juegos/world-cast-proportions.mjs';
import {STAGE,visualHeight,groupLayout,shelfSlots} from '../public/juegos/bonju-chef/visual-layout.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const art=path.join(root,'public/juegos/bonju-chef/art');
const built=await build({stdin:{contents:`export * from './games/bonju-chef/ui-v3.ts';export {model,clock} from './games/bonju-chef/model.ts';`,resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'event-emitter-without-webgl',setup(b){b.onResolve({filter:/^phaser$/},()=>({path:'phaser',namespace:'unit'}));b.onLoad({filter:/.*/,namespace:'unit'},()=>({contents:`import {EventEmitter} from 'node:events';export default {Events:{EventEmitter}};`}));}}]});
globalThis.matchMedia=()=>({matches:false});
const ui=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function screen(phase='fridge',coarse=false){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'public/juegos/bonju-chef/index.html'),'utf8'));
 globalThis.document=dom.window.document;
 const s=createChef({id:'visual-contract',now:0});
 chefAction(s,{type:'open'},{staff:true});chefAction(s,{type:'fillBots',count:18},{staff:true,random:()=>.5});chefAction(s,{type:'start'},{staff:true,random:()=>.5});
 s.phase=phase;s.rounds[0]={recipeId:'burger',mode:'normal'};s.roster[0].x=490;s.roster[0].y=735;
 const view=chefView(s,{selfId:s.roster[0].id,staff:true});
 Object.assign(ui.model,{episode:view,coarse,basket:false,category:'all',guidePage:0,help:false,selected:null,overview:false,boot:{profile:{characterId:'maria-villegas'}}});
 ui.clock.sync(view);return {dom,s,view,st:view.station,q:selector=>document.querySelector(selector),all:selector=>[...document.querySelectorAll(selector)]};
}

test('physical shelves fit all 71 ingredients once, with no two items in one shelf slot',()=>{
 const slots=shelfSlots(INGREDIENTS);assert.equal(slots.length,INGREDIENTS.length);assert.equal(new Set(slots.map(i=>i.id)).size,INGREDIENTS.length);
 assert.equal(slots.filter(i=>i.bank==='cold').length,49);assert.equal(slots.filter(i=>i.bank==='dry').length,22);
 assert.equal(new Set(slots.map(i=>`${i.bank}:${i.row}:${i.col}`)).size,INGREDIENTS.length);
 for(const i of slots){assert(i.row<9);assert(i.col<(i.bank==='cold'?6:4));}
});

test('all cast sizes use floor positions, waist-high counters and centered incomplete rows',()=>{
 for(let n=1;n<=18;n++){
  const positions=groupLayout(n);
  assert.equal(positions.length,n);
  for(const p of positions){assert(p.x>70&&p.x<1850);assert(p.y<=1000&&p.y>=650);assert(Math.abs((p.y-p.tableY)/p.height-STAGE.counterHeightRatio)<1e-10);assert(p.labelY>p.tableY+60);}
  for(const row of new Set(positions.map(p=>p.row))){const xs=positions.filter(p=>p.row===row).map(p=>p.x);assert.equal((Math.min(...xs)+Math.max(...xs))/2,960);}
  if(n>9){const back=positions.filter(p=>!p.row),front=positions.filter(p=>p.row);assert(Math.max(...back.map(p=>p.labelY+65))<Math.min(...front.map(p=>p.y-visualHeight('guillermo',p.height))));}
 }
 for(const c of CONTESTANTS)assert.equal(visualHeight(c.id,200),CAST_HEIGHTS[c.id]);
 assert(STAGE.fridge.height>Math.max(...CONTESTANTS.map(c=>visualHeight(c.id,STAGE.walkHeight))));
});

test('fridge interactions depend on distance, basket confirmation and device controls',()=>{
 const {view,q,all}=screen();ui.renderUI(true);assert(q('[data-basket]'));assert.match(q('[data-basket]').textContent,/E.*ABRIR NEVERA/);assert.equal(all('[data-pick]').length,0);
 view.roster[0].x=1700;ui.renderUI(true);assert(!q('[data-basket]'));
 view.roster[0].x=490;view.station.ready=true;ui.renderUI(true);assert(!q('[data-basket]'));
 view.station.ready=false;ui.model.coarse=true;ui.renderUI(true);assert(!q('[data-basket] kbd'));assert.equal(all('[data-dir]').length,4);
});

test('the physical pantry disables exhausted and owned items, preserves focus across live stock updates, and limits baskets to eight',()=>{
 const {view,st,q,all}=screen();ui.model.basket=true;ui.renderUI(true);assert.equal(all('[data-pick]').length,INGREDIENTS.length);assert.equal(all('.empty-slot').length,8);
 const meat=q('[data-pick="meat"]');meat.focus();view.stock.meat=0;ui.renderUI();assert.equal(q('[data-pick="meat"]'),meat);assert.equal(document.activeElement,meat);assert(meat.disabled);assert.equal(meat.querySelector('em').textContent,'0');
 st.inventory=['bread'];ui.renderUI();assert(q('[data-pick="bread"]').disabled);assert.equal(q('[data-pick="bread"] em').textContent,'✓');assert.equal(all('[data-drop]').length,1);
 st.inventory=INGREDIENTS.slice(0,8).map(i=>i.id);ui.renderUI();assert(all('[data-pick]').every(b=>b.disabled));assert.equal(all('[data-drop]').length,8);assert.equal(all('.empty-slot').length,0);
 ui.model.category='fruit';ui.renderUI(true);for(const b of all('[data-pick]'))assert.equal(b.classList.contains('filtered'),INGREDIENTS.find(i=>i.id===b.dataset.pick).category!=='fruit');
});

test('blind and improvised recipe screens do not reveal the hidden dish or ingredients',()=>{
 const {view,q,all}=screen('recipe');view.mode='blind';view.modeInfo={name:'A ciegas',description:'Confía en tu criterio.'};view.recipe={...RECIPES[0],id:'blind',hidden:true,name:'La receta secreta',required:[],bonus:[]};ui.renderUI(true);
 assert.equal(all('.recipe-ingredients i').length,0);assert(!q('.recipe-hero img').src.includes('burger'));assert(!q('.recipe-details').textContent.includes('Carne molida'));
 view.mode='improv';view.recipe={...view.recipe,id:'improv',hidden:false,name:'Tu creación de supervivencia'};ui.renderUI(true);assert.equal(all('.recipe-ingredients i').length,0);assert.match(q('.recipe-hero img').src,/logo.webp$/);
});

test('single-unit instructions and improvised cold recipes agree with the private station and public live mode',()=>{
 const {view,st,q}=screen('recipe');view.mode='single';ui.renderUI(true);assert.match(q('.recipe-details').textContent,/UNA UNIDAD/);assert(q('.recipe-bonus').textContent.includes('×1'));
 view.phase='kitchen';view.mode='improv';st.recipeId='sushi';st.stage='cook';ui.renderUI(true);assert.match(q('.cook-identity').textContent,/EL FRÍO/);assert.match(q('.working-tip').textContent,/frío/);assert(q('.heat-meter').getAttribute('style').includes('--heat-a:35%'));
});

test('tutorial and station instructions switch between keyboard and touch and show the actual eight-cut progress',()=>{
 const {view,st,q}=screen('tutorial');ui.renderUI(true);assert.match(q('.tutorial-steps').textContent,/ESPACIO/);assert.match(q('.tutorial-steps').textContent,/WASD/);
 ui.model.coarse=true;ui.renderUI(true);assert.match(q('.tutorial-steps').textContent,/Toca CORTAR/);assert(!q('.tutorial-steps').textContent.includes('ESPACIO'));assert(q('[data-guide-next]'));
 ui.model.guidePage=1;ui.renderUI(true);assert(q('[data-understood]'));
 ui.model.coarse=false;view.phase='kitchen';st.stage='prep';st.cuts=[{value:1},{value:.8}];ui.renderUI(true);assert.equal(document.querySelectorAll('.cut-count .done').length,2);assert.match(q('.cut-count').textContent,/2 \/ 8/);assert(q('[data-action="cut"] kbd'));
 ui.model.coarse=true;ui.renderUI(true);assert.equal(q('[data-action="cut"]').textContent,'CORTAR');assert(!q('[data-action="cut"] kbd'));
});

test('farewell exposes only the return action and its fifteen-second countdown',()=>{
 const {q,all}=screen('farewell');ui.renderUI(true);assert.equal(all('#scene-ui button').length,1);assert.equal(q('#scene-ui button').dataset.action,'returnHome');assert(q('#chat-toggle').hidden);assert(q('#comm-toggle').hidden);assert(q('#staff').hidden);ui.updateClock();assert.equal(q('#return-count').textContent,'15');
});

test('costume walk atlases contain moving limbs, transparent cutouts and distinct idle frames for all eighteen characters',async()=>{
 for(const c of CONTESTANTS){
  const source=path.join(art,'walk-v3',c.id+'.webp'),m=await sharp(source).metadata();assert.equal(m.width,1440,c.id);assert.equal(m.height,200,c.id);assert(m.hasAlpha,c.id);
  const walking=await sharp(source).extract({left:0,top:0,width:160,height:200}).raw().toBuffer(),idle=await sharp(source).extract({left:1280,top:0,width:160,height:200}).raw().toBuffer();assert.notDeepEqual(walking,idle,c.id);
  const portrait=await sharp(path.join(art,'cast-v3',c.id+'.webp')).metadata();assert(portrait.hasAlpha,c.id);
 }
 for(const r of RECIPES)for(const quality of ['excellent','normal','ugly']){const file=path.join(art,'plates-v4',`${r.id}-${quality}.webp`),m=await sharp(file).metadata();assert.equal(m.width,512);assert.equal(m.height,352);assert(m.hasAlpha);const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0);assert.equal(data[((info.height-1)*info.width+x)*4+3],0);}for(let y=0;y<info.height;y++){assert.equal(data[(y*info.width)*4+3],0);assert.equal(data[(y*info.width+info.width-1)*4+3],0);}}
 for(const id of ['stage-jury-v3','stage-pantry-v3','stage-floor-v3']){const m=await sharp(path.join(art,id+'.webp')).metadata();assert.equal(m.width,1920);assert.equal(m.height,1080);}
});

test('every overview cook has a spectate action; a watched kitchen is read-only and has a return arrow',()=>{
 const {s,q,all}=screen('kitchen');ui.model.overview=true;ui.renderUI(true);assert.equal(all('[data-watch]').length,18);assert(q('[data-my-kitchen]'));
 const id=s.roster[1].id;Object.assign(ui.model,{overview:false,episode:chefView(s,{selfId:s.roster[0].id,watchId:id})});ui.renderUI(true);assert.equal(document.body.dataset.spectating,'true');assert(q('[data-watch-back]'));assert.match(q('.watching-label').textContent,new RegExp(s.roster[1].name));assert(q('[data-action="cut"]').disabled);assert(q('#round-skip').disabled===false,'watching does not remove one’s own skip consent');
});

test('SKIP displays a personal consent state and count without replacing the timer',()=>{
 const {s,q}=screen('kitchen');s.roster.forEach(p=>p.bot=false);s.skipVotes=[s.roster[0].id,s.roster[1].id];Object.assign(ui.model,{episode:chefView(s,{selfId:s.roster[0].id})});ui.renderUI(true);ui.updateClock();assert(!q('#round-skip').hidden);assert(q('#round-skip').disabled);assert.equal(q('#skip-count').textContent,'2/18');assert.match(q('#round-time').textContent,/^\d\d:\d\d$/);
});

test('jury reveals separate critiques and stars Bonju then Dua then María, with final score last',()=>{
 const {view,q,all}=screen('judging');view.results=[{id:view.selfId,name:'Ari Santana',note:9,total:90,parts:{ingredients:25,cooking:25,technique:12,presentation:12,creativity:6}}];view.judgingIndex=0;view.phaseAt=0;
 for(let slot=0;slot<3;slot++){ui.clock.value=slot*6500;ui.clock.target=ui.clock.value;ui.clock.at=performance.now();ui.clock.paused=true;ui.renderUI(true);assert.equal(q('.jury-critique').dataset.judge,['bonju','dua','maria'][slot]);assert.equal(all('.jury-scoreboard article.revealed:not(.overall-note)').length,slot+1);assert.equal(q('.overall-note').classList.contains('revealed'),slot===2);}
 for(const [i,name]of all('.judge-name').entries()){assert.equal(parseFloat(name.style.left),STAGE.judgeSeats[i]/19.2);assert.equal(parseFloat(name.style.top),STAGE.deskName/10.8);}
});

test('mixing uses the basket controls and has a useful empty-state action',()=>{
 const {view,st,q,all}=screen('kitchen');st.stage='mix';st.inventory=['meat','bread'];st.mixed=['bread'];ui.renderUI(true);assert.equal(all('[data-mix]').length,2);assert(q('[data-mix="bread"]').disabled);st.inventory=[];st.mixed=[];ui.renderUI(true);assert.equal(all('[data-mix]').length,0);assert(q('[data-action="serveEmpty"]'));
});

test('the public Bonju lobby has eighteen plazas, role-specific entry, live users/bots controls and a clear conflicting episode',()=>{
 const {s,view,q,all}=screen('closed');view.roster=[];view.phase='closed';ui.renderUI(true);assert.equal(all('.chef-lobby-slot').length,18);assert(q('[data-action="open"]'));assert(!q('[data-action="play"]'));
 view.phase='lobby';view.roster=s.roster.slice(0,7);ui.renderUI(true);assert.equal(all('.chef-lobby-slot.occupied').length,7);assert(q('[data-action="fillUsers"]'));assert(q('[data-action="fillBots"]'));assert(!q('[data-action="start"]').disabled);
 view.entryBlock={name:'The Last Grip',url:'/juegos/last-grip/'};ui.renderUI(true);assert(q('[data-action="start"]').disabled);assert.match(q('.lobby-conflict').textContent,/The Last Grip/);
 view.entryBlock=null;view.staff=false;view.roster=[];ui.model.boot.participation={active:true};ui.renderUI(true);assert(q('[data-action="play"]'));assert(!q('[data-action="fillBots"]'));assert(!q('[data-action="start"]'));
});

test('reopening the completed episode shows an empty lobby, without an old farewell, countdown or announcement',()=>{
 const {view,q,all}=screen('finished');view.returned=true;view.announcement={id:'old-farewell',text:'Gracias por jugar',custom:true};ui.renderUI(true);assert.equal(document.body.dataset.scene,'LobbyScene');assert.equal(all('.chef-lobby-slot.empty').length,18);assert.equal(all('.chef-lobby-slot.occupied').length,0);assert(q('[data-action="open"]'));assert.equal(q('[data-action="returnHome"]'),null);assert.equal(q('#return-count'),null);assert(q('#announcement').hidden);
 view.staff=false;ui.model.boot.participation={active:true};ui.renderUI(true);assert(q('[data-action="play"]'));assert(!q('[data-action="play"]').disabled);assert.equal(q('[data-action="returnHome"]'),null);
});
