import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';import {createWorldShop} from '../world-shop-service.mjs';
const request=extra=>({requestId:randomUUID(),...extra});
test('Maria/Bonju remain reserved while Isabel/Dua reappear at their original prices and role grants survive',async()=>{const f=await fixture();try{const view=await f.shop.snapshot({id:'a'});for(const ref of ['maria-villegas','bonju']){assert(!view.catalog.characters.some(c=>c.id===ref));await assert.rejects(f.shop.buy({id:'a'},request({kind:'character',ref})),/no están a la venta/);}assert.equal(view.catalog.characters.find(c=>c.id==='isabel')?.price,500000);assert.equal(view.catalog.characters.find(c=>c.id==='dua-lingo')?.price,1000);assert.equal((await f.shop.snapshot({id:'a'})).wallet.coins,20000);const roles=createWorldShop({db:f.db,canStaff:async u=>u.id==='b',canNurse:async u=>u.id==='c'});await roles.ready;const staff=await roles.snapshot({id:'b'});assert.deepEqual(staff.inventory.filter(i=>i.kind==='character').map(i=>i.ref),['maria-villegas']);assert.equal(staff.wallet.coins,20000);const nurse=await roles.snapshot({id:'c'});assert(nurse.inventory.some(i=>i.ref==='isabel'));assert(!nurse.inventory.some(i=>i.ref==='maria-villegas'));await roles.snapshot({id:'b'});assert.equal((await roles.snapshot({id:'b'})).inventory.filter(i=>i.ref==='maria-villegas').length,1);}finally{await f.close();}});
async function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-shop-')),db=await openDatabase(dir);await db.run('INSERT INTO world_seasons(id,name,state,updated) VALUES(?,?,?,1)','antarctica-1','Apocalypse II','{}');for(const [id,character]of [['a','bruno'],['b','peggy'],['c','ivy']]){await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,1)',id,id,id,id+'@example.invalid','Dani');await db.run('INSERT INTO world_preferences(user_id,character_id,updated) VALUES(?,?,1)',id,character);await db.run('INSERT INTO world_contestants(season,user_id,status,updated) VALUES(?,?,?,1)','antarctica-1',id,'active');await db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,20000,50000,0)',id);}let rng=0;const shop=createWorldShop({db,random:()=>rng});await shop.ready;return {db,shop,rng:v=>rng=v,async close(){await db.close();assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}};}
test('native catalog includes every supplied pet and wallpaper; purchases persist and duplicate requests debit once',async()=>{const f=await fixture();try{const initial=await f.shop.snapshot({id:'a'});assert.equal(initial.catalog.pets.length,34);assert.equal(initial.catalog.wallpapers.length,24);assert(initial.catalog.foods.every(p=>p.price>=1000&&p.price<=2000));const input=request({kind:'pet',ref:initial.catalog.pets[0].id});const [one,two]=await Promise.all([f.shop.buy({id:'a'},input),f.shop.buy({id:'a'},input)]);assert.equal(one.item.id,two.item.id);assert.equal(two.shop.wallet.coins,19000);await assert.rejects(f.shop.buy({id:'a'},request({kind:'pet',ref:input.ref})),/Ya tienes/);await f.shop.equip({id:'a'},request({kind:'pet',ref:input.ref}));assert.equal((await f.shop.equipment({id:'a'})).pet,input.ref);await assert.rejects(f.shop.equip({id:'b'},request({kind:'pet',ref:input.ref})));const reloaded=createWorldShop({db:f.db});await reloaded.ready;assert.equal((await reloaded.snapshot({id:'a'})).equipped.pet,input.ref);}finally{await f.close();}});
test('sealed crates debit tickets, open only once, exclude rare first rewards, and allow rare rewards after purchase one',async()=>{const f=await fixture();try{f.rng(.99999);const first=await f.shop.buy({id:'a'},request({kind:'crate'}));assert.equal(first.shop.wallet.tickets,45000);assert(!('purchaseNo' in first.item));const opened=await f.shop.open({id:'a'},request({itemId:first.item.id}));assert.equal(opened.item.kind,'character');const count=opened.shop.inventory.length;await f.shop.open({id:'a'},request({itemId:first.item.id}));assert.equal((await f.shop.snapshot({id:'a'})).inventory.length,count);const second=await f.shop.buy({id:'a'},request({kind:'crate'}));const rare=await f.shop.open({id:'a'},request({itemId:second.item.id}));assert.equal(rare.item.kind,'food_bundle');}finally{await f.close();}});
test('gifts transfer ownership atomically, clear equipment, survive reconnect and can be gifted onward',async()=>{const f=await fixture();try{const catalog=(await f.shop.snapshot({id:'a'})).catalog;const bought=await f.shop.buy({id:'a'},request({kind:'pet',ref:catalog.pets[0].id}));await f.shop.equip({id:'a'},request({kind:'pet',ref:bought.item.ref}));const input=request({itemId:bought.item.id,target:'b'});await f.shop.gift({id:'a'},input);await f.shop.gift({id:'a'},input);assert.equal((await f.shop.equipment({id:'a'})).pet,null);assert(!(await f.shop.snapshot({id:'a'})).inventory.some(i=>i.id===bought.item.id));const receiver=await f.shop.snapshot({id:'b'});assert(receiver.inventory.some(i=>i.id===bought.item.id));assert(receiver.notices.some(n=>n.kind==='gift'&&n.from==='Bruno'));await assert.rejects(f.shop.gift({id:'a'},request({itemId:bought.item.id,target:'c'})));await f.shop.gift({id:'b'},request({itemId:bought.item.id,target:'c'}));assert((await f.shop.snapshot({id:'c'})).inventory.some(i=>i.id===bought.item.id));assert(!(await f.shop.snapshot({id:'b'})).inventory.some(i=>i.id===bought.item.id));}finally{await f.close();}});
test('fake and real idols have identical public identities; insufficient balance and full food inventory roll back',async()=>{const f=await fixture();try{await f.shop.snapshot({id:'a'});for(const ref of ['idol_false','idol_true'])await f.db.run("INSERT INTO world_shop_items(id,owner,kind,ref,state,payload,created,updated) VALUES(?,?,'advantage',?,'owned','{}',1,1)",ref,'a',ref);const items=(await f.shop.snapshot({id:'a'})).inventory.filter(i=>i.kind==='advantage').map(({id,...i})=>i);assert.deepEqual(items[0],items[1]);await f.db.run('UPDATE user_progression SET coins=0 WHERE user_id=?','a');await assert.rejects(f.shop.buy({id:'a'},request({kind:'pet',ref:'pig'})),/suficientes/);assert.equal((await f.shop.snapshot({id:'a'})).wallet.coins,0);await f.db.run('UPDATE user_progression SET coins=20000 WHERE user_id=?','a');await f.db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,48,1)','a','apple');await assert.rejects(f.shop.buy({id:'a'},request({kind:'food',ref:'apple'})),/espacio/);assert.equal((await f.shop.snapshot({id:'a'})).wallet.coins,20000);}finally{await f.close();}});

test('regular pets cost 1,000 coins; jester, duo, bat and blue survivor cost 2,000',async()=>{
 const f=await fixture();try{
  const catalog=(await f.shop.snapshot({id:'a'})).catalog;
  assert.equal(catalog.pets.length,34);
  for(const pet of catalog.pets)assert.equal(pet.price,['jester','duo','bat','blue-survivor'].includes(pet.id)?2000:1000);
  const normal=await f.shop.buy({id:'a'},request({kind:'pet',ref:'cat'}));assert.equal(normal.shop.wallet.coins,19000);
  const premium=await f.shop.buy({id:'a'},request({kind:'pet',ref:'jester'}));assert.equal(premium.shop.wallet.coins,17000);
 }finally{await f.close();}
});

test('only the 5,000-ticket random crate is purchasable, while advantages are preview-only',async()=>{
 const f=await fixture();try{
  const initial=await f.shop.snapshot({id:'a'});
  assert.equal(initial.catalog.crate.price,5000);
  assert(initial.catalog.advantages.length>10);
  assert(initial.catalog.advantages.every(item=>item.price===undefined));
  await assert.rejects(f.shop.buy({id:'a'},request({kind:'advantage',ref:'extra_votes'})),e=>e.status===403);
  assert.equal((await f.shop.snapshot({id:'a'})).wallet.tickets,50000);
  const bought=await f.shop.buy({id:'a'},request({kind:'crate'}));
  assert.equal(bought.shop.wallet.tickets,45000);
  assert.equal(bought.item.kind,'crate');
  const opened=await f.shop.open({id:'a'},request({itemId:bought.item.id}));
  assert(opened.item.kind!=='crate','The crate still awards a random catalog reward');
 }finally{await f.close();}
});
test('Dua Lingo and Isabel retain distinct prices; buying Isabel grants nurse access without Staff',async()=>{
 const f=await fixture();try{
  const dua=await f.shop.buy({id:'a'},request({kind:'character',ref:'dua-lingo'}));
  assert.equal(dua.shop.wallet.coins,19000);
  await f.db.run('UPDATE user_progression SET coins=600000 WHERE user_id=?','a');
  const isabel=await f.shop.buy({id:'a'},request({kind:'character',ref:'isabel'}));
  assert.equal(isabel.shop.wallet.coins,100000);
  assert(isabel.shop.inventory.some(i=>i.kind==='character'&&i.ref==='isabel'));
  const role=await f.db.one('SELECT enabled FROM world_clinic_roles WHERE user_id=?','a');
  assert.equal(Number(role?.enabled),1);
  assert.equal(isabel.shop.catalog.characters.find(c=>c.id==='isabel')?.soldOut,true);
 }finally{await f.close();}
});

test('Isabel is a single atomic 500,000 coin purchase per server and remains sold out after shop restart',async()=>{
 const f=await fixture();
 try{
  await f.db.run('UPDATE user_progression SET coins=600000 WHERE user_id IN (?,?)','a','b');
  const before=await f.shop.snapshot({id:'b'});
  assert.equal(before.catalog.characters.find(c=>c.id==='isabel')?.canBuy,true);
  const [first,second]=await Promise.allSettled([
    f.shop.buy({id:'a'},request({kind:'character',ref:'isabel'})),
    f.shop.buy({id:'b'},request({kind:'character',ref:'isabel'}))
  ]);
  const successes=[first,second].filter(r=>r.status==='fulfilled');
  const failures=[first,second].filter(r=>r.status==='rejected');
  assert.equal(successes.length,1);
  assert.equal(failures.length,1);
  assert.equal(failures[0].reason.status,409);
  const buyer=first.status==='fulfilled'?'a':'b',other=buyer==='a'?'b':'a';
  assert.equal((await f.shop.snapshot({id:buyer})).wallet.coins,100000);
  const otherView=await f.shop.snapshot({id:other});
  assert.equal(otherView.wallet.coins,600000,'The rejected purchase cannot debit coins');
  assert.equal(otherView.catalog.characters.find(c=>c.id==='isabel')?.soldOut,true);
  assert.equal(otherView.catalog.characters.find(c=>c.id==='isabel')?.canBuy,false);
  assert.equal(Number((await f.db.one('SELECT enabled FROM world_clinic_roles WHERE user_id=?',buyer)).enabled),1);
  assert.equal((await f.db.one('SELECT enabled FROM world_clinic_roles WHERE user_id=?',other))?.enabled??null,null);
  const reloaded=createWorldShop({db:f.db});await reloaded.ready;
  assert.equal((await reloaded.snapshot({id:other})).catalog.characters.find(c=>c.id==='isabel').soldOut,true);
  await assert.rejects(reloaded.buy({id:other},request({kind:'character',ref:'isabel'})),e=>e.status===409);
  assert.equal((await reloaded.snapshot({id:other})).wallet.coins,600000);
 }finally{await f.close();}
});
