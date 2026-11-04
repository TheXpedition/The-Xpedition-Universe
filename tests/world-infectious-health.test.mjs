import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWellness,treatCondition,stepWellness,wellnessSnapshot,MEDICINE_BY_ID} from '../public/juegos/world-wellness.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {smokeCigarette} from '../public/juegos/world-smoking.mjs';
import {setInfection,isSuppressed,advanceInfection} from '../public/juegos/world-infectious-health.mjs';
import {applyEncounterHealth} from '../public/juegos/world-encounter-health.mjs';
const environment={weather:'clear',temperature:20,totalMinutes:1440};
test('smoking uses a cooldown and cumulative respiratory effects survive save normalization',()=>{
 let body=createWellness(),vitals=createVitals({stress:50});
 assert.throws(()=>smokeCigarette(body,vitals,{adult:false}),/adultos/);
 for(let n=0;n<26;n++)smokeCigarette(body,vitals,{adult:true,now:n*31000,random:()=>0});
 body=createWellness(JSON.parse(JSON.stringify(body)));assert.equal(body.smoking.total,26);assert(body.conditions.some(c=>c.id==='copd'));assert(body.conditions.some(c=>c.id==='smoke-irritation'));
 assert.throws(()=>smokeCigarette(body,vitals,{adult:true,now:26*31000-30000}),/Espera/);
 const next=stepWellness(body,vitals,{seconds:5,environment,zone:'gasolinera-interior'});assert(next.vitals.stress>vitals.stress);assert(next.body.smoking.reliefDebt<body.smoking.reliefDebt);
});
test('inhalers relieve symptoms but never erase COPD; diagnostic data is private until examination',()=>{
 const b=createWellness({conditions:[{id:'copd',severity:60}],medicines:{salbutamol:1}}),next=treatCondition(b,createVitals(),'salbutamol',{random:()=>.5});assert(next.body.conditions.some(c=>c.id==='copd'));assert(next.body.conditions[0].severity<60);assert(!wellnessSnapshot(next.body).conditions.length);
 next.body.clinical.known.push('copd');assert.equal(wellnessSnapshot(next.body).conditions[0].id,'copd');assert.notEqual(MEDICINE_BY_ID.salbutamol.icon,MEDICINE_BY_ID.dolutegravir.icon);
});
test('a complete two-component plan controls HIV, a single component does not cure or suppress it',()=>{
 let b=setInfection(createWellness({medicines:{'emtricitabine-tenofovir':2,dolutegravir:2,'hiv-screen':1}}),'hiv-2');assert.deepEqual(wellnessSnapshot(b).infection,{status:'unknown'});assert(!wellnessSnapshot(b).conditions.length);
 b=treatCondition(b,createVitals(),'emtricitabine-tenofovir',{random:()=>.5}).body;assert(!isSuppressed(b));b.elapsed+=31;b=treatCondition(b,createVitals(),'dolutegravir',{random:()=>.5}).body;assert(isSuppressed(b));
 b.elapsed+=31;b=treatCondition(b,createVitals(),'hiv-screen').body;assert.equal(wellnessSnapshot(b).infection.type,'hiv-2');assert(wellnessSnapshot(b).conditions.some(c=>c.id==='hiv-2'));b=createWellness(b);assert(isSuppressed(b));b.elapsed+=3601;assert(!isSuppressed(b));
});
test('untreated advanced infection has complications; HIV-2 progression is slower and treatment lowers pressure',()=>{
 const a=setInfection(createWellness(),'hiv-1'),b=setInfection(createWellness(),'hiv-2');advanceInfection(a,36000);advanceInfection(b,36000);assert(a.infection.progression>b.infection.progression);assert(a.conditions.some(c=>c.id==='aids'));assert(a.conditions.some(c=>c.id==='opportunistic-pneumonia'));assert(!b.conditions.some(c=>c.id==='aids'));
 a.infection.components={backboneUntil:10000,integraseUntil:10000};const before=a.infection.progression;advanceInfection(a,100);assert(a.infection.progression<before);assert(a.conditions.some(c=>c.id==='hiv-1'));
});
const participant=(gender='male')=>({adult:true,gender,body:createWellness({reproductive:{enabled:gender==='female',adult:true}}),vitals:createVitals()});
test('infection requires an infected source, never a gender pairing, and suppressed sources do not transmit',()=>{
 for(const gender of ['male','female']){const a=participant(),b=participant(gender);applyEncounterHealth(a,b,{protectedEncounter:false,random:()=>0});assert.equal(a.body.infection.type,null);assert.equal(b.body.infection.type,null);}
 const a=participant(),b=participant();setInfection(a.body,'hiv-1');applyEncounterHealth(a,b,{protectedEncounter:false,random:()=>0});assert.equal(b.body.infection.type,'hiv-1');assert.deepEqual(wellnessSnapshot(b.body).infection,{status:'unknown'});
 const c=participant();a.body.infection.components={backboneUntil:1000,integraseUntil:1000};applyEncounterHealth(a,c,{protectedEncounter:false,random:()=>0});assert.equal(c.body.infection.type,null);
});
test('pregnancy is an adult, explicitly consented story, hidden until a test',()=>{
 const a=participant('female'),b=participant();applyEncounterHealth(a,b,{protectedEncounter:false,random:()=>0});assert.equal(a.body.reproductive.pregnant,false);
 applyEncounterHealth(a,b,{protectedEncounter:false,pregnancyConsent:true,random:()=>0});assert(a.body.reproductive.pregnant);assert.equal(wellnessSnapshot(a.body).reproductive.pregnancy,'unknown');assert.throws(()=>applyEncounterHealth({...a,adult:false},b),/adultos/);
});
