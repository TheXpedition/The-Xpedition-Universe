import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../database.mjs';
import {createProgression} from '../progression.mjs';
import {createArcadeProgress} from '../arcade-progress.mjs';
import {solveRun} from './arcade-route-helper.mjs';
import {LEVELS} from '../public/simulator/ice-breaker/levels.mjs';
import {FALL_LINES,AMBIENT_LINES,shuffleBag} from '../public/simulator/ice-breaker/dani-lines.mjs';
const data=fs.mkdtempSync(path.join(os.tmpdir(),'xp-arcade-rewards-')),db=await openDatabase(data);
let clock=Date.UTC(2026,9,20,15),allowed=true;
const a={id:'arcade-reward-a'},b={id:'arcade-reward-b'};
for(const u of [a,b])await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',u.id,u.id,u.id,u.id+'@example.invalid','Dani',clock);
const fail=(status,message)=>{const error=Error(message);error.status=status;throw error;};
const deps={db,body:async req=>req.payload,json:(res,value,status=200)=>Object.assign(res,{value,status}),fail,checkRate:()=>{},now:()=>clock};
const progression=createProgression({...deps,shop:{items:[],modes:[]},catalog:{},serialize:fn=>fn(),notify:()=>{}});
const service=createArcadeProgress({...deps,access:async()=>({canPlay:allowed}),progression});
async function request(user,route,method='GET',payload){const res={setHeader(){}};try{assert(await service.handle({method,payload},res,new URL(route,'http://localhost'),user));return {...res.value,status:res.status};}catch(error){return {status:error.status||500,error:error.message};}}
after(()=>db.close());
async function start(level=1,user=a){return request(user,'/api/arcade/ice-breaker/runs','POST',{level,difficulty:'normal'});}
async function send(session,commands,user=a){const value=await request(user,'/api/arcade/ice-breaker/runs/'+session.id,'PUT',{revision:session.revision,commands});if(value.status===200)session.revision=value.revision;return value;}
async function win(level=1,user=a){const session=await start(level,user);assert.equal(session.status,201);let result,lastPayload;const queue=solveRun(level,'normal').commands;
 while(queue.length){let ticks=0;const commands=[];while(queue.length&&commands.length<100){const next=queue[0];if(next.op==='step'&&ticks+next.ticks>600){const n=600-ticks;if(n){commands.push({...next,ticks:n});next.ticks-=n;ticks+=n;}break;}commands.push(queue.shift());if(next.op==='step')ticks+=next.ticks;}
  clock+=ticks/120*1000;lastPayload={revision:session.revision,commands};result=await send(session,commands,user);assert.equal(result.status,200,result.error);
 }
 assert.equal(result.reward.level,level);return {session,result,lastPayload};
}
test('tickets use the real verified route, unlock levels, persist and cannot be credited twice by retries',async()=>{
 assert.equal((await start(2)).status,409);assert.equal((await start(10)).status,400);assert.equal((await start(1,null)).status,401);
 const first=await win(1);assert.equal(first.result.reward.tickets,8);assert.equal(first.result.wallet.tickets,8);assert.deepEqual(first.result.completed,[1]);
 const duplicate=await request(a,'/api/arcade/ice-breaker/runs/'+first.session.id,'PUT',first.lastPayload);assert.equal(duplicate.status,200);assert.equal(duplicate.wallet.tickets,8);assert.equal(duplicate.reward.tickets,0);
 const repeat=await win(1);assert.equal(repeat.result.reward.tickets,0);assert.equal(repeat.result.wallet.tickets,8);
 const second=await win(2);assert.equal(second.result.reward.tickets,12);assert.equal(second.result.wallet.tickets,20);
 assert.equal((await progression.wallet(b.id)).tickets,0);
 clock+=86400000;
 const old=await request(a,'/api/arcade/ice-breaker/runs/'+first.session.id,'PUT',first.lastPayload);assert.equal(old.wallet.tickets,20,'old wins cannot be claimed again on a new day');
 const tomorrow=await win(1);assert.equal(tomorrow.result.reward.tickets,8);assert.equal(tomorrow.result.wallet.tickets,28);
 const reopened=await openDatabase(data);assert.equal(Number((await reopened.one('SELECT tickets FROM user_progression WHERE user_id=?',a.id)).tickets),28);await reopened.close();
});
test('ownership, closed access, forged finishes, unreachable destinations and time skipping earn nothing',async()=>{
 const session=await start();const before=await progression.wallet(a.id);
 assert.equal((await send(session,[{op:'finish',score:999999}])).status,400);
 assert.equal((await send(session,[{op:'jump',id:'f23'}])).status,409);
 assert.equal((await send(session,[{op:'step',ticks:601,input:{x:0,y:0,dodge:false}}])).status,400);
 assert.equal((await send(session,[{op:'step',ticks:600,input:{x:0,y:0,dodge:false}}])).status,400);
 assert.equal((await send(session,[{op:'step',ticks:1,input:{x:0,y:0,dodge:false}}],b)).status,404);
 allowed=false;assert.equal((await send(session,[{op:'step',ticks:1,input:{x:0,y:0,dodge:false}}])).status,403);allowed=true;
 assert.deepEqual(await progression.wallet(a.id),before);
});
test('mouse walking can be cancelled by keyboard input without desynchronizing a verified run',async()=>{
 const session=await start();clock+=1200;
 const result=await send(session,[{op:'walk',x:185,y:450},{op:'step',ticks:12,input:{x:0,y:0,dodge:false}},{op:'cancel'},{op:'step',ticks:12,input:{x:-1,y:0,dodge:false}}]);
 assert.equal(result.status,200);const state=JSON.parse((await db.one('SELECT snapshot FROM arcade_runs WHERE id=?',session.id)).snapshot);assert.equal(state.walkTarget,null);assert(Math.abs(state.player.x-160)<.01);
});
test('all fall and ambient quotes have complete audio, censored on-screen profanity and shuffled non-repeating bags',()=>{
 assert.equal(FALL_LINES.length,7);assert.equal(AMBIENT_LINES.length,6);
 for(const line of [...FALL_LINES,...AMBIENT_LINES]){
  const file=new URL('../public/simulator/ice-breaker/audio/'+line.id+'.wav',import.meta.url),bytes=fs.readFileSync(file);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert(bytes.length>8000);
  assert(!/concha|hijueputa|mamada|pija/i.test(line.text));assert(!/[*@4]/.test(line.spoken));
 }
 const next=shuffleBag(FALL_LINES,()=>.35),first=Array.from({length:7},next);assert.equal(new Set(first.map(q=>q.id)).size,7);assert.notEqual(next().id,first.at(-1).id);
});
test('active runs from the old campaign require a restart without granting tickets',async()=>{
 const session=await start(),row=await db.one('SELECT snapshot FROM arcade_runs WHERE id=?',session.id),state=JSON.parse(row.snapshot);state.version=1;await db.run('UPDATE arcade_runs SET snapshot=? WHERE id=?',JSON.stringify(state),session.id);clock+=1000;const before=await progression.wallet(a.id);
 const result=await send(session,[{op:'step',ticks:1,input:{x:0,y:0,dodge:false}}]);assert.equal(result.status,409);assert.match(result.error,/campaña se actualizó/);assert.deepEqual(await progression.wallet(a.id),before);
});
