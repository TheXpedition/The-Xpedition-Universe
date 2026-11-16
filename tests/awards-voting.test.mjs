import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAwardsVoting} from '../awards-voting.mjs';
import {openDatabase} from '../database.mjs';

const ballot=JSON.parse(await readFile(new URL('../awards-voting-ballot.json',import.meta.url),'utf8'));

test('la papeleta usa IDs únicos, trae los 90 nominados pedidos y apunta a arte que existe',async()=>{
 const categories=ballot.sections.flatMap(section=>section.categories);
 assert.equal(new Set(categories.map(category=>category.id)).size,categories.length);
 const requested=ballot.sections[0].categories.length+4+6;
 assert.equal(requested,15);
 for(const category of [
  ...ballot.sections[0].categories,...ballot.sections[1].categories.slice(4,8),...ballot.sections[2].categories.slice(0,6)
 ])assert.equal(category.nominees.length,6,category.name);
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

test('a 9999 votos acepta solo una de dos solicitudes y abre una cuota nueva a medianoche en Colombia',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'xp-awards-quota-')));
 const account={id:'vote-test'};
 try{
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',account.id,'QA','qa','vote@example.invalid','Dani',0);
  let timestamp=Date.parse('2026-11-17T04:59:59.900Z');
  const voting=createAwardsVoting({db,ballot,now:()=>timestamp,fail:(status,message)=>{throw Object.assign(Error(message),{status});},body:req=>req.payload,json:(_,value)=>value});
  const [fan,villain]=ballot.sections[0].categories;
  const choice=category=>({category:category.id,nominee:category.nominees[0].id});
  const submit=category=>voting.vote({method:'PUT',payload:choice(category)},{},account);
  await db.run('INSERT INTO award_vote_days(edition,day,count) VALUES(?,?,?)',3,'2026-11-16',9999);
  const outcomes=await Promise.allSettled([submit(fan),submit(villain)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(outcomes.find(r=>r.status==='rejected').reason.status,429);
  const {votes}=await voting.vote({method:'GET'},{},account);
  assert.equal(Object.keys(votes).length,1);
  const success=outcomes[0].status==='fulfilled'?fan:villain;
  const denied=success===fan?villain:fan;
  await submit(success);
  assert.equal((await db.one('SELECT count FROM award_vote_days WHERE day=?','2026-11-16')).count,10000);
  timestamp=Date.parse('2026-11-17T05:00:00.000Z');
  await submit(denied);
  assert.equal((await db.one('SELECT count FROM award_vote_days WHERE day=?','2026-11-17')).count,1);
 }finally{await db.close();}
});
