import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=path.resolve(process.env.TEST_DATA_DIR||path.join(root,'work','test-'+randomUUID()));
fs.mkdirSync(data,{recursive:true});
let child,base,alice,bob,outsider,chat,message,imageId,group,keptImage,keptAudio,starts=0;
async function start(){
  if(process.env.TEST_DATABASE_URL&&!['127.0.0.1','localhost'].includes(new URL(process.env.TEST_DATABASE_URL).hostname))throw new Error('Las pruebas solo admiten PostgreSQL local y aislado.');
  const instanceDir=process.env.TEST_DATABASE_URL?path.join(data,'instance-'+starts++):data;
  child=spawn(process.execPath,[path.join(root,'server.mjs')],{env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL||'',PERSISTENCE_MODE:process.env.TEST_DATABASE_URL?'supabase':'local',PORT:'0',HOST:'127.0.0.1',DATA_DIR:instanceDir},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(new Error('Servidor no inició: '+errors)),20000);child.stderr.on('data',chunk=>{errors+=chunk;});child.stdout.on('data',chunk=>{output+=chunk;if(output.match(/localhost:(\d+)/)){base='http://127.0.0.1:'+output.match(/localhost:(\d+)/)[1];clearTimeout(timer);resolve();}});child.on('error',reject);child.once('exit',code=>{if(!base){clearTimeout(timer);reject(new Error('Servidor terminó: '+code+' '+errors));}});});
}
async function stop(){const old=child;if(old&&!old.killed){old.kill();await new Promise(resolve=>old.once('exit',resolve));}}
const client=()=>({cookie:'',user:null});
async function request(c,p,method='GET',body){const response=await fetch(base+'/api'+p,{method,headers:{'Content-Type':'application/json',...(c?.cookie?{cookie:c.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(response.headers.has('set-cookie')&&c)c.cookie=response.headers.get('set-cookie').split(';')[0];const value=await response.json();return {status:response.status,...value};}
before(start);after(stop);
test('registro, sesión, privacidad y contraseñas',async()=>{
  alice=client();bob=client();outsider=client();
  for(const[c,name]of[[alice,'QA Alice'],[bob,'QA Bob'],[outsider,'QA Carol']]){const result=await request(c,'/auth/register','POST',{name,email:name.replace(' ','').toLowerCase()+'@example.invalid',password:'UnaClaveDePrueba-123'});assert.equal(result.status,201);c.user=result.user;}
  assert.equal((await request(null,'/conversations')).status,401);
  assert.equal((await request(client(),'/auth/login','POST',{login:'QA Alice',password:'incorrecta'})).status,401);
  const login=await request(client(),'/auth/login','POST',{login:'qa alice',password:'UnaClaveDePrueba-123'});assert.equal(login.user.id,alice.user.id);
  const profiles=await request(null,'/profiles');assert(profiles.profiles.length>=119);assert(!JSON.stringify(profiles).includes('@example.invalid'));assert(!JSON.stringify(profiles).includes('password'));
  if(!process.env.TEST_DATABASE_URL){const db=await fs.promises.readFile(path.join(data,'xpedition.sqlite-wal'));assert(!db.includes(Buffer.from('UnaClaveDePrueba-123')));}
  assert.equal((await request(client(),'/auth/register','POST',{name:'QA Alice',email:'new@example.invalid',password:'UnaClaveDePrueba-123'})).status,409);
  assert.equal((await request(client(),'/auth/register','POST',{name:'Dani',email:'dani@example.invalid',password:'UnaClaveDePrueba-123'})).status,409);
});
test('perfil, íconos, seguimiento y guardados sobreviven a nuevas sesiones',async()=>{
  const result=await request(alice,'/me','PATCH',{name:'QA Alice Nueva',bio:'Una biografía real.',avatar:'Violeta',saved:['house']});assert.equal(result.user.avatar,'Violeta');assert.equal(result.user.bio,'Una biografía real.');
  for(let i=0;i<2;i++)assert.equal((await request(alice,'/follow/'+bob.user.id,'POST',{follow:true})).status,200);
  const profiles=await request(bob,'/profiles');assert.equal(profiles.profiles.find(p=>p.id===bob.user.id).followers,1);
  const followers=await request(bob,'/profiles/'+bob.user.id+'/followers');assert.equal(followers.profiles[0].id,alice.user.id);
  await request(alice,'/follow/char:dani','POST',{follow:true});const me=await request(alice,'/me');assert.equal(me.user.follows.length,2);assert.deepEqual(me.user.saved,['house']);
});
test('chat privado con entrega en tiempo real y control de acceso',async()=>{
  const created=await request(alice,'/conversations','POST',{members:[bob.user.id]});chat=created.conversation.id;
  const again=await request(bob,'/conversations','POST',{members:[alice.user.id]});assert.equal(again.conversation.id,chat);
  assert.equal((await request(outsider,'/conversations/'+encodeURIComponent(chat)+'/messages')).status,404);
  const abort=new AbortController();const stream=await fetch(base+'/api/events',{headers:{cookie:bob.cookie},signal:abort.signal});const reader=stream.body.getReader();await reader.read();
  const result=await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{id:randomUUID(),text:'Hola, esto es un chat real.'});assert.equal(result.status,201);message=result.message;
  const event=await Promise.race([(async()=>{let text='';while(!text.includes('Hola, esto es un chat real.')){const chunk=await reader.read();text+=new TextDecoder().decode(chunk.value);}return text;})(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('No llegó SSE')),5000))]);assert(event.includes('event: message'));abort.abort();
  assert.equal((await request(bob,'/conversations')).conversations[0].unread,1);await request(bob,'/conversations/'+encodeURIComponent(chat)+'/read','POST',{});assert.equal((await request(bob,'/conversations')).conversations[0].unread,0);
  assert.equal((await request(outsider,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{text:'Intrusión'})).status,404);
});
test('mensajes simultáneos, reintentos, respuestas y reacciones',async()=>{
  const id=randomUUID();await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{id,text:'Sin duplicados'});await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{id,text:'Sin duplicados'});
  await Promise.all([request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{text:'Mensaje A'}),request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{text:'Mensaje B'})]);
  const reply=await request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{text:'Te respondo.',replyTo:message.id});assert.equal(reply.message.reply.id,message.id);
  await request(bob,'/messages/'+message.id+'/reaction','POST',{emoji:'❤️'});let messages=(await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages')).messages;assert.equal(messages.find(m=>m.id===message.id).reactions.length,1);assert.equal(messages.filter(m=>m.text==='Sin duplicados').length,1);assert(messages.some(m=>m.text==='Mensaje A'));assert(messages.some(m=>m.text==='Mensaje B'));
  assert.equal((await request(bob,'/messages/'+message.id,'PATCH',{text:'No autorizado'})).status,403);
  assert.equal((await request(alice,'/messages/'+message.id,'PATCH',{text:'Hola editado'})).message.text,'Hola editado');
});
test('imágenes privadas y archivos restringidos a miembros',async()=>{
  const data64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=';
  const result=await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{type:'image',mime:'image/png',data:data64,filename:'prueba.png'});assert.equal(result.status,201);imageId=result.message.id;
  assert.equal((await fetch(base+result.message.url,{headers:{cookie:bob.cookie}})).status,200);assert.equal((await fetch(base+result.message.url,{headers:{cookie:outsider.cookie}})).status,404);assert.equal((await fetch(base+result.message.url)).status,401);
  assert.equal((await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{type:'image',mime:'image/svg+xml',data:'PHN2Zz4=',filename:'x.svg'})).status,400);
  assert.equal((await request(alice,'/messages/'+imageId,'DELETE',{})).message.type,'deleted');assert.equal((await fetch(base+'/api/files/'+imageId,{headers:{cookie:bob.cookie}})).status,404);
  keptImage=(await request(alice,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{type:'image',mime:'image/png',data:data64,filename:'conservar.png'})).message;
  keptAudio=(await request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{type:'audio',mime:'audio/webm',data:Buffer.from('audio de prueba').toString('base64'),filename:'voz.webm'})).message;
  assert(keptImage?.url);assert(keptAudio?.url);
});
test('grupos, permisos, nuevos miembros y salida',async()=>{
  const result=await request(alice,'/conversations','POST',{type:'group',title:'Exploradores QA',members:[bob.user.id]});group=result.conversation.id;
  assert.equal((await request(bob,'/conversations/'+group,'PATCH',{title:'No autorizado'})).status,403);
  assert.equal((await request(alice,'/conversations/'+group+'/members','POST',{members:[outsider.user.id]})).status,200);
  assert.equal((await request(outsider,'/conversations/'+group+'/messages')).status,200);
  await request(alice,'/conversations/'+group,'PATCH',{onlyAdminWrite:true});
  assert.equal((await request(bob,'/conversations/'+group+'/messages','POST',{text:'No permitido todavía'})).status,403);
  assert.equal((await request(bob,'/conversations/'+group+'/members','PATCH',{userId:outsider.user.id,role:'admin'})).status,403);
  await request(alice,'/conversations/'+group+'/members','PATCH',{userId:bob.user.id,role:'mod'});
  assert.equal((await request(bob,'/conversations/'+group+'/messages','POST',{text:'Mensaje del moderador'})).status,201);
  const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=';
  assert.equal((await request(alice,'/conversations/'+group,'PATCH',{iconData:image,mime:'image/png'})).status,200);
  assert.equal((await fetch(base+'/api/group-icons/'+group,{headers:{cookie:bob.cookie}})).status,200);
  await request(alice,'/conversations/'+group+'/members','DELETE',{userId:outsider.user.id});
  assert.equal((await request(outsider,'/conversations/'+group+'/messages')).status,404);
  assert.equal((await fetch(base+'/api/group-icons/'+group,{headers:{cookie:outsider.cookie}})).status,404);
  await request(alice,'/conversations/'+group,'DELETE',{});const remaining=(await request(bob,'/conversations')).conversations.find(c=>c.id===group);assert(remaining.members.some(m=>m.role==='admin'));assert.equal((await request(alice,'/conversations/'+group+'/messages')).status,404);
});
test('cambio de contraseña verifica la clave actual y revoca otras sesiones',async()=>{
  const other=client();await request(other,'/auth/login','POST',{login:'QA Alice Nueva',password:'UnaClaveDePrueba-123'});
  assert.equal((await request(alice,'/me/password','POST',{current:'incorrecta',password:'NuevaClaveDePrueba-456'})).status,400);
  assert.equal((await request(alice,'/me/password','POST',{current:'UnaClaveDePrueba-123',password:'NuevaClaveDePrueba-456'})).status,200);
  assert.equal((await request(other,'/me')).user,null);assert.equal((await request(alice,'/me')).user.id,alice.user.id);
  assert.equal((await request(client(),'/auth/login','POST',{login:'QA Alice Nueva',password:'NuevaClaveDePrueba-456'})).status,200);
});
test('noticias, límites, CSRF y datos privados fuera del directorio público',async()=>{
  const id='dani-ganadora-antarctica';await request(alice,'/news/'+id+'/like','POST',{liked:true});await request(alice,'/news/'+id+'/like','POST',{liked:true});const likes=(await request(bob,'/news')).likes.find(n=>n.id===id);assert.equal(likes.count,1);assert.equal(likes.liked,false);
  const csrf=await fetch(base+'/api/me',{method:'PATCH',headers:{cookie:alice.cookie,'Content-Type':'application/json',origin:'https://otro.example'},body:JSON.stringify({bio:'Intruso'})});assert.equal(csrf.status,403);
  for(const p of ['/server.mjs','/data/xpedition.sqlite','/data/uploads/'+imageId])assert.equal((await fetch(base+p)).status,404);
});
test('persistencia tras reinicio y cierre de sesión',async()=>{
  await stop();base=undefined;await start();const me=await request(alice,'/me');assert.equal(me.user.bio,'Una biografía real.');assert.equal(me.user.avatar,'Violeta');assert((await request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages')).messages.some(m=>m.text==='Hola editado'));
  const picture=await fetch(base+keptImage.url,{headers:{cookie:bob.cookie}});assert.equal(picture.status,200);assert.equal(Buffer.from(await picture.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const audio=await fetch(base+keptAudio.url,{headers:{cookie:alice.cookie}});assert.equal(audio.status,200);assert.equal(await audio.text(),'audio de prueba');
  assert.equal((await fetch(base+'/api/group-icons/'+group,{headers:{cookie:bob.cookie}})).status,200);
  if(process.env.TEST_DATABASE_URL){assert(!fs.existsSync(path.join(data,'instance-0')));assert(!fs.existsSync(path.join(data,'instance-1')));}
  const logout=await request(alice,'/auth/logout','POST',{});assert.equal(logout.status,200);assert.equal((await request(alice,'/me')).user,null);assert.equal((await request(alice,'/conversations')).status,401);
});
