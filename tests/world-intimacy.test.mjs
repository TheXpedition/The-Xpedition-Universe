import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWorldIntimacy} from '../world-intimacy-service.mjs';
import {createWellness} from '../public/juegos/world-wellness.mjs';
function setup(){let time=10000,finished=0;const events=[],people=new Map();for(const id of ['a','b','c'])people.set(id,{user:{id,name:id},zone:{id:'room'},p:{x:0,y:0,path:[]},adult:true,wellness:createWellness({medicines:{condom:2}})});
 const service=createWorldIntimacy({now:()=>time,clientFor:({id})=>people.get(id),connected:()=>[...people.values()],send:(c,e)=>events.push({...e,for:c.user.id}),bedFor:(_,id)=>id==='bed'?{point:{x:100,y:0}}:null,isAdult:c=>c.adult,occupied:(_,id)=>[...people.values()].some(c=>c.seat?.propId===id),approach:(c,p,s)=>{c.intimacySession=s.id;c.p.path=[p];},begin:c=>{c.careBusy=true;},release:c=>{c.careBusy=false;c.p.path=[];},finish:async(_,s,valid)=>{if(!valid())throw Error('cancelled');finished++;},fail:(status,message)=>{throw Object.assign(Error(message),{status});}});
 const request=()=>{service.request(people.get('a'),{bedId:'bed',target:'b',acknowledged:true});return events.findLast(e=>e.type==='intimacy-request').request;};
 return {service,people,events,request,advance:n=>time+=n,finished:()=>finished};
}
test('private invitations require nearby adult characters and explicit acceptance from the recipient',()=>{
 const f=setup();f.people.get('c').adult=false;assert.deepEqual(f.service.candidates(f.people.get('a'),'bed').map(p=>p.id),['b']);const r=f.request();assert.equal(f.events.filter(e=>e.type==='intimacy-request').length,1);assert.equal(f.events.find(e=>e.type==='intimacy-request').for,'b');
 assert.throws(()=>f.service.accept({id:'c'},{requestId:r.id,acknowledged:true}),/invitación/);assert.throws(()=>f.service.accept({id:'b'},{requestId:r.id}),/expresamente/);f.service.accept({id:'b'},{requestId:r.id,acknowledged:true});assert(f.service.reserved('room','bed'));
});
test('manual cancellation releases both paths and the bed before anyone reaches it',()=>{
 const f=setup(),r=f.request();f.service.accept({id:'b'},{requestId:r.id,acknowledged:true});assert.throws(()=>f.service.candidates(f.people.get('c'),'bed'),/ocupada/);f.service.cancel('b');assert(!f.service.reserved('room','bed'));for(const c of f.people.values())assert(!c.p.path.length);f.advance(100000);f.service.tick();assert.equal(f.finished(),0);
});
test('one occupied bed cannot be reserved; expiry and disconnect cannot leave stale reservations',()=>{
 const f=setup();f.people.get('c').seat={propId:'bed'};assert.throws(()=>f.request(),/ocupada/);f.people.get('c').seat=null;const r=f.request();f.advance(30001);assert.throws(()=>f.service.accept({id:'b'},{requestId:r.id,acknowledged:true}),/invitación/);
 const r2=f.request();f.service.accept({id:'b'},{requestId:r2.id,acknowledged:true});f.people.delete('b');f.service.tick();assert(!f.service.reserved('room','bed'));assert(!f.people.get('a').p.path.length);
});
test('completion happens once, and cancelling the private moment prevents completion',async()=>{
 for(const cancel of [false,true]){const f=setup(),r=f.request();f.service.accept({id:'b'},{requestId:r.id,acknowledged:true});for(const id of ['a','b'])f.people.get(id).p.x=100;f.service.tick();assert(f.people.get('a').careBusy);assert.equal(f.events.filter(e=>e.type==='intimacy-session'&&e.session.phase==='private').length,2);if(cancel)f.service.cancel('a');f.advance(7000);f.service.tick();await new Promise(r=>setImmediate(r));assert.equal(f.finished(),cancel?0:1);f.service.tick();assert.equal(f.finished(),cancel?0:1);assert(!f.service.reserved('room','bed'));assert(!f.people.get('b').careBusy);}
});
