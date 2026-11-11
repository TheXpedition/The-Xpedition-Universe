import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
const latest=(p,id)=>p.messages.flatMap(m=>m.players||[]).findLast(p=>p.userId===id);
test('a real connected participant buys their pajamas once, equips the correct outfit, walks and keeps it after reconnect',async()=>{const [x,y]=WORLD_MAPS.base.spawn,id='pajama-user',f=await liveFixture('pajama-user',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x,y},{id,character:'bruno',zone:'base',x:x+20,y}],{setup:db=>db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,10000,123,0)',id)});try{const observer=await f.connect(STAFF_ID);let p=await f.connect(id);assert.equal((await f.call('/api/world/clothing',id,'POST',{clothing:'pajamas',pajamasOwned:['bruno']})).status,403);const bought=await f.call('/api/world/shop/buy',id,'POST',{requestId:randomUUID(),kind:'pajama',ref:'bruno'});assert.equal(bought.status,200);assert.equal(bought.shop.wallet.coins,5000);assert.equal(bought.shop.wallet.tickets,123);const dressed=await f.call('/api/world/clothing',id,'POST',{clothing:'pajamas'});assert.equal(dressed.status,200);assert.equal(dressed.body.clothing,'pajamas');await f.until(()=>latest(observer,id)?.clothing==='pajamas');const from=latest(observer,id).x;f.send(p,{type:'input',x:1,y:0});await f.until(()=>latest(observer,id)?.x>from+15);f.send(p,{type:'stop'});p.socket.terminate();await new Promise(r=>setTimeout(r,150));p=await f.connect(id);assert.equal(latest(p,id).clothing,'pajamas');assert.equal((await f.call('/api/world/shop',id)).shop.wallet.coins,5000);assert.equal((await f.call('/api/world/clothing',id,'POST',{clothing:'heat'})).status,200);assert.equal((await f.call('/api/world/clothing',id,'POST',{clothing:'pajamas'})).status,200);}finally{await f.close();}});

test('Isabel can equip her coat for free and sleeps on hospital beds with or without her purchased pajamas',async()=>{
 const zone='hospital-interior',map=WORLD_MAPS[zone],bed=map.props.find(p=>p.id==='hospital-bed-left');
 const [x,y]=map.spawn,id='nurse-pajamas';
 const f=await liveFixture('nurse-pajamas',[
  {id:STAFF_ID,character:'maria-villegas',zone,x,y},
  {id,character:'isabel',zone,...bed.approaches[0]}
 ],{setup:async db=>{
  await db.run('INSERT INTO world_clinic_roles(user_id,enabled,updated_by,updated) VALUES(?,1,?,1)',id,STAFF_ID);
  await db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,5000,0,0)',id);
 }});
 try{
  const observer=await f.connect(STAFF_ID),nurse=await f.connect(id);
  const coat=await f.call('/api/world/clothing',id,'POST',{clothing:'cold'});
  assert.equal(coat.status,200);
  assert.equal(coat.body.clothing,'cold');
  assert.equal((await f.call('/api/world/clothing',id,'POST',{clothing:'pajamas'})).status,403);
  f.send(nurse,{type:'interact',objectId:bed.id,slot:0});
  const first=await f.until(()=>nurse.messages.find(m=>m.type==='error')||latest(observer,id)?.state==='sleep'&&latest(observer,id));
  assert.equal(first.seatId,bed.id,first.message);
  f.send(nurse,{type:'stand'});
  await f.until(()=>!latest(observer,id)?.seatId);
  const bought=await f.call('/api/world/shop/buy',id,'POST',{requestId:randomUUID(),kind:'pajama',ref:'isabel'});
  assert.equal(bought.status,200);
  assert.equal(bought.shop.wallet.coins,0);
  assert.equal((await f.call('/api/world/clothing',id,'POST',{clothing:'pajamas'})).status,200);
  f.send(nurse,{type:'interact',objectId:bed.id,slot:0});
  await f.until(()=>latest(observer,id)?.state==='sleep'&&latest(observer,id)?.clothing==='pajamas');
 }finally{await f.close();}
});
