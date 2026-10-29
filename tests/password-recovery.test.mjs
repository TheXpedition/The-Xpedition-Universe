import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {openDatabase} from '../database.mjs';
import {JSDOM} from 'jsdom';

const data=fs.mkdtempSync(path.join(os.tmpdir(),'xp-password-recovery-')),accounts=new Map(),deliveries=[],calls=[];
let child,base,emulator,sequence=0;
before(async()=>{
 emulator=http.createServer(async(req,res)=>{
  const parts=[];for await(const part of req)parts.push(part);const input=JSON.parse(Buffer.concat(parts).toString()||'{}');
  const action=new URL(req.url,'http://localhost').pathname.split(':').at(-1);calls.push({action,input});
  let result,status=200,account=accounts.get(input.email);
  if(action==='signUp'){
   if(account){status=400;result={error:{message:'EMAIL_EXISTS'}};}
   else{account={email:input.email,password:input.password,localId:'firebase-'+accounts.size,emailVerified:false};accounts.set(input.email,account);result={localId:account.localId};}
  }else if(action==='sendOobCode'){
   if(account){deliveries.push({email:input.email,requestType:input.requestType,locale:req.headers['x-firebase-locale']});result={email:input.email};}
   else{status=400;result={error:{message:'EMAIL_NOT_FOUND'}};}
  }else if(action==='signInWithPassword'){
   if(account&&account.password===input.password)result={idToken:account.localId};else{status=400;result={error:{message:'INVALID_LOGIN_CREDENTIALS'}};}
  }else if(action==='lookup'){
   account=[...accounts.values()].find(account=>account.localId===input.idToken);result={users:account?[{...account,email:account.lookupEmail||account.email,localId:account.lookupId||account.localId}]:[]};
  }else{status=400;result={error:{message:'UNEXPECTED_OPERATION'}};}
  res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
 });
 await new Promise(resolve=>emulator.listen(0,'127.0.0.1',resolve));
 child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),windowsHide:true,env:{...process.env,NODE_ENV:'test',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:'+emulator.address().port,FIREBASE_API_KEY:'test-key',DATA_DIR:data,DATABASE_URL:'',PERSISTENCE_MODE:'local',PORT:'0',HOST:'127.0.0.1',TRUST_PROXY:'true'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'No inició el servidor')),20000);child.stderr.on('data',chunk=>errors+=chunk);child.stdout.on('data',chunk=>{output+=chunk;const port=output.match(/localhost:(\d+)/)?.[1];if(port&&!base){base='http://127.0.0.1:'+port;clearTimeout(timer);resolve();}});child.once('error',reject);});
});
after(async()=>{if(child&&!child.killed){const old=child;await new Promise(resolve=>{old.once('exit',resolve);old.kill();});}if(emulator)await new Promise(resolve=>emulator.close(resolve));});
function client(){return {cookie:'',ip:'127.1.0.'+(++sequence)};}
async function request(actor,route,method='GET',payload){
 const response=await fetch(base+'/api'+route,{method,headers:{'content-type':'application/json','x-forwarded-for':actor.ip,...(actor.cookie?{cookie:actor.cookie}:{})},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
 if(response.headers.has('set-cookie'))actor.cookie=response.headers.get('set-cookie').split(';')[0];
 return {status:response.status,...await response.json()};
}
async function register(email){const actor=client(),result=await request(actor,'/auth/register','POST',{name:'Recuperación '+sequence,email,password:'AnteriorSegura-2026'});assert.equal(result.status,201);actor.user=result.user;return actor;}
const forgot=(actor,email)=>request(actor,'/auth/forgot-password','POST',{email});

test('una cuenta local recibe un solo correo en español y vuelve a entrar con la clave recuperada conservando su ID y cerrando otras sesiones',async()=>{
 const actor=await register('recuperar@example.invalid'),email=actor.user.email,oldSession=client();oldSession.cookie=actor.cookie;
 const sent=await forgot(actor,email.toUpperCase());assert.equal(sent.status,200);assert.equal(sent.ok,true);
 assert.deepEqual(deliveries.filter(item=>item.email===email),[{email,requestType:'PASSWORD_RESET',locale:'es'}]);
 assert.notEqual(accounts.get(email).password,'AnteriorSegura-2026','no se envía la contraseña local a Firebase');
 const repeated=await Promise.all([forgot(actor,email),forgot(actor,email),forgot(actor,email)]);assert(repeated.every(result=>result.status===200));assert.equal(deliveries.filter(item=>item.email===email).length,1);
 accounts.get(email).password='RecuperadaSegura-2026';accounts.get(email).emailVerified=true;
 const recovered=client(),login=await request(recovered,'/auth/login','POST',{login:actor.user.name,password:'RecuperadaSegura-2026'});
 assert.equal(login.status,200);assert.equal(login.user.id,actor.user.id);assert.equal(login.user.avatar,actor.user.avatar);
 assert.equal((await request(oldSession,'/me')).user,null);
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'AnteriorSegura-2026'})).status,401);
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'RecuperadaSegura-2026'})).status,200);
 const db=await openDatabase(data);try{assert.equal(await db.one('SELECT * FROM password_recovery_requests WHERE user_id=?',actor.user.id),undefined);}finally{await db.close();}
});

test('un Firebase sin correo verificado o con otro correo no puede reemplazar la contraseña local',async()=>{
 const actor=await register('protegida@example.invalid'),email=actor.user.email;
 accounts.set(email,{email,password:'ContraseñaAjena-2026',localId:'preexisting',emailVerified:false});
 assert.equal((await forgot(actor,email)).status,200);
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'ContraseñaAjena-2026'})).status,401);
 accounts.get(email).emailVerified=true;accounts.get(email).lookupEmail='otra@example.invalid';
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'ContraseñaAjena-2026'})).status,401);
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'AnteriorSegura-2026'})).status,200);
});

test('el formulario no revela si existe el correo y rechaza direcciones inválidas',async()=>{
 const actor=await register('privacidad@example.invalid'),known=await forgot(actor,actor.user.email),unknown=await forgot(client(),'desconocida@example.invalid');
 assert.deepEqual(unknown,known);assert.equal(accounts.has('desconocida@example.invalid'),false);
 assert.equal((await forgot(client(),'correo-inválido')).status,400);
 assert(!JSON.stringify(known).includes(actor.user.email));
});

test('una recuperación vencida no altera la contraseña ni la sesión existente',async()=>{
 const actor=await register('vencida@example.invalid'),email=actor.user.email;await forgot(actor,email);
 accounts.get(email).password='CaducadaSegura-2026';accounts.get(email).emailVerified=true;
 const db=await openDatabase(data);try{await db.run('UPDATE password_recovery_requests SET requested=? WHERE user_id=?',Date.now()-2*86400000,actor.user.id);}finally{await db.close();}
 assert.equal((await request(client(),'/auth/login','POST',{login:email,password:'CaducadaSegura-2026'})).status,401);
 assert.equal((await request(actor,'/me')).user.id,actor.user.id);
});

test('el botón de inicio de sesión abre el formulario, pide el correo y envía la recuperación sin exigir contraseña',async()=>{
 const dom=new JSDOM('<div id="modalContent"></div>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window;
 try{
  w.state={publicOnly:false,catalog:{characters:[]},firebase:null};w.$=selector=>w.document.querySelector(selector);w.$$=selector=>[...w.document.querySelectorAll(selector)];w.icon=()=>'';w.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;');w.modal=html=>{w.document.querySelector('#modalContent').innerHTML=html;};w.submitAuth=()=>{};
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  w.eval(app.slice(app.indexOf('function field('),app.indexOf('async function submitAuth(')));
  w.eval(fs.readFileSync(new URL('../public/password-recovery.js',import.meta.url),'utf8'));
  let payload;w.api=async(route,options)=>{assert.equal(route,'/auth/forgot-password');payload=options.body;return {ok:true,message:'Revisa tu correo y spam.'};};
  w.openAuth('login');const button=w.document.querySelector('[data-action="forgot-password"]');assert(button);assert.equal(button.type,'button');
  w.document.querySelector('#authLogin').value='persona@example.invalid';button.click();
  const field=w.document.querySelector('#recoveryEmail');assert.equal(field.type,'email');assert.equal(field.value,'persona@example.invalid');assert.equal(w.document.querySelector('input[type="password"]'),null);
  w.document.querySelector('#passwordRecoveryForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(payload.email,'persona@example.invalid');assert.match(w.document.body.textContent,/Revisa tu correo/);
  w.openAuth('register');assert.equal(w.document.querySelector('[data-action="forgot-password"]'),null);
 }finally{w.close();}
});
