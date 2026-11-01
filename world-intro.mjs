import {randomUUID} from 'node:crypto';
export const WORLD_INTRO={version:'world-intro-20261101',url:'/juegos/media/the-x-world-intro.mp4',mobileUrl:'/juegos/media/the-x-world-intro-mobile.mp4',duration:64.6};
export function createWorldIntro({db,now=Date.now}){
 const fail=message=>{throw Object.assign(Error(message),{status:409});};
 async function status(user){const row=await db.one('SELECT * FROM world_intro_views WHERE user_id=?',user.id);return {...WORLD_INTRO,seen:row?.version===WORLD_INTRO.version&&Number(row.completed)>0};}
 async function start(user){const session=randomUUID(),at=now();await db.run('INSERT INTO world_intro_views(user_id,version,completed,session,started) VALUES(?,?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET completed=CASE WHEN world_intro_views.version=excluded.version THEN world_intro_views.completed ELSE 0 END,session=CASE WHEN world_intro_views.version=excluded.version AND world_intro_views.completed=0 THEN world_intro_views.session ELSE excluded.session END,started=CASE WHEN world_intro_views.version=excluded.version AND world_intro_views.completed=0 THEN world_intro_views.started ELSE excluded.started END,version=excluded.version',user.id,WORLD_INTRO.version,session,at);const row=await db.one('SELECT session FROM world_intro_views WHERE user_id=?',user.id);return {...await status(user),session:row.session};}
 async function complete(user,input){const row=await db.one('SELECT * FROM world_intro_views WHERE user_id=?',user.id);if(row?.version===WORLD_INTRO.version&&Number(row.completed)>0)return {seen:true};
  if(!row||row.version!==WORLD_INTRO.version||row.session!==input.session||now()-Number(row.started)<WORLD_INTRO.duration*1000-1200||!Number.isFinite(input.position)||input.position<WORLD_INTRO.duration-.6)fail('La introducción debe reproducirse completa antes de continuar.');
  await db.run('UPDATE world_intro_views SET completed=? WHERE user_id=? AND session=?',now(),user.id,input.session);return {seen:true};
 }
 return {status,start,complete};
}
