import test from 'node:test';import assert from 'node:assert/strict';
import {critique,judgingStep,JUDGE_ORDER} from '../public/juegos/bonju-chef/judging.mjs';
import {DURATIONS} from '../public/juegos/bonju-chef/data.mjs';
test('judges speak Bonju, Dua, María in separate timed segments for every plate',()=>{
 for(let index=0;index<18;index++)for(let slot=0;slot<3;slot++){const s={phaseAt:4000,judgingIndex:index,clock:4000+slot*6500};assert.equal(judgingStep(s).judge,JUDGE_ORDER[slot]);assert.equal(judgingStep({...s,clock:s.clock+6499}).judge,JUDGE_ORDER[slot]);}
});
test('critiques cover the requested lines, react to recipe faults and never award stars to an empty plate',()=>{
 const perfect={note:10,total:100,parts:{ingredients:25,cooking:25,technique:15,presentation:15,creativity:10}},bad={note:1,total:10,missing:2,matches:[{kind:'missing',required:'meat'}],parts:{ingredients:0,cooking:0}};
 for(const judge of JUDGE_ORDER){for(const result of [perfect,bad,{quality:'empty',note:0,total:0}]){const c=critique(result,judge,'seed');assert(c.text.length);assert(c.stars>=0&&c.stars<=5);assert(c.frame>=0&&c.frame<15);}assert.equal(critique({quality:'empty'},judge).stars,0);}
 for(const judge of ['bonju','maria']){assert.match(critique(bad,judge).text,/Faltaron carne/);assert(new Set(Array.from({length:100},(_,i)=>critique(perfect,judge,String(i)).text)).size>=3);}
 const loves=new Set(Array.from({length:100},(_,i)=>critique(perfect,'dua',String(i)).text)),disgust=new Set(Array.from({length:100},(_,i)=>critique(bad,'dua',String(i)).text));assert.equal(loves.size,3);assert.equal(disgust.size,6);assert(disgust.has('*Vomitar*'));const vomit=Array.from({length:100},(_,i)=>critique(bad,'dua',String(i))).find(c=>c.text==='*Vomitar*');assert.equal(vomit.frame,14);assert.equal(vomit.reaction,'nausea');
});
