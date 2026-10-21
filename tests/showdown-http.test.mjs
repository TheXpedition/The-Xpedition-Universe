import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../database.mjs';
const project=fileURLToPath(new URL('..',import.meta.url)),dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-showdown-http-'));let child,base;
async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:project,windowsHide:true,env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:dataDir,DATABASE_URL:'',PERSISTENCE_MODE:'local'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{let errors='';const timeout=setTimeout(()=>reject(new Error(errors||'No inició el servidor')),20000);child.stderr.on('data',b=>errors+=b);child.stdout.on('data',b=>{const port=String(b).match(/localhost:(\d+)/)?.[1];if(port){base='http://127.0.0.1:'+port;clearTimeout(timeout);resolve();}});child.once('error',reject);});}
async function stop(){if(child&&!child.killed){child.kill();await new Promise(resolve=>child.once('exit',resolve));}}
after(stop);
async function request(client,path,method='GET',payload){const res=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',...(client?.cookie?{cookie:client.cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});if(client&&res.headers.has('set-cookie'))client.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,...await res.json()};}
test('el simulador real integra compra por usuario, invitación por mensaje, bots, chat y recuperación persistente',async()=>{
 await start();for(const asset of ['/showdown/config.mjs','/showdown/stage.js','/showdown/simulator.js','/showdown/simulator.css','/showdown/art/bonju.webp']){const r=await fetch(base+asset);assert.equal(r.status,200);if(asset.endsWith('.mjs'))assert(r.headers.get('content-type').includes('javascript'));}
 const host={},friend={},outsider={};for(const [i,c]of [host,friend,outsider].entries()){const result=await request(c,'/auth/register','POST',{name:'Showdown HTTP '+i,email:'showdown-http-'+i+'@example.invalid',password:'PruebaLocal-2026'});assert.equal(result.status,201);c.id=result.user.id;}
 const db=await openDatabase(dataDir);for(const c of [host,friend])await db.run('UPDATE user_progression SET coins=1200 WHERE user_id=?',c.id);await db.close();
 assert.equal((await request(host,'/economy/buy','POST',{item:'mode:showdown'})).wallet.coins,200);const created=await request(host,'/showdown/rooms','POST',{mode:'multi',format:3});assert.equal(created.status,201);const id=created.room.id,token=created.room.shareUrl.split('/').at(-1),p='/showdown/rooms/'+id;
 assert.equal((await request(host,'/game-runs','POST',{mode:'showdown'})).status,409);assert.equal((await request(host,p+'/invite','POST',{userId:friend.id})).status,200);const conversations=await request(friend,'/conversations'),messages=await request(friend,'/conversations/'+conversations.conversations[0].id+'/messages');const invite=messages.messages.find(m=>m.type==='showdown-invite');assert.equal(invite.showdownInvite.room,id);assert.equal(invite.showdownInvite.token,token);
 assert.equal((await request(friend,p+'/join','POST',{token})).status,403);assert.equal((await request(friend,'/economy/buy','POST',{item:'mode:showdown'})).wallet.coins,200);assert.equal((await request(friend,p+'/join','POST',{token})).status,200);assert.equal((await request(outsider,p)).status,403);assert.equal((await request(null,p)).status,401);
 const data=await request(host,'/showdown'),chars=data.ownedCharacters;assert.equal((await request(host,p+'/character','POST',{character:chars[0]})).status,200);assert.equal((await request(friend,p+'/character','POST',{character:chars[1]})).status,200);assert.equal((await request(host,p+'/start','POST',{fillBots:false})).status,409);const started=await request(host,p+'/start','POST',{fillBots:true});assert.equal(started.room.phase,'challenge');assert.equal(started.room.players.length,6);assert.equal(started.room.track,null);
 const chat=await request(friend,p+'/chat','POST',{text:'¡Nos vemos en el escenario!'});assert.equal(chat.messages[0].name,'Showdown HTTP 1');assert.equal((await request(host,p+'/action','POST',{type:'pause'})).status,403);
 const snapshot=started.room;await stop();await start();const restored=(await request(host,p)).room;assert.deepEqual(restored.players.map(p=>p.character.id),snapshot.players.map(p=>p.character.id));assert.equal(restored.phaseNumber,snapshot.phaseNumber);assert.equal((await request(host,p+'/chat')).messages[0].text,'¡Nos vemos en el escenario!');assert.equal((await request(friend,'/showdown')).wallet.coins,200);
});
