import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../database.mjs';
import {explicitContent} from '../moderation.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=path.resolve(process.env.TEST_DATA_DIR||path.join(root,'work','test-'+randomUUID()));
fs.mkdirSync(data,{recursive:true});
let child,base,alice,bob,outsider,chat,message,imageId,group,keptImage,keptAudio,keptVideo,keptSticker,starts=0;
const stickerCatalog=JSON.parse(fs.readFileSync(path.join(root,'public','stickers.json'),'utf8'));
function testAudio(){const b=Buffer.alloc(16044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);for(let i=0;i<8000;i++)b.writeInt16LE(Math.round(Math.sin(i/8000*Math.PI*880)*8000),44+i*2);return b;}
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
test('las cinco previas móviles son ligeras, inician por metadatos y admiten rangos',async()=>{
 for(const name of ['japan','antarctica','safari','traitor-2','showdown-2']){
  const url=base+'/media/'+name+'-preview-mobile.mp4';
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');
  const size=Number(head.headers.get('content-length'));assert(size>1000&&size<6*1024*1024);
  const startup=await fetch(url,{headers:{Range:'bytes=0-131071'}});const metadata=Buffer.from(await startup.arrayBuffer());assert(metadata.indexOf('moov')>0);assert(metadata.indexOf('moov')<metadata.indexOf('mdat'));
  const first=await fetch(url,{headers:{Range:'bytes=0-31'}});assert.equal(first.status,206);assert.equal(first.headers.get('content-range'),`bytes 0-31/${size}`);
  const bytes=Buffer.from(await first.arrayBuffer());assert.equal(bytes.length,32);assert(bytes.includes(Buffer.from('ftyp')));
  const tail=await fetch(url,{headers:{Range:'bytes=-16'}});assert.equal(tail.status,206);assert.equal((await tail.arrayBuffer()).byteLength,16);
  const invalid=await fetch(url,{headers:{Range:`bytes=${size}-`}});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),`bytes */${size}`);
 }
});
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
  keptAudio=(await request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages','POST',{type:'audio',mime:'audio/wav',data:testAudio().toString('base64'),filename:'voz.wav',durationMs:1000})).message;
  assert(keptImage?.url);assert(keptAudio?.url);
});
test('grupos, permisos, nuevos miembros y salida',async()=>{
  const result=await request(alice,'/conversations','POST',{type:'group',title:'Exploradores QA',members:[bob.user.id]});group=result.conversation.id;
  assert.equal((await request(bob,'/conversations/'+group,'PATCH',{title:'No autorizado'})).status,403);
  assert.equal((await request(alice,'/conversations/'+group+'/members','POST',{members:[outsider.user.id]})).status,200);
  assert.equal((await request(outsider,'/conversations/'+group+'/messages')).status,200);
  await request(alice,'/conversations/'+group,'PATCH',{onlyAdminWrite:true});
  assert.equal((await request(bob,'/conversations/'+group+'/messages','POST',{text:'No permitido todavía'})).status,403);
  assert.equal((await request(bob,'/conversations/'+group+'/messages','POST',{type:'sticker',stickerId:stickerCatalog[0].id})).status,403);
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
test('stickers originales, selección validada y reacciones personalizadas',async()=>{
  assert.equal(stickerCatalog.length,50);
  const result=await request(alice,'/conversations/'+chat+'/messages','POST',{type:'sticker',stickerId:stickerCatalog[0].id});assert.equal(result.status,201);keptSticker=result.message;assert.equal(keptSticker.stickerId,stickerCatalog[0].id);
  const file=await fetch(base+keptSticker.url);assert.equal(file.status,200);assert.deepEqual(Buffer.from(await file.arrayBuffer()),fs.readFileSync(path.join(root,'public',decodeURIComponent(stickerCatalog[0].src))));
  assert.equal((await request(alice,'/conversations/'+chat+'/messages','POST',{type:'sticker',stickerId:'https://example.com/no.png'})).status,400);
  assert.equal((await request(outsider,'/conversations/'+chat+'/messages','POST',{type:'sticker',stickerId:stickerCatalog[0].id})).status,404);
  for(const emoji of ['🥹','🫶','💜'])assert.equal((await request(bob,'/messages/'+keptSticker.id+'/reaction','POST',{emoji})).status,200);
  const current=(await request(alice,'/conversations/'+chat+'/messages')).messages.find(m=>m.id===keptSticker.id);assert.deepEqual(current.reactions.map(r=>r.emoji),['💜']);
  assert.equal((await request(bob,'/messages/'+keptSticker.id+'/reaction','POST',{emoji:'<script>'})).status,400);
});
test('audios privados reproducibles con duración, HEAD y búsqueda por rangos',async()=>{
  assert.equal(keptAudio.durationMs,1000);
  const head=await fetch(base+keptAudio.url,{method:'HEAD',headers:{cookie:alice.cookie}});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'audio/wav');assert.equal(head.headers.get('accept-ranges'),'bytes');assert.equal(Number(head.headers.get('content-length')),testAudio().length);
  const range=await fetch(base+keptAudio.url,{headers:{cookie:alice.cookie,Range:'bytes=0-43'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 0-43/${testAudio().length}`);assert.deepEqual(Buffer.from(await range.arrayBuffer()),testAudio().subarray(0,44));
  const tail=await fetch(base+keptAudio.url,{headers:{cookie:alice.cookie,Range:'bytes=-100'}});assert.equal(tail.status,206);assert.equal((await tail.arrayBuffer()).byteLength,100);
  assert.equal((await fetch(base+keptAudio.url,{headers:{cookie:alice.cookie,Range:'bytes=999999-'}})).status,416);
  assert.equal((await fetch(base+keptAudio.url,{headers:{cookie:outsider.cookie,Range:'bytes=0-43'}})).status,404);assert.equal((await fetch(base+keptAudio.url,{method:'HEAD'})).status,401);
});
test('actualizar una base anterior conserva sus mensajes y adjuntos',{skip:!!process.env.TEST_DATABASE_URL},async()=>{
  const legacyDir=path.join(data,'legacy');fs.mkdirSync(legacyDir);const legacy=new DatabaseSync(path.join(legacyDir,'xpedition.sqlite'));
  legacy.exec("CREATE TABLE messages(id TEXT PRIMARY KEY,conversation TEXT,sender TEXT,text TEXT,type TEXT,file TEXT,mime TEXT,filename TEXT,reply_to TEXT,created INTEGER,edited INTEGER,deleted INTEGER DEFAULT 0);INSERT INTO messages(id,conversation,sender,text,type,file,created) VALUES('legacy','existing-chat','existing-user','Este mensaje debe conservarse.','audio','existing-private-file',1)");legacy.close();
  const migrated=await openDatabase(legacyDir);try{const message=await migrated.one('SELECT * FROM messages WHERE id=?','legacy');assert.equal(message.text,'Este mensaje debe conservarse.');assert.equal(message.file,'existing-private-file');assert.equal(message.duration_ms,0);}finally{await migrated.close();}
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
test('el filtro bloquea probabilidades explícitas sin rechazar solo sensualidad',()=>{
  assert(explicitContent([{className:'Porn',probability:.8}]));assert(explicitContent([{className:'Hentai',probability:.8}]));assert(explicitContent([{className:'Porn',probability:.5},{className:'Hentai',probability:.4}]));assert(!explicitContent([{className:'Sexy',probability:.99},{className:'Neutral',probability:.01}]));
});
test('identidad editable y orientación privada en perfiles y publicaciones',async()=>{
  const me=await request(alice,'/me','PATCH',{genderIdentity:'No Binario',pronouns:'elle',orientation:'Bisexual',orientationVisible:false});assert.equal(me.user.pronouns,'elle');assert.equal(me.user.orientation,'Bisexual');
  const publicUser=(await request(bob,'/profiles')).profiles.find(p=>p.id===alice.user.id);assert.equal(publicUser.orientation,undefined);assert.equal(publicUser.pronouns,'elle');
  assert.equal((await request(alice,'/me','PATCH',{genderIdentity:'Therian',pronouns:''})).status,400);
  assert.equal((await request(alice,'/me','PATCH',{genderIdentity:'Hombre',pronouns:'ella'})).user.pronouns,'el');
  await request(alice,'/me','PATCH',{genderIdentity:'Mujer',orientationVisible:true});assert.equal((await request(bob,'/profiles')).profiles.find(p=>p.id===alice.user.id).orientation,'Bisexual');
  await request(alice,'/me','PATCH',{orientationVisible:false});
});
test('publicaciones, menciones, stickers, archivo recuperable y orden reciente',async()=>{
  assert.equal((await request(client(),'/posts','POST',{text:'Intruso'})).status,401);
  const a=await request(alice,'/posts','POST',{text:'Hola universo',feeling:'orgullosa',sticker:stickerCatalog[0].id,mentions:[bob.user.id,'char:dani']});assert.equal(a.status,201);assert.equal(a.post.mentions.length,2);assert.equal(a.post.author.orientation,undefined);assert.equal(a.post.sticker.id,stickerCatalog[0].id);
  await new Promise(r=>setTimeout(r,3));const b=await request(bob,'/posts','POST',{text:'La más reciente'});const feed=await request(client(),'/posts');assert.equal(feed.posts[0].id,b.post.id);
  assert.equal((await request(bob,'/posts/'+a.post.id,'PATCH',{archived:true})).status,404);
  assert.equal((await request(alice,'/posts/'+a.post.id,'PATCH',{archived:true})).status,200);assert(!(await request(client(),'/posts')).posts.some(p=>p.id===a.post.id));
  assert.equal((await request(bob,'/posts?author='+alice.user.id+'&archived=1')).status,403);assert((await request(alice,'/posts?author='+alice.user.id+'&archived=1')).posts.some(p=>p.id===a.post.id));
  await request(alice,'/posts/'+a.post.id,'PATCH',{archived:false});assert((await request(client(),'/posts?author='+alice.user.id)).posts.some(p=>p.id===a.post.id));
  for(const values of [{text:'x',mentions:['char:noexiste']},{sticker:'../private'},{text:'x',feeling:'noexiste'}])assert.equal((await request(alice,'/posts','POST',values)).status,400);
});
test('popularidad inicial, visitas únicas y cambios graduales',async()=>{
  let p=(await request(client(),'/profiles')).profiles.filter(p=>p.character).sort((a,b)=>a.popularityRank-b.popularityRank);
  assert.equal(p.length,152);assert.equal(new Set(p.map(p=>p.id)).size,152);
  assert.deepEqual(p.slice(0,15).map(p=>p.name),['Bonju','Jiafei','Dua Lingo','Dani','Britney Britney','Isabel','Luciano','Andromeda','Alexandro','Coronel','Nicki Gorilaj','Pepi','Nidia Mirella','Mel Rz','Edna Droga']);
  assert.equal(p.at(-1).name,'Vladimir');assert.equal(p.at(-2).name,'Gustavo');
  const last=p.at(-1);for(let i=0;i<3;i++)assert.equal((await request(alice,'/characters/'+last.id+'/view','POST',{})).status,200);
  const next=(await request(client(),'/profiles')).profiles.find(p=>p.id===last.id);assert.equal(next.visits,last.visits+1);assert.equal(next.popularityRank,last.popularityRank);
  await request(bob,'/characters/'+last.id+'/view','POST',{});assert.equal((await request(client(),'/profiles')).profiles.find(p=>p.id===last.id).visits,last.visits+2);
});
test('los cinco personajes nuevos tienen perfiles, iconos y se pueden elegir como avatar',async()=>{
 const profiles=(await request(client(),'/profiles')).profiles;
 for(const [name,slug] of [['Edwin','edwin'],['Myke Z','mykez'],['Jiafei','jiafei'],['Mariano','mariano'],['Gustavo','gustavo']]){
  const p=profiles.find(p=>p.id==='char:'+slug);assert(p?.character);assert.equal(p.name,name);
  const image=await fetch(base+'/personajes/'+slug+'.png');assert.equal(image.status,200);
  const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.readUInt32BE(16),200);assert.equal(bytes.readUInt32BE(20),200);
  assert.equal((await request(alice,'/me','PATCH',{avatar:name})).user.avatar,name);
 }
 assert(!profiles.some(p=>p.name==='Miguel Antonio'));
 assert(profiles.some(p=>p.name==='Marianito')&&profiles.some(p=>p.name==='Mariano'));
 await request(alice,'/me','PATCH',{avatar:'Violeta'});
});
test('revisión real de imágenes públicas sin bloquear los mensajes',async()=>{
  const pending=request(alice,'/posts','POST',{text:'Arte aprobado',image:fs.readFileSync(path.join(root,'public/backdrops/apocalypse-top.png')).toString('base64')});
  await new Promise(r=>setTimeout(r,250));const t=Date.now();assert.equal((await request(bob,'/conversations/'+chat+'/messages','POST',{text:'El chat sigue funcionando durante la revisión'})).status,201);assert(Date.now()-t<2000);
  const result=await pending;assert.equal(result.status,201);const image=await fetch(base+result.post.image);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal((await request(alice,'/posts','POST',{image:Buffer.from('<svg/>').toString('base64')})).status,422);
  await request(alice,'/posts/'+result.post.id,'PATCH',{archived:true});assert.equal((await fetch(base+result.post.image)).status,404);
  await request(alice,'/posts/'+result.post.id,'PATCH',{archived:false});assert.equal((await fetch(base+result.post.image)).status,200);
});

let keptCover;
test('reacciones a publicaciones y comentarios con permisos y persistencia',async()=>{
 const post=(await request(alice,'/posts','POST',{text:'Publicación para conversar'})).post;
 assert.equal((await request(client(),'/posts/'+post.id+'/reaction','POST',{emoji:'❤️'})).status,401);
 assert.equal((await request(bob,'/posts/'+post.id+'/reaction','POST',{emoji:'❤️'})).status,200);
 await request(bob,'/posts/'+post.id+'/reaction','POST',{emoji:'💜'});await request(alice,'/posts/'+post.id+'/reaction','POST',{emoji:'💜'});
 let activity=await request(bob,'/posts/'+post.id+'/activity');assert.deepEqual(activity.reactions,[{emoji:'💜',count:2,mine:true}]);
 assert.equal((await request(bob,'/posts/'+post.id+'/reaction','POST',{emoji:'<script>'})).status,400);
 await request(bob,'/posts/'+post.id+'/reaction','POST',{emoji:''});assert.equal((await request(bob,'/posts/'+post.id+'/activity')).reactions[0].mine,false);
 assert.equal((await request(client(),'/posts/'+post.id+'/comments','POST',{text:'No autorizado'})).status,401);
 const id=randomUUID();const c=await request(bob,'/posts/'+post.id+'/comments','POST',{id,text:'Mi comentario'});assert.equal(c.status,201);
 assert.equal((await request(bob,'/posts/'+post.id+'/comments','POST',{id,text:'Mi comentario'})).commentsCount,1);
 await request(alice,'/comments/'+c.comment.id+'/reaction','POST',{emoji:'😂'});const publicComment=(await request(client(),'/comments/'+c.comment.id)).comment;assert.equal(publicComment.reactions[0].mine,false);assert.equal(publicComment.reactions[0].count,1);assert.equal(publicComment.author.orientation,undefined);
 assert.equal((await request(alice,'/comments/'+c.comment.id,'PATCH',{text:'Cambiar comentario ajeno'})).status,403);
 assert.equal((await request(bob,'/comments/'+c.comment.id,'PATCH',{text:'Comentario corregido'})).comment.text,'Comentario corregido');
 for(let n=0;n<22;n++)await request(bob,'/posts/'+post.id+'/comments','POST',{text:'Comentario '+n});
 const page=await request(client(),'/posts/'+post.id+'/comments');assert.equal(page.comments.length,20);assert.equal(page.hasMore,true);
 const previous=await request(client(),'/posts/'+post.id+'/comments?before='+page.comments[0].created+'&beforeId='+page.comments[0].id);assert.equal(previous.comments.length,3);assert.equal(new Set([...previous.comments,...page.comments].map(c=>c.id)).size,23);
 assert.equal((await request(client(),'/posts/'+post.id+'/activity')).commentsCount,23);
 await request(alice,'/posts/'+post.id,'PATCH',{archived:true});assert.equal((await request(bob,'/posts/'+post.id+'/comments')).status,404);assert.equal((await request(bob,'/comments/'+c.comment.id+'/reaction','POST',{emoji:'👍'})).status,404);
 await request(alice,'/posts/'+post.id,'PATCH',{archived:false});assert.equal((await request(client(),'/posts/'+post.id+'/comments')).comments.length,20);
});
test('portadas revisadas, públicas y ajustables sin cambiar otras cuentas',async()=>{
 assert.equal((await request(client(),'/me/cover','POST',{position:50})).status,401);
 assert.equal((await request(alice,'/me/cover','POST',{position:101})).status,400);
 assert.equal((await request(alice,'/me/cover','POST',{image:Buffer.from('<svg/>').toString('base64')})).status,422);
 const result=await request(alice,'/me/cover','POST',{image:fs.readFileSync(path.join(root,'public/backdrops/apocalypse-top.png')).toString('base64'),position:25});assert.equal(result.status,200);assert.equal(result.user.coverPosition,25);assert(result.user.cover);
 const image=await fetch(base+result.user.cover);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
 const publicProfile=(await request(client(),'/profiles')).profiles.find(p=>p.id===alice.user.id);assert.equal(publicProfile.coverPosition,25);assert.equal(publicProfile.cover,result.user.cover);assert.equal((await request(bob,'/me')).user.cover,null);
 keptCover=(await request(alice,'/me/cover','POST',{position:35})).user.cover;assert.equal((await request(alice,'/me')).user.coverPosition,35);
});

test('videos privados y galería completa con paginación y acceso solo para miembros',async()=>{
  const endpoint='/conversations/'+encodeURIComponent(chat)+'/media';
  assert.equal((await request(client(),endpoint)).status,401);assert.equal((await request(outsider,endpoint)).status,404);
  assert.equal((await request(bob,endpoint+'?limit=61')).status,400);
  const initial=(await request(bob,endpoint)).total;
  const bytes=fs.readFileSync(path.join(root,'public/media/japan-preview-mobile.mp4'));
  const payload={id:randomUUID(),type:'video',mime:'video/mp4',data:bytes.toString('base64'),filename:'aventura.mp4'};
  const result=await request(alice,'/conversations/'+chat+'/messages','POST',payload);assert.equal(result.status,201);keptVideo=result.message;
  assert.equal((await request(alice,'/conversations/'+chat+'/messages','POST',payload)).status,200);
  const head=await fetch(base+keptVideo.url,{method:'HEAD',headers:{cookie:bob.cookie}});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');assert.equal(Number(head.headers.get('content-length')),bytes.length);
  const range=await fetch(base+keptVideo.url,{headers:{cookie:bob.cookie,Range:'bytes=0-31'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(0,32));
  assert.equal((await request(outsider,'/messages/'+keptVideo.id)).status,404);assert.equal((await request(bob,'/messages/'+keptVideo.id)).message.type,'video');
  for(const [mime,data]of[['video/mp4',Buffer.from('<script>fake</script>')],['video/webm',Buffer.from('fake')],['video/quicktime',bytes]])assert.equal((await request(alice,'/conversations/'+chat+'/messages','POST',{type:'video',mime,data:data.toString('base64')})).status,400);
  assert.equal((await request(alice,'/conversations/'+chat+'/messages','POST',{type:'video',mime:'video/mp4',data:Buffer.alloc(6*1024*1024+1).toString('base64')})).status,413);
  const pictures=[];for(let i=0;i<4;i++)pictures.push((await request(bob,'/conversations/'+chat+'/messages','POST',{type:'image',mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=',filename:'foto.png'})).message);
  const page=await request(bob,endpoint+'?limit=3');assert.equal(page.total,initial+5);assert.equal(page.media.length,3);assert.equal(page.hasMore,true);
  const ids=page.media.map(m=>m.id);let cursor=page;while(cursor.hasMore){cursor=await request(bob,endpoint+'?limit=3&before='+cursor.media.at(-1).created);ids.push(...cursor.media.map(m=>m.id));assert(cursor.media.every(m=>['image','video'].includes(m.type)));}
  assert.equal(ids.length,initial+5);assert.equal(new Set(ids).size,ids.length);assert(ids.includes(keptVideo.id));
  await request(bob,'/messages/'+pictures[0].id,'DELETE',{});const remaining=await request(alice,endpoint);assert.equal(remaining.total,initial+4);assert(!remaining.media.some(m=>m.id===pictures[0].id));
});

test('stickers nuevos y favoritos privados por cuenta sobreviven a nuevas sesiones',async()=>{
  const first=stickerCatalog[34],last=stickerCatalog.at(-1),url='/me/sticker-favorites/';
  assert.equal((await request(client(),url+first.id,'PUT',{favorite:true})).status,401);
  assert.equal((await request(alice,url+'0000000000000000','PUT',{favorite:true})).status,400);
  assert.equal((await request(alice,url+first.id,'PUT',{favorite:'sí'})).status,400);
  for(let i=0;i<2;i++)assert.deepEqual((await request(alice,url+first.id,'PUT',{favorite:true})).stickerFavorites,[first.id]);
  await request(alice,url+last.id,'PUT',{favorite:true});
  assert.deepEqual((await request(alice,'/me')).user.stickerFavorites,[first.id,last.id]);
  assert.deepEqual((await request(bob,'/me')).user.stickerFavorites,[]);
  assert((await request(bob,'/profiles')).profiles.every(p=>p.stickerFavorites===undefined));
  const login=await request(client(),'/auth/login','POST',{login:'QA Alice Nueva',password:'NuevaClaveDePrueba-456'});
  assert.deepEqual(login.user.stickerFavorites,[first.id,last.id]);
  assert.deepEqual((await request(alice,url+first.id,'PUT',{favorite:false})).stickerFavorites,[last.id]);
  const sent=await request(alice,'/conversations/'+chat+'/messages','POST',{type:'sticker',stickerId:last.id});assert.equal(sent.status,201);
  const image=await fetch(base+sent.message.url);assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),fs.readFileSync(path.join(root,'public',last.src)));
  const published=await request(alice,'/posts','POST',{sticker:last.id});assert.equal(published.status,201);assert.equal(published.post.sticker.id,last.id);
  await request(alice,'/posts/'+published.post.id,'PATCH',{archived:true});
});

test('persistencia tras reinicio y cierre de sesión',async()=>{
  await stop();base=undefined;await start();const me=await request(alice,'/me');assert.equal(me.user.bio,'Una biografía real.');assert.equal(me.user.avatar,'Violeta');assert((await request(bob,'/conversations/'+encodeURIComponent(chat)+'/messages')).messages.some(m=>m.text==='Hola editado'));
  assert.deepEqual(me.user.stickerFavorites,[stickerCatalog.at(-1).id]);
  assert((await request(bob,'/conversations/'+encodeURIComponent(chat)+'/media')).media.some(m=>m.id===keptVideo.id));assert.equal((await fetch(base+keptVideo.url,{headers:{cookie:bob.cookie},method:'HEAD'})).status,200);
  const picture=await fetch(base+keptImage.url,{headers:{cookie:bob.cookie}});assert.equal(picture.status,200);assert.equal(Buffer.from(await picture.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const audio=await fetch(base+keptAudio.url,{headers:{cookie:alice.cookie}});assert.equal(audio.status,200);assert.deepEqual(Buffer.from(await audio.arrayBuffer()),testAudio());
  const persisted=(await request(bob,'/conversations/'+chat+'/messages')).messages;assert.equal(persisted.find(m=>m.id===keptAudio.id).durationMs,1000);assert.equal(persisted.find(m=>m.id===keptSticker.id).type,'sticker');
  assert.equal((await fetch(base+'/api/group-icons/'+group,{headers:{cookie:bob.cookie}})).status,200);
  if(process.env.TEST_DATABASE_URL){assert(!fs.existsSync(path.join(data,'instance-0')));assert(!fs.existsSync(path.join(data,'instance-1')));}
  assert.equal((await fetch(base+keptCover)).status,200);assert.equal(me.user.coverPosition,35);assert((await request(client(),'/posts')).posts.some(p=>p.commentsCount===23));
  const logout=await request(alice,'/auth/logout','POST',{});assert.equal(logout.status,200);assert.equal((await request(alice,'/me')).user,null);assert.equal((await request(alice,'/conversations')).status,401);
});
