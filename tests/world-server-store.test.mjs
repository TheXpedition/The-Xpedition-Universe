import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';import {serverDatabase,SERVER_TABLES} from '../world-server-store.mjs';import {createWorldIntro} from '../world-intro.mjs';import {hasApocalypseStyle} from '../world-profile-access.mjs';
import {createProtocolInventory} from '../world-protocol-inventory.mjs';

test('two World servers keep inventory, elimination order and intro separate while sharing profile balances across reopening',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'world-servers-')),base=await openDatabase(folder),aId=randomUUID(),bId=randomUUID();
 try{
  const user={id:'same-account'};await base.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',user.id,'Player','player','player@example.invalid','Dani',1);
  await base.run('INSERT INTO apocalypse_cast(user_id,style_override,updated) VALUES(?,1,1)',user.id);assert.equal(await hasApocalypseStyle(base,user.id),true);
  const a=await serverDatabase(base,aId),b=await serverDatabase(base,bId);
  await a.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,3,1)',user.id,'apple');
  await a.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,800,42,99)',user.id);
  await a.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,1)','x-protocol:history:one',JSON.stringify({eliminated:['bruno','kareli']}));
  await b.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,1)','x-protocol:history:one',JSON.stringify({eliminated:['kareli','bruno']}));
  let clock=1000;const introA=createWorldIntro({db:a,now:()=>clock}),first=await introA.start(user);clock+=65000;await introA.complete(user,{session:first.session,position:64.6});
  assert.equal((await createWorldIntro({db:b}).status(user)).seen,false);
  assert.equal(await b.one('SELECT * FROM world_food_inventory WHERE user_id=?',user.id),undefined);
  assert.equal((await b.one('SELECT coins FROM user_progression WHERE user_id=?',user.id)).coins,800);
  assert.equal((await base.one('SELECT tickets FROM user_progression WHERE user_id=?',user.id)).tickets,42);
  const spends=await Promise.all([a.run('UPDATE user_progression SET coins=coins-500 WHERE user_id=? AND coins>=500',user.id),b.run('UPDATE user_progression SET coins=coins-500 WHERE user_id=? AND coins>=500',user.id)]);
  assert.equal(spends.filter(result=>result.changes===1).length,1);
  assert.equal((await base.one('SELECT coins FROM user_progression WHERE user_id=?',user.id)).coins,300);
  await base.run('UPDATE user_progression SET tickets=tickets+3 WHERE user_id=?',user.id);
  assert.equal((await a.one('SELECT tickets FROM user_progression WHERE user_id=?',user.id)).tickets,45);
  assert.equal((await b.one('SELECT tickets FROM user_progression WHERE user_id=?',user.id)).tickets,45);
  assert.notEqual((await a.one('SELECT state FROM world_environment WHERE id=?','x-protocol:history:one')).state,(await b.one('SELECT state FROM world_environment WHERE id=?','x-protocol:history:one')).state);
  const reopened=await serverDatabase(base,aId);assert.equal((await reopened.one('SELECT quantity FROM world_food_inventory WHERE user_id=?',user.id)).quantity,3);
  assert.equal((await createWorldIntro({db:reopened}).status(user)).seen,true);
  assert.equal((await a.one("SELECT 'world_vitals' AS literal")).literal,'world_vitals');
  assert(!SERVER_TABLES.includes('user_progression'));assert(!SERVER_TABLES.includes('economy_rewards'));assert(!SERVER_TABLES.includes('activity_days'));assert(!SERVER_TABLES.includes('users'));assert(!SERVER_TABLES.includes('world_sessions'));assert(!SERVER_TABLES.includes('world_servers'));
 }finally{await base.close();assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(folder,{recursive:true,force:true});}
});

test('an old runtime cannot overwrite a recovered server; a human can leave food to a bot without a fake account',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'world-room-lease-')),base=await openDatabase(folder),id=randomUUID();
 try{
  await base.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,1)','human','Human','human','human@example.invalid','Dani');
  await base.run('INSERT INTO world_servers(id,name,creator,enabled,settings,created,updated) VALUES(?,?,?,1,?,1,1)',id,'Room','human','{}');
  await base.run('INSERT INTO world_server_leases(server_id,owner,expires) VALUES(?,?,?)',id,'old',Date.now()+60000);const old=await serverDatabase(base,id,{leaseOwner:'old'});
  await old.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,2,1)','human','apple');
  await base.run('UPDATE world_server_leases SET owner=? WHERE server_id=?','new',id);const current=await serverDatabase(base,id,{leaseOwner:'new'});
  await assert.rejects(old.run('DELETE FROM world_food_inventory WHERE user_id=?','human'),{status:409});
  const inventory=createProtocolInventory({db:current});await current.transaction(()=>inventory.giftRaw({ceremonyId:'episode',from:'human',to:'bot:kareli',fromName:'Human',toBot:true}));
  assert.equal((await current.all('SELECT * FROM world_food_inventory WHERE user_id=?','human')).length,0);const gift=await current.one('SELECT state FROM world_survival_state WHERE id=?','inheritance:bot:kareli');assert.equal(JSON.parse(gift.state)[0].items.find(item=>item.id==='apple').quantity,2);assert.equal(await base.one('SELECT id FROM users WHERE id=?','bot:kareli'),undefined);
 }finally{await base.close();assert(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(folder,{recursive:true,force:true});}
});
