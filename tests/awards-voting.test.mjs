import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAwardsVoting} from '../awards-voting.mjs';
import {openDatabase} from '../database.mjs';

const ballot=JSON.parse(await readFile(new URL('../awards-voting-ballot.json',import.meta.url),'utf8'));

test('la papeleta usa IDs únicos, trae los nominados pedidos y apunta a arte que existe',async()=>{
 const categories=ballot.sections.flatMap(section=>section.categories);
 assert.equal(new Set(categories.map(category=>category.id)).size,categories.length);
 const requested=ballot.sections[0].categories.length+4+6;
 assert.equal(requested,15);
 assert.equal(categories.length,25);
 assert.deepEqual(ballot.sections[1].categories.slice(0,5).map(category=>category.id),['estratega-del-ano','mayor-amenaza','participante-mas-gracioso','mejor-evolucion','traidor']);
 assert(!categories.some(category=>['Mejor Duelo','Mejor Episodio','Mejor Diseño & Vestuario','Mejor Temporada','Mejor Canción'].includes(category.name)));
 const [jury,competition,external]=ballot.sections[2].categories.slice(-3);
 assert.deepEqual([jury.id,competition.id,external.id],['mejor-presentacion-jurado','peor-competencia-virtual','peor-participacion-en-competencia-externa']);
 assert.equal(competition.nominees.length,6);
 assert.equal(external.nominees.length,6);
 assert.deepEqual(competition.nominees.slice(0,3).map(({name,details})=>[name,details]),[
  ['Turn It Up 7: Jackpot!','Eduard Salerno'],['Turn It Up 7: Y2K Version','Eduard Salerno'],['Discord Total','Pier, Matías Aliaga']
 ]);
 assert.deepEqual(jury.nominees.slice(3,4).map(({name,details})=>[name,details]),[['Bryan Montalvo','Celebrity Stars']]);
 const poop=categories.find(category=>category.id==='poop-of-the-year');
 assert.equal(poop.nominees.length,8);
 assert.deepEqual(poop.nominees.slice(-2).map(({name,details})=>[name,details]),[['Coronel Sanders','Showdown 2'],['Dani Jara','The Traitor 2']]);
 for(const category of [
  ...ballot.sections[0].categories,...ballot.sections[1].categories.slice(0,4),...ballot.sections[2].categories.slice(0,6)
 ])if(category!==poop)assert.equal(category.nominees.length,6,category.name);
 for(const category of categories){
  assert.equal(new Set(category.nominees.map(nominee=>nominee.id)).size,category.nominees.length,category.name);
  for(const nominee of category.nominees){
   for(const person of [nominee,...(nominee.people||[])]){
    if(!person.image)continue;
    const image=person.image.replace(/^\/seasons\/campria\/apocalypse-ii\/portraits\//,'/juegos/x-protocol/art/portraits/');
    assert((await readFile(new URL('../public'+image,import.meta.url))).length>0,image);
   }
  }
 }
});

test('las cuatro categorías de The Traitor conservan sus retratos del HTML de referencia',()=>{
 const originals={
  traidor:[1,2,3,4,5,6],
  inocente:[7,8,9,10,11,12],
  sobreviviente:[13,14,15,16,12,17],
  detective:[7,18,8,19,20,11]
 };
 const categories=ballot.sections.find(section=>section.id==='generales').categories;
 for(const [id,portraits] of Object.entries(originals)){
  const category=categories.find(entry=>entry.id===id);
  assert.deepEqual(category.nominees.map(nominee=>nominee.image),portraits.map(number=>'/awards/vote-portraits/'+number+'.webp'));
 }
});

test('a 9999 votos acepta solo una de dos solicitudes y abre una cuota nueva a medianoche en Colombia',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'xp-awards-quota-')));
 const account={id:'92354719-8816-4e25-9199-0dc9a99f7da1'};
 try{
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',account.id,'QA','qa','vote@example.invalid','Dani',0);
  let timestamp=Date.parse('2026-11-17T04:59:59.900Z');
  const voting=createAwardsVoting({db,ballot,now:()=>timestamp,fail:(status,message)=>{throw Object.assign(Error(message),{status});},body:req=>req.payload,json:(_,value)=>value});
  const [fan,villain]=ballot.sections[0].categories;
  const choice=category=>({category:category.id,nominee:category.nominees[0].id});
  const submit=(category,requestId=randomUUID())=>voting.vote({method:'POST',payload:{...choice(category),requestId}},{},account);
  await db.run('INSERT INTO award_vote_days(edition,day,count) VALUES(?,?,?)',3,'2026-11-16',9999);
  const requestIds=[randomUUID(),randomUUID()];
  const outcomes=await Promise.allSettled([submit(fan,requestIds[0]),submit(villain,requestIds[1])]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,429);
  const {votes}=await voting.vote({method:'GET'},{},account);
  assert.equal(Object.keys(votes).length,1);
  const success=outcomes[0].status==='fulfilled'?fan:villain;
  const denied=success===fan?villain:fan;
  await submit(success,requestIds[success===fan?0:1]);
  await assert.rejects(submit(success),{status:429});
  assert.equal((await db.one('SELECT count FROM award_vote_days WHERE day=?','2026-11-16')).count,10000);
  timestamp=Date.parse('2026-11-17T05:00:00.000Z');
  await submit(denied);
  assert.equal((await db.one('SELECT count FROM award_vote_days WHERE day=?','2026-11-17')).count,1);
 }finally{await db.close();}
});
