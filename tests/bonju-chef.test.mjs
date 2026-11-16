import test from 'node:test';
import assert from 'node:assert/strict';
import {createChef,chefAction,tickChef,chefView,nearChefFridge} from '../public/juegos/bonju-chef/engine.mjs';
import {createBonjuChef} from '../world-bonju-chef-service.mjs';
import {CONTESTANTS} from '../public/juegos/bonju-chef/data.mjs';
import {eliminationPlan,RECIPES,DURATIONS} from '../public/juegos/bonju-chef/data.mjs';
import {cutIngredients} from '../public/juegos/bonju-chef/preparation.mjs';
import {scoreDish} from '../public/juegos/bonju-chef/score-rules.mjs';
const rng=()=>.43,staff={staff:true,random:rng};
function episode(n=18){const s=createChef({id:'qa',now:0});chefAction(s,{type:'open'},staff);chefAction(s,{type:'fillBots',count:n},staff);chefAction(s,{type:'start'},staff);return s;}
test('Completar con usuarios removes lobby bots and starts without automatic replacements',async()=>{
 const director={user:{id:'staff'},direct:true,zone:{id:'base'},p:{}};
 const players=[...CONTESTANTS.slice(0,13).map(({id})=>id),'peggy','joseserna'].map(id=>({user:{id},characterId:id,wellness:{life:{status:'alive'}},zone:{id:'base'},p:{}}));
 const service=createBonjuChef({db:{one:async()=>null,run:async()=>{}},clients:new Map([director,...players].map(c=>[c.user.id,c])),send(){},can:async user=>user.id==='staff',canParticipate:async()=>true,autoBots:true});
 const action=type=>service.handle(director,{type:'chef-action',action:{type}});
 try{
  await action('open');await action('fillBots');
  for(const guest of players.slice(-2))await service.handle(guest,{type:'chef-subscribe'});
  assert((await service.status(director.user)).roster.every(p=>!['peggy','joseserna'].includes(p.characterId)));
  await action('fillUsers');
  assert.equal((await service.status(director.user)).roster.length,15);
  await action('start');
  const state=await service.status(director.user);
  assert.equal(state.phase,'tutorial');
  assert.equal(state.roster.length,15);
  assert(state.roster.every(p=>!p.bot));
  for(const id of ['peggy','joseserna'])assert((await service.status({id})).station);
 }finally{await service.close();}
});
test('restarting an explicitly selected active episode withdraws bots and preserves human stations and elapsed time',async()=>{
 const s=episode(18);s.phase='kitchen';s.paused=true;s.clock=1234;s.phaseAt=876;
 for(const [i,p] of s.roster.entries())if(i<15){p.bot=false;s.stations[p.id].inventory=['meat'];}
 let saved;
 const db={one:async(_sql,id)=>id==='bonju-chef'?{state:JSON.stringify(s)}:{state:s.id},run:async(_sql,_key,state)=>{saved=JSON.parse(state);}};
 const service=createBonjuChef({db,clients:new Map(),send(){},can:async()=>true,now:()=>5000});
 try{
  const result=await service.status({id:s.roster[0].id});
  assert.equal(result.roster.length,15);
  assert(result.roster.every(p=>!p.bot));
  assert.deepEqual(result.station.inventory,['meat']);
  assert.equal(result.clock,1234);
  assert.equal(result.paused,true);
  assert.equal(saved.roster.length,15);
 }finally{await service.close();}
});
test('eligible visitors keep their lobby seat across a reconnect and only staff can start',async()=>{
 const s=createChef({id:'manual-start',now:1000});
 chefAction(s,{type:'open'},staff);s.autoStartAt=1200;
 const director={user:{id:'staff'},direct:true,zone:{id:'base'},p:{}};
 const participants=CONTESTANTS.slice(0,7).map(({id})=>({user:{id},characterId:id,zone:{id:'base'},p:{},wellness:{life:{status:'alive'}}}));
 const db={one:async(_sql,id)=>id==='bonju-chef'?{state:JSON.stringify(s)}:null,run:async()=>{}};
 const clients=new Map([director,...participants].map(c=>[c.user.id,c]));
 const service=createBonjuChef({db,clients,send(){},can:async user=>user.id==='staff',canParticipate:async()=>true,autoBots:true,now:()=>5000});
 const action=(c,type)=>service.handle(c,{type:'chef-action',action:{type}});
 try{
  await Promise.all(participants.map(c=>service.handle(c,{type:'chef-subscribe'})));
  await new Promise(resolve=>setTimeout(resolve,120));
  assert.equal((await service.status(director.user)).phase,'lobby');
  assert.equal((await service.status(director.user)).roster.length,7);
  await assert.rejects(action(participants[0],'start'),/Solo Dirección/);
  await action(director,'fillUsers');await action(director,'start');
  service.disconnect(participants[0]);await service.attach(participants[0]);
  const result=await service.status(participants[0].user);
  assert.equal(result.phase,'tutorial');
  assert(result.engaged);
  assert(result.station);
  assert(result.roster.every(p=>!p.bot));
 }finally{await service.close();}
});
test('a live cook cannot show another kitchen while their own station is still open',()=>{
 const s=episode(7);s.phase='kitchen';
 const [cook,target]=s.roster;
 assert.equal(chefView(s,{selfId:cook.id,watchId:target.id}).spectating,null);
 s.stations[cook.id].served=true;
 assert.equal(chefView(s,{selfId:cook.id,watchId:target.id}).spectating.id,target.id);
});
test('Bonju Chef reaches two finalists, or three for casts of seventeen or eighteen for every supported cast size',()=>{
 for(let n=7;n<=18;n++){const plan=eliminationPlan(n);assert.equal(plan.length,n>=17?7:5);assert.equal(plan.reduce((a,b)=>a+b,0),n-(n>=17?3:2));assert(plan.every(x=>x>=1&&x<=4));}
});
test('shared stock cannot oversell, duplicate, bypass distance or expose another private station',()=>{
 const s=episode();s.phase='fridge';for(const p of s.roster){p.x=490;p.y=690;p.bot=false;}
 for(const p of s.roster.slice(0,6))chefAction(s,{type:'take',id:'meat'},{actor:p});assert.equal(s.stock.meat,0);
 assert.throws(()=>chefAction(s,{type:'take',id:'meat'},{actor:s.roster[7]}),/agotó/);
 assert.throws(()=>chefAction(s,{type:'take',id:'meat'},{actor:s.roster[0]}),/tienes/);
 chefAction(s,{type:'drop',id:'meat'},{actor:s.roster[0]});assert.equal(s.stock.meat,1);
 const p=s.roster[8];p.x=1600;assert.throws(()=>chefAction(s,{type:'take',id:'bread'},{actor:p}),/Acércate/);
 s.phase='kitchen';const publicView=chefView(s,{selfId:'watcher',staff:true});assert.equal(publicView.station,null);assert(!JSON.stringify(publicView).includes('cookGood'));assert.deepEqual(publicView.stock,{});
 assert.throws(()=>chefAction(s,{type:'cancel'},{actor:p}),/Dirección/);
});
test('score is strict, substitutions are matched once and plate quality changes with mistakes',()=>{
 const r=RECIPES[0],inventory=[...r.required,...r.bonus],placed=r.required.map((id,i)=>({id,x:.25+i%3*.25,y:.35+Math.floor(i/3)*.3}));
 const perfect={inventory,cuts:Array.from({length:cutIngredients({inventory}).length*8},()=>({value:1})),cookTotal:26000,cookGood:26000,burn:0,placed,served:true};
 assert.equal(scoreDish(perfect,r).quality,'excellent');const poor=scoreDish({...perfect,inventory:['chicken','bread','butter','lettuce'],burn:9000},r);assert.equal(poor.quality,'ugly');assert(poor.note<6);assert.equal(poor.substitutes,2);assert.equal(poor.missing,2);
});
test('timing attempts are validated once per pulse and pause freezes all progress',()=>{
 const s=episode(7);s.phase='kitchen';const p=s.roster[0],st=s.stations[p.id];p.bot=false;st.stageAt=0;s.clock=487.5;chefAction(s,{type:'cut',clock:s.clock},{actor:p});assert.equal(st.cuts[0].value,1);chefAction(s,{type:'cut',clock:s.clock},{actor:p});assert.equal(st.cuts.length,1);chefAction(s,{type:'pause'},staff);const clock=s.clock;tickChef(s,10000);assert.equal(s.clock,clock);assert.equal(st.cuts.length,1);
});
test('eighteen bots advance automatically, shorten the schedule after zero scores, retain three finalists and save every rank',()=>{
 const s=episode(),short={...DURATIONS,tutorial:500,intro:0,recipe:0,fridge:38000,judging:0,results:0,elimination:0,between:0};let t=0,limit=0;
 while(s.phase!=='winner'&&limit++<30000){t+=100;tickChef(s,t,{random:rng,durations:short});}
 assert.equal(s.phase,'winner');assert(s.round<=8);assert.equal(s.round,s.totalRounds);assert.equal(s.history.length,s.round);assert.equal(s.history.at(-1).results.length,3);assert.equal(new Set(s.history.map(h=>h.recipeId)).size,s.round);assert.equal(s.ranking.length,18);assert.equal(new Set(s.ranking.map(p=>p.characterId)).size,18);assert.equal(s.ranking[0].rank,1);let remaining=18;for(const h of s.history){assert.equal(h.results.length,remaining);for(const r of h.results.filter(r=>r.total===0))assert(h.eliminated.includes(r.id));remaining-=h.eliminated.length;}assert.equal(remaining,1);assert(Object.values(s.stock).every(n=>n>=0));const semifinalists=new Set(s.history.at(-2).results.map(r=>r.characterId));for(const row of s.ranking)assert.equal(row.challengeHigh,semifinalists.has(row.characterId));
});

test('SKIP is one consent per active contestant, includes completed bots and changes phase only after unanimous consent',()=>{
 const s=episode(7);s.phase='kitchen';s.roster.forEach(p=>{p.bot=false;s.stations[p.id].served=true;s.stations[p.id].stage='served';s.stations[p.id].result={total:70,note:7,quality:'normal'};});
 const p=s.roster[0];chefAction(s,{type:'skip'},{actor:p});chefAction(s,{type:'skip'},{actor:p});assert.equal(chefView(s,{selfId:p.id}).skip.count,1);assert.equal(chefView(s,{selfId:'observer'}).skip.canVote,false);assert.throws(()=>chefAction(s,{type:'skip'},{actor:{id:'observer'},staff:true}),/no está activa/);
 for(const q of s.roster.slice(1,-1))chefAction(s,{type:'skip'},{actor:q});assert.equal(s.phase,'kitchen');s.roster.at(-1).bot=true;s.roster.at(-1).nextBot=0;tickChef(s,100);assert.equal(s.phase,'judging');assert.equal(s.judgingIndex,0);assert.equal(s.phaseAt,s.clock);assert.equal(s.roundResults.length,7);
});

function resultsWithZeros(count,positive){const s=episode(count);s.roster.forEach(p=>p.bot=false);s.phase='results';s.roundResults=s.roster.map((p,i)=>({id:p.id,name:p.name,characterId:p.characterId,total:i<positive?90-i:0,note:i<positive?9-i/10:0,quality:i<positive?'normal':'empty',rank:i+1}));return s;}
test('all zero-scoring cooks leave together and remaining rounds lead to a valid final',()=>{
 const s=resultsWithZeros(18,5);tickChef(s,100,{durations:{...DURATIONS,results:0}});assert.equal(s.eliminated.length,13);assert.equal(s.roster.filter(p=>p.active).length,5);assert.equal(s.totalRounds,4);assert.equal(s.plan.slice(1).reduce((a,b)=>a+b,0),2);assert.equal(s.finalistCount,3);
});
test('one survivor wins after departures; no survivors close without inventing a winner',()=>{
 for(const positive of [0,1]){const s=resultsWithZeros(7,positive);tickChef(s,100,{durations:{...DURATIONS,results:0}});assert.equal(s.phase,'elimination');assert.equal(s.eliminated.length,7-positive);tickChef(s,200,{durations:{...DURATIONS,elimination:0}});assert.equal(s.phase,positive?'winner':'farewell');assert.equal(s.noWinner,!positive);assert.equal(s.winner,positive?s.roster[0].id:null);assert.equal(s.ranking.length,7);}
});
test('spectating exposes only the chosen live kitchen and hides blind recipes and unrevealed scores',()=>{
 const s=episode(7);s.phase='kitchen';s.rounds[0].mode='blind';const p=s.roster[0],st=s.stations[p.id];st.recipeId='burger';st.result={total:99,note:9.9,parts:{ingredients:25},quality:'excellent',plateId:'burger'};
 const view=chefView(s,{selfId:'spectator',watchId:p.id});assert.equal(view.spectating.id,p.id);assert.equal(view.station,null);assert(view.watchedStation);assert.equal(view.watchedStation.recipeId,undefined);assert.equal(view.watchedStation.result.total,undefined);assert.equal(view.watchedStation.result.plateId,null);assert.equal(chefView(s,{watchId:'wrong'}).watchedStation,null);s.phase='judging';assert.equal(chefView(s,{watchId:p.id}).watchedStation,null);
});
test('special rounds have distinct recipes, hidden ingredients, short Flash deadlines and global one-unit stock',async()=>{
 const {createRounds,publicRecipe,roundMode,cookingLimit,fridgeLimit,inferRecipe}=await import('../public/juegos/bonju-chef/round-rules.mjs');
 for(let n=7;n<=18;n++){const setup=createRounds(n,rng);assert.equal(setup.totalRounds,n>=17?8:6);assert.equal(setup.finalistCount,n>=17?3:2);assert.equal(new Set(setup.rounds.map(r=>r.recipeId)).size,setup.totalRounds);for(const mode of ['blind','flash','single','improv'])assert.equal(setup.rounds.filter(r=>r.mode===mode).length,1);}
 const s=episode(),p=s.roster[0];p.bot=false;s.round=s.rounds.findIndex(r=>r.mode==='blind')+1;s.phase='fridge';let view=chefView(s,{selfId:p.id});assert.equal(view.recipe.name,'La receta secreta');assert.deepEqual(view.recipe.required,[]);assert.deepEqual(view.recipe.bonus,[]);assert(!view.roster.some(p=>p.guessRecipe));s.phase='judging';assert(publicRecipe(s).required.length>0);
 s.round=s.rounds.findIndex(r=>r.mode==='flash')+1;assert(cookingLimit(s)<360000/2);assert(fridgeLimit(s)<55000/2);
 s.round=s.rounds.findIndex(r=>r.mode==='single');s.phase='between';chefAction(s,{type:'next'},staff);assert.equal(roundMode(s),'single');assert(Object.values(s.stock).every(n=>n===1));s.phase='fridge';for(const p of s.roster){p.x=490;p.y=740;p.bot=false;}
 chefAction(s,{type:'take',id:'meat'},{actor:s.roster[0]});assert.throws(()=>chefAction(s,{type:'take',id:'meat'},{actor:s.roster[1]}),/agotó/);assert.equal(s.stock.meat,0);
 const sushi=RECIPES.find(r=>r.id==='sushi');assert.equal(inferRecipe(sushi.required).recipe.id,'sushi');
});

test('empty plates score zero, incoherent improvisation produces varied failed dishes, and finals return through a fifteen-second farewell',()=>{
 const s=episode(7),p=s.roster[0];p.bot=false;s.round=s.rounds.findIndex(r=>r.mode==='improv')+1;s.phase='kitchen';const st=s.stations[p.id];st.stage='plate';st.inventory=['salt'];st.mixed=['salt'];st.placed=[{id:'salt',x:.5,y:.5}];chefAction(s,{type:'serve'},{actor:p});assert.equal(st.result.quality,'ugly');assert(Number.isInteger(st.result.garbage));assert(st.result.note<=3.5);
 const q=s.roster[1];q.bot=false;const empty=s.stations[q.id];empty.stage='prep';s.phaseAt=0;s.clock=400000;s.at=400000;tickChef(s,400100,{random:rng});assert.equal(empty.result.quality,'empty');assert.equal(empty.result.note,0);assert.equal(empty.result.total,0);
 const close=episode(7);close.phase='winner';close.phaseAt=close.clock;close.at=0;for(let time=500;time<=20000;time+=500)tickChef(close,time);assert.equal(close.phase,'farewell');const farewellAt=close.clock;for(let time=20500;time<35000;time+=500){tickChef(close,time);assert.equal(close.phase,'farewell');}tickChef(close,35000);assert.equal(close.clock-farewellAt,15000);assert.equal(close.phase,'finished');
});

test('filling a saved kitchen lobby adds Alice and Gabriel in the old bot slots',()=>{
 const s=createChef({id:'cast-update',now:0});
 chefAction(s,{type:'open'},staff);
 chefAction(s,{type:'fillBots'},staff);
 const aliases={alice:'peggy',gabrielsab:'joseserna'};
 const retained=s.roster.filter(p=>!aliases[p.characterId]);
 for(const p of s.roster)if(aliases[p.characterId])p.characterId=aliases[p.characterId];
 chefAction(s,{type:'fillBots'},staff);
 assert.equal(s.roster.length,18);
 assert.deepEqual(s.roster.slice(0,16),retained);
 assert.deepEqual(s.roster.slice(16).map(p=>p.characterId).sort(),['alice','gabrielsab']);
});

test('a single approach request walks all eighteen human cooks into fridge range',()=>{
 const s=episode(18);
 s.phase='fridge';
 const stock={...s.stock};
 for(const p of s.roster){
  p.bot=false;
  chefAction(s,{type:'approachFridge'},{actor:p});
 }
 const last=s.roster.at(-1);
 assert(chefView(s,{selfId:last.id}).approachingFridge);
 for(let time=50;time<=6500;time+=50)tickChef(s,time);
 assert(s.roster.every(p=>nearChefFridge(p)&&!p.input));
 assert(!chefView(s,{selfId:last.id}).approachingFridge);
 assert.deepEqual(s.stock,stock);
 chefAction(s,{type:'take',id:'meat'},{actor:last});
 assert.deepEqual(s.stations[last.id].inventory,['meat']);
 last.x=1500;
 chefAction(s,{type:'approachFridge'},{actor:last});
 chefAction(s,{type:'move',x:1,y:0},{actor:last});
 assert(!chefView(s,{selfId:last.id}).approachingFridge);
 tickChef(s,6550);
 assert(last.x>1500);
});
