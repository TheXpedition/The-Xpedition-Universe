import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openDatabase} from '../database.mjs';

const root=new URL('..',import.meta.url),data=fs.mkdtempSync(path.join(os.tmpdir(),'xp-chat-staff-'));
const staff='92354719-8816-4e25-9199-0dc9a99f7da1',ordinary='chat-staff-ordinary';
const people=Array.from({length:100},(_,index)=>'chat-person-'+index);
let child,base;
const token=id=>'chat-test-token-'+id;
async function start(){
 base=null;
 child=spawn(process.execPath,['server.mjs'],{cwd:root,windowsHide:true,env:{...process.env,DATABASE_URL:'',PERSISTENCE_MODE:'local',DATA_DIR:data,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  let output='',errors='';const timer=setTimeout(()=>reject(Error('El servidor no inició: '+errors)),20000);
  child.stderr.on('data',chunk=>errors+=chunk);
  child.stdout.on('data',chunk=>{output+=chunk;const port=output.match(/localhost:(\d+)/)?.[1];if(port&&!base){base='http://127.0.0.1:'+port;clearTimeout(timer);resolve();}});
  child.once('error',error=>{clearTimeout(timer);reject(error);});
 });
}
async function stop(){if(child&&!child.killed){const old=child;await new Promise(resolve=>{old.once('exit',resolve);old.kill();});}}
before(async()=>{
 const db=await openDatabase(data);
 try{
  await db.transaction(async()=>{
   for(const id of [staff,ordinary,...people]){
    await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani',Date.now());
    await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',createHash('sha256').update(token(id)).digest('hex'),id,Date.now()+3600000);
   }
  });
 }finally{await db.close();}
 await start();
});
after(stop);
async function request(actor,route='',method='GET',payload){
 const response=await fetch(base+'/api/conversations'+route,{method,headers:{'content-type':'application/json',...(actor?{cookie:'xp_session='+token(actor)}:{})},body:payload===undefined?undefined:JSON.stringify(payload)});
 return {status:response.status,...await response.json()};
}
async function groupView(actor,id){return (await request(actor)).conversations.find(conversation=>conversation.id===id);}

test('el staff crea grupos de más de 30 personas, añade más sin cupo y conserva todos los miembros al reiniciar',async()=>{
 const created=await request(staff,'','POST',{type:'group',title:'Staff sin límite',members:people.slice(0,60)});
 assert.equal(created.status,201);assert.equal(created.conversation.members.length,61);
 const id=created.conversation.id;
 assert.equal((await request(staff,'/'+id+'/members','POST',{members:people.slice(60)})).status,200);
 assert.equal((await groupView(staff,id)).members.length,101);
 assert.equal((await request(staff,'/'+id+'/members','POST',{members:people})).status,200);
 assert.equal((await groupView(staff,id)).members.length,101,'reintentar no duplica miembros');
 assert.equal((await groupView(people.at(-1),id)).members.length,101,'las nuevas personas reciben el grupo');
 await stop();await start();assert.equal((await groupView(staff,id)).members.length,101);
});

test('el staff puede añadir cualquier cantidad en un grupo donde participa sin ser su administrador',async()=>{
 const created=await request(ordinary,'','POST',{type:'group',title:'Grupo compartido',members:[staff]});
 const id=created.conversation.id;
 assert.equal(created.conversation.members.find(member=>member.id===staff).role,'member');
 assert.equal((await request(staff,'/'+id+'/members','POST',{members:people})).status,200);
 assert.equal((await groupView(staff,id)).members.length,102);
});

test('las cuentas normales conservan su límite y no pueden obtener el permiso enviando staff en la petición',async()=>{
 assert.equal((await request(ordinary,'','POST',{type:'group',title:'Excede el límite',members:people.slice(0,30),staff:true})).status,400);
 const created=await request(ordinary,'','POST',{type:'group',title:'Grupo normal',members:people.slice(0,29)});
 assert.equal(created.status,201);assert.equal(created.conversation.members.length,30);
 const id=created.conversation.id;
 assert.equal((await request(ordinary,'/'+id+'/members','POST',{members:[people[29]],staff:true})).status,400);
 assert.equal((await request(people[0],'/'+id+'/members','POST',{members:[people[29]],staff:true})).status,403);
 assert.equal((await groupView(ordinary,id)).members.length,30);
});

test('el permiso del staff valida cuentas reales y conserva los chats directos y la privacidad de otros grupos',async()=>{
 const created=await request(staff,'','POST',{type:'group',title:'Validación de miembros',members:[people[0]]});
 const id=created.conversation.id;
 for(const members of [[people[1],'cuenta-inexistente'],[people[1],{}]]){
  assert.equal((await request(staff,'/'+id+'/members','POST',{members})).status,400);
  assert.equal((await groupView(staff,id)).members.length,2,'una cuenta inválida no añade parcialmente al resto');
 }
 assert.equal((await request(null,'/'+id+'/members','POST',{members:[people[1]]})).status,401);
 const privateGroup=await request(ordinary,'','POST',{type:'group',title:'Otro grupo privado',members:[people[0]]});
 assert.equal((await request(staff,'/'+privateGroup.conversation.id+'/members','POST',{members:[people[1]]})).status,404);
 assert.equal((await request(staff,'','POST',{type:'dm',members:people.slice(0,3)})).status,400);
 const dm=await request(staff,'','POST',{type:'dm',members:[people[0]]});assert.equal(dm.status,201);
 assert.equal((await request(staff,'/'+encodeURIComponent(dm.conversation.id)+'/members','POST',{members:[people[1]]})).status,403);
});

test('X Critics exige una sesión de Staff y el archivo anterior deja de ser público',async()=>{
 const get=(actor,pathname='/api/x-critics')=>fetch(base+pathname,{headers:actor?{cookie:'xp_session='+token(actor)}:{}});
 assert.equal((await get(null)).status,401);
 assert.equal((await get(ordinary)).status,403);
 assert.equal((await get(staff,'/x-critics-data.json')).status,404);
 const response=await get(staff);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();
 assert.equal(data.showdownRatings['showdown-2'][0],7.3);
});

test('la tercera edición está cerrada por defecto y solo el Staff puede abrirla y volverla a cerrar',async()=>{
 const route='/api/awards/edicion-3',moderation='/api/moderation/awards/edicion-3';
 const banner='/awards/edition-3-banner.webp',art='/awards/edition-3-poster.webp';
 const get=(pathname,actor,options={})=>fetch(base+pathname,{...options,headers:actor?{cookie:'xp_session='+token(actor)}:{}});
 const publish=(actor,publicEnabled)=>fetch(base+moderation,{method:'PUT',headers:{'content-type':'application/json',...(actor?{cookie:'xp_session='+token(actor)}:{})},body:JSON.stringify({publicEnabled})});
 assert.equal((await get('/api/config').then(response=>response.json())).awardsThirdPublic,false);
 assert.equal((await get(route)).status,403);
 assert.equal((await get(route,ordinary)).status,403);
 assert.equal((await get(route,staff)).status,200);
 assert.equal((await get(moderation)).status,401);
 assert.equal((await publish(ordinary,true)).status,403);
 assert.equal((await publish(staff,'true')).status,400);
 assert.equal((await get(banner,null,{method:'HEAD'})).status,200);
 assert.equal((await get(art,null,{method:'HEAD'})).status,403);
 assert.equal((await get(art,staff,{method:'HEAD'})).status,200);
 const historical=await get('/awards/editions.json').then(response=>response.json());
 assert.deepEqual(Object.keys(historical.editions),['edicion-1','edicion-2']);
 assert.equal((await publish(staff,true)).status,200);
 await stop();await start();
 assert.equal((await get('/api/config').then(response=>response.json())).awardsThirdPublic,true);
 const live=await get(route);
 assert.equal(live.status,200);
 assert.equal(live.headers.get('cache-control'),'no-store');
 assert.equal((await live.json()).record.edition,3);
 assert.equal((await get(art,null,{method:'HEAD'})).status,200);
 assert.equal((await publish(staff,false)).status,200);
 assert.equal((await get(route)).status,403);
 assert.equal((await get(art,null,{method:'HEAD'})).status,403);
 const history=await get('/api/moderation/history',staff).then(response=>response.json());
 assert(history.actions.some(action=>action.action==='publish-awards'));
 assert(history.actions.some(action=>action.action==='unpublish-awards'));
});

test('la audiencia y el Staff pueden votar, y solo el Staff recibe los conteos',async()=>{
 const votePath='/api/awards/voting',tallyPath='/api/moderation/awards/votes';
 const request=(actor,pathname,body)=>fetch(base+pathname,{method:body?'PUT':'GET',headers:{'content-type':'application/json',...(actor?{cookie:'xp_session='+token(actor)}:{})},body:body&&JSON.stringify(body)});
 assert.equal((await request(null,votePath)).status,401);
 assert.equal((await request(null,tallyPath)).status,401);
 assert.equal((await request(ordinary,tallyPath)).status,403);
 const initial=await request(ordinary,votePath).then(response=>response.json());
 assert.deepEqual(Object.keys(initial).sort(),['ballot','votes']);
 const fan=initial.ballot.sections[0].categories[0],first={category:fan.id,nominee:fan.nominees[0].id},second={category:fan.id,nominee:fan.nominees[1].id};
 assert.equal((await request(ordinary,votePath,{...first,nominee:'inventado'})).status,400);
 assert.equal((await request(ordinary,votePath,first)).status,200);
 assert.equal((await request(ordinary,votePath,first)).status,200);
 assert.equal((await request(staff,votePath,first)).status,200);
 assert.equal((await request(ordinary,votePath,second)).status,200);
 const results=await request(staff,tallyPath).then(response=>response.json());
 assert.equal(results.dailyCount,3);
 assert.equal(results.dailyLimit,10000);
 assert.deepEqual(results.sections[0].categories[0].nominees.map(n=>n.votes),[1,1,0,0,0,0]);
 assert.deepEqual((await request(ordinary,votePath).then(r=>r.json())).votes,{[fan.id]:second.nominee});
 assert.deepEqual((await request(staff,votePath).then(r=>r.json())).votes,{[fan.id]:first.nominee});
});
