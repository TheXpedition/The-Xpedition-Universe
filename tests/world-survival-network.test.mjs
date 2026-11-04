import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {interactionPoint} from '../public/juegos/world-interactions.mjs';
import {createWellness,MEDICINES} from '../public/juegos/world-wellness.mjs';
import {createVitals} from '../public/juegos/world-vitals.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
import {createWorldShop} from '../world-shop-service.mjs';

// Real HTTP and WebSocket clients against an isolated, fictional review database.
const root=path.resolve(import.meta.dirname,'..');
const dir=fs.mkdtempSync(path.join(root,'review','.survival-network-'));
const staff='92354719-8816-4e25-9199-0dc9a99f7da1',a='survival-patient',b='survival-observer';
const hash=value=>createHash('sha256').update(value).digest('hex');
let child,base,stderr='';const peers=[];
after(async()=>{
 for(const peer of peers)peer.socket.terminate();
 if(child&&child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
});
async function until(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const value=fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,30));}throw Error('Expected survival state did not arrive. '+stderr.slice(-500));}
async function call(url,id=a,method='GET',input){const response=await fetch(base+url,{method,headers:{Cookie:'xp_world_session='+id,'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});return {status:response.status,...await response.json()};}
async function connect(id,zone){await claimFixtureCharacter(base,id,{[staff]:'maria-villegas',[a]:'vitany',[b]:'guillermo'}[id]);return new Promise((resolve,reject)=>{const peer={socket:new WebSocket(base.replace('http:','ws:')+'/api/world/live?zone='+zone,{headers:{Origin:base,Cookie:'xp_world_session='+id}}),messages:[]};peers.push(peer);peer.socket.once('error',reject);peer.socket.on('message',raw=>{const value=JSON.parse(raw);peer.messages.push(value);if(value.type==='welcome')resolve(peer);});});}
const send=(peer,value)=>peer.socket.send(JSON.stringify(value));

test('shared environment and private medical care are authoritative across real clients',async t=>{
 const map=WORLD_MAPS['hospital-interior'],cabinet=map.props.find(prop=>prop.type==='medical-cabinet'),point=interactionPoint(map,cabinet),db=await openDatabase(dir);
 for(const id of [staff,a,b]){
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','',Date.now());
  await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',hash(id),id,Date.now()+3600000);
  await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',hash(id),hash(id),id,Date.now()+3600000);
  const zone=id===a?'hospital-interior':'base',spawn=id===a?[point.x,point.y]:WORLD_MAPS.base.spawn;
  await db.run('INSERT INTO world_preferences(user_id,character_id,favorites,visited,last_zone,x,y,diary,updated) VALUES(?,?,?,?,?,?,?,?,?)',id,'dani','[]','[]',zone,...spawn,'',Date.now());
 }
 // Explicit owned characters and confirmed casting, as in a real saved profile.
 const shop=createWorldShop({db});await shop.snapshot({id:a});
 for(const [owner,ref]of [[a,'vitany'],[b,'guillermo'],[staff,'bruno']])await db.run('INSERT INTO world_shop_items(id,owner,kind,ref,state,payload,created,updated) VALUES(?,?,?,?,?,?,?,?)','owned-'+owner+'-'+ref,owner,'character',ref,'owned','{}',Date.now(),Date.now());
 for(const [i,id]of [a,b].entries())await db.run('INSERT INTO casting_entries(season,user_id,direct_slot) VALUES(?,?,?)','apocalypse-ii',id,i+1);
 await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,?,?,?)','world',1,staff,Date.now());
 await db.run('INSERT INTO world_wellness(user_id,state,updated) VALUES(?,?,?)',a,JSON.stringify(createWellness({elapsed:100,conditions:[{id:'scratch',severity:60,age:0}]})),Date.now());
 await db.run('INSERT INTO world_vitals(user_id,state,updated) VALUES(?,?,?)',a,JSON.stringify(createVitals({health:70,energy:80,sleep:80})),Date.now());
 // This privacy/persistence fixture already owns a crafted coat; acquisition is tested separately.
 await db.run('INSERT INTO world_survival_state(id,state,updated) VALUES(?,?,?)','user:'+a,JSON.stringify({items:{coat:1},charges:{},equipment:{},cooldowns:{},receipts:[]}),Date.now());
 await db.close();
 child=spawn(process.execPath,[path.join(root,'world-server.mjs')],{cwd:root,env:{...process.env,NODE_ENV:'test',PERSISTENCE_MODE:'local',DATABASE_URL:'',DATA_DIR:dir,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{let stdout='';const timer=setTimeout(()=>reject(Error('Survival server startup: '+stderr)),15000);child.on('error',reject);child.stderr.on('data',data=>stderr+=data);child.stdout.on('data',data=>{stdout+=data;const match=stdout.match(/localhost:(\d+)/);if(match){base='http://127.0.0.1:'+match[1];clearTimeout(timer);resolve();}});});
 const [director,patient,observer]=await Promise.all([connect(staff,'base'),connect(a,'hospital-interior'),connect(b,'base')]);

 await t.test('only Direction changes shared weather, game hour and day duration',async()=>{
  const initial=await call('/api/world/environment');assert.equal(initial.status,200);assert.equal(initial.environment.rate,24);assert.equal(initial.canConfigure,false);
  assert.equal((await call('/api/world/environment',a,'PUT',{weather:'storm',hour:22,rate:24})).status,403);
  const changed=await call('/api/world/environment',staff,'PUT',{weather:'storm',hour:22,rate:24});assert.equal(changed.status,200);assert.equal(changed.environment.weather,'storm');assert.equal(changed.environment.phase,'night');assert.equal(changed.environment.hour,22);assert.equal(changed.environment.rate,24);
  for(const peer of [director,patient,observer])await until(()=>peer.messages.some(message=>message.type==='environment'&&message.environment.weather==='storm'&&message.environment.hour===22));
  const other=await call('/api/world/environment',b);assert.equal(other.environment.weather,'storm');assert.equal(other.environment.hour,22);assert.equal(other.environment.weatherSince,changed.environment.weatherSince);
  const bootstrap=await call('/api/world/bootstrap',b);assert.equal(bootstrap.environment.weather,'storm','bootstrap reads updated state, not the initial promise value');
  for(const input of [{weather:'lava'},{hour:24},{hour:1.5},{rate:120},null,[]])assert.equal((await call('/api/world/environment',staff,'PUT',input)).status,400);
  assert.equal((await call('/api/world/environment',staff,'PUT',{weather:'snow',rate:12})).environment.rate,12);
  assert.equal((await call('/api/world/environment',staff,'PUT',{weather:'rain',rate:48})).environment.rate,48);
  await call('/api/world/environment',staff,'PUT',{weather:'clear',hour:10,rate:24});
 });

 await t.test('clothing and conditions remain personal and forged health changes are ignored',async()=>{
  const own=await call('/api/world/health');assert.equal(own.status,200);assert.equal(own.body.conditions[0].id,'scratch');assert.equal(own.body.clothing,'heat');assert.equal(own.body.medicines.antiseptic,0);
  const wrong=await call('/api/world/clothing',a,'POST',{clothing:'armour'});assert.equal(wrong.status,400);
  const dressed=await call('/api/world/clothing',a,'POST',{clothing:'cold',userId:b,health:100,conditions:[]});assert.equal(dressed.status,200);assert.equal(dressed.body.clothing,'cold');assert.equal(dressed.body.conditions[0].id,'scratch');
  assert.equal((await call('/api/world/health',b)).body.clothing,'heat','a supplied user ID cannot modify another account');
  send(patient,{type:'wellness',body:{clothing:'heat',conditions:[],medicines:{antiseptic:99}},vitals:{health:100}});
  send(patient,{type:'vitals',health:1,stress:100});await new Promise(resolve=>setTimeout(resolve,150));
  const unchanged=await call('/api/world/health');assert.equal(unchanged.body.clothing,'cold');assert.equal(unchanged.body.conditions[0].id,'scratch');assert.equal(unchanged.body.medicines.antiseptic,0);assert(unchanged.vitals.health>=69&&unchanged.vitals.health<75);
  for(const peer of [director,observer]){
   assert(!peer.messages.some(message=>message.type==='wellness'&&message.body.conditions.some(condition=>condition.id==='scratch')),'another client never receives patient conditions');
   assert(!peer.messages.flatMap(message=>message.players||[]).some(player=>player.body||player.wellness||player.medicines),'room snapshots exclude medical details');
  }
 });

 await t.test('thermal clothing reaches other real clients and Maria can equip it without crafting or duplicating inventory',async()=>{
  await until(()=>observer.messages.flatMap(m=>m.players||[]).some(p=>p.userId===staff&&p.clothing==='heat'));
  assert.equal((await call('/api/world/clothing',b,'POST',{clothing:'cold',characterId:'maria-villegas',granted:true})).status,409);
  const health=await call('/api/world/health',staff);assert.equal(health.body.clothingCharacter,'maria-villegas');assert.equal(health.body.clothingOptions.find(o=>o.id==='cold').granted,true);
  const dressed=await call('/api/world/clothing',staff,'POST',{clothing:'cold'});assert.equal(dressed.status,200);assert.equal(dressed.body.clothing,'cold');
  await until(()=>observer.messages.flatMap(m=>m.players||[]).some(p=>p.userId===staff&&p.clothing==='cold'));
  assert.equal((await call('/api/world/survival',staff)).personal.items.coat,undefined);
  assert.equal((await call('/api/world/health',staff)).body.clothing,'cold');
  assert.equal((await call('/api/world/preferences',staff,'PUT',{characterId:'bruno'})).status,200);
  const changed=await call('/api/world/health',staff);assert.equal(changed.body.clothing,'heat');assert.equal(changed.body.clothingOptions.find(o=>o.id==='cold').owned,false);
  assert.equal((await call('/api/world/preferences',staff,'PUT',{characterId:'maria-villegas'})).status,200);
  assert.equal((await call('/api/world/health',staff)).body.clothingOptions.find(o=>o.id==='cold').granted,true);
 });

 await t.test('hospital stock is managed by staff and taken only beside a painted medical object',async()=>{
  assert.equal((await call('/api/world/hospital',b)).status,409);
  assert.equal((await call('/api/world/hospital/take',b,'POST',{medicineId:'antiseptic'})).status,403);assert.equal((await call('/api/world/hospital/take',a,'POST',{medicineId:'antiseptic'})).status,403,'ordinary participants cannot take shared supplies');assert.equal((await call('/api/world/clinic/role',staff,'PUT',{target:a,enabled:true})).status,200);
  assert.equal((await call('/api/world/hospital',a,'PUT',{action:'fill'})).status,403);
  assert.equal((await call('/api/world/hospital',staff,'PUT',{action:'set',medicineId:'antiseptic',quantity:-1})).status,400);
  let stock=await call('/api/world/hospital',staff,'PUT',{action:'empty'});assert.equal(stock.status,200);assert(Object.values(stock.supplies).every(quantity=>quantity===0));
  assert.equal((await call('/api/world/hospital/take',a,'POST',{medicineId:'antiseptic'})).status,409);
  stock=await call('/api/world/hospital',staff,'PUT',{action:'fill'});assert.equal(Object.keys(stock.supplies).length,MEDICINES.length);assert(Object.values(stock.supplies).every(quantity=>quantity===20));
  for(const [medicineId,quantity]of [['antiseptic',3],['water',2]])assert.equal((await call('/api/world/hospital',staff,'PUT',{action:'set',medicineId,quantity})).status,200);
  const mark=patient.messages.length;send(patient,{type:'interact',objectId:cabinet.id});const opened=await until(()=>patient.messages.slice(mark).find(message=>message.type==='hospital'));assert.equal(opened.supplies.antiseptic,3);assert.equal(opened.staff,false);
  const taken=await call('/api/world/hospital/take',a,'POST',{medicineId:'water'});assert.equal(taken.status,200);assert.equal(taken.body.medicines.water,1);assert.equal(taken.supplies.water,1);assert.equal((await call('/api/world/health',b)).body.medicines.water,0);
  const pair=await Promise.all([call('/api/world/hospital/take',a,'POST',{medicineId:'antiseptic'}),call('/api/world/hospital/take',a,'POST',{medicineId:'antiseptic'})]);
  // A busy client is rejected rather than duplicating stock; both successful requests would also be valid if serialized.
  const successes=pair.filter(result=>result.status===200);assert(successes.length>=1);assert(pair.every(result=>[200,409].includes(result.status)));
  const current=await call('/api/world/hospital');assert.equal(current.supplies.antiseptic,3-successes.length);assert.equal(current.body.medicines.antiseptic,successes.length);
 });

 await t.test('unsuitable medicine and cooldown preserve items; correct care persists after reconnection',async()=>{
  const before=await call('/api/world/health');const wrong=await call('/api/world/health/treat',a,'POST',{medicineId:'water'});assert.equal(wrong.status,409);assert.match(wrong.error,/no corresponde/);assert.equal((await call('/api/world/health')).body.medicines.water,1);
  const treated=await call('/api/world/health/treat',a,'POST',{medicineId:'antiseptic',userId:b,health:10000});assert.equal(treated.status,200);assert.equal(treated.body.medicines.antiseptic,before.body.medicines.antiseptic-1);const outcome=treated.body.lastOutcome.outcome;assert(['effective','ineffective','adverse'].includes(outcome));if(outcome==='effective'){assert(treated.body.conditions[0].severity<before.body.conditions[0].severity);assert.equal(treated.body.conditions[0].stage,'En tratamiento');}else if(outcome==='adverse')assert(treated.body.conditions.some(c=>c.id==='adverse-reaction'));assert(treated.vitals.health<80);
  if(treated.body.medicines.antiseptic<1)await call('/api/world/hospital/take',a,'POST',{medicineId:'antiseptic'});
  const cooldownStock=(await call('/api/world/health')).body.medicines.antiseptic;const repeat=await call('/api/world/health/treat',a,'POST',{medicineId:'antiseptic'});assert.equal(repeat.status,409);assert.match(repeat.error,/Espera/);assert.equal((await call('/api/world/health')).body.medicines.antiseptic,cooldownStock);
  const replacement=await connect(a,'hospital-interior'),welcome=replacement.messages.find(message=>message.type==='welcome');assert.equal(welcome.body.clothing,'cold');assert.equal(welcome.body.medicines.water,1);assert.equal(welcome.body.medicines.antiseptic,cooldownStock);assert.equal(welcome.body.lastOutcome.outcome,outcome);
  const own=await call('/api/world/health');assert.deepEqual(own.body.medicines,welcome.body.medicines);
  assert.equal((await call('/api/world/health/treat',b,'POST',{medicineId:'antiseptic'})).status,403,'other accounts cannot use the patient inventory');
 });
});
