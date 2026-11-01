import {randomUUID} from 'node:crypto';
import {isStaff} from './account-roles.mjs';
import {hasApocalypseStyle} from './world-profile-access.mjs';

export function createWorldServers({db,json,fail,body,access,now=Date.now}){
 const view=row=>({id:row.id,name:row.name,enabled:!!Number(row.enabled),autoBots:JSON.parse(row.settings).autoBots!==false,created:Number(row.created),updated:Number(row.updated)});
 const valid=id=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id);
 async function get(id){if(!valid(id))fail(404,'Este servidor no existe.');const row=await db.one('SELECT * FROM world_servers WHERE id=?',id);if(!row)fail(404,'Este servidor no existe.');return view(row);}
 async function enter(user,id){
  if(!user)fail(401,'Entra con tu cuenta para elegir un servidor.');
  const gate=await access(user);if(!gate.canPlay)fail(403,gate.publicEnabled?'Necesitas el estilo de participante de Apocalypse II en tu perfil.':'World está reservado al STAFF por ahora.');
  if(!isStaff(user.id)&&!await hasApocalypseStyle(db,user.id))fail(403,'Necesitas el estilo de participante de Apocalypse II en tu perfil.');
  const server=await get(id);if(!server.enabled&&!isStaff(user.id))fail(403,'Este servidor está cerrado por el STAFF.');return server;
 }
 async function handle(req,res,url,user){
  const match=/^\/api\/world\/servers(?:\/([0-9a-f-]+))?$/.exec(url.pathname);if(!match)return false;
  if(!user)fail(401,'Entra con tu cuenta para ver los servidores.');const staff=isStaff(user.id);
  if(!staff&&!await hasApocalypseStyle(db,user.id))fail(403,'El acceso está reservado a los perfiles con estilo Apocalypse II.');
  const gate=await access(user);if(!staff&&!gate.canPlay)fail(403,'World está reservado al STAFF por ahora.');
  if(req.method==='GET'&&!match[1]){const rows=await db.all('SELECT * FROM world_servers ORDER BY created DESC,id');json(res,{servers:rows.map(view).filter(s=>staff||s.enabled),staff,configured:gate.configured,inline:gate.inline,publicEnabled:gate.publicEnabled});return true;}
  if(!staff)fail(403,'Solo el STAFF puede crear o administrar servidores.');
  if(req.method==='POST'&&!match[1]){
   const input=await body(req),name=typeof input.name==='string'?input.name.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,60):'';
   if(name.length<2)fail(400,'Escribe un nombre para el servidor.');const id=randomUUID(),at=now();
   await db.transaction(async()=>{await db.run('INSERT INTO world_servers(id,name,creator,enabled,settings,created,updated) VALUES(?,?,?,1,?,?,?)',id,name,user.id,JSON.stringify({autoBots:input.autoBots!==false}),at,at);await audit(user,'create',id,{name,autoBots:input.autoBots!==false});});
   json(res,{server:await get(id)},201);return true;
  }
  if(req.method==='PATCH'&&match[1]){const server=await get(match[1]),input=await body(req);if(typeof input.enabled!=='boolean')fail(400,'Indica si deseas abrir o cerrar este servidor.');await db.transaction(async()=>{await db.run('UPDATE world_servers SET enabled=?,updated=? WHERE id=?',input.enabled?1:0,now(),server.id);await audit(user,input.enabled?'open':'close',server.id,{});});json(res,{server:await get(server.id)});return true;}
  fail(405,'Acción de servidor no disponible.');
 }
 async function audit(user,action,id,details){await db.run('INSERT INTO moderation_actions(id,moderator,action,subject,details,created) VALUES(?,?,?,?,?,?)',randomUUID(),user.id,'world-server:'+action,id,JSON.stringify(details),now());}
 return {get,enter,handle};
}
