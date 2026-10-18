import {randomUUID} from 'node:crypto';
import {moderateImage} from './moderation.mjs';

export function createInteractions({db,storage,userFields,safeUser,body,json,fail,checkRate,serialize,everyone,reactionEmojis}){
  async function summary(kind,id,viewer){
    const table=kind==='comment'?'comment_reactions':'post_reactions',column=kind==='comment'?'comment':'post';
    return (await db.all(`SELECT emoji,COUNT(*) AS count,MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END) AS mine FROM ${table} WHERE ${column}=? GROUP BY emoji ORDER BY count DESC,emoji`,viewer?.id||'',id)).map(r=>({emoji:r.emoji,count:Number(r.count),mine:!!Number(r.mine)}));
  }
  const commentCount=async id=>Number((await db.one('SELECT COUNT(*) AS count FROM post_comments WHERE post=?',id)).count);
  async function findPost(id){const p=await db.one('SELECT * FROM posts WHERE id=? AND archived=0',id);if(!p)fail(404,'Publicación no disponible.');return p;}
  async function findComment(id){const c=await db.one('SELECT * FROM post_comments WHERE id=?',id);if(!c)fail(404,'Comentario no disponible.');await findPost(c.post);return c;}
  async function commentValue(c,viewer){return {id:c.id,post:c.post,text:c.text,created:c.created,edited:c.edited,author:userFields(await db.one('SELECT * FROM users WHERE id=?',c.author)),reactions:await summary('comment',c.id,viewer)};}
  async function handle(req,res,url,u){
    const p=url.pathname,method=req.method;
    const cover=p.match(/^\/api\/profile-covers\/([^/]+)$/);
    if(cover&&['GET','HEAD'].includes(method)){
      const c=await db.one('SELECT * FROM profile_covers WHERE user_id=?',decodeURIComponent(cover[1]));if(!c)fail(404,'Portada no disponible.');
      const bytes=await storage.get(c.file);res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(method==='HEAD'?undefined:bytes);return true;
    }
    if(p==='/api/me/cover'&&method==='POST'){
      if(!u)fail(401,'Inicia sesión para cambiar tu portada.');checkRate(req,'cover',12,3600000);
      const b=await body(req),position=Number(b.position??50);if(!Number.isFinite(position)||position<0||position>100)fail(400,'Encuadre inválido.');
      let uploadedFile,replacedFile;
      if(b.image){
        if(typeof b.image!=='string'||b.image.length>5600000||!/^[a-zA-Z0-9+/]+={0,2}$/.test(b.image))fail(400,'Elige una imagen PNG, JPG o WebP de hasta 4 MB.');
        const bytes=Buffer.from(b.image,'base64');if(bytes.length>4*1024*1024)fail(413,'La portada admite hasta 4 MB.');
        const approved=await moderateImage(bytes);uploadedFile='cover-'+randomUUID();await storage.put(uploadedFile,approved,'image/png');
      }
      try{await serialize(async()=>{
        const current=await db.one('SELECT * FROM profile_covers WHERE user_id=?',u.id),file=uploadedFile||current?.file;
        if(!file)fail(400,'Elige una imagen para tu portada.');
        await db.run('INSERT INTO profile_covers(user_id,file,position,updated) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET file=excluded.file,position=excluded.position,updated=excluded.updated',u.id,file,Math.round(position),Date.now());
        if(current?.file!==file)replacedFile=current?.file;
      });}
      catch(error){if(uploadedFile)await storage.remove(uploadedFile).catch(()=>{});throw error;}
      if(replacedFile)await storage.remove(replacedFile).catch(()=>{});
      everyone('profiles',{});json(res,{user:await safeUser(await db.one('SELECT * FROM users WHERE id=?',u.id),true)});return true;
    }
    const activity=p.match(/^\/api\/posts\/([a-f0-9-]+)\/activity$/);
    if(activity&&method==='GET'){await findPost(activity[1]);json(res,{reactions:await summary('post',activity[1],u),commentsCount:await commentCount(activity[1])});return true;}
    const comments=p.match(/^\/api\/posts\/([a-f0-9-]+)\/comments$/);
    if(comments&&method==='GET'){
      await findPost(comments[1]);const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER),beforeId=String(url.searchParams.get('beforeId')||'');
      if(!Number.isSafeInteger(before)||before<0)fail(400,'Página inválida.');
      const list=await db.all('SELECT * FROM post_comments WHERE post=? AND (created<? OR (created=? AND id<?)) ORDER BY created DESC,id DESC LIMIT 21',comments[1],before,before,beforeId);
      json(res,{comments:await Promise.all(list.slice(0,20).reverse().map(c=>commentValue(c,u))),hasMore:list.length>20});return true;
    }
    if(comments&&method==='POST'){
      if(!u)fail(401,'Inicia sesión para comentar.');await findPost(comments[1]);checkRate(req,'comments',120,3600000);
      const b=await body(req),text=String(b.text||'').trim();if(!text||text.length>1500)fail(400,'Escribe un comentario de hasta 1500 caracteres.');
      const id=typeof b.id==='string'&&/^[a-f0-9-]{36}$/.test(b.id)?b.id:randomUUID();
      const existing=await db.one('SELECT * FROM post_comments WHERE id=?',id);
      if(existing&&(existing.author!==u.id||existing.post!==comments[1]))fail(409,'No se pudo guardar el comentario.');
      if(!existing)await db.run('INSERT INTO post_comments(id,post,author,text,created) VALUES(?,?,?,?,?)',id,comments[1],u.id,text,Date.now());
      const comment=await commentValue(existing||await db.one('SELECT * FROM post_comments WHERE id=?',id),u);
      everyone('post-activity',{post:comments[1],comment:id});json(res,{comment,commentsCount:await commentCount(comments[1])},201);return true;
    }
    const comment=p.match(/^\/api\/comments\/([a-f0-9-]+)$/);
    if(comment&&method==='GET'){json(res,{comment:await commentValue(await findComment(comment[1]),u)});return true;}
    if(comment&&method==='PATCH'){
      if(!u)fail(401,'Inicia sesión.');const current=await findComment(comment[1]);if(current.author!==u.id)fail(403,'Solo puedes editar tus comentarios.');
      const b=await body(req),text=String(b.text||'').trim();if(!text||text.length>1500)fail(400,'Escribe un comentario de hasta 1500 caracteres.');
      await db.run('UPDATE post_comments SET text=?,edited=? WHERE id=?',text,Date.now(),current.id);everyone('post-activity',{post:current.post,comment:current.id});json(res,{comment:await commentValue(await findComment(current.id),u)});return true;
    }
    const reaction=p.match(/^\/api\/(posts|comments)\/([a-f0-9-]+)\/reaction$/);
    if(reaction&&method==='POST'){
      if(!u)fail(401,'Inicia sesión para reaccionar.');checkRate(req,'social-reactions',300,3600000);
      const kind=reaction[1]==='posts'?'post':'comment',item=kind==='post'?await findPost(reaction[2]):await findComment(reaction[2]);
      const b=await body(req);if(typeof b.emoji!=='string'||(b.emoji&&!reactionEmojis.has(b.emoji)))fail(400,'Elige una reacción del selector.');
      const table=kind==='post'?'post_reactions':'comment_reactions',column=kind==='post'?'post':'comment';
      if(b.emoji)await db.run(`INSERT INTO ${table}(${column},user_id,emoji) VALUES(?,?,?) ON CONFLICT(${column},user_id) DO UPDATE SET emoji=excluded.emoji`,item.id,u.id,b.emoji);
      else await db.run(`DELETE FROM ${table} WHERE ${column}=? AND user_id=?`,item.id,u.id);
      everyone('post-activity',{post:kind==='post'?item.id:item.post,...(kind==='comment'?{comment:item.id}:{})});json(res,{reactions:await summary(kind,item.id,u)});return true;
    }
    return false;
  }
  return {handle,summary,commentCount};
}
