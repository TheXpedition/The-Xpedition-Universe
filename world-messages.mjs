// Same conversations as the universe, with a small text-only API for World.
import {randomUUID,createHash} from 'node:crypto';
export function createWorldMessages({db,json,fail,body,checkRate}){
 async function members(id){return db.all('SELECT u.id,u.name,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation=?',id);}
 async function handle(req,res,url,user){
  if(!url.pathname.startsWith('/api/conversations'))return false;
  if(!user)fail(401,'Inicia sesión.');checkRate(req,'messages',100,60000);
  const match=url.pathname.match(/^\/api\/conversations(?:\/([^/]+)\/messages)?$/);if(!match)fail(404,'Conversación desconocida.');
  if(!match[1]){
   if(req.method==='GET'){const rows=await db.all('SELECT c.* FROM conversations c JOIN members m ON m.conversation=c.id WHERE m.user_id=? ORDER BY c.created DESC LIMIT 60',user.id);json(res,{conversations:await Promise.all(rows.map(async c=>({id:c.id,type:c.type,title:c.title,members:await members(c.id)})))});return true;}
   if(req.method!=='POST')fail(405,'Acción no permitida.');const b=await body(req),target=b.members?.[0];
   if(b.type!=='dm'||!Array.isArray(b.members)||b.members.length!==1||target===user.id||!await db.one('SELECT id FROM users WHERE id=?',target))fail(400,'Elige otro usuario del universo.');
   // Reuse any existing DM, including those created by the main application.
   let old=await db.one("SELECT c.id FROM conversations c JOIN members a ON a.conversation=c.id JOIN members b ON b.conversation=c.id WHERE c.type='dm' AND a.user_id=? AND b.user_id=?",user.id,target);
   const id=old?.id||'dm:'+createHash('sha256').update([user.id,target].sort().join('\0')).digest('hex');
   await db.transaction(async()=>{await db.run("INSERT INTO conversations(id,type,title,created) VALUES(?,'dm','',?) ON CONFLICT(id) DO NOTHING",id,Date.now());for(const uid of [user.id,target])await db.run('INSERT INTO members(conversation,user_id) VALUES(?,?) ON CONFLICT DO NOTHING',id,uid);});
   json(res,{conversation:{id,type:'dm',title:'',members:await members(id)}});return true;
  }
  const id=decodeURIComponent(match[1]),member=await db.one('SELECT m.role,c.only_admin FROM members m JOIN conversations c ON c.id=m.conversation WHERE m.conversation=? AND m.user_id=?',id,user.id);if(!member)fail(403,'Esta conversación es privada.');
  if(req.method==='GET'){
   const rows=await db.all('SELECT m.id,m.sender,m.text,m.type,m.deleted,m.created,u.name FROM messages m JOIN users u ON u.id=m.sender WHERE m.conversation=? ORDER BY m.created DESC,m.id DESC LIMIT 60',id);
   json(res,{messages:rows.reverse().map(m=>({id:m.id,sender:{id:m.sender,name:m.name},text:Number(m.deleted)?'Mensaje eliminado':m.type==='text'?m.text:'[Contenido multimedia · ábrelo en el universo]',type:m.type,created:Number(m.created)}))});return true;
  }
  if(req.method!=='POST')fail(405,'Acción no permitida.');if(Number(member.only_admin)&&member.role!=='admin')fail(403,'Solo los administradores pueden escribir aquí.');
  const b=await body(req),text=typeof b.text==='string'?b.text.trim():'';if(b.type!=='text'||!text||text.length>4000)fail(400,'Escribe un mensaje de hasta 4000 caracteres.');
  const messageId=typeof b.id==='string'&&/^[a-zA-Z0-9-]{12,80}$/.test(b.id)?b.id:randomUUID(),old=await db.one('SELECT conversation,sender FROM messages WHERE id=?',messageId);if(old&&(old.sender!==user.id||old.conversation!==id))fail(409,'Este mensaje ya existe.');
  await db.run("INSERT INTO messages(id,conversation,sender,text,type,created) VALUES(?,?,?,?,'text',?) ON CONFLICT(id) DO NOTHING",messageId,id,user.id,text,Date.now());json(res,{ok:true,id:messageId});return true;
 }
 return {handle};
}
