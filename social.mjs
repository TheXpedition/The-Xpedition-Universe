import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {moderateImage} from './moderation.mjs';

export const feelings=['feliz','triste','enojada','burletona','enamorada','orgullosa','traicionada','asqueada','positiva','decepcionada','enferma','solitaria','cachonda'];
export function identityValues(b,u,fail){
  const gender=b.genderIdentity===undefined?u.gender_identity:String(b.genderIdentity);
  let pronouns=b.pronouns===undefined?u.pronouns:String(b.pronouns);
  const orientation=b.orientation===undefined?u.orientation:String(b.orientation);
  const visible=b.orientationVisible===undefined?Number(u.orientation_visible):b.orientationVisible===true?1:b.orientationVisible===false?0:-1;
  if(!['','Mujer','Hombre','No Binario','Therian'].includes(gender)||!['','Heterosexual','Homosexual','Bisexual','Pansexual','Otro'].includes(orientation)||visible===-1)fail(400,'Revisa los datos de identidad del perfil.');
  if(gender==='Mujer')pronouns='ella';if(gender==='Hombre')pronouns='el';
  if(!gender)pronouns='';
  if(!['','ella','el','elle'].includes(pronouns)||(['No Binario','Therian'].includes(gender)&&!pronouns))fail(400,'Elige tus pronombres preferidos.');
  return [gender,pronouns,orientation,visible];
}
export function popularityOrder(characters,details){
  const first=['Bonju','Dani','Isabel','Luciano','Andromeda','Alexandro','Coronel','Peggy','Ivy','Catalina','Lucas Mendez','Bayron','Felix','Daelly','Dua Lingo','Eduard','Iñaella Rose','Julián','Marcos','Alice','Bryan Montalvo','Sal Lua','Mary Hao','Leandro','Carlos Harrington','Vita','Ximena','Luis','Kim Camila','Ignacio Ricci','Pier','Gabriel Sab','Esteban','Adriana Pereira','Bodega Bodeguita','Beto','Ari Salgado','Renata','Pablo','Nahuee','Teseo','Marianito','Cocomong'];
  first.splice(2,0,'Britney Britney');first.splice(14,0,'Eduardo Buñuelo');first.splice(19,0,'Dios');
  first.splice(first.indexOf('Dua Lingo'),1);
  first.splice(1,0,'Jiafei','Dua Lingo');
  first.splice(10,0,'Nicki Gorilaj','Pepi','Nidia Mirella','Mel Rz','Edna Droga');
  const last=['Damián','Agus','Amanda Lewis','Brave','Atneimip','Edson','Cassie Casu','Emmy Mango','Gokuh Moreno','Imanol','Alexia','Katy','Kareli','Julie','Maicol','Lui Mclean','Pilar','Rodri','Sadith','Stephany','Carlos Rojas','Alex Yohender','Ashley','Candy Cookies','Cinthia Carral','Emily Waldorf','Gaba Hochbaum','Isaac','Jared','Jeyson','Joaquin','Jose Serna','Maria Luna','Valery Ocampo','Vladimir'];
  last.splice(last.length-1,0,'Gustavo');
  const key=n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const available=new Map(characters.map(c=>[key(c.name),c]));
  const priority=new Set(['antarctica','safari','traitor-showdown'].flatMap(id=>details[id]?.cast||[]).map(key));
  const used=new Set([...first,...last].map(key));
  const rest=characters.filter(c=>!used.has(key(c.name))).sort((a,b)=>Number(priority.has(key(b.name)))-Number(priority.has(key(a.name)))||a.name.localeCompare(b.name,'es'));
  const newcomers=['Jose Julián','Meow','Neila Drag','Robert'],newKeys=new Set(newcomers.map(key));
  const ordered=[...first.map(n=>available.get(key(n))),...rest,...last.map(n=>available.get(key(n)))].filter(c=>c&&!newKeys.has(key(c.name)));
  ordered.splice(Math.floor(ordered.length*.63),0,...newcomers.map(n=>available.get(key(n))).filter(Boolean));return ordered;
}
export function createSocial({db,storage,characters,details,stickers,userFields,body,json,fail,checkRate,serialize,everyone,interactions,progression}){
  const order=popularityOrder(characters,details),ids=new Set(characters.map(c=>c.id));
  const visitorSecret=process.env.DATABASE_PASSWORD||randomBytes(32).toString('hex');
  async function ranks(counts){
    const views=new Map((await db.all('SELECT character,views FROM character_views')).map(v=>[v.character,Number(v.views)]));
    const sorted=order.map((c,i)=>({id:c.id,seed:i,views:views.get(c.id)||0,score:(order.length-i)*100+(views.get(c.id)||0)+(counts.get(c.id)||0)*12})).sort((a,b)=>b.score-a.score||a.seed-b.seed);
    return new Map(sorted.map((c,i)=>[c.id,{popularityRank:i+1,visits:c.views}]));
  }
  async function postValue(post,viewer){
    const author=await db.one('SELECT * FROM users WHERE id=?',post.author);
    const mentions=await db.all('SELECT target FROM post_mentions WHERE post=?',post.id);
    const profiles=[];
    for(const {target} of mentions){const c=characters.find(c=>c.id===target);const u=c?null:await db.one('SELECT * FROM users WHERE id=?',target);if(c||u)profiles.push(c?{id:c.id,name:c.name,avatar:c.avatar,character:true}:userFields(u));}
    return {id:post.id,text:post.text,author:userFields(author),created:post.created,feeling:post.feeling,sticker:post.sticker?stickers.get(post.sticker):null,image:post.image?'/api/post-images/'+post.id:null,mentions:profiles,archived:!!post.archived,reactions:await interactions.summary('post',post.id,viewer),commentsCount:await interactions.commentCount(post.id)};
  }
  async function handle(req,res,url,u){
    const p=url.pathname,method=req.method;
    const visit=p.match(/^\/api\/characters\/([^/]+)\/view$/);
    if(visit&&method==='POST'){
      const id=decodeURIComponent(visit[1]);if(!ids.has(id))fail(404,'Personaje no encontrado.');
      checkRate(req,'profile-view',300,3600000);
      const ip=process.env.TRUST_PROXY==='true'?String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim():req.socket.remoteAddress;
      const visitor=createHmac('sha256',visitorSecret).update(u?'user:'+u.id:'visitor:'+ip+':'+String(req.headers['user-agent']||'')).digest('hex');
      const inserted=await db.run('INSERT INTO character_visits(character,visitor,day) VALUES(?,?,?) ON CONFLICT DO NOTHING',id,visitor,Math.floor(Date.now()/86400000));
      if(inserted.changes)await db.run('INSERT INTO character_views(character,views) VALUES(?,1) ON CONFLICT(character) DO UPDATE SET views=character_views.views+1',id);
      json(res,{ok:true});return true;
    }
    if(p==='/api/posts'&&method==='GET'){
      const author=url.searchParams.get('author'),archived=url.searchParams.get('archived')==='1';
      if(archived&&(!u||author!==u.id))fail(403,'Solo puedes consultar tu archivo.');
      const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
      if(!Number.isSafeInteger(before)||before<0)fail(400,'Página inválida.');
      const beforeId=String(url.searchParams.get('beforeId')||'');
      const query="SELECT * FROM posts p WHERE NOT EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='post' AND r.item_id=p.id) AND archived=? AND (created<? OR (created=? AND id<?))"+(author?' AND author=?':'')+' ORDER BY created DESC,id DESC LIMIT 21';
      const list=await db.all(query,...[archived?1:0,before,before,beforeId,...(author?[author]:[])]);
      json(res,{posts:await Promise.all(list.slice(0,20).map(post=>postValue(post,u))),hasMore:list.length>20});return true;
    }
    const image=p.match(/^\/api\/post-images\/([a-f0-9-]+)$/);
    if(image&&['GET','HEAD'].includes(method)){
      const post=await db.one("SELECT * FROM posts p WHERE id=? AND archived=0 AND NOT EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='post' AND r.item_id=p.id)",image[1]);
      if(!post?.image)fail(404,'Imagen no disponible.');
      const bytes=await storage.get(post.image);res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(method==='HEAD'?undefined:bytes);return true;
    }
    if(p==='/api/posts'&&method==='POST'){
      if(!u)fail(401,'Inicia sesión para publicar.');checkRate(req,'posts',20,3600000);
      const b=await body(req),text=String(b.text||'').trim(),feeling=String(b.feeling||''),sticker=String(b.sticker||'');
      if(text.length>3000||(!text&&!b.image&&!sticker&&!feeling))fail(400,'Escribe algo o elige una imagen, sticker o sentimiento.');
      if(feeling&&!feelings.includes(feeling))fail(400,'Sentimiento inválido.');
      if(sticker&&!stickers.has(sticker))fail(400,'Elige un sticker de la colección.');
      if(sticker&&b.image)fail(400,'Elige una imagen o un sticker por publicación.');
      if(!Array.isArray(b.mentions||[])||(b.mentions||[]).length>10)fail(400,'Puedes mencionar hasta 10 perfiles.');
      const mentions=[...new Set(b.mentions||[])];
      for(const id of mentions)if(typeof id!=='string'||(!ids.has(id)&&!await db.one('SELECT id FROM users WHERE id=?',id)))fail(400,'Uno de los perfiles mencionados no existe.');
      let bytes;
      if(b.image){
        if(typeof b.image!=='string'||b.image.length>5600000||!/^[a-zA-Z0-9+/]+={0,2}$/.test(b.image))fail(400,'Imagen inválida o demasiado grande. Máximo 4 MB.');
        const data=Buffer.from(b.image,'base64');if(data.length>4*1024*1024)fail(413,'La imagen admite hasta 4 MB.');
        bytes=await moderateImage(data);
      }
      const id=randomUUID(),file=bytes?'post-'+id:null;
      if(file)await storage.put(file,bytes,'image/png');
      try{
        await serialize(async()=>{
          await db.transaction(async()=>{
            await db.run('INSERT INTO posts(id,author,text,image,mime,sticker,feeling,created) VALUES(?,?,?,?,?,?,?,?)',id,u.id,text,file,file?'image/png':null,sticker||null,feeling,Date.now());
            for(const target of mentions)await db.run('INSERT INTO post_mentions(post,target) VALUES(?,?)',id,target);
          });
        });
      }catch(error){if(file)await storage.remove(file).catch(()=>{});throw error;}
      await serialize(()=>progression.socialAction(u.id,'post',text.trim().toLowerCase(),text||'Una imagen de la comunidad'));
      everyone('posts',{});json(res,{post:await postValue(await db.one('SELECT * FROM posts WHERE id=?',id),u)},201);return true;
    }
    const edit=p.match(/^\/api\/posts\/([a-f0-9-]+)$/);
    if(edit&&method==='PATCH'){
      if(!u)fail(401,'Inicia sesión.');const post=await db.one("SELECT * FROM posts p WHERE id=? AND NOT EXISTS (SELECT 1 FROM community_removals r WHERE r.kind='post' AND r.item_id=p.id)",edit[1]);
      if(!post||post.author!==u.id)fail(404,'Publicación no disponible.');
      const b=await body(req);if(typeof b.archived!=='boolean')fail(400,'Acción inválida.');
      await db.run('UPDATE posts SET archived=? WHERE id=?',b.archived?1:0,post.id);everyone('posts',{});json(res,{ok:true});return true;
    }
    return false;
  }
  return {handle,ranks};
}
