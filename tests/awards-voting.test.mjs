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

test('staff-only 400k/day; 100k/person across categories and shared nominees',async()=>{
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
  for(const id of staff){assert.equal((await quota(id)).dailyLimit,400000);assert.equal((await quota(id)).nomineeDailyLimit,100000);}
  assert.equal((await quota(normal)).dailyLimit,100000);
  assert.equal((await quota(normal)).nomineeDailyLimit,10000);
  const fan=cat('fan-favorite'),comp=cat('mejor-competidor'),villain=cat('mejor-villano'),host=cat('mejor-host');
  const ivy=nom(fan,'Ivy Pierce'),requestId=randomUUID();
  await send(staff[0],fan,ivy,100000,requestId);
  await send(staff[0],fan,ivy,100000,requestId);
  assert.equal((await quota(staff[0])).remaining,300000);
  assert.equal((await quota(staff[0])).spentByNominee[comp.id][nom(comp,'Ivy Pierce').id],100000);
  await assert.rejects(send(staff[0],comp,nom(comp,'Ivy Pierce'),1),{status:409});
  await send(staff[0],villain,nom(villain,'Lucas Mendez'),100000);
  await send(staff[0],comp,nom(comp,'Alice Torrico'),100000);
  await send(staff[0],host,nom(host,'Maria Villegas'),100000);
  assert.equal((await quota(staff[0])).remaining,0);
  await assert.rejects(send(staff[0],villain,nom(villain,'Carlos Harrington'),1),{status:429});
  await assert.rejects(send(normal,fan,ivy,10001),{status:400});
  assert.equal((await quota(normal)).remaining,100000);
  assert.equal((await quota(staff[1])).remaining,400000);
  const rivals=cat('rivalidad-de-la-temporada');
  await send(staff[1],rivals,nom(rivals,'Kim Camila vs Eduard'),100000);
  await assert.rejects(send(staff[1],cat('participante-mas-gracioso'),nom(cat('participante-mas-gracioso'),'Eduard Salerno'),1),{status:409});
  time+=86400000;
  assert.equal((await quota(staff[0])).remaining,400000);
  assert.equal((await quota(normal)).remaining,100000);
 }finally{await db.close();}
});
