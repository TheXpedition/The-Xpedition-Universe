// Account bridge only: no World physics, sockets or game timers in the main site.
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {isStaff} from './account-roles.mjs';
import {createWorldParticipation} from './world-participation.mjs';
import {createWorldServers} from './world-servers.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const cookieValue=(req,name)=>(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';
export function applicationURL(value){if(!value)return null;const u=new URL(value),local=u.hostname==='localhost'||u.hostname.endsWith('.localhost')||u.hostname==='127.0.0.1';if(u.username||u.password||u.protocol!=='https:'&&!(local&&u.protocol==='http:'))throw Error('La URL de World debe usar HTTPS.');return new URL(u.origin);}
export function createWorldGateway({db,json,fail,getSession,body,worldURL=process.env.WORLD_URL,now=Date.now,onDeleteServer=async()=>{}}){
 const participation=createWorldParticipation({db,now});
 async function destination(){let value=worldURL;if(!value){const row=await db.one('SELECT state FROM world_environment WHERE id=?','world-service:public-url');try{value=JSON.parse(row?.state||'{}').url;}catch{}}if(!value)return null;try{applicationURL(value);const url=new URL(value);url.search='';url.hash='';url.pathname=url.pathname.replace(/\/$/,'');return url;}catch{return null;}}
 async function access(user){const row=await db.one('SELECT enabled FROM world_access WHERE resource=?','world'),publicEnabled=!!Number(row?.enabled),staff=isStaff(user?.id),role=await participation.role(user,{staff}),target=await destination();return {publicEnabled,canPlay:!!user&&(staff||publicEnabled&&role.confirmed),staffPreview:staff&&!publicEnabled,configured:!!target,inline:target?.pathname.replace(/\/$/,'')==='/world-play',...role};}
 const servers=createWorldServers({db,json,fail,body,access,now,onDelete:onDeleteServer});
 async function launch(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');
  const user=await getSession(req);if(!user){res.writeHead(302,{Location:'/?auth=login&returnTo=%2Fjuegos%2F#world'});res.end();return;}
  const serverId=new URL(req.url,'http://localhost').searchParams.get('server');if(!serverId){res.writeHead(302,{Location:'/#world'});res.end();return;}
  await servers.enter(user,serverId);
  const targetOrigin=await destination();if(!targetOrigin){res.writeHead(302,{Location:'/#world'});res.end();return;}
  const parent=digest(cookieValue(req,'xp_session')),ticket=randomBytes(32).toString('hex');
  // Single use, with time for a free instance to wake up before the exchange.
  await db.run('INSERT INTO world_handoffs(token,parent_token,user_id,expires) VALUES(?,?,?,?)',digest(ticket),parent,user.id,now()+300000);
  const target=new URL(targetOrigin.href.replace(/\/$/,'')+'/servers/'+serverId+'/auth');if(process.env.NODE_ENV==='test'&&process.env.WORLD_LOCAL_ALIASES==='true'){const local=new URL('http://'+req.headers.host);if(local.hostname.endsWith('.localhost')||local.hostname==='localhost')target.hostname=local.hostname;}
  target.hash='ticket='+ticket;res.writeHead(302,{Location:target.href});res.end();
 }
 async function handle(req,res,url,user){
  if(url.pathname==='/api/world/access'&&req.method==='GET'){json(res,await access(user));return true;}
  if(await servers.handle(req,res,url,user))return true;
  if(url.pathname!=='/api/moderation/world')return false;
  if(!user)fail(401,'Inicia sesión.');if(!isStaff(user.id))fail(403,'Solo el STAFF puede administrar World.');
  if(req.method==='PUT'){
   const input=await body(req);if(typeof input.enabled!=='boolean')fail(400,'Indica si deseas abrir o cerrar World.');
   await db.transaction(async()=>{await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,?,?,?) ON CONFLICT(resource) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated=excluded.updated','world',input.enabled?1:0,user.id,now());await db.run('INSERT INTO moderation_actions(id,moderator,action,subject,details,created) VALUES(?,?,?,?,?,?)',randomUUID(),user.id,'world:access','world',JSON.stringify({enabled:input.enabled}),now());});
  }else if(req.method!=='GET')fail(405,'Acción no permitida.');
  json(res,{access:await access(user)});return true;
 }
 return {handle,launch,access,canCompete:participation.canCompete};
}
