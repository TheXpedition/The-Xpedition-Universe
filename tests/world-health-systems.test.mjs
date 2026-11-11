import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWellness,stepWellness,treatCondition,wellnessSnapshot} from '../public/juegos/world-wellness.mjs';
import {applyCharacterHealthProfile,mobility} from '../public/juegos/world-health-systems.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {normalizeWorldPlayer} from '../public/juegos/world-player-state.mjs';
const environment={weather:'clear',temperature:20,totalMinutes:1440};
test('female cast care is mandatory, cycle symptoms are visible and account identity is not used',()=>{
 let body=applyCharacterHealthProfile(createWellness(), 'plastiquedoll');assert(body.reproductive.enabled&&body.reproductive.menstruates);body.reproductive.enabled=false;applyCharacterHealthProfile(body,'plastiquedoll');assert(body.reproductive.enabled);
 body=stepWellness(body,createVitals(),{seconds:1,zone:'refugio-1',environment}).body;assert(wellnessSnapshot(body).reproductive.menstruating);assert.equal(applyCharacterHealthProfile(createWellness(),'dani').reproductive.enabled,true);
});
test('clinical diagnoses and lifelong traits are private until an examination records them',()=>{
 const b=createWellness({clinical:{traits:{autism:true,downSyndrome:true}},conditions:[{id:'anxiety',severity:40}]});let view=wellnessSnapshot(b);assert.equal(view.mental.diagnoses.length,0);assert.equal(view.conditions.length,0);b.clinical.known=['anxiety','traits'];view=wellnessSnapshot(b);assert.deepEqual(view.mental.diagnoses,['anxiety','autism','down-syndrome']);assert.equal(view.conditions[0].id,'anxiety');
 const next=treatCondition({...b,medicines:{counselling:1}},createVitals({stress:80}),'counselling');assert(next.body.clinical.traits.autism&&next.body.clinical.traits.downSyndrome);assert(next.vitals.stress<80);
});
test('response and adverse outcomes consume one unit and preserve untargeted injuries',()=>{
 const b=createWellness({conditions:[{id:'scratch',severity:60}],medicines:{antiseptic:2}}),v=createVitals({health:70});const ineffective=treatCondition(b,v,'antiseptic',{random:()=>.99});assert.equal(ineffective.outcome,'ineffective');assert.equal(ineffective.body.conditions[0].severity,60);assert.equal(ineffective.body.medicines.antiseptic,1);
 const adverse=treatCondition(b,v,'antiseptic',{random:()=>0});assert.equal(adverse.outcome,'adverse');assert(adverse.body.conditions.some(c=>c.id==='adverse-reaction'));assert.equal(adverse.vitals.health,69);assert.equal(b.medicines.antiseptic,2);
 const fracture=createWellness({conditions:[{id:'fracture',severity:60}],clinical:{injuries:[{condition:'fracture',part:'left-leg'}]},medicines:{plaster:1}});assert.throws(()=>treatCondition(fracture,v,'plaster',{bodyPart:'right-leg'}),/extremidad/);const cast=treatCondition(fracture,v,'plaster',{bodyPart:'left-leg'});assert(cast.body.clinical.casts['left-leg']>0);
});
test('reproductive procedures require confirmed state and the patient decision',()=>{
 let b=applyCharacterHealthProfile(createWellness({medicines:{'pregnancy-test':1,'reproductive-care':1}}),'plastiquedoll');b.reproductive.pregnant=true;assert.throws(()=>treatCondition(b,createVitals(),'reproductive-care'),/confirmación/);b=treatCondition(b,createVitals(),'pregnancy-test').body;assert.equal(wellnessSnapshot(b).reproductive.pregnancy,'positive');b.elapsed+=31;b.reproductive.procedureConsent=true;const next=treatCondition(b,createVitals(),'reproductive-care');assert.equal(next.body.reproductive.pregnant,false);assert.equal(next.body.reproductive.procedureConsent,false);
});
test('hygiene products have distinct effects and reusable equipment is not destroyed',()=>{
 const b=createWellness({hygiene:{body:10,oral:10,feet:10,hair:10},medicines:{soap:1,toothbrush:1,toothpaste:2,'blood-pressure-monitor':1}});const wash=treatCondition(b,createVitals(),'soap');assert.equal(wash.body.hygiene.body,100);assert.equal(wash.body.hygiene.oral,10);wash.body.elapsed+=31;const brushed=treatCondition(wash.body,createVitals(),'toothbrush');assert.equal(brushed.body.medicines.toothbrush,1);assert.equal(brushed.body.medicines.toothpaste,1);assert.equal(brushed.body.hygiene.oral,100);
});
test('exhaustion blocks running, fainting recovers autonomously and health zero stays dead',()=>{
 const body=createWellness();assert(!mobility(body,createVitals({energy:60})).canRun);assert(mobility(body,createVitals({energy:61})).canRun);assert(mobility(body,createVitals({energy:5})).speedFactor<.5);
 let state=stepWellness(body,createVitals({sleep:0}),{seconds:1,environment,zone:'refugio-1',now:1000});assert.equal(state.body.life.status,'fainted');for(let i=0;i<30;i++)state=stepWellness(state.body,state.vitals,{seconds:1,environment,zone:'refugio-1',now:2000+i*1000});assert.equal(state.body.life.status,'alive');
 const dead=stepWellness(body,createVitals({health:0,hunger:0}),{seconds:1,environment,zone:'base',now:1000});assert.equal(dead.body.life.status,'dead');assert(dead.body.life.vomitUntil>1000);assert.equal(mobility(dead.body,dead.vitals).speedFactor,0);assert.equal(stepWellness(dead.body,dead.vitals,{seconds:5,environment}).vitals.health,0);
});
test('sleep retains its bed reference and standing removes it',()=>{
 const asleep=normalizeWorldPlayer({state:'sleep',seatId:'bed',seatSlot:0});assert.equal(asleep.seatId,'bed');assert.equal(normalizeWorldPlayer({...asleep,state:'idle'}).seatId,null);
});

test('poor hygiene raises stress and damages health without causing death',()=>{
 const body=createWellness({hygiene:{body:0},conditions:[{id:'poor-hygiene',severity:100}]});
 const step=(wellness,vitals)=>stepWellness(wellness,vitals,{seconds:5,environment,zone:'refugio-1',now:1000});
 const dirty=step(body,createVitals({health:25,stress:0}));
 assert(dirty.vitals.health<25);
 assert(dirty.vitals.stress>0);
 let critical=step(body,createVitals({health:1.001}));
 for(let i=0;i<25;i++)critical=step(critical.body,critical.vitals);
 assert.equal(critical.vitals.health,1);
 assert.equal(critical.body.life.status,'alive');
 const dead=step(body,createVitals({health:0,hunger:0}));
 assert.equal(dead.body.life.status,'dead');
 assert.equal(dead.body.life.cause,'starvation');
});
