import {randomUUID} from 'node:crypto';
import {isStaff} from './account-roles.mjs';
import {createArcadeProgress} from './arcade-progress.mjs';

export const arcadeGames=Object.freeze([
 {id:'x-million',name:'THE X MILLION',character:'Bonju',url:'/simulator/x-million/',cover:'/simulator/x-million/assets/stage.webp',description:'Una pregunta puede llevarte al millón. Juega individual o compite en vivo con tus amigos.',questionCount:150,defaultPublic:false},
 {id:'ice-breaker',name:'Antarctica — Ice Breaker',character:'Dani',url:'/simulator/ice-breaker/',cover:'/arcade/ice-breaker-poster.png',description:'Acompaña a Dani entre glaciares, recoge cristales y encuentra el camino a la base.'}
]);

export function createArcade({db,json,fail,body,checkRate,progression,now=Date.now,everyone=()=>{}}){
 const find=id=>{const game=arcadeGames.find(g=>g.id===id);if(!game)fail(404,'Juego no encontrado.');return game;};
 async function access(id,user){
  const game=find(id),row=await db.one('SELECT public_enabled,updated FROM arcade_access WHERE game_id=?',id),publicEnabled=row?Number(row.public_enabled)===1:!!game.defaultPublic;
  return {...game,publicEnabled,canPlay:publicEnabled||isStaff(user?.id),staffPreview:!publicEnabled&&isStaff(user?.id),updated:Number(row?.updated||0)};
 }
 const progress=createArcadeProgress({db,json,fail,body,checkRate,access,progression,now});
 async function handle(req,res,url,user){
  if(await progress.handle(req,res,url,user))return true;
  const p=url.pathname,admin=p.startsWith('/api/moderation/games'),list=p==='/api/arcade/games'||p==='/api/moderation/games',selected=p.match(/^\/api\/(?:arcade|moderation)\/games\/([a-z0-9-]+)$/);
  if(!list&&!selected)return false;
  res.setHeader?.('Cache-Control','private, no-store');res.setHeader?.('Vary','Cookie');
  if(admin){if(!user)fail(401,'Inicia sesión.');if(!isStaff(user.id))fail(403,'Solo el Staff puede administrar los juegos.');}
  if(req.method==='GET'){
   json(res,list?{games:await Promise.all(arcadeGames.map(g=>access(g.id,user)))}:{game:await access(selected[1],user)});return true;
  }
  if(admin&&selected&&req.method==='PUT'){
   const game=find(selected[1]);checkRate(req,'arcade-access',60,3600000);const input=await body(req);
   if(typeof input.publicEnabled!=='boolean')fail(400,'Indica si el juego estará abierto al público.');
   await db.transaction(async()=>{
    const old=await access(game.id,user);if(old.publicEnabled===input.publicEnabled)return;
    const now=Date.now();
    await db.run('INSERT INTO arcade_access(game_id,public_enabled,updated_by,updated) VALUES(?,?,?,?) ON CONFLICT(game_id) DO UPDATE SET public_enabled=excluded.public_enabled,updated_by=excluded.updated_by,updated=excluded.updated',game.id,input.publicEnabled?1:0,user.id,now);
    await db.run('INSERT INTO moderation_actions(id,moderator,action,subject,details,created) VALUES(?,?,?,?,?,?)',randomUUID(),user.id,input.publicEnabled?'open-game':'close-game',game.id,JSON.stringify({name:game.name,publicEnabled:input.publicEnabled}),now);
   });
   everyone('arcade-access',{id:game.id});json(res,{game:await access(game.id,user)});return true;
  }
  fail(405,'Acción no permitida.');
 }
 return {handle,access};
}
