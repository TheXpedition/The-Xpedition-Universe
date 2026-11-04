import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {createWellness} from '../public/juegos/world-wellness.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';

// This launches a separate localhost server and uses fictional users only.
const root=path.resolve(import.meta.dirname,'..'),dir=fs.mkdtempSync(path.join(root,'review','.trade-network-'));
const staff='92354719-8816-4e25-9199-0dc9a99f7da1',a='trade-sender',b='trade-recipient',other='trade-observer',far='trade-distant';
const hash=value=>createHash('sha256').update(value).digest('hex');
let child,base,stderr='';const peers=[];
after(async()=>{for(const peer of peers)peer.socket.terminate();if(child&&child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});});
async function until(fn,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const result=fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Expected exchange state did not arrive. '+stderr.slice(-600));}
async function call(url,id=a,method='GET',input){const response=await fetch(base+url,{method,headers:{Cookie:'xp_world_session='+id,'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});return {status:response.status,...await response.json()};}
async function connect(id,zone='base'){await claimFixtureCharacter(base,id,{[staff]:'maria-villegas',[a]:'bruno',[b]:'guillermo',[other]:'roger',[far]:'joseserna'}[id]);return new Promise((resolve,reject)=>{const peer={socket:new WebSocket(base.replace('http:','ws:')+'/api/world/live?zone='+zone,{headers:{Origin:base,Cookie:'xp_world_session='+id}}),messages:[]};peers.push(peer);peer.socket.once('error',reject);peer.socket.on('message',raw=>{const value=JSON.parse(raw);peer.messages.push(value);if(value.type==='welcome')resolve(peer);});});}
const send=(peer,input)=>peer.socket.send(JSON.stringify(input));
const foodQuantity=(inventory,id)=>inventory.items.find(item=>item.foodId===id)?.quantity||0;
async function inventory(id){const result=await call('/api/world/inventory',id);assert.equal(result.status,200);return result;}
const denied=result=>assert([400,403,404,409].includes(result.status),JSON.stringify(result));

test('consensual exchanges remain private, conserve items, enforce capacity and close with distance or departure',async t=>{
 const db=await openDatabase(dir),map=WORLD_MAPS.base;
 for(const [id,offset]of [[a,0],[b,35],[other,75],[far,0],[staff,0]]){
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','',Date.now());
  await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',hash(id),id,Date.now()+3600000);
  await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',hash(id),hash(id),id,Date.now()+3600000);
  const zone=id===staff?'comunicaciones':'base',point=id===far?[map.width*.92,map.spawn[1]]:id===staff?WORLD_MAPS[zone].spawn:[map.spawn[0]+offset,map.spawn[1]];
  await db.run('INSERT INTO world_preferences(user_id,character_id,favorites,visited,last_zone,x,y,diary,updated) VALUES(?,?,?,?,?,?,?,?,?)',id,'dani','[]','[]',zone,...point,'',Date.now());
  await db.run('INSERT INTO world_wellness(user_id,state,updated) VALUES(?,?,?)',id,JSON.stringify(createWellness({medicines:id===a?{antiseptic:3}:id===b?{water:29}:{}})),Date.now());
 }
 await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,?,?,?)','world',1,staff,Date.now());
 for(const [userId,foodId,quantity]of [[a,'apple',2],[b,'banana',47]])await db.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,?,?)',userId,foodId,quantity,Date.now());
 await db.close();
 child=spawn(process.execPath,[path.join(root,'world-server.mjs')],{cwd:root,env:{...process.env,NODE_ENV:'test',PERSISTENCE_MODE:'local',DATABASE_URL:'',DATA_DIR:dir,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{let stdout='';const timer=setTimeout(()=>reject(Error('Exchange server startup: '+stderr)),15000);child.on('error',reject);child.stderr.on('data',data=>stderr+=data);child.stdout.on('data',data=>{stdout+=data;const match=stdout.match(/localhost:(\d+)/);if(match){base='http://127.0.0.1:'+match[1];clearTimeout(timer);resolve();}});});
 const [sender,recipient,observer,distant,director]=await Promise.all([connect(a),connect(b),connect(other),connect(far),connect(staff,'comunicaciones')]);
 let lastProposalAt=0;
 async function request(){const wait=4100-(Date.now()-lastProposalAt);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));const mark=recipient.messages.length;send(sender,{type:'trade-request',target:b});const message=await until(()=>recipient.messages.slice(mark).find(message=>message.type==='trade-request'));lastProposalAt=Date.now();assert.equal(message.request.from.id,a);assert(Number.isFinite(message.request.expiresAt));assert(message.request.expiresAt>Date.now()+25000&&message.request.expiresAt<=Date.now()+31000);return message.request;}
 async function accept(){const proposal=await request(),result=await call('/api/world/trade/accept',b,'POST',{requestId:proposal.id});assert.equal(result.status,200,JSON.stringify(result));const current=await call('/api/world/trade',a);assert.equal(current.status,200);assert(current.trade?.id);return current.trade.id;}
 const transfer=(id,tradeId,kind,itemId,quantity=1,extra={})=>call('/api/world/trade/transfer',id,'POST',{tradeId,kind,itemId,quantity,...extra});
 let tradeId;

 await t.test('a request needs two nearby distinct connected accounts and reveals no inventory',async()=>{
  assert.equal((await call('/api/world/trade')).trade,null);
  for(const target of [a,far,staff,'nonexistent-player']){const mark=sender.messages.length;send(sender,{type:'trade-request',target});await until(()=>sender.messages.slice(mark).some(message=>message.type==='error'));assert.equal((await call('/api/world/trade')).trade,null);}
  const proposal=await request();assert.equal(Object.hasOwn(proposal,'inventories'),false);assert.equal(Object.hasOwn(proposal,'food'),false);assert.equal(Object.hasOwn(proposal,'medicines'),false);
  assert.equal((await call('/api/world/trade',a)).trade,null);assert.equal((await call('/api/world/trade',b)).trade,null,'pending consent is not an open inventory session');
  denied(await call('/api/world/trade/accept',other,'POST',{requestId:proposal.id}));
  const declined=await call('/api/world/trade/decline',b,'POST',{requestId:proposal.id});assert.equal(declined.status,200);denied(await call('/api/world/trade/accept',b,'POST',{requestId:proposal.id}));
  assert.equal((await call('/api/world/trade')).trade,null);assert.equal(foodQuantity((await inventory(a)).inventory,'apple'),2);
 });

 await t.test('only accepted partners receive the two inventories, and third parties cannot use the session',async()=>{
  tradeId=await accept();
  for(const [id,peer,partner]of [[a,sender,b],[b,recipient,a]]){const current=await call('/api/world/trade',id);assert.equal(current.trade.selfId,id);assert.equal(current.trade.partner.id,partner);assert.deepEqual(current.trade.inventories.map(item=>item.userId).sort(),[a,b].sort());await until(()=>peer.messages.some(message=>message.type==='trade'&&message.trade.id===tradeId));}
  assert.equal((await call('/api/world/trade',other)).trade,null);
  denied(await transfer(other,tradeId,'food','apple'));
  denied(await call('/api/world/trade/close',other,'POST',{tradeId}));
  for(const peer of [observer,distant,director])assert(!peer.messages.some(message=>message.type==='trade'||message.type==='trade-request'),'unrelated clients do not receive private exchanges');
 });

 await t.test('food transfer uses the authenticated owner, preserves total units and prevents duplicate or over-capacity transfers',async()=>{
  // Forged sender and recipient IDs cannot turn an absent personal item into a withdrawal from the partner.
  denied(await transfer(a,tradeId,'food','banana',1,{senderId:b,from:b,recipientId:other,to:other}));
  assert.equal(foodQuantity((await inventory(b)).inventory,'banana'),47);
  for(const quantity of [0,-1,1.5,'1',49])denied(await transfer(a,tradeId,'food','apple',quantity));
  let result=await transfer(a,tradeId,'food','apple');assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(foodQuantity((await inventory(a)).inventory,'apple'),1);assert.equal(foodQuantity((await inventory(b)).inventory,'apple'),1);
  denied(await transfer(a,tradeId,'food','apple'));assert.equal(foodQuantity((await inventory(a)).inventory,'apple'),1,'full recipient rejects without consuming the sender item');
  result=await transfer(b,tradeId,'food','banana');assert.equal(result.status,200);
  const race=await Promise.all([transfer(a,tradeId,'food','apple'),transfer(a,tradeId,'food','apple')]);assert.equal(race.filter(value=>value.status===200).length,1,'only one request can consume the last apple');race.filter(value=>value.status!==200).forEach(denied);
  const left=await inventory(a),right=await inventory(b);assert.equal(foodQuantity(left.inventory,'apple')+foodQuantity(right.inventory,'apple'),2);assert.equal(foodQuantity(left.inventory,'banana')+foodQuantity(right.inventory,'banana'),47);assert.equal(right.inventory.items.reduce((total,item)=>total+item.quantity,0),48);
  // Extra IDs are ignored: the item can go only to the established partner.
  assert.equal((await transfer(a,tradeId,'food','banana',1,{recipientId:other,to:other})).status,409,'partner inventory is full regardless of a forged destination');
  assert.equal((await inventory(other)).inventory.items.length,0);
 });

 await t.test('medical transfers enforce the personal thirty-unit limit without duplicating supplies',async()=>{
  const first=await transfer(a,tradeId,'medicine','antiseptic');assert.equal(first.status,200,JSON.stringify(first));
  let left=await inventory(a),right=await inventory(b);assert.equal(left.body.medicines.antiseptic,2);assert.equal(right.body.medicines.antiseptic,1);assert.equal(right.body.medicines.water,29);
  denied(await transfer(a,tradeId,'medicine','antiseptic'));assert.equal((await inventory(a)).body.medicines.antiseptic,2);
  assert.equal((await transfer(b,tradeId,'medicine','water')).status,200);
  denied(await transfer(a,tradeId,'medicine','antiseptic',2));
  denied(await transfer(a,tradeId,'medicine','not-a-treatment'));denied(await transfer(a,tradeId,'currency','tickets'));
  assert.equal((await transfer(a,tradeId,'medicine','antiseptic')).status,200);
  [left,right]=await Promise.all([inventory(a),inventory(b)]);assert.equal(left.body.medicines.antiseptic+right.body.medicines.antiseptic,3);assert.equal(left.body.medicines.water+right.body.medicines.water,29);assert.equal(Object.values(right.body.medicines).reduce((sum,n)=>sum+n,0),30);
 });

 await t.test('closing or leaving the zone revokes inventory access and late transfers',async()=>{
  assert.equal((await call('/api/world/trade/close',b,'POST',{tradeId})).status,200);
  await until(()=>sender.messages.some(message=>message.type==='trade-closed'));assert.equal((await call('/api/world/trade')).trade,null);denied(await transfer(a,tradeId,'medicine','antiseptic'));
  tradeId=await accept();const mark=sender.messages.length;send(director,{type:'teleport',target:b,zone:'hospital'});
  await until(()=>sender.messages.slice(mark).some(message=>message.type==='trade-closed'));assert.equal((await call('/api/world/trade')).trade,null);assert.equal((await call('/api/world/trade',b)).trade,null);denied(await transfer(a,tradeId,'medicine','antiseptic'));
  assert.equal((await inventory(other)).inventory.items.length,0);
 });

 await t.test('disconnecting a partner closes the exchange and preserves completed transfers',async()=>{
  let mark=recipient.messages.length;send(director,{type:'teleport',target:b,zone:'base'});await until(()=>recipient.messages.slice(mark).some(message=>message.type==='zone'&&message.zone==='base'));
  tradeId=await accept();mark=sender.messages.length;recipient.socket.terminate();await until(()=>sender.messages.slice(mark).some(message=>message.type==='trade-closed'));assert.equal((await call('/api/world/trade')).trade,null);denied(await transfer(a,tradeId,'food','banana'));
  const replacement=await connect(b);const welcome=replacement.messages.find(message=>message.type==='welcome');assert.equal(welcome.body.medicines.antiseptic,2);assert.equal(welcome.body.medicines.water,28);assert.equal(foodQuantity((await inventory(b)).inventory,'apple'),2);
 });
});
