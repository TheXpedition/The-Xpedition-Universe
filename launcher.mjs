import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const url='http://localhost:3000';
if(Number(process.versions.node.split('.')[0])<24){console.error('Instala Node.js 24 LTS desde https://nodejs.org/ y vuelve a abrir este archivo.');process.exit(1);}
if(!fs.existsSync(path.join(dir,'node_modules','sharp','package.json'))||!fs.existsSync(path.join(dir,'node_modules','@tensorflow','tfjs-backend-wasm','package.json'))){
  console.log('Preparando las herramientas para publicar imágenes. Esto solo se hace la primera vez.');
  const npmPath=path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
  const install=fs.existsSync(npmPath)?spawn(process.execPath,[npmPath,'ci','--omit=dev'],{cwd:dir,windowsHide:true,stdio:'inherit'}):spawn('cmd.exe',['/d','/s','/c','npm ci --omit=dev'],{cwd:dir,windowsHide:true,stdio:'inherit'});
  const status=await new Promise(resolve=>{install.once('error',()=>resolve(1));install.once('exit',resolve);});
  if(status!==0){console.error('No se pudieron preparar las imágenes. Revisa tu conexión y vuelve a abrir la página.');process.exit(1);}
}
async function healthy(){try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});const v=await r.json();return v.ok&&String(v.version).startsWith('2.');}catch{return false;}}
if(!await healthy()){
  fs.mkdirSync(path.join(dir,'data'),{recursive:true});
  const log=fs.openSync(path.join(dir,'data','servidor.log'),'a');
  const server=spawn(process.execPath,[path.join(dir,'server.mjs')],{cwd:dir,detached:true,windowsHide:true,stdio:['ignore',log,log],env:{...process.env,PORT:'3000',HOST:'127.0.0.1'}});server.unref();
  fs.writeFileSync(path.join(dir,'data','servidor.pid'),String(server.pid));
  let ready=false;for(let i=0;i<30;i++){if(await healthy()){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,300));}
  if(!ready){console.error('No se pudo iniciar el servidor. Revisa data/servidor.log. Puede que otro programa esté usando el puerto 3000.');process.exit(1);}
}
console.log('The Xpedition ya esta funcionando en '+url);
spawn('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://localhost:3000'"],{windowsHide:true,stdio:'ignore'}).unref();
