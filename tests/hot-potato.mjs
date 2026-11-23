import assert from 'node:assert/strict';
import {createHotPotato,hotPotatoCast} from '../world-hot-potato.mjs';
const memory=new Map(),losses=[],clients=new Map();
const db={one:async(q,id)=>memory.has(id)?{state:memory.get(id)}:null,all:async()=>losses,transaction:fn=>fn(),run:async(q,id,value)=>memory.set(id,value)};
let clock=10000;
const service=createHotPotato({db,clients,send:(c,m)=>c.messages.push(m),can:async u=>u.id==='staff',canPlay:async()=>true,beforeStart:async()=>{},now:()=>clock,rand:(a,b)=>b?a:0});
const state=()=>JSON.parse(memory.get('hot-potato'));
async function peer(id,characterId){const c={user:{id,name:id},characterId,messages:[],ws:{readyState:1}};clients.set(id,c);await service.handle(c,{type:'potato',action:'subscribe'});return c;}
async function act(c,action,target,rev){await service.handle(c,{type:'potato',action,target,revision:rev??(memory.has('hot-potato')?state().revision:0)});}
try{
 const staff=await peer('staff','maria-villegas'),one=await peer('one','luciano'),two=await peer('two','nacho');
 assert.deepEqual(await hotPotatoCast(db),['alice','andromeda','arisantana','kareli','bruno','daelly','vitany','guillermo','ivy','marianito','roger','sallua','vita','carmine','nacho','luciano','leandro']);
 memory.set('x-protocol-exclusions',JSON.stringify(['vita']));
 await act(one,'bots');assert.equal(memory.has('hot-potato'),false);
 await act(staff,'bots');const cast=state().players.map(p=>p.characterId);
 for(const id of ['eduard','gabrielsab','peggy','isabel','dani','joseserna','maria-villegas','dua-lingo','vita'])assert(!cast.includes(id),id);
 assert.equal(cast.length,16);assert(cast.includes('luciano')&&cast.includes('nacho'));clock+=600000;await act(one,'start');assert.equal(state().phase,'lobby');assert(one.messages.some(m=>m.type==='potato-error'&&m.message.includes('Solo Dirección')));
 losses.push({character_id:'bruno'});await act(staff,'start');assert(!state().players.some(p=>p.characterId==='bruno'));assert.equal(state().phase,'intro');
 const step=async when=>{clock=when;await act(staff,'pass','nobody',-1);};
 await step(state().deadline);await step(state().deadline);const firstBot=state().holder;
 await step(state().botAt);assert.notEqual(state().holder,firstBot);assert(state().holder.startsWith('bot-'));
 await act(staff,'cancel');await act(staff,'users');const lobby=state();
 await Promise.all([one,two].map(c=>service.handle(c,{type:'potato',action:'join',gameId:lobby.id,revision:lobby.revision})));
 assert.equal(state().players.length,2);await act(staff,'start');
 assert(await service.returnToArena('one'));assert.equal(await service.returnToArena('staff'),false);assert.deepEqual(state().players.map(p=>p.id),['one','two']);
 const tick=async()=>{clock=state().deadline;await act(staff,'pass','nobody',-1);};
 await tick();await tick();assert.equal(state().holder,'one');const rev=state().revision;await act(two,'pass','one');assert.equal(state().revision,rev);
 await act(one,'pass','two');await act(one,'pass','two',rev);assert.equal(state().holder,'two');assert.equal(state().revision,rev+1);
 for(let i=0;i<3;i++){if(state().holder==='one')await act(one,'pass','two');await tick();assert.equal(state().lastHit.lives,2-i);await tick();}
 assert.equal(await service.returnToArena('two'),false);assert.equal(state().winner,'one');assert(memory.has('hot-potato-immunity:one'));console.log('OK: exclusiones, autorización, modos, pases duplicados, tres vidas, eliminación e inmunidad.');
}finally{await service.close();}
