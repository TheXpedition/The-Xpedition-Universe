// Restricted to the explicitly launched, isolated loopback review.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {digest} from './world-gateway.mjs';
export const REVIEW_USER='92354719-8816-4e25-9199-0dc9a99f7da1';
export function reviewEntryConfiguration(env=process.env){
 if(env.NODE_ENV!=='test'||env.HOST!=='127.0.0.1'||env.DATABASE_URL||env.WORLD_REVIEW_STAFF_ID!==REVIEW_USER||!/^[a-f0-9]{64}$/.test(env.WORLD_REVIEW_ENTRY_KEY||''))return null;
 return {userId:REVIEW_USER,key:env.WORLD_REVIEW_ENTRY_KEY};
}
export function createReviewEntry({db,configuration,now=Date.now}){
 return async function enter(req,res,url){
  if(url.pathname!=='/review/staff')return false;
  const peer=req.socket?.remoteAddress,host=req.headers.host||'',key=url.searchParams.get('key')||'';
  if(!configuration||req.method!=='GET'||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(peer)||!/^127\.0\.0\.1:\d+$/.test(host)||!/^[a-f0-9]{64}$/.test(key)||!timingSafeEqual(Buffer.from(key),Buffer.from(configuration.key))){res.writeHead(404,{'Cache-Control':'no-store'});res.end();return true;}
  const user=await db.one('SELECT id,email FROM users WHERE id=?',configuration.userId);
  if(user?.email!=='review@example.invalid'){res.writeHead(404,{'Cache-Control':'no-store'});res.end();return true;}
  const parent=randomBytes(32).toString('hex'),token=randomBytes(32).toString('hex'),expires=now()+86400000;
  await db.transaction(async()=>{await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',digest(parent),user.id,expires);await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',digest(token),digest(parent),user.id,expires);});
  const destination=url.searchParams.get('next')==='last-grip-review'?'/juegos/last-grip/review.html':'/juegos/';
  res.writeHead(302,{Location:destination,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Set-Cookie':'xp_world_session='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400'});res.end();return true;
 };
}
