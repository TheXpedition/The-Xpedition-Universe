import test from 'node:test';
import assert from 'node:assert/strict';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';

test('Last Grip fills connected humans before bots and permits a real player to replace their bot seat',async()=>{
 const f=await liveFixture('grip-users',[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:500,y:700},
  {id:'human-early',character:'bruno',zone:'base',x:600,y:700},
  {id:'human-late',character:'ivy',zone:'base',x:700,y:700},
  {id:'spectator',character:'dani',zone:'base',x:800,y:700},
  {id:'eliminated',character:'peggy',zone:'base',x:900,y:700,spectator:true},
 ],{setup:async db=>{
  await db.run('INSERT INTO world_seasons(id,name,state,updated) VALUES(?,?,?,1)','antarctica-1','Apocalypse II','{}');
  await db.run('INSERT INTO apocalypse_cast(user_id,style_override,updated) VALUES(?,1,1)','eliminated');
  await db.run('INSERT INTO world_contestants(season,user_id,status,updated) VALUES(?,?,?,1)','antarctica-1','eliminated','eliminated');
 }});
 try{
  const staff=await f.connect(STAFF_ID),latest=()=>staff.messages.filter(m=>m.type==='grip-state').at(-1)?.episode;
  f.send(staff,{type:'grip-subscribe'});f.send(staff,{type:'grip-action',action:{type:'open'}});await f.until(()=>latest()?.phase==='lobby');
  f.send(staff,{type:'grip-action',action:{type:'fillBots'}});await f.until(()=>latest()?.roster.length===18);assert(latest().roster.every(p=>p.bot));
  const early=await f.connect('human-early'),viewer=await f.connect('spectator'),eliminated=await f.connect('eliminated');
  f.send(staff,{type:'grip-action',action:{type:'fillUsers'}});await f.until(()=>latest()?.roster.some(p=>p.id==='human-early'));
  assert.equal(latest().roster.length,18);assert.equal(latest().roster.filter(p=>p.bot).length,17);assert.equal(latest().roster.find(p=>p.id==='human-early').ready,true);
  assert.equal(latest().roster.filter(p=>p.characterId==='bruno').length,1);assert(!latest().roster.some(p=>['spectator','eliminated',STAFF_ID].includes(p.id)));
  f.send(viewer,{type:'grip-action',action:{type:'fillUsers'}});await f.until(()=>viewer.messages.some(m=>m.type==='error'&&m.message.includes('Solo Dirección')));
  f.send(eliminated,{type:'grip-action',action:{type:'join'}});await f.until(()=>eliminated.messages.some(m=>m.type==='error'&&m.message.includes('participantes confirmados')));
  const late=await f.connect('human-late');f.send(late,{type:'grip-action',action:{type:'join'}});await f.until(()=>latest()?.roster.some(p=>p.id==='human-late'));
  assert.equal(latest().roster.length,18);assert.equal(latest().roster.filter(p=>p.bot).length,16);assert.equal(latest().roster.filter(p=>p.characterId==='ivy').length,1);
  f.send(late,{type:'grip-action',action:{type:'ready',ready:true}});await f.until(()=>latest()?.roster.find(p=>p.id==='human-late')?.ready);
  f.send(staff,{type:'grip-action',action:{type:'start'}});await f.until(()=>['opening','arrival'].includes(latest()?.phase));
  for(const peer of [early,late]){await f.until(()=>peer.messages.some(m=>m.type==='grip-state'&&m.episode.engaged&&['opening','arrival'].includes(m.episode.phase)));}
  assert.equal(latest().roster.filter(p=>!p.bot).length,2);
  const client=await fetch(f.base+'/juegos/last-grip/client.mjs',{headers:{Cookie:'xp_world_session='+STAFF_ID}});assert.match(await client.text(),/add\('fillUsers','COMPLETAR CON USUARIOS'\)/);
 }finally{await f.close();}
});
