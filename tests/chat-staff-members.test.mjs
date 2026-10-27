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
