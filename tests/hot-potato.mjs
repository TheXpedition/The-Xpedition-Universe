import assert from 'node:assert/strict';
import {createHotPotato,hotPotatoCast} from '../world-hot-potato.mjs';
const memory=new Map(),losses=[],clients=new Map();
const db={one:async(q,id)=>memory.has(id)?{state:memory.get(id)}:null,all:async()=>losses,transaction:fn=>fn(),run:async(q,id,value)=>memory.set(id,value)};
let clock=10000,useMinimum=false;const returned=[];
const service=createHotPotato({db,clients,send:(c,m)=>c.messages.push(m),can:async u=>u.id==='staff',canPlay:async()=>true,beforeStart:async()=>{},onReturn:async c=>returned.push(c.user.id),now:()=>clock,rand:(a,b)=>b===undefined?0:useMinimum?a:b-1});
const state=()=>JSON.parse(memory.get('hot-potato'));
async function peer(id,characterId){const c={user:{id,name:id},characterId,messages:[],ws:{readyState:1}};clients.set(id,c);await service.handle(c,{type:'potato',action:'subscribe'});return c;}
async function act(c,action,target,rev){await service.handle(c,{type:'potato',action,target,revision:rev??(memory.has('hot-potato')?state().revision:0)});}
try{
 const staff=await peer('staff','maria-villegas'),one=await peer('one','luciano'),two=await peer('two','nacho');
 assert.deepEqual(await hotPotatoCast(db),['alice','andromeda','arisantana','kareli','bruno','daelly','vitany','guillermo','ivy','marianito','roger','sallua','vita','carmine','nacho','luciano','leandro']);
 memory.set('x-protocol-exclusions',JSON.stringify(['vita']));
 await act(one,'open');assert.equal(memory.has('hot-potato'),false);
 await act(staff,'open');assert.equal(state().players.length,0);assert.equal(state().mode,null);
 await act(one,'bots');assert.equal(state().mode,null);
 await act(staff,'bots');const cast=state().players.map(p=>p.characterId);
 for(const id of ['eduard','gabrielsab','peggy','isabel','dani','joseserna','maria-villegas','dua-lingo','vita'])assert(!cast.includes(id),id);
 assert.equal(cast.length,16);assert(cast.includes('luciano')&&cast.includes('nacho'));clock+=600000;await act(one,'start');assert.equal(state().phase,'lobby');assert(one.messages.some(m=>m.type==='potato-error'&&m.message.includes('Solo Dirección')));
 losses.push({character_id:'bruno'});await act(staff,'start');assert(!state().players.some(p=>p.characterId==='bruno'));assert.equal(state().phase,'intro');
 const step=async when=>{clock=when;await act(staff,'pass','nobody',-1);};
 await step(state().deadline);assert.equal(state().phase,'tutorial');assert.equal(state().deadline-clock,10000);assert.equal(state().holder,null);await step(state().deadline);assert.equal(state().phase,'countdown');assert.equal(state().deadline-clock,5000);assert.equal(state().holder,null);await step(state().deadline);const firstBot=state().holder;assert.equal(state().deadline-clock,60000);
 assert(state().botAt-clock>=950);
 const botTime=state().botAt,explosionTime=state().deadline;
 await act(one,'pause');assert.equal(state().pausedAt,null);
 await act(staff,'pause');assert.equal(state().pausedAt,clock);
 clock+=90000;await act(one,'pass','two');assert.equal(state().holder,firstBot);
 await act(staff,'resume');assert.equal(state().deadline,explosionTime+90000);assert.equal(state().botAt,botTime+90000);
 await step(state().botAt);assert.notEqual(state().holder,firstBot);assert(state().holder.startsWith('bot-'));
 // Play through the 15-person cast and cross the half-field threshold.
 while(state().players.filter(p=>p.lives>0).length>2){
  await step(state().deadline);assert.equal(state().phase,'blast');assert.equal(state().deadline-clock,10000);
  const resumeAt=state().deadline,round=state().round;
  await step(resumeAt-1);assert.equal(state().phase,'blast');assert.equal(state().holder,null);
  useMinimum=!useMinimum;await step(resumeAt);
  assert.equal(state().phase,'playing');assert.equal(state().round,round+1);
  assert(state().players.some(p=>p.lives>0&&p.id===state().holder));
  const remaining=state().players.filter(p=>p.lives>0).length;
  const limits=remaining*2<=state().players.length?[10000,30000]:[30000,50000];
  assert.equal(state().deadline-clock,limits[useMinimum?0:1]);
 }
 await act(staff,'cancel');await act(staff,'open');
 const lobby=state();assert.equal(lobby.players.length,0);
 await act(staff,'fillUsers');assert.equal(state().mode,'users');
 assert.deepEqual(state().players.map(p=>p.id),['one','two']);assert(!state().players.some(p=>p.bot));
 await act(staff,'fillBots');assert.equal(state().mode,'mixed');
 assert.equal(state().players.filter(p=>p.bot).length,13);
 assert.equal(new Set(state().players.map(p=>p.characterId)).size,15);
 await act(staff,'removeBots');assert.deepEqual(state().players.map(p=>p.id),['one','two']);
 await act(one,'leave');await act(two,'leave');
 await act(staff,'start');assert.equal(state().phase,'lobby');
 await Promise.all([one,two].map(c=>service.handle(c,{type:'potato',action:'join',gameId:lobby.id,revision:lobby.revision})));
 assert.equal(state().players.length,2);await act(staff,'start');assert.equal(state().phase,'lobby');
 await Promise.all([one,two].map(c=>service.handle(c,{type:'potato',action:'ready',gameId:lobby.id,ready:true})));
 service.disconnect(two);
 assert.equal(staff.messages.at(-1).game.players.find(p=>p.id==='two').connected,false);
 await act(staff,'start');assert.equal(state().phase,'lobby');
 await service.handle(two,{type:'potato',action:'subscribe'});
 assert.equal(staff.messages.at(-1).game.players.find(p=>p.id==='two').connected,true);
 await act(staff,'start');
 assert(await service.returnToArena('one'));assert.equal(await service.returnToArena('staff'),false);assert.deepEqual(state().players.map(p=>p.id),['one','two']);
 const tick=async()=>{clock=state().deadline;await act(staff,'pass','nobody',-1);};
 await tick();await tick();await tick();assert.equal(state().holder,'one');const rev=state().revision;await act(two,'pass','one');assert.equal(state().revision,rev);
 await service.handle(one,{type:'potato',action:'subscribe',compactPass:true});
 const deadline=state().deadline;clock+=14000;await act(one,'pass','two');assert.equal(state().deadline,deadline);await act(one,'pass','two',rev);assert.equal(state().holder,'two');assert.equal(state().revision,rev+1);
 for(let i=0;i<30;i++){
  const sender=i%2===0?two:one,target=sender===two?'one':'two';
  await act(sender,'pass',target);assert.equal(state().holder,target);
  assert.equal(one.messages.at(-1).type,'potato-pass');
  assert.equal(one.messages.at(-1).revision,state().revision);
  assert.equal(state().deadline,deadline);
 }
 for(let i=0;i<3;i++){if(state().holder==='one')await act(one,'pass','two');await tick();assert.equal(state().lastHit.lives,2-i);await tick();}
 assert(await service.returnToArena('two'));assert.equal(state().winner,'one');assert(memory.has('hot-potato-immunity:one'));
 assert(service.engaged('one')&&service.engaged('two'));
 await act(staff,'open');assert(service.engaged('two'),'an old return survives a new lobby');
 await act(two,'return',null,state().revision-1);assert.equal(await service.returnToArena('two'),false);assert.deepEqual(returned,['two']);
 await act(one,'return');await act(staff,'cancel');await act(staff,'open');
 await act(staff,'fillUsers');await act(staff,'fillBots');
 for(const p of state().players.filter(p=>p.id!=='one'&&p.id!=='bot-alice'))await act(staff,'remove',p.id);
 assert.equal(state().mode,'mixed');await act(staff,'start');
 await tick();await tick();await tick();assert.equal(state().holder,'one');
 for(let round=0;round<3;round++){
  await act(one,'pass','bot-alice');
  assert(state().botAt-clock>=950);
  await step(state().deadline);assert.equal(state().lastHit.id,'bot-alice');await tick();
 }
 assert.equal(state().winner,'one');assert.equal(state().phase,'finished');assert.equal(JSON.parse(memory.get('hot-potato-immunity:one')).game,state().id);
 await act(one,'return');assert(!service.engaged('one'));
 console.log('OK: exclusiones, autorización, modos, pases duplicados, tres vidas, eliminación e inmunidad.');
}finally{await service.close();}
