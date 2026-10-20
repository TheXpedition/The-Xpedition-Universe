import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from '../database.mjs';
const project=fileURLToPath(new URL('..',import.meta.url));
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-casting-http-'));
let child,base;
async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:project,windowsHide:true,env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:dataDir,DATABASE_URL:'',PERSISTENCE_MODE:'local'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{let output='',errors='';const timeout=setTimeout(()=>reject(new Error(errors||'Servidor no inició')),20000);child.stderr.on('data',b=>errors+=b);child.stdout.on('data',b=>{output+=b;const port=output.match(/localhost:(\d+)/)?.[1];if(port){base='http://127.0.0.1:'+port;clearTimeout(timeout);resolve();}});child.once('error',reject);});}
async function stop(){if(child&&!child.killed){child.kill();await new Promise(resolve=>child.once('exit',resolve));}}
after(stop);
async function request(client,path,method='GET',payload){const res=await fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',...(client?.cookie?{cookie:client.cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});if(client&&res.headers.has('set-cookie'))client.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,...await res.json()};}

test('el sitio sirve la sexta previa, el módulo y el casting real; tickets, acceso y elenco sobreviven al reinicio',async()=>{
 await start();
 const config=await fetch(base+'/casting-config.mjs');assert.equal(config.status,200);assert(config.headers.get('content-type').includes('javascript'));
 for(const suffix of ['','-mobile']){const response=await fetch(base+'/media/apocalypse-ii-preview'+suffix+'.mp4',{headers:{range:'bytes=0-131071'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),'video/mp4');const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.indexOf('moov')>0);assert(bytes.indexOf('moov')<bytes.indexOf('mdat'));}
 const c={},registration=await request(c,'/auth/register','POST',{name:'Casting HTTP QA',email:'casting-http@example.invalid',password:'SoloUnaPrueba-2026'});assert.equal(registration.status,201);
 const observer={},second=await request(observer,'/auth/register','POST',{name:'Casting HTTP Observer',email:'casting-observer@example.invalid',password:'SoloUnaPrueba-2026'});assert.equal(second.status,201);
 const db=await openDatabase(dataDir);await db.run('UPDATE user_progression SET tickets=800 WHERE user_id=?',registration.user.id);await db.close();
 const p='/casting/apocalypse-ii',purchase=await request(c,p+'/purchase','POST',{kind:'audition',acceptNoRefund:true});assert.equal(purchase.status,200);assert.equal(purchase.wallet.tickets,700);assert.equal(purchase.entry.started,0);
 assert.equal((await request(c,p+'/purchase','POST',{kind:'audition',acceptNoRefund:true})).wallet.tickets,700);
 const started=await request(c,p+'/start','POST',{});assert.equal(started.entry.state,'running');
 await request(c,p+'/answer','POST',{step:0,value:{played:false}});
 await request(c,p+'/answer','POST',{step:1,value:'Una respuesta privada que debe conservarse.',draft:true});
 assert.equal((await request(observer,p)).entry,null);assert.equal((await request(null,p)).entry,null);
 assert.equal((await request(observer,'/moderation/auditions')).status,403);
 const direct=await request(c,p+'/purchase','POST',{kind:'direct',acceptNoRefund:true});assert.equal(direct.status,200);assert.equal(direct.wallet.tickets,200);assert.equal(direct.entry.directSlot,1);
 const cast=(await request(null,p)).cast;assert.equal(cast[0].id,registration.user.id);assert.equal(cast[0].name,'Casting HTTP QA');assert(!JSON.stringify(cast).includes('privada'));
 await stop();await start();
 const restored=await request(c,p);assert.equal(restored.entry.state,'running');assert.equal(restored.entry.step,1);assert.equal(restored.entry.answers.why.value,'Una respuesta privada que debe conservarse.');assert.equal(restored.entry.directSlot,1);assert.equal(restored.entry.started,started.entry.started);assert.equal(restored.wallet.tickets,200);assert.equal(restored.cast.length,1);
});
