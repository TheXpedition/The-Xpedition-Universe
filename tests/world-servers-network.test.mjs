import vm from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';import {WebSocket} from 'ws';
import {openDatabase} from '../database.mjs';import {serverDatabase} from '../world-server-store.mjs';
import {seedOwnedFixtureCharacters} from './helpers/world-owned-fixtures.mjs';
const STAFF='92354719-8816-4e25-9199-0dc9a99f7da1',root=path.resolve(import.meta.dirname,'..'),hash=value=>createHash('sha256').update(value).digest('hex');

test('STAFF creates isolated servers; profile-style player competes with bots; outsiders cannot enter and the site stays healthy',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'world-room-live-')),db=await openDatabase(dir),peers=[];let child,base,errors='';
 const until=async(fn,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,30));}throw Error('Room test timeout: '+errors.slice(-2000));};
 try{
  for(const id of [STAFF,'girl','outsider']){await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani',Date.now());await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',hash(id),id,Date.now()+3600000);}
  await db.run('INSERT INTO apocalypse_cast(user_id,style_override,updated) VALUES(?,1,1)','girl');await db.run('INSERT INTO user_progression(user_id,coins,tickets,xp) VALUES(?,999,55,10)','girl');await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,0,0,0,?,1)','girl','welcome','Test account already welcomed');
  await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,1,?,?)','world',STAFF,Date.now());
  child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:'0',WORLD_URL:'',WORLD_EMBEDDED:'true',PERSISTENCE_MODE:'local',DATABASE_URL:'',DATA_DIR:dir},stdio:['ignore','pipe','pipe'],windowsHide:true});let output='';child.stderr.on('data',data=>errors+=data);child.stdout.on('data',data=>{output+=data;const match=/The Xpedition · http:\/\/localhost:(\d+)/.exec(output);if(match)base='http://127.0.0.1:'+match[1];});await until(()=>base);
  const main=async(url,id=STAFF,method='GET',body)=>{const response=await fetch(base+url,{method,headers:{Cookie:'xp_session='+id,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,...await response.json()};};
  await until(async()=>(await main('/api/world/access')).configured);
  assert.equal((await main('/api/world/servers','outsider')).status,403);assert.equal((await main('/api/world/servers','girl','POST',{name:'No autorizado'})).status,403);
  const first=await main('/api/world/servers',STAFF,'POST',{name:'Una participante y bots'}),second=await main('/api/world/servers',STAFF,'POST',{name:'Otra temporada'});assert.equal(first.status,201);assert.equal(second.status,201);const a=first.server.id,b=second.server.id;assert.notEqual(a,b);
  async function enter(id,server){const launch=await fetch(base+'/juegos/?server='+server,{headers:{Cookie:'xp_session='+id},redirect:'manual'});assert.equal(launch.status,302);const target=new URL(launch.headers.get('location'));assert(target.pathname.includes('/world-play/servers/'+server+'/auth'));const prefix=base+'/world-play/servers/'+server,ticket=new URLSearchParams(target.hash.slice(1)).get('ticket');const response=await fetch(prefix+'/api/world/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket})});assert.equal(response.status,200,await response.clone().text());return {prefix,cookie:response.headers.get('set-cookie').split(';')[0]};}
  const girlA=await enter('girl',a),girlB=await enter('girl',b),staffA=await enter(STAFF,a),staffB=await enter(STAFF,b);
  const call=async(actor,url,method='GET',body)=>{const response=await fetch(actor.prefix+url,{method,headers:{Cookie:actor.cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,...await response.json()};};
  async function browserClient(actor){
   for(const asset of ['/world-landscape.mjs','/world-landscape.css','/juegos/game-chrome.mjs']){const page=await fetch(actor.prefix+asset,{headers:{Cookie:actor.cookie}});assert.equal(page.status,200,asset+' must load inside the selected server');}
   const response=await fetch(actor.prefix+'/juegos/world-ui.mjs',{headers:{Cookie:actor.cookie}});assert.equal(response.status,200);
   const source=await response.text(),apiSource=source.split('\n').find(line=>line.startsWith('async function api(url,'));
   assert(apiSource,'Actual browser API helper must be served');
   const browserFetch=(url,options)=>fetch(new URL(url,base),{...options,headers:{...options?.headers,Cookie:actor.cookie}});
   const api=vm.runInNewContext('('+apiSource+')',{fetch:browserFetch,JSON,Error});
   const socketExpression=source.match(/const ws=new WebSocket\((.*?)\);state.socket/)[1];
   const socketURL=vm.runInNewContext(socketExpression,{location:new URL(base),state:{zone:'base'},encodeURIComponent});
   return {api,socketURL};
  }
  const cold=await main('/api/world/servers',STAFF,'POST',{name:'Media without a simulation'}),coldPrefix=base+'/world-play/servers/'+cold.server.id;
  const mediaPath='/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4';
  assert.equal(await db.one('SELECT owner FROM world_server_leases WHERE server_id=?',cold.server.id),undefined);
  for(const asset of ['/juegos/','/juegos/world-ui.mjs','/juegos/x-protocol/','/juegos/x-protocol/assets.json','/juegos/last-grip/','/juegos/bonju-chef/','/world-landscape.mjs']){
   const response=await fetch(coldPrefix+asset,{headers:{Cookie:girlA.cookie}});assert.equal(response.status,200,asset);const source=await response.text();
   if(asset==='/juegos/world-ui.mjs')assert(source.includes('/world-play/servers/'+cold.server.id+'/api/world/live'),'static JS keeps its server-scoped socket');
   const tag=response.headers.get('etag');assert(tag);const fresh=await fetch(coldPrefix+asset,{headers:{Cookie:girlA.cookie,'If-None-Match':tag}});assert.equal(fresh.status,304,asset);
  }
  assert.equal(await db.one('SELECT owner FROM world_server_leases WHERE server_id=?',cold.server.id),undefined,'HTML and all art load without starting a simulation or reserving an active room');
  assert.equal((await fetch(coldPrefix+'/juegos/x-protocol/')).status,401,'a cached asset grant cannot authorize another account');
  assert.equal((await fetch(coldPrefix+'/api/world/session')).status,405);
  const crossSite=await fetch(coldPrefix+'/api/world/session',{method:'POST',headers:{Origin:'https://another.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(crossSite.status,403);
  assert.equal((await fetch(coldPrefix+'/performance.nonexistent')).status,404);
  assert.equal(await db.one('SELECT owner FROM world_server_leases WHERE server_id=?',cold.server.id),undefined,'invalid unauthenticated bootstrap requests never allocate a simulation');
  const video=await fetch(coldPrefix+mediaPath,{headers:{Cookie:girlA.cookie,Range:'bytes=0-31'}});assert.equal(video.status,206);assert.equal(video.headers.get('content-type'),'video/mp4');assert.equal((await video.arrayBuffer()).byteLength,32);
  const videoHead=await fetch(coldPrefix+mediaPath,{method:'HEAD',headers:{Cookie:girlA.cookie}});assert.equal(videoHead.status,200);assert.equal(Number(videoHead.headers.get('content-length')),10015270);
  assert.equal(await db.one('SELECT owner FROM world_server_leases WHERE server_id=?',cold.server.id),undefined,'streaming the intro must not allocate or restart a game worker');
  assert.equal((await fetch(coldPrefix+mediaPath)).status,401);
  for(const actor of [girlA,girlB,staffA,staffB])actor.browser=await browserClient(actor);
  for(const roomId of [a,b])await seedOwnedFixtureCharacters(await serverDatabase(db,roomId),[{id:'girl',character:'bruno'}]);
  for(const actor of [girlA,girlB]){const boot=await call(actor,'/api/world/bootstrap');assert.equal(boot.status,200);assert.equal(boot.intro.seen,false);assert.equal(boot.user.wallet.coins,999);assert.equal(boot.shop.wallet.coins,999);assert.equal(boot.shop.wallet.tickets,55);assert(!boot.shop.inventory.some(item=>item.ref==='maria-villegas'));assert.equal(boot.participation.role,'participant');assert.equal((await actor.browser.api('/world/preferences',{characterId:'bruno'},'PUT')).profile.characterId,'bruno');}
  for(const actor of [staffA,staffB]){const boot=await call(actor,'/api/world/bootstrap');assert.equal(boot.shop.inventory.filter(item=>item.ref==='maria-villegas').length,1);assert(!boot.shop.catalog.characters.some(item=>item.id==='maria-villegas'));assert.equal(boot.characterAvailability.characters['maria-villegas'].selectable,true);assert.equal((await actor.browser.api('/world/preferences',{characterId:'maria-villegas'},'PUT')).profile.characterId,'maria-villegas');}
  const aDb=await serverDatabase(db,a),bDb=await serverDatabase(db,b);await aDb.run('INSERT INTO world_food_inventory(user_id,food_id,quantity,updated) VALUES(?,?,2,1)','girl','apple');assert.equal(await bDb.one('SELECT quantity FROM world_food_inventory WHERE user_id=?','girl'),undefined);assert.equal((await db.one('SELECT coins FROM user_progression WHERE user_id=?','girl')).coins,999);
  const purchases=await Promise.all([call(girlA,'/api/world/shop/buy','POST',{kind:'character',ref:'ivy',requestId:'shared-wallet-first'}),call(girlB,'/api/world/shop/buy','POST',{kind:'character',ref:'peggy',requestId:'shared-wallet-second'})]);
  assert.equal(purchases.filter(result=>result.status===200).length,1,JSON.stringify(purchases.map(({status,error})=>({status,error})))+' '+errors);assert.equal(purchases.filter(result=>result.status===409).length,1,JSON.stringify(purchases.map(({status,error})=>({status,error})))+' '+errors);
  for(const actor of [girlA,girlB]){const snapshot=await call(actor,'/api/world/shop');assert.equal(snapshot.shop.wallet.coins,499);assert.equal(snapshot.shop.wallet.tickets,55);}
  assert.equal((await main('/api/economy','girl')).wallet.coins,499);
  const winnerRoom=purchases[0].status===200?girlA:girlB,otherRoom=winnerRoom===girlA?girlB:girlA;
  assert((await call(winnerRoom,'/api/world/shop')).shop.inventory.some(item=>item.ref===(winnerRoom===girlA?'ivy':'peggy')));
  assert(!(await call(otherRoom,'/api/world/shop')).shop.inventory.some(item=>item.ref===(winnerRoom===girlA?'ivy':'peggy')));
  async function connect(actor){const messages=[],socket=new WebSocket(actor.browser.socketURL,{headers:{Origin:base,Cookie:actor.cookie}}),peer={socket,messages};peers.push(peer);socket.on('message',raw=>messages.push(JSON.parse(raw)));await until(()=>messages.some(m=>m.type==='welcome'));return peer;}
  const ga=await connect(girlA),gb=await connect(girlB),sa=await connect(staffA),sb=await connect(staffB),send=(peer,data)=>peer.socket.send(JSON.stringify(data));
  for(const peer of [sa,sb])send(peer,{type:'protocol-subscribe'});send(sa,{type:'protocol-action',action:{type:'open'}});await until(()=>sa.messages.some(m=>m.type==='protocol-state'&&m.episode.phase==='LOBBY'));assert(!sb.messages.some(m=>m.type==='protocol-state'&&m.episode.phase==='LOBBY'));
  send(sa,{type:'protocol-action',action:{type:'start'}});const protocol=await until(()=>sa.messages.find(m=>m.type==='protocol-state'&&m.episode.phase==='ELIMINATION_LOADING'));assert.equal(protocol.episode.roster.filter(p=>p.bot).length,17);assert.equal(protocol.episode.roster.find(p=>!p.bot)?.id,'girl');const invite=await until(()=>ga.messages.find(m=>m.type==='protocol-start'));assert.equal(invite.url,'/world-play/servers/'+a+'/juegos/x-protocol/');assert(!gb.messages.some(m=>m.type==='protocol-start'));
  send(sb,{type:'grip-subscribe'});send(gb,{type:'grip-subscribe'});send(sb,{type:'grip-action',action:{type:'open'}});await until(()=>sb.messages.some(m=>m.type==='grip-state'&&m.episode.phase==='lobby'));send(gb,{type:'grip-action',action:{type:'join'}});await until(()=>gb.messages.some(m=>m.type==='grip-state'&&m.episode.roster.some(p=>p.id==='girl')));send(gb,{type:'grip-action',action:{type:'ready',ready:true}});await until(()=>gb.messages.some(m=>m.type==='grip-state'&&m.episode.roster.find(p=>p.id==='girl')?.ready));send(sb,{type:'grip-action',action:{type:'start'}});const grip=await until(()=>sb.messages.find(m=>m.type==='grip-state'&&['opening','arrival'].includes(m.episode.phase)));assert.equal(grip.episode.roster.filter(p=>p.bot).length,17);assert.equal(grip.episode.roster.filter(p=>!p.bot).length,1);
  if(process.env.WORLD_SOAK==='1'){const untilAt=Date.now()+60000;while(Date.now()<untilAt){await new Promise(r=>setTimeout(r,5000));assert.equal((await main('/api/health')).ok,true);for(const p of [ga,gb,sa,sb])assert.equal(p.socket.readyState,WebSocket.OPEN,'live users stay connected across worker lease renewals');}}
  assert.equal((await main('/api/health')).ok,true);const outsider=await fetch(girlA.prefix+'/api/world/bootstrap',{headers:{Cookie:'xp_session=outsider'}});assert.equal(outsider.status,401);
 }finally{for(const peer of peers)peer.socket.terminate();if(child&&child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});await db.close();assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
