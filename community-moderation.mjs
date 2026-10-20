import { randomUUID } from 'node:crypto';
import { isStaff, accountRole, setAccountVerification } from './account-roles.mjs';
import { levelFor } from './progression.mjs';

export function createModeration({db,json,fail,checkRate,everyone,body,storage,progression,notify=()=>{},userFields}){
 const profileRow='SELECT u.*,COALESCE(pr.tickets,0) AS tickets,COALESCE(pr.coins,0) AS coins,COALESCE(pr.xp,0) AS public_xp FROM users u LEFT JOIN user_progression pr ON pr.user_id=u.id';
 const profile=u=>({...(userFields?userFields(u):{id:u.id,name:u.name,avatar:u.avatar,bio:u.bio,created:u.created}),...accountRole(u.id),level:levelFor(Number(u.public_xp||0)),coins:Number(u.coins||0),tickets:Number(u.tickets||0)});
 const page=url=>{const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'Página inválida.');return offset;};
 const audit=(user,action,subject,details={},id=randomUUID())=>db.run('INSERT INTO moderation_actions(id,moderator,action,subject,details,created) VALUES(?,?,?,?,?,?)',id,user.id,action,subject,JSON.stringify(details),Date.now());
 async function handle(req,res,url,user){
  const path=url.pathname,method=req.method;
  const removal=path.match(/^\/api\/(posts|comments)\/([a-f0-9-]+)$/),restore=path.match(/^\/api\/moderation\/(post|comment)\/([a-f0-9-]+)\/restore$/),list=path==='/api/moderation';
  if(!path.startsWith('/api/moderation')&&!(removal&&method==='DELETE'))return false;
  if(!user)fail(401,'Inicia sesión.');
  if(!isStaff(user.id))fail(403,'Solo el Staff de The Xpedition puede moderar la comunidad.');
  if(list&&method==='GET'){
   const rows=await db.all("SELECT r.kind,r.item_id AS id,r.created,COALESCE(p.text,c.text,'') AS text,COALESCE(p.author,c.author) AS author_id FROM community_removals r LEFT JOIN posts p ON r.kind='post' AND p.id=r.item_id LEFT JOIN post_comments c ON r.kind='comment' AND c.id=r.item_id ORDER BY r.created DESC,r.item_id DESC LIMIT 50");
   json(res,{removals:rows.map(r=>({...r,text:r.text.slice(0,300)}))});return true;
  }
  if(path==='/api/moderation/overview'&&method==='GET'){
   const [users,posts,removed,joined]=await Promise.all([
    db.one('SELECT COUNT(*) AS n FROM users'),
    db.one("SELECT COUNT(*) AS n FROM posts p WHERE p.archived=0 AND NOT EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='post' AND r.item_id=p.id)"),
    db.one('SELECT COUNT(*) AS n FROM community_removals'),
    db.one('SELECT COUNT(*) AS n FROM users WHERE created>=?',Date.now()-86400000)
   ]);
   json(res,{users:Number(users.n),posts:Number(posts.n),removed:Number(removed.n),joined:Number(joined.n)});return true;
  }
  if(path==='/api/moderation/profiles'&&method==='GET'){
   const offset=page(url),query=String(url.searchParams.get('query')||'').trim().toLowerCase().slice(0,80),where=query?' WHERE LOWER(u.name) LIKE ?':'',args=query?['%'+query+'%']:[];
   const rows=await db.all(profileRow+where+' ORDER BY u.created DESC,u.id DESC LIMIT 26 OFFSET ?',...args,offset);
   const count=await db.one('SELECT COUNT(*) AS n FROM users u'+where,...args);
   json(res,{profiles:rows.slice(0,25).map(profile),hasMore:rows.length>25,total:Number(count.n),offset});return true;
  }
  const selected=path.match(/^\/api\/moderation\/profiles\/([^/]+)(?:\/(verification|grant))?$/);
  if(selected){
   const id=decodeURIComponent(selected[1]),person=await db.one(profileRow+' WHERE u.id=?',id);
   if(!person)fail(404,'Cuenta no encontrada.');
   if(!selected[2]&&method==='GET'){json(res,{profile:profile(person)});return true;}
   if(selected[2]==='verification'&&method==='PUT'){
    checkRate(req,'verification',100,3600000);const input=await body(req);
    if(typeof input.verified!=='boolean')fail(400,'Indica si la cuenta debe estar verificada.');
    if(accountRole(id).verified!==input.verified)await db.transaction(async()=>{
     await db.run('INSERT INTO profile_verifications(user_id,verified,moderator,updated) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET verified=excluded.verified,moderator=excluded.moderator,updated=excluded.updated',id,input.verified?1:0,user.id,Date.now());
     await audit(user,input.verified?'verify':'unverify',id,{name:person.name});
    });
    setAccountVerification(id,input.verified);everyone('profiles',{});json(res,{profile:profile(person)});return true;
   }
   if(selected[2]==='grant'&&method==='POST'){
    checkRate(req,'staff-grant',100,3600000);const input=await body(req),coins=input.coins,tickets=input.tickets,reason=String(input.reason||'').trim();
    if(!Number.isSafeInteger(coins)||!Number.isSafeInteger(tickets)||coins<0||tickets<0||coins>1000000||tickets>100000||coins+tickets<1)fail(400,'Indica entre 1 y 1.000.000 de monedas o entre 1 y 100.000 tickets, sin valores negativos.');
    if(reason.length<3||reason.length>180)fail(400,'Añade un motivo de 3 a 180 caracteres.');
    if(typeof input.requestId!=='string'||!(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i).test(input.requestId))fail(400,'Identificador de entrega inválido.');
    const details={name:person.name,coins,tickets,reason};
    const previous=await db.one('SELECT * FROM moderation_actions WHERE id=?',input.requestId);
    if(previous){
     const recorded=JSON.parse(previous.details);
     if(previous.moderator!==user.id||previous.subject!==id||previous.action!=='grant'||recorded.coins!==coins||recorded.tickets!==tickets||recorded.reason!==reason)fail(409,'Esta entrega ya se utilizó para otra operación.');
    }else await db.transaction(async()=>{
     const wallet=await db.one('SELECT coins,tickets FROM user_progression WHERE user_id=?',id);
     if(!Number.isSafeInteger(Number(wallet?.coins||0)+coins)||!Number.isSafeInteger(Number(wallet?.tickets||0)+tickets))fail(400,'El saldo resultante excede el límite permitido.');
     await audit(user,'grant',id,details,input.requestId);
     await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,0,0,0) ON CONFLICT DO NOTHING',id);
     await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,?,?,0,?,?)',id,'staff-grant:'+input.requestId,tickets,coins,'Staff · '+reason,Date.now());
     await db.run('UPDATE user_progression SET coins=coins+?,tickets=tickets+? WHERE user_id=?',coins,tickets,id);
    });
    const updated=await db.one(profileRow+' WHERE u.id=?',id),wallet=await progression.wallet(id);
    if(!previous)notify([id],'staff-grant',{user:id,wallet,coins,tickets,reason});
    json(res,{profile:profile(updated),alreadyApplied:!!previous});return true;
   }
   fail(405,'Acción no permitida.');
  }
  if(path==='/api/moderation/posts'&&method==='GET'){
   const offset=page(url),query=String(url.searchParams.get('query')||'').trim().toLowerCase().slice(0,100),status=url.searchParams.get('status')||'active';
   const removed="EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='post' AND r.item_id=p.id)";
   if(!['active','removed','archived','all'].includes(status))fail(400,'Filtro inválido.');
   const conditions=status==='active'?['p.archived=0','NOT '+removed]:status==='removed'?[removed]:status==='archived'?['p.archived=1']:[],args=[];
   if(query){conditions.push('(LOWER(p.text) LIKE ? OR LOWER(u.name) LIKE ?)');args.push('%'+query+'%','%'+query+'%');}
   const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
   const rows=await db.all('SELECT p.*,u.name AS author_name,u.avatar AS author_avatar,'+removed+' AS removed FROM posts p JOIN users u ON u.id=p.author'+where+' ORDER BY p.created DESC,p.id DESC LIMIT 21 OFFSET ?',...args,offset);
   json(res,{posts:rows.slice(0,20).map(row=>({id:row.id,text:row.text,created:row.created,archived:!!Number(row.archived),removed:!!row.removed,author:{id:row.author,name:row.author_name,avatar:row.author_avatar,...accountRole(row.author)},image:row.image?'/api/moderation/posts/'+row.id+'/image':null,sticker:row.sticker||null})),hasMore:rows.length>20,offset});return true;
  }
  const postDetail=path.match(/^\/api\/moderation\/posts\/([a-f0-9-]+)\/(image|comments)$/);
  if(postDetail&&['GET','HEAD'].includes(method)){
   const post=await db.one('SELECT * FROM posts WHERE id=?',postDetail[1]);if(!post)fail(404,'Publicación no encontrada.');
   if(postDetail[2]==='image'){
    if(!post.image)fail(404,'Imagen no disponible.');const bytes=await storage.get(post.image);res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'private, no-store'});res.end(method==='HEAD'?undefined:bytes);return true;
   }
   const offset=page(url),rows=await db.all("SELECT c.*,u.name AS author_name,u.avatar AS author_avatar,EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='comment' AND r.item_id=c.id) AS removed FROM post_comments c JOIN users u ON u.id=c.author WHERE c.post=? ORDER BY c.created DESC,c.id DESC LIMIT 26 OFFSET ?",post.id,offset);
   json(res,{comments:rows.slice(0,25).map(row=>({id:row.id,text:row.text,created:row.created,removed:!!row.removed,author:{id:row.author,name:row.author_name,avatar:row.author_avatar,...accountRole(row.author)}})),hasMore:rows.length>25,offset});return true;
  }
  if(path==='/api/moderation/history'&&method==='GET'){
   const offset=page(url),rows=await db.all('SELECT a.*,u.name AS moderator_name FROM moderation_actions a JOIN users u ON u.id=a.moderator ORDER BY a.created DESC,a.id DESC LIMIT 31 OFFSET ?',offset);
   json(res,{actions:rows.slice(0,30).map(row=>({...row,details:JSON.parse(row.details)})),hasMore:rows.length>30,offset});return true;
  }
  if((removal&&method==='DELETE')||(restore&&method==='POST')){
   checkRate(req,'moderation',100,3600000);
   const kind=restore?restore[1]:removal[1]==='posts'?'post':'comment',id=restore?restore[2]:removal[2],table=kind==='post'?'posts':'post_comments';
   const item=await db.one(`SELECT * FROM ${table} WHERE id=?`,id);if(!item)fail(404,'Contenido no disponible.');
   await db.transaction(async()=>{
    const change=restore?await db.run('DELETE FROM community_removals WHERE kind=? AND item_id=?',kind,id):await db.run('INSERT INTO community_removals(kind,item_id,moderator,created) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',kind,id,user.id,Date.now());
    if(change.changes)await audit(user,restore?'restore-'+kind:'remove-'+kind,id,{text:item.text.slice(0,300),author:item.author});
   });
   everyone('moderation',{kind,id,post:kind==='post'?id:item.post,removed:!restore});json(res,{ok:true});return true;
  }
  fail(404,'Opción de moderación no encontrada.');
 }
 return {handle};
}
