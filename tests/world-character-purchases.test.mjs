import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
test('a new account has no free character; only a paid character can be selected and staff starts with Maria only',async()=>{
 const [x,y]=WORLD_MAPS.base.spawn,user='no-free-character',f=await liveFixture('character-purchase',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x,y,owned:false},{id:user,character:'bruno',zone:'base',x,y,owned:false}],{setup:db=>db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,6000,25,0)',user)});
 try{let boot=await f.call('/api/world/bootstrap',user);assert.equal(boot.status,200);assert.equal(boot.shop.inventory.filter(i=>i.kind==='character').length,0);assert(boot.characterAvailability.needsSelection);assert.equal(boot.characterAvailability.characters.bruno.selectable,false);
  assert.equal((await f.call('/api/world/preferences',user,'PUT',{characterId:'bruno'})).status,403);
  const staff=await f.call('/api/world/bootstrap',STAFF_ID);assert.deepEqual(staff.shop.inventory.filter(i=>i.kind==='character').map(i=>i.ref),['maria-villegas']);
  assert.equal((await f.call('/api/world/shop/buy',user,'POST',{kind:'character',ref:'bruno',requestId:randomUUID()})).status,200);assert.equal((await f.call('/api/world/preferences',user,'PUT',{characterId:'bruno'})).status,200);
  const peer=await f.connect(user);assert(peer.messages.some(m=>m.type==='welcome'));
  boot=await f.call('/api/world/bootstrap',user);assert.equal(boot.shop.wallet.coins,5500);assert.deepEqual(boot.shop.inventory.filter(i=>i.kind==='character').map(i=>i.ref),['bruno']);assert.equal(boot.shop.wallet.tickets,25);
 }finally{await f.close();}
});
