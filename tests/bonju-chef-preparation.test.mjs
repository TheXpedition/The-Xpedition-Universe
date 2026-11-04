import test from 'node:test';import assert from 'node:assert/strict';
import {createChef,chefAction,tickChef,chefView} from '../public/juegos/bonju-chef/engine.mjs';
import {INGREDIENTS,RECIPES,DURATIONS} from '../public/juegos/bonju-chef/data.mjs';
import {prepProgress,prepPeriod,beginCooking,fatigueOf} from '../public/juegos/bonju-chef/preparation.mjs';
import {cookingLimit} from '../public/juegos/bonju-chef/round-rules.mjs';
const admin={staff:true,random:()=>.4};
function setup(n=18){const s=createChef({id:'preparation',now:0});chefAction(s,{type:'open'},admin);chefAction(s,{type:'fillBots',count:n},admin);chefAction(s,{type:'start'},admin);for(const p of s.roster){p.bot=false;p.x=490;p.y=690;}return s;}
test('each cuttable ingredient gets its own eight cuts; milk and other ready ingredients are not chopped',()=>{
 const s=setup(7),p=s.roster[0],st=s.stations[p.id];s.phase='kitchen';st.inventory=['carrot','milk','onion','fish'];
 for(const [index,id] of ['carrot','onion','fish'].entries()){assert.equal(prepProgress(st).current,id);for(let hit=0;hit<8;hit++){s.clock=st.stageAt+prepPeriod(s,p)*(hit+.25);chefAction(s,{type:'cut',clock:s.clock},{actor:p});}assert.equal(st.cuts.length,(index+1)*8);if(index<2)assert.equal(st.stage,'prep');}
 assert.equal(st.stage,'cook');assert.equal(prepProgress(st).completed,3);
});
test('blending requires a held input, stops on release, respects pause, and completes the recipe stage',()=>{
 const s=setup(7),p=s.roster[0],st=s.stations[p.id];s.phase='kitchen';st.inventory=['milk','cream','sugar','vanilla'];st.recipeId='icecream';beginCooking(st,s.clock,RECIPES.find(r=>r.id==='icecream'));assert.equal(st.stage,'blend');
 tickChef(s,100);assert.equal(st.blendProgress,0);chefAction(s,{type:'blend',active:true},{actor:p});tickChef(s,200);assert.equal(st.blendProgress,100);chefAction(s,{type:'blend',active:false},{actor:p});tickChef(s,300);assert.equal(st.blendProgress,100);
 chefAction(s,{type:'pause'},admin);tickChef(s,400);assert.equal(st.blendProgress,100);chefAction(s,{type:'resume'},admin);
 for(let t=500;t<8000&&st.stage==='blend';t+=100){chefAction(s,{type:'blend',active:true},{actor:p});tickChef(s,t);}assert.equal(st.stage,'cook');assert(st.blended);
});
test('the one-unit pantry has enough distinct food for an eighteen-person cast and cannot be monopolized',()=>{
 const s=setup();s.round=s.rounds.findIndex(r=>r.mode==='single');s.phase='between';chefAction(s,{type:'next'},admin);s.phase='fridge';const remaining=INGREDIENTS.map(i=>i.id);assert.equal(remaining.length,71);assert(Object.values(s.stock).every(n=>n===1));
 for(const p of s.roster){p.bot=false;p.x=490;p.y=690;for(let i=0;i<4&&remaining.length;i++)chefAction(s,{type:'take',id:remaining.shift()},{actor:p});}
 assert.equal(s.roster.filter(p=>s.stations[p.id].inventory.length===0).length,0);assert(s.roster.every(p=>s.stations[p.id].inventory.length>=3));assert(Object.values(s.stock).every(n=>n===0));assert.throws(()=>chefAction(s,{type:'take',id:'milk'},{actor:s.roster[0]}),/llena|agotó|tienes/);
});
test('all contestants receive only their own simultaneous judging and cooking ends on completion or unanimous SKIP',()=>{
 const s=setup(7);s.phase='kitchen';for(const [i,p]of s.roster.entries()){const st=s.stations[p.id];st.served=true;st.result={note:8+i/10,total:80+i,parts:{ingredients:25,technique:15,cooking:25,presentation:10,creativity:5},quality:'normal'};}
 tickChef(s,100);assert.equal(s.phase,'judging');for(const p of s.roster){const v=chefView(s,{selfId:p.id});assert.equal(v.results.length,1);assert.equal(v.results[0].id,p.id);assert.equal(v.judgingIndex,0);assert.equal(v.phaseAt,s.phaseAt);assert.deepEqual(v.judgingSegments,s.judgingSegments);}
 const duration=s.judgingSegments.reduce((a,b)=>a+b,0);for(let t=200;t<=duration+700;t+=100)tickChef(s,t);assert.equal(s.phase,'results');
 const next=setup(7);next.phase='kitchen';for(const p of next.roster)chefAction(next,{type:'skip'},{actor:p});assert.equal(next.phase,'judging');assert(next.clock<300000);
 for(const mode of ['normal','blind','single','improv']){next.mode=mode;next.rounds=[];assert.equal(cookingLimit(next),300000);}next.mode='flash';assert(cookingLimit(next)<150000);
});
test('sleep, hunger, energy, health and stress change the physical preparation difficulty within a small bounded range',()=>{
 const rested={vitals:{energy:100,sleep:100,hunger:100,health:100,stress:0}},s=setup(7);assert.equal(fatigueOf(rested),0);for(const vital of ['energy','sleep','hunger','health']){const tired={vitals:{...rested.vitals,[vital]:20}};assert(fatigueOf(tired)>0);assert(fatigueOf(tired)<=.24);assert(prepPeriod(s,tired)<prepPeriod(s,rested));}assert(fatigueOf({vitals:{stress:90}})>0);
});
