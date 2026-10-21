import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
const cwd=new URL('..',import.meta.url),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-cache-'));
let child;after(async()=>{if(child&&!child.killed){child.kill();await new Promise(resolve=>child.once('exit',resolve));}});
test('recargar recursos públicos devuelve 304 sin bytes; rangos y archivos privados conservan sus controles',async()=>{
 child=spawn(process.execPath,['server.mjs'],{cwd,windowsHide:true,env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:dir,DATABASE_URL:'',PERSISTENCE_MODE:'local'},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{let out='',errors='';const timer=setTimeout(()=>reject(Error(errors||'El servidor no inició')),20000);child.stderr.on('data',b=>errors+=b);child.stdout.on('data',b=>{out+=b;const port=out.match(/localhost:(\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});child.once('error',reject);});
 const first=await fetch(base+'/showdown/simulator.js');assert.equal(first.status,200);const etag=first.headers.get('etag');assert(etag);assert((await first.text()).length>1000);
 const fresh=await fetch(base+'/showdown/simulator.js',{headers:{'if-none-match':etag}});assert.equal(fresh.status,304);assert.equal((await fresh.arrayBuffer()).byteLength,0);
 const range=await fetch(base+'/media/japan-preview-mobile.mp4',{headers:{range:'bytes=0-31'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,32);
 const denied=await fetch(base+'/showdown/solo/',{headers:{'if-none-match':'*'}});assert.equal(denied.status,403);assert(!denied.headers.has('etag'));
});
