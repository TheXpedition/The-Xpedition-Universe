import {isStaff} from './account-roles.mjs';

export function createModeration({db,json,fail,checkRate,everyone}){
 async function handle(req,res,url,user){
  const removal=url.pathname.match(/^\/api\/(posts|comments)\/([a-f0-9-]+)$/),restore=url.pathname.match(/^\/api\/moderation\/(post|comment)\/([a-f0-9-]+)\/restore$/),list=url.pathname==='/api/moderation';
  if(!(removal&&req.method==='DELETE')&&!(restore&&req.method==='POST')&&!(list&&req.method==='GET'))return false;
  if(!user)fail(401,'Inicia sesión.');if(!isStaff(user.id))fail(403,'Solo el Staff de The Xpedition puede moderar la comunidad.');
  if(list){const rows=await db.all("SELECT r.kind,r.item_id AS id,r.created,COALESCE(p.text,c.text,'') AS text,COALESCE(p.author,c.author) AS author_id FROM community_removals r LEFT JOIN posts p ON r.kind='post' AND p.id=r.item_id LEFT JOIN post_comments c ON r.kind='comment' AND c.id=r.item_id ORDER BY r.created DESC,r.item_id DESC LIMIT 50");json(res,{removals:rows.map(r=>({...r,text:r.text.slice(0,300)}))});return true;}
  checkRate(req,'moderation',100,3600000);
  const kind=restore?restore[1]:removal[1]==='posts'?'post':'comment',id=restore?restore[2]:removal[2],table=kind==='post'?'posts':'post_comments';
  const item=await db.one(`SELECT * FROM ${table} WHERE id=?`,id);if(!item)fail(404,'Contenido no disponible.');
  if(restore)await db.run('DELETE FROM community_removals WHERE kind=? AND item_id=?',kind,id);
  else await db.run('INSERT INTO community_removals(kind,item_id,moderator,created) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',kind,id,user.id,Date.now());
  everyone('moderation',{kind,id,post:kind==='post'?id:item.post,removed:!restore});json(res,{ok:true});return true;
 }
 return {handle};
}
