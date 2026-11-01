import test from 'node:test';import assert from 'node:assert/strict';import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
test('confirmed players can compete; two audience accounts can share Dani and cannot forge participant actions',async()=>{
 const f=await liveFixture('publish-roles',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:500,y:700},{id:'cast-member',character:'bruno',zone:'base',x:600,y:700},{id:'viewer-one',character:'dani',zone:'base',x:700,y:700},{id:'viewer-two',character:'dani',zone:'base',x:800,y:700}]);
 try{const staff=await f.connect(STAFF_ID),member=await f.connect('cast-member'),first=await f.connect('viewer-one'),second=await f.connect('viewer-two');
  assert.equal((await f.call('/api/world/bootstrap','cast-member')).participation.role,'participant');for(const id of ['viewer-one','viewer-two'])assert.equal((await f.call('/api/world/bootstrap',id)).participation.role,'spectator');
  const denied=await f.call('/api/world/preferences','viewer-one','PUT',{characterId:'peggy'});assert.equal(denied.status,403);assert.match(denied.error,/participantes confirmados|Compra este personaje/);
  assert.equal((await f.call('/api/world/survival/action','viewer-one','POST',{action:'gather',id:'anywhere'})).status,403);
  f.send(staff,{type:'grip-subscribe'});f.send(staff,{type:'grip-action',action:{type:'open'}});await f.until(()=>staff.messages.some(m=>m.type==='grip-state'&&m.episode.phase==='lobby'));
  f.send(first,{type:'grip-action',action:{type:'join'}});await f.until(()=>first.messages.some(m=>m.type==='error'&&/participantes confirmados/.test(m.message)));
  f.send(first,{type:'grip-subscribe'});f.send(first,{type:'grip-action',action:{type:'visit'}});await f.until(()=>first.messages.some(m=>m.type==='grip-state'&&m.episode.visitors.some(p=>p.id==='viewer-one')));
  f.send(member,{type:'grip-action',action:{type:'join'}});await f.until(()=>staff.messages.some(m=>m.type==='grip-state'&&m.episode.roster.some(p=>p.id==='cast-member')));
  f.send(staff,{type:'protocol-subscribe'});f.send(staff,{type:'protocol-action',action:{type:'open'}});await f.until(()=>staff.messages.some(m=>m.type==='protocol-state'&&m.episode.phase==='LOBBY'));
  f.send(second,{type:'protocol-action',action:{type:'join'}});await f.until(()=>second.messages.some(m=>m.type==='error'&&/participantes confirmados/.test(m.message)));
 }finally{await f.close();}
});
