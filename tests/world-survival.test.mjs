import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createEnvironment,environmentSnapshot,adjustEnvironment,outdoorExposure,environmentalHazard,WEATHER} from '../public/juegos/world-environment.mjs';
import {createWellness,stepWellness,registerMeal,treatCondition,wellnessSnapshot,CONDITIONS,CONDITION_BY_ID,MEDICINES,MEDICINE_BY_ID} from '../public/juegos/world-wellness.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {WorldAmbience} from '../public/juegos/world-ambience.mjs';
import {paintEnvironment} from '../public/juegos/world-environment-art.mjs';

const start=1_800_000_000_000;
const weather=(name='clear',hour=12)=>environmentSnapshot(createEnvironment({anchorAt:start,anchorMinutes:hour*60,weather:name},start),start);
function simulate(seconds,body={},options={},vitals={}){
 let current={body:createWellness(body),vitals:createVitals(vitals)};
 for(let elapsed=0;elapsed<seconds;elapsed+=1)current=stepWellness(current.body,current.vitals,{seconds:1,environment:weather(),zone:'base',...options});
 return current;
}

test('the fictional clock takes sixty real minutes per day and staff changes preserve clock continuity',()=>{
 const state=createEnvironment({},start),before=environmentSnapshot(state,start),after=environmentSnapshot(state,start+3_600_000);
 assert.equal(state.rate,24);assert.equal(after.totalMinutes-before.totalMinutes,1440);assert.equal(after.time,before.time);assert.equal(after.day,before.day+1);
 for(const [rate,minutes]of [[12,120],[24,60],[48,30]]){
  const changed=adjustEnvironment(state,{rate},start+60_000),atChange=environmentSnapshot(changed,start+60_000);
  assert.equal(atChange.totalMinutes,environmentSnapshot(state,start+60_000).totalMinutes,'changing speed does not jump the clock');
  assert.equal(environmentSnapshot(changed,start+60_000+minutes*60_000).totalMinutes-atChange.totalMinutes,1440);
 }
 assert.equal(weather('clear',6).phase,'day');assert.equal(weather('clear',13).phase,'afternoon');assert.equal(weather('clear',20).phase,'night');
 assert.equal(environmentSnapshot(adjustEnvironment(state,{hour:22,weather:'storm'},start),start).time,'22:00');
 assert.equal(weather('storm').weatherName,'Tormenta');assert.equal(weather('snow',22).temperature,-4);assert.deepEqual(Object.keys(WEATHER),['clear','rain','snow','storm']);
 for(const input of [{rate:120},{hour:24},{hour:2.5},{weather:'tornado'}])assert.throws(()=>adjustEnvironment(state,input,start));
 const automatic=createEnvironment({anchorAt:start,anchorMinutes:0},start),sequence=Array.from({length:8},(_,i)=>environmentSnapshot(automatic,start+i*900_000).weather);
 assert.deepEqual(sequence,['clear','rain','clear','snow','clear','storm','clear','clear']);
});

test('exposure is gradual, climate clothing matters and protected interiors do not receive precipitation exposure',()=>{
 assert.equal(outdoorExposure('cocina'),0);assert.equal(outdoorExposure('hospital-interior'),0);assert.equal(outdoorExposure('tren-pasajeros'),0);assert.equal(outdoorExposure('base'),1);
 const instant=simulate(1,{}, {environment:weather('snow')});assert.equal(instant.body.conditions.length,0);assert.equal(instant.vitals.health,100);
 const light=simulate(180,{clothing:'heat'},{environment:weather('snow')});
 const warm=simulate(180,{clothing:'cold'},{environment:weather('snow')});
 assert(light.body.exposure.cold>warm.body.exposure.cold);assert(light.body.conditions.some(c=>c.id==='chill'));assert.equal(warm.body.conditions.length,0);assert(light.vitals.stress>warm.vitals.stress);
 const hotLight=simulate(180,{clothing:'heat'},{environment:weather('clear',15)}),hotCoat=simulate(180,{clothing:'cold'},{environment:weather('clear',15)});
 assert(hotCoat.body.exposure.heat>hotLight.body.exposure.heat);assert(hotCoat.vitals.stress>hotLight.vitals.stress);
 const rain=simulate(120,{clothing:'heat'},{environment:weather('rain')}),storm=simulate(120,{clothing:'heat'},{environment:weather('storm')}),coated=simulate(120,{clothing:'cold'},{environment:weather('storm')});
 assert(storm.body.wetness>rain.body.wetness);assert(coated.body.wetness<storm.body.wetness);
 const indoor=simulate(600,{}, {environment:weather('storm'),zone:'refugio-1'});assert.equal(indoor.body.wetness,0);assert.equal(indoor.body.conditions.length,0);assert.equal(indoor.vitals.health,100);
 const offline=stepWellness(createWellness(),createVitals(),{seconds:86_400,environment:weather('snow')});assert.equal(offline.body.elapsed,5,'a delayed tick never applies hours of offline penalties');assert.equal(offline.body.conditions.length,0);
});

test('injuries require actual running through marked hazards and hospital rest improves recovery',()=>{
 const map={width:1000,height:500,walkBand:[.78,.94]},point={x:250,y:400};
 assert(environmentalHazard('desguace',point,map));assert(!environmentalHazard('base',point,map));assert(!environmentalHazard('desguace',{x:500,y:400},map));
 for(const options of [{moving:false,running:true,hazard:true},{moving:true,running:false,hazard:true},{moving:true,running:true,hazard:false}]){
  assert.equal(simulate(400,{},options).body.conditions.filter(c=>CONDITION_BY_ID[c.id].group==='injury').length,0);
 }
 const injured=simulate(340,{}, {moving:true,running:true,hazard:true});for(const id of ['scratch','bruise','sprain'])assert(injured.body.conditions.some(c=>c.id===id));
 const seed={conditions:[{id:'sprain',severity:60}],wetness:60},vitals={health:70,energy:30,sleep:30,stress:50};
 const rested=simulate(60,seed,{zone:'hospital-interior',hospitalRest:true},vitals),waiting=simulate(60,seed,{zone:'hospital-interior'},vitals);
 assert(rested.vitals.health>waiting.vitals.health);assert(rested.vitals.energy>waiting.vitals.energy);assert(rested.vitals.sleep>waiting.vitals.sleep);assert(rested.vitals.stress<waiting.vitals.stress);assert(rested.body.conditions[0].severity<waiting.body.conditions[0].severity);
 assert.equal(wellnessSnapshot(createWellness({conditions:[{id:'sprain',severity:60}]})).speedFactor,.85);
 assert.equal(wellnessSnapshot(createWellness()).speedFactor,1);
 const complicated=simulate(1,{conditions:[{id:'scratch',severity:40,age:600},{id:'wound-infection',severity:60,age:600}]});assert(complicated.body.conditions.some(c=>c.id==='fever'));
 const severe=simulate(3600,{conditions:[{id:'heatstroke',severity:100}]},{environment:weather('clear',15)},{health:11});assert.equal(severe.vitals.health,0);assert.equal(severe.body.life.status,'dead');
});

test('food illness follows heat exposure or overeating instead of randomly poisoning fresh food',()=>{
 const fresh=registerMeal(createWellness(),{category:'protein'});assert.equal(fresh.conditions.length,0);
 const warmed=simulate(480,{}, {hasPerishable:true,environment:weather('clear',15)}).body;
 assert.equal(wellnessSnapshot(warmed).foodRisk,true);const meal=registerMeal(warmed,{category:'protein'});assert(meal.conditions.some(c=>c.id==='food-sickness'));assert(meal.conditions.some(c=>c.id==='nausea'));
 assert(!registerMeal(warmed,{category:'fruit'}).conditions.some(c=>c.id==='food-sickness'),'heat-sensitive meals differ from fruit');
 const stored=simulate(480,{}, {hasPerishable:true,zone:'cocina',environment:weather('clear',15)});assert.equal(stored.body.foodWarmth,0);
 let body=createWellness();for(let i=0;i<4;i++)body=registerMeal(body,{category:'meal'});assert(body.conditions.some(c=>c.id==='indigestion'));assert(body.conditions.some(c=>c.id==='nausea'));
 body.elapsed=181;const spaced=registerMeal(body,{category:'fruit'});assert.equal(spaced.meals.length,1,'old portions leave the short overeating window');
});

test('all conditions have matching treatments and using medicine consumes only suitable personal stock',()=>{
 assert.equal(CONDITIONS.length,42);assert.equal(MEDICINES.length,59);
 for(const condition of CONDITIONS)for(const id of condition.treatments)assert(MEDICINE_BY_ID[id].treats.includes(condition.id),condition.id+' matching medicine');
 for(const medicine of MEDICINES)for(const id of medicine.treats)assert(CONDITION_BY_ID[id],medicine.id+' known condition');
 const body=createWellness({elapsed:100,conditions:[{id:'dehydration',severity:90}],medicines:{water:2,'support-wrap':1}}),original=structuredClone(body);
 assert.throws(()=>treatCondition(body,createVitals(),'support-wrap'),/no corresponde/);assert.deepEqual(body,original,'rejected medicine leaves caller-owned state untouched');
 const treated=treatCondition(body,createVitals({health:80}),'water');assert.equal(treated.body.medicines.water,1);assert.equal(treated.body.conditions[0].severity,58);assert.equal(treated.body.conditions[0].treatment,90);assert.equal(treated.vitals.health,83);
 assert.throws(()=>treatCondition(treated.body,treated.vitals,'water'),/Espera/);const later=simulate(31,treated.body,{zone:'hospital-interior'},treated.vitals);assert.doesNotThrow(()=>treatCondition(later.body,later.vitals,'water'));
 assert.throws(()=>treatCondition(createWellness(),createVitals(),'water'),/No tienes/);assert.throws(()=>treatCondition(body,createVitals(),'unknown'),/válido/);
});

function audioContext(){
 const nodes=[],param=()=>({calls:[],setValueAtTime(v,t){this.calls.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.calls.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.calls.push(['exponential',v,t]);}});
 const node=kind=>{const n={kind,frequency:param(),gain:param(),Q:param(),stopped:false,disconnected:false,connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t??0;},stop(t){this.stopped=true;this.stopAt=t;}};nodes.push(n);return n;};
 return {nodes,state:'running',currentTime:1,sampleRate:1000,destination:{},createBuffer:(channels,length)=>({getChannelData:()=>new Float32Array(length)}),createBufferSource:()=>node('noise'),createOscillator:()=>node('oscillator'),createBiquadFilter:()=>node('filter'),createGain:()=>node('gain')};
}
const maxGain=ctx=>Math.max(...ctx.nodes.filter(n=>n.kind==='gain').flatMap(n=>n.gain.calls.map(c=>c[1])));

test('rain and delayed thunder are quieter indoors and mute, hidden tab or leaving play stop every audio layer',()=>{
 const outside=audioContext(),inside=audioContext(),a=new WorldAmbience(),b=new WorldAmbience(),environment={...weather('storm'),weatherSince:start};
 a.update(outside,{zone:'base',environment,now:0,worldTime:start+2500});b.update(inside,{zone:'cocina',environment,now:0,worldTime:start+2500});
 assert.equal(a.notes.size,0,'lightning happens before thunder');assert.equal(b.notes.size,0);assert(maxGain(outside)>maxGain(inside),'rain is muffled indoors');
 a.update(outside,{zone:'base',environment,now:900,worldTime:start+3400});b.update(inside,{zone:'cocina',environment,now:900,worldTime:start+3400});assert.equal(a.notes.size,1);assert.equal(b.notes.size,1);
 const outdoorPeak=maxGain(outside),indoorPeak=maxGain(inside);assert.equal(outdoorPeak,.055);assert(indoorPeak<outdoorPeak);
 a.update(outside,{zone:'base',environment,now:950,worldTime:start+3450});assert.equal(a.notes.size,1,'each storm pulse plays one thunder only');
 for(const field of ['enabled','visible','playing']){
  const ctx=audioContext(),ambience=new WorldAmbience();ambience.update(ctx,{zone:'base',environment,worldTime:start+3400});assert(ambience.layers.length&&ambience.notes.size);ambience.update(ctx,{zone:'base',environment,[field]:false});assert.equal(ambience.layers.length,0);assert.equal(ambience.notes.size,0);assert(ctx.nodes.filter(n=>n.kind==='noise'||n.kind==='oscillator').every(n=>n.stopped));assert(ctx.nodes.every(n=>n.disconnected));
 }
 const suspended=audioContext();suspended.state='suspended';const silent=new WorldAmbience();silent.update(suspended,{zone:'base',environment});assert.equal(suspended.nodes.length,0,'no audio starts before the existing gesture unlock');
});

test('forest ambience changes from daytime birds to lower nighttime calls and clears the previous sources',()=>{
 const ctx=audioContext(),ambience=new WorldAmbience();ambience.update(ctx,{zone:'sendero-bosque',environment:weather(),now:0});ambience.update(ctx,{zone:'sendero-bosque',environment:weather(),now:4000});
 const bird=ctx.nodes.find(n=>n.kind==='oscillator');assert(bird.frequency.calls[0][1]>1800);
 const oldSources=ctx.nodes.filter(n=>n.kind==='noise'||n.kind==='oscillator');ambience.update(ctx,{zone:'sendero-bosque',environment:weather('clear',22),now:5000});assert(oldSources.every(n=>n.stopped&&n.disconnected));ambience.update(ctx,{zone:'sendero-bosque',environment:weather('clear',22),now:9000});
 const hoots=ctx.nodes.filter(n=>n.kind==='oscillator').slice(-2);assert.equal(hoots.length,2);assert(hoots.every(n=>n.frequency.calls[0][1]<600),'night calls stay below daytime bird pitches');ambience.stop();
});

test('weather effects stay outside and reduced-motion mode disables lightning',()=>{
 const operations=[],noop=()=>{},context=new Proxy({save:noop,restore:noop,fillRect(){operations.push(['fill',this.globalCompositeOperation,this.globalAlpha]);},stroke(){operations.push(['stroke',this.globalCompositeOperation]);},createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)}),base={width:400,height:200,id:'base'},camera={project:(x,y)=>({x,y})},environment={...weather('storm'),weatherSince:start};
 paintEnvironment(context,400,200,{environment,map:base,camera,time:start+2500});assert(operations.some(op=>op[1]==='screen'));assert(operations.filter(op=>op[0]==='stroke').length>100);
 operations.length=0;paintEnvironment(context,400,200,{environment,map:base,camera,time:start+2500,reducedMotion:true});assert(!operations.some(op=>op[1]==='screen'));
 operations.length=0;paintEnvironment(context,400,200,{environment,map:{...base,id:'cocina'},camera,time:start+2500});assert.equal(operations.length,0,'a protected interior gets neither rain nor a fullscreen flash');
});

test('the actual Canvas night darkens the sky more than the readable floor without a strong blue wash',async t=>{
 let createCanvas;try{({createCanvas}=createRequire(process.env.XP_CANVAS_PACKAGE||'C:/Users/lopez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')('@napi-rs/canvas'));}catch{t.skip('Native Canvas is unavailable in this environment.');return;}
 const canvas=createCanvas(200,100),c=canvas.getContext('2d');c.fillStyle='#aa784b';c.fillRect(0,0,200,100);c.fillStyle='#d4c5a6';c.fillRect(80,0,120,100);
 const day=c.getImageData(0,0,200,100).data;paintEnvironment(c,200,100,{environment:weather('clear',22),map:{id:'base',width:200,height:100},camera:{project:(x,y)=>({x,y})}});const night=c.getImageData(0,0,200,100).data;
 const luminance=data=>{let sum=0;for(let i=0;i<data.length;i+=4)sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];return sum/(data.length/4);};
 assert(luminance(night)>luminance(day)*.3,'night retains readable midtones');assert(luminance(night)<luminance(day)*.65,'night is visibly darker than daytime');const sample=y=>{const i=(y*200+100)*4;return night[i]*.2126+night[i+1]*.7152+night[i+2]*.0722;};assert(sample(10)<sample(90),'the sky is darker than the walking floor');const floor=(90*200+100)*4;assert(night[floor+2]/night[floor]<1.1,'the floor is not saturated blue');
});
