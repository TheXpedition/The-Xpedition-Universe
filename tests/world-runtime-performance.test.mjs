import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createImageModeration} from '../moderation.mjs';
import {createWorldAssetAccess} from '../world-asset-access.mjs';
import {createLiveWallet} from '../world-live-wallet.mjs';
import {deliverWorldPacket} from '../world-live-delivery.mjs';
import {serverDatabase,SERVER_TABLES} from '../world-server-store.mjs';
const next=()=>new Promise(resolve=>setImmediate(resolve));
class ReviewWorker extends EventEmitter{
 constructor(){super();this.posts=[];this.stopped=false;}
 postMessage(job){this.posts.push(job);}
 reply(predictions=[]){this.emit('message',{id:this.posts.at(-1).id,predictions,image:Buffer.from('sanitized')});}
 async terminate(){this.stopped=true;this.emit('exit',1);return 1;}
}
test('World can release idle image inference memory; active reviews remain mandatory and a later review reloads safely',async()=>{
 const workers=[],m=createImageModeration({createWorker:()=>{const w=new ReviewWorker();workers.push(w);return w;}});
 let p=m.moderate(Buffer.from('first'));await next();assert.equal(await m.releaseIdle(),false);assert(!workers[0].stopped);
 workers[0].reply();assert.equal((await p).toString(),'sanitized');assert.equal(m.status(),'ready');assert(await m.releaseIdle());assert.equal(m.status(),'idle');
 p=m.moderate(Buffer.from('second'));await next();assert.equal(workers.length,2);workers[0].emit('exit',1);assert.equal(m.status(),'starting');workers[1].reply([{className:'Porn',probability:.99}]);await assert.rejects(p,{status:422});assert(await m.releaseIdle());
});
test('an inference failure rejects every affected image, then permits a fresh protected review',async()=>{
 const workers=[],m=createImageModeration({createWorker:()=>{const w=new ReviewWorker();workers.push(w);return w;}});
 const p=m.moderate(Buffer.from('image')),rejected=assert.rejects(p,{status:503});await next();workers[0].emit('exit',1);await rejected;const good=m.moderate(Buffer.from('retry'));await next();workers[1].reply();await good;assert(await m.releaseIdle());
});
test('an asset burst shares authorization, while other cookies, other rooms, expired and rejected grants are checked again',async()=>{
 let time=0,calls=0;const auth=createWorldAssetAccess(async(req,id)=>{calls++;if(req.headers.cookie==='denied')throw Object.assign(Error('denied'),{status:403});return {id};},{now:()=>time});
 const req={headers:{cookie:'one'}};await Promise.all(Array.from({length:100},()=>auth(req,'a')));assert.equal(calls,1);await auth({headers:{cookie:'two'}},'a');await auth(req,'b');assert.equal(calls,3);time=2001;await auth(req,'a');assert.equal(calls,4);
 for(let i=0;i<2;i++)await assert.rejects(auth({headers:{cookie:'denied'}},'a'),{status:403});assert.equal(calls,6);
});
test('ceremony snapshots reuse balance reads, deduplicate concurrent loads and invalidate immediately after a debit',async()=>{
 let time=0,calls=0,coins=300;const wallet=createLiveWallet({one:async()=>{calls++;return {coins};}},{now:()=>time});
 const frames=await Promise.all(Array.from({length:80},()=>wallet.get('player')));assert(frames.every(v=>v.coins===300));assert.equal(calls,1);
 coins=100;wallet.invalidate('player');assert.equal((await wallet.get('player')).coins,100);time=2001;await wallet.get('player');assert.equal(calls,3);
});
test('slow live clients drop obsolete frames without being disconnected; votes, chat and returns stay reliable',()=>{
 const sent=[],closed=[],ws={readyState:1,bufferedAmount:300000,send:value=>sent.push(JSON.parse(value)),close:(...args)=>closed.push(args)};
 for(const type of ['move','protocol-state','grip-state','chef-state'])assert.equal(deliverWorldPacket(ws,{type}),false);
 for(const type of ['protocol-start','protocol-chat','protocol-return','error'])assert(deliverWorldPacket(ws,{type}));assert.equal(closed.length,0);assert.equal(sent.length,4);
 ws.bufferedAmount=0;assert(deliverWorldPacket(ws,{type:'protocol-state',revision:40}));assert.equal(sent.at(-1).revision,40);
 ws.bufferedAmount=3000000;assert(!deliverWorldPacket(ws,{type:'protocol-return'}));assert.equal(closed[0][0],4008);
});
test('eighteen live ceremony viewers refresh their distinct profile balances in one query, rather than blocking 18 sequential reads',async()=>{
 let queries=0,time=0;const wallet=createLiveWallet({one:async()=>{throw Error('unexpected individual read');},all:async(_sql,...ids)=>{queries++;return ids.map((user_id,i)=>({user_id,coins:i*100}));}},{now:()=>time}),ids=Array.from({length:18},(_,i)=>'human-'+i);
 for(let frame=0;frame<20;frame++){time=frame*100;const balances=await wallet.getMany(ids);assert.equal(balances.get('human-17').coins,1700);}assert.equal(queries,1);
 time=2001;await wallet.getMany(ids);assert.equal(queries,2);
});
test('hosted room schema and permissions install in one batch instead of hundreds of network round trips',async()=>{
 const calls=[],db={kind:'postgres',transaction:fn=>fn(),exec:async sql=>calls.push(sql)};
 await serverDatabase(db,'11111111-1111-4111-8111-111111111111');assert.equal(calls.length,1);
 for(const table of SERVER_TABLES){assert(calls[0].includes('_'+table+'('),table);assert(calls[0].includes('_'+table+' ENABLE ROW LEVEL SECURITY'),table);assert(calls[0].includes('_'+table+' FROM PUBLIC'),table);}
});
