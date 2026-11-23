import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAwardsVoting} from '../awards-voting.mjs';
import {openDatabase} from '../database.mjs';

const ballot=JSON.parse(await readFile(new URL('../awards-voting-ballot.json',import.meta.url),'utf8'));

test('voting: 100k daily per account, 10k per nominee and 2 choices per category',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'xp-awards-new-')));
 const ids=['92354719-8816-4e25-9199-0dc9a99f7da2','92354719-8816-4e25-9199-0dc9a99f7da3'];
 try{
  for(let i=0;i<ids.length;i++)await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',ids[i],'Test'+i,'test'+i,'test'+i+'@example.invalid','Dani',0);
  let timestamp=Date.parse('2026-11-18T04:59:59Z');
  const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
  const voting=createAwardsVoting({db,ballot,now:()=>timestamp,fail,body:req=>req.payload,json:(_,value)=>value});
  const categories=ballot.sections.flatMap(s=>s.categories).filter(c=>c.nominees.length>=3);
  const submit=(user,cat,nominee,amount,requestId=randomUUID())=>voting.vote({method:'POST',payload:{category:cat.id,nominee:nominee.id,votes:amount,requestId}},{},{id:user});
  await assert.rejects(voting.vote({method:'GET'},{},null),{status:401});
  const fan=categories[0],rid=randomUUID();
  assert.equal((await submit(ids[0],fan,fan.nominees[0],10000,rid)).votes,10000);
  assert.equal((await submit(ids[0],fan,fan.nominees[0],10000,rid)).votes,10000);
  assert.equal((await db.one('SELECT COUNT(*) AS n FROM award_vote_entries WHERE voter_id=?',ids[0])).n,1);
  await assert.rejects(submit(ids[0],fan,fan.nominees[0],1),{status:409});
  await submit(ids[0],fan,fan.nominees[1],10000);
  await assert.rejects(submit(ids[0],fan,fan.nominees[2],1),{status:409});
  for(let i=1;i<=8;i++)await submit(ids[0],categories[i],categories[i].nominees[0],10000);
  assert.equal((await voting.vote({method:'GET'},{},{id:ids[0]})).quota.remaining,0);
  await assert.rejects(submit(ids[0],categories[9],categories[9].nominees[0],1),{status:429,message:'Ya no tienes más votos disponibles por hoy.'});
  assert.equal((await voting.vote({method:'GET'},{},{id:ids[1]})).quota.remaining,100000);
  await submit(ids[1],fan,fan.nominees[0],10000);
  timestamp=Date.parse('2026-11-18T05:00:00Z');
  assert.equal((await voting.vote({method:'GET'},{},{id:ids[0]})).quota.remaining,100000);
  assert.equal((await submit(ids[0],fan,fan.nominees[0],10000)).votes,20000);
 }finally{await db.close();}
});


test('Staff alone: 1m per day, 200k per person and unlimited nominees per category',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'xp-awards-staff-')));
 const staff=['4cc31ade-086c-48b2-b77e-27240358e425','92354719-8816-4e25-9199-0dc9a99f7da1'];
 const normal='623c6648-b88a-4eec-be92-09c6d9487442';
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 let time=Date.parse('2026-11-20T18:00:00Z');
 const voting=createAwardsVoting({db,ballot,now:()=>time,fail,body:req=>req.payload,json:(_,value)=>value});
 const cat=id=>ballot.sections.flatMap(s=>s.categories).find(c=>c.id===id);
 const nom=(c,name)=>{const n=c.nominees.find(n=>n.name===name);assert.ok(n,name);return n;};
 const send=(id,c,n,votes,requestId=randomUUID())=>voting.vote({method:'POST',payload:{category:c.id,nominee:n.id,votes,requestId}},{},{id});
 const quota=async id=>(await voting.vote({method:'GET'},{},{id})).quota;
 try{
  for(const [i,id] of [...staff,normal].entries())await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,'Test'+i,'quota-'+i,'quota-'+i+'@example.invalid','Dani',0);
  for(const id of staff){
   assert.equal((await quota(id)).dailyLimit,1000000);
   assert.equal((await quota(id)).nomineeDailyLimit,200000);
   assert.equal((await quota(id)).categoryChoiceLimit,null);
   assert.equal((await quota(id)).remaining,1000000);
  }
  assert.equal((await quota(normal)).dailyLimit,100000);
  assert.equal((await quota(normal)).nomineeDailyLimit,10000);
  assert.equal((await quota(normal)).categoryChoiceLimit,2);

  const fan=cat('fan-favorite'),comp=cat('mejor-competidor'),villain=cat('mejor-villano'),host=cat('mejor-host'),poop=cat('poop-of-the-year');
  const ivy=nom(fan,'Ivy Pierce'),requestId=randomUUID();
  await send(staff[0],fan,ivy,200000,requestId);
  await send(staff[0],fan,ivy,200000,requestId); // same request cannot double-charge
  assert.equal((await quota(staff[0])).remaining,800000);
  assert.equal((await quota(staff[0])).spentByNominee[comp.id][nom(comp,'Ivy Pierce').id],200000);
  await assert.rejects(send(staff[0],comp,nom(comp,'Ivy Pierce'),1),{status:409});
  await send(staff[0],villain,nom(villain,'Lucas Mendez'),200000);
  await send(staff[0],comp,nom(comp,'Alice Torrico'),200000);
  await send(staff[0],host,nom(host,'Maria Villegas'),200000);
  await send(staff[0],poop,nom(poop,'Eris Midnight'),200000);
  assert.equal((await quota(staff[0])).remaining,0);
  await assert.rejects(send(staff[0],host,nom(host,'Ignacio Vila'),1),{status:429});

  // Staff can support every nominee in the same category.
  for(const nominee of fan.nominees)await send(staff[1],fan,nominee,1);
  assert.equal((await quota(staff[1])).selected[fan.id].length,fan.nominees.length);
  const rivals=cat('rivalidad-de-la-temporada'),funny=cat('participante-mas-gracioso');
  await send(staff[1],rivals,nom(rivals,'Guillermo vs Roger'),200000);
  await assert.rejects(send(staff[1],funny,nom(funny,'Roger Lida'),1),{status:409});

  // The regular verified account retains exactly the previous restrictions.
  await assert.rejects(send(normal,fan,ivy,10001),{status:400});
  await send(normal,fan,fan.nominees[0],1);
  await send(normal,fan,fan.nominees[1],1);
  await assert.rejects(send(normal,fan,fan.nominees[2],1),{status:409});
  assert.equal((await quota(normal)).remaining,99998);

  time+=86400000;
  assert.equal((await quota(staff[0])).remaining,1000000);
  assert.equal((await quota(normal)).remaining,100000);
 }finally{await db.close();}
});


test('Awards: bottom-two freeze blocks all voters and reserves fixed percentages',async()=>{
 const db=await openDatabase(await mkdtemp(path.join(tmpdir(),'xp-awards-frozen-')));
 const voter='623c6648-b88a-4eec-be92-09c6d9487442';
 const staff='4cc31ade-086c-48b2-b77e-27240358e425';
 const now=Date.parse('2026-11-23T15:00:00Z');
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const voting=createAwardsVoting({db,ballot,now:()=>now,fail,body:req=>req.payload,json:(_,value)=>value});
 const send=(id,category,nominee,votes)=>voting.vote({method:'POST',payload:{category,nominee,votes,requestId:randomUUID()}},{},{id});
 try{
  for(const [i,id] of [voter,staff].entries()){
   await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,'Frozen Test '+i,'frozen-test-'+i,'frozen'+i+'@example.invalid','Dani',now);
  }
  for(const [nominee,votes] of [['renata',10],['elias',20],['kim-camila',70]]){
   await db.run('INSERT INTO award_vote_entries(edition,voter_id,request_id,category,nominee,votes,created) VALUES(?,?,?,?,?,?,?)',3,voter,randomUUID(),'fan-favorite',nominee,votes,now);
  }
  for(const [nominee,votes,percent] of [['renata',10,10],['elias',20,20]]){
   await db.run('INSERT INTO award_vote_frozen(edition,category,nominee,votes,percent_value,category_total,frozen_at) VALUES(?,?,?,?,?,?,?)',3,'fan-favorite',nominee,votes,percent,100,now);
  }
  const before=await voting.vote({method:'GET'},{},{id:voter});
  assert.deepEqual(before.frozen['fan-favorite'].elias,{votes:20,percent:20});
  assert.deepEqual(before.frozen['fan-favorite'].renata,{votes:10,percent:10});
  assert.equal(before.quota.remaining,99900);
  await assert.rejects(send(voter,'fan-favorite','elias',1),{status:409});
  await assert.rejects(send(staff,'fan-favorite','renata',1),{status:409});
  assert.equal((await voting.vote({method:'GET'},{},{id:voter})).quota.remaining,99900);
  await send(voter,'fan-favorite','ivy-pierce',70);
  const rows=(await voting.results({method:'GET'},{},{id:staff})).sections.flatMap(s=>s.categories);
  const nominees=rows.find(c=>c.id==='fan-favorite').nominees;
  const item=name=>nominees.find(n=>n.name===name);
  assert.equal(item('Elias').votes,20);
  assert.equal(item('Elias').percent,20);
  assert.equal(item('Renata').votes,10);
  assert.equal(item('Renata').percent,10);
  assert.equal(item('Kim Camila').percent,35);
  assert.equal(item('Ivy Pierce').percent,35);
  assert.equal(nominees.reduce((total,n)=>total+n.percent,0),100);
  assert.equal((await db.one('SELECT COUNT(*) AS count FROM award_vote_entries WHERE edition=? AND category=?',3,'fan-favorite')).count,4);
  // This lock applies only to the specified category and nominee.
  assert.equal((await send(staff,'mejor-villano','lucas-mendez',1)).votes,1);
 }finally{await db.close();}
});
