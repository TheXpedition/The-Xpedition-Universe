import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {createCasting} from '../casting.mjs';
import {castingQuestions,castingProfile} from '../public/casting-config.mjs';

const db=await openDatabase(fs.mkdtempSync(path.join(os.tmpdir(),'xp-casting-')));
const catalog=JSON.parse(fs.readFileSync(new URL('../public/catalog.json',import.meta.url)));
let timestamp=2000000000000,queue=Promise.resolve();
const casting=createCasting({db,catalog,now:()=>timestamp,fail:(status,message)=>{throw Object.assign(new Error(message),{status});},body:async req=>req.payload,checkRate(){},json:(res,result,status=200)=>Object.assign(res,{result,status}),progression:{wallet:async uid=>({...await db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',uid),level:1})}});
after(()=>db.close());
async function user(tickets=1000,id=randomUUID()){await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,'QA '+id.slice(0,8),id,id+'@example.invalid','Bonju',timestamp);await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,?,99,200)',id,tickets);return {id};}
function request(actor,suffix='',method='GET',payload={}){const operation=async()=>{const res={};try{const url=new URL(suffix.startsWith('/api/')?suffix:'/api/casting/apocalypse-ii'+suffix,'https://test.invalid');await casting.handle({method,payload},res,url,actor);return {status:res.status,...res.result};}catch(error){if(!error.status)throw error;return {status:error.status,error:error.message};}};const result=queue.then(operation);queue=result.catch(()=>{});return result;}
const buy=(actor,kind='audition')=>request(actor,'/purchase','POST',{kind,acceptNoRefund:true});
const wallet=actor=>db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',actor.id);

test('compras requieren cuenta, aceptación explícita y saldo; son persistentes e idempotentes',async()=>{
 const poor=await user(99),actor=await user();
 assert.equal((await buy(null)).status,401);
 assert.equal((await request(actor,'/purchase','POST',{kind:'audition',acceptNoRefund:false})).status,400);
 assert.equal((await buy(poor)).status,409);assert.equal((await wallet(poor)).tickets,99);assert.equal((await request(poor)).entry,null);
 const bought=await buy(actor);assert.equal(bought.entry.state,'ready');assert.equal(bought.entry.started,0);assert.equal(bought.wallet.tickets,900);
 timestamp+=86400000;assert.equal((await request(actor)).entry.state,'ready');assert.equal((await buy(actor)).wallet.tickets,900);
 assert.equal((await wallet(actor)).coins,99);assert.equal((await wallet(actor)).xp,200);
 assert.equal((await db.one('SELECT COUNT(*) AS n FROM economy_rewards WHERE user_id=?',actor.id)).n,1);
 assert.equal((await request(null)).entry,null);assert.equal((await request(null)).wallet,null);
});

test('el cronómetro pertenece al servidor; recargar o repetir start no lo reinicia y los borradores sobreviven',async()=>{
 const actor=await user();assert.equal((await request(actor,'/start','POST')).status,403);await buy(actor);
 const start=await request(actor,'/start','POST'),deadline=start.entry.deadline;assert.equal(deadline-timestamp,60000);
 timestamp+=2000;assert.equal((await request(actor,'/start','POST')).entry.deadline,deadline);
 await request(actor,'/answer','POST',{step:0,draft:true,value:{played:false}});
 assert.deepEqual((await request(actor)).entry.answers.history.value,{played:false});
 timestamp=deadline+1;const expired=await request(actor);assert.equal(expired.entry.step,1);assert.equal(expired.entry.answers.history.timedOut,true);assert.equal(expired.entry.answers.history.seconds,60);
 const stale=await request(actor,'/answer','POST',{step:0,value:{played:true}});assert.equal(stale.entry.step,1);
 assert.equal((await request(actor,'/answer','POST',{step:1,value:''})).status,400);
 assert.equal((await request(actor,'/answer','POST',{step:1,value:'x'.repeat(1801)})).status,400);
 timestamp+=5000;const next=await request(actor,'/answer','POST',{step:1,value:'Soy una persona creativa y me encantan los retos.'});assert.equal(next.entry.step,2);assert.equal(next.entry.answers.why.seconds,5.001);
 assert.equal((await request(actor,'/answer','POST',{step:2,value:'opción inventada'})).status,400);
});

test('historia valida franquicias y temporadas; las 13 respuestas, tiempos y resultados son privados para dueño y Staff',async()=>{
 const actor=await user(),other=await user(),staff=await user(1000,'92354719-8816-4e25-9199-0dc9a99f7da1');await buy(actor);await request(actor,'/start','POST');
 assert.equal((await request(actor,'/answer','POST',{step:0,value:{played:true,forgot:false,multiple:true,franchise:'Campria',season:'fake'}})).status,400);
 const values=[{played:true,forgot:false,multiple:true,franchise:'Campria',season:'apocalypse'},'Tengo ideas y puedo sorprender al resto.','El estratega','Defendería mi punto de vista y aceptaría la decisión.','Busco otra alianza para protegerme.',['Estrategia','Música','Duelos'],5,4,3,5,...castingQuestions.slice(10).map(q=>q.options[0])];
 for(let step=0;step<values.length;step++){
  timestamp+=1000;
  if(step===5)assert.equal((await request(actor,'/answer','POST',{step,value:['Moda','Música','Rol','Suerte']})).status,400);
  assert.equal((await request(actor,'/answer','POST',{step,value:values[step]})).status,200);
 }
 const completed=await request(actor);assert.equal(completed.entry.state,'completed');assert.equal(completed.entry.profile.name,'Estratega');assert.equal(Object.keys(completed.entry.answers).length,13);
 const again=await request(actor,'/start','POST');assert.equal(again.entry.started,completed.entry.started);assert.equal(again.entry.state,'completed');
 assert.equal((await request(other)).entry,null);
 assert.equal((await request(null,'/api/moderation/auditions')).status,401);
 assert.equal((await request(other,'/api/moderation/auditions/'+actor.id)).status,403);
 const detail=await request(staff,'/api/moderation/auditions/'+actor.id);assert.equal(detail.entry.answers.why.value,values[1]);assert(!('email' in detail.person));assert(!('password' in detail.person));assert.equal(detail.entry.profile.name,'Estratega');
 const list=await request(staff,'/api/moderation/auditions?status=completed');assert(list.entries.some(e=>e.userId===actor.id));
 timestamp+=900000;assert.deepEqual((await request(actor)).entry.answers,completed.entry.answers);
});

test('cerrar la página no pausa preguntas; los tiempos agotados y los no contestados quedan registrados sin inventar perfiles',async()=>{
 const actor=await user();await buy(actor);await request(actor,'/start','POST');timestamp+=castingQuestions.reduce((n,q)=>n+q.seconds*1000,0)+1;
 const result=await request(actor);assert.equal(result.entry.state,'completed');assert.equal(result.entry.profile.name,'Sin definir');assert.equal(result.entry.profile.answered,0);
 assert.equal(Object.keys(result.entry.answers).length,13);assert(Object.values(result.entry.answers).every(a=>a.timedOut&&a.value===null));
 assert.equal(castingProfile(Object.fromEntries(castingQuestions.slice(10).map((q,i)=>[q.id,{value:q.options[i]}]))).name,'Versátil');
});

test('solo se cobran y asignan nueve entradas únicas, incluso ante compras simultáneas y reintentos',async()=>{
 const accounts=await Promise.all(Array.from({length:12},()=>user(600)));
 const results=await Promise.all(accounts.map(actor=>buy(actor,'direct')));assert.equal(results.filter(x=>x.status===200).length,9);assert.equal(results.filter(x=>x.status===409).length,3);
 for(let i=0;i<12;i++)assert.equal((await wallet(accounts[i])).tickets,i<9?100:600);
 const cast=(await request(null)).cast;assert.equal(cast.length,9);assert.equal(new Set(cast.map(p=>p.slot)).size,9);assert.equal(new Set(cast.map(p=>p.id)).size,9);
 assert(cast.every(p=>Object.keys(p).sort().join(',')==='avatar,id,name,slot,staff,verified'));assert(!JSON.stringify(cast).includes('@example.invalid'));
 const repeated=await buy(accounts[0],'direct');assert.equal(repeated.status,200);assert.equal((await wallet(accounts[0])).tickets,100);
 assert.equal((await buy(accounts[0],'audition')).status,409);assert.equal((await wallet(accounts[0])).tickets,100);
 assert.equal((await db.one("SELECT COUNT(*) AS n FROM economy_rewards WHERE event_key='casting:apocalypse-ii:direct'")).n,9);
});

test('Staff encuentra las audiciones vencidas en Enviadas aunque su dueño cierre la página y no vuelva',async()=>{
 const actor=await user();await buy(actor);await request(actor,'/start','POST');timestamp+=castingQuestions.reduce((n,q)=>n+q.seconds*1000,0)+1;
 const result=await request({id:'92354719-8816-4e25-9199-0dc9a99f7da1'},'/api/moderation/auditions?status=completed');assert(result.entries.some(e=>e.userId===actor.id&&e.state==='completed'));
});

test('el cupo diez vale 3000, exige confirmar ese precio, es único y no modifica las nueve compras anteriores',async()=>{
 const before=await db.all("SELECT user_id,direct_slot,direct_purchased FROM casting_entries WHERE season='apocalypse-ii' AND direct_slot IS NOT NULL ORDER BY direct_slot");assert.equal(before.length,9);
 const a=await user(4000),b=await user(4000);
 assert.equal((await request(a,'/purchase','POST',{kind:'direct',expectedPrice:500,acceptNoRefund:true})).status,409);assert.equal((await wallet(a)).tickets,4000);
 const data=await request(a);assert.equal(data.capacity,10);assert.equal(data.directPrice,3000);
 const results=await Promise.all([a,b].map(actor=>request(actor,'/purchase','POST',{kind:'direct',expectedPrice:3000,acceptNoRefund:true})));
 assert.equal(results.filter(r=>r.status===200).length,1);const index=results.findIndex(r=>r.status===200),winner=[a,b][index];assert.equal(results[index].entry.directSlot,10);assert.equal((await wallet(winner)).tickets,1000);
 assert.equal((await request(winner,'/purchase','POST',{kind:'direct',expectedPrice:3000,acceptNoRefund:true})).status,200);assert.equal((await wallet(winner)).tickets,1000);
 assert.deepEqual(await db.all("SELECT user_id,direct_slot,direct_purchased FROM casting_entries WHERE season='apocalypse-ii' AND direct_slot<10 ORDER BY direct_slot"),before);
});
