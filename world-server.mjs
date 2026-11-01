// Independent process: no community renderer, moderation model or account creation.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {openDatabase} from './database.mjs';
import {loadAccountVerifications} from './account-roles.mjs';
import {createWorldAuth} from './world-auth.mjs';
import {createReviewEntry,reviewEntryConfiguration} from './world-review-entry.mjs';
import {applicationURL} from './world-gateway.mjs';
import {createWorld} from './world.mjs';
import {createWorldMessages} from './world-messages.mjs';
import {createArcade} from './arcade.mjs';
import {createDodgeballNetwork} from './dodgeball-network.mjs';
import {createProgression} from './progression.mjs';
const root=import.meta.dirname,publicDir=path.join(root,'public'),db=await openDatabase(path.resolve(process.env.DATA_DIR||path.join(root,'data')));
await loadAccountVerifications(db);
if(process.env.NODE_ENV==='production'&&process.env.RENDER_EXTERNAL_URL){const published=applicationURL(process.env.RENDER_EXTERNAL_URL);await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated','world-service:public-url',JSON.stringify({url:published.href,service:'world'}),Date.now());}
const universe=applicationURL(process.env.UNIVERSE_URL||'http://127.0.0.1:3000');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'});res.end(JSON.stringify(value));}
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)fail(413,'El mensaje es demasiado grande.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Solicitud inválida.');}}
const limits=new Map();function checkRate(req,group,max,windowMs){const ip=process.env.TRUST_PROXY==='true'?String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim():req.socket.remoteAddress,key=ip+':'+group,t=Date.now();let row=limits.get(key);if(!row||row.until<t){row={count:0,until:t+windowMs};limits.set(key,row);}if(++row.count>max)fail(429,'Demasiados intentos. Espera un momento.');}
let queue=Promise.resolve();async function serialize(fn){const previous=queue;let done;queue=new Promise(r=>done=r);await previous;try{return await fn();}finally{done();}}
const auth=createWorldAuth({db,fail}),getSession=auth.getSession;
const reviewEntry=createReviewEntry({db,configuration:reviewEntryConfiguration()});
const progression=createProgression({db,shop:JSON.parse(fs.readFileSync(path.join(publicDir,'simulator/catalog.json'))),catalog:JSON.parse(fs.readFileSync(path.join(publicDir,'catalog.json'))),body,json,fail,checkRate,serialize,notify:async()=>{}});
const arcade=createArcade({db,json,fail,body,checkRate,progression,worldOnly:true,worldChallenge:user=>world.challengeAccess(user),canCompete:user=>world.canCompete(user)});
// Review immunity is confined to the explicitly launched loopback test fixture.
const reviewStaffId=process.env.NODE_ENV==='test'&&process.env.HOST==='127.0.0.1'&&!process.env.DATABASE_URL?process.env.WORLD_REVIEW_STAFF_ID||'':'';
const world=createWorld({db,json,fail,body,getSession,progression,arcade,reviewStaffId});
const dodgeball=createDodgeballNetwork({authorize:async identity=>{const current=await getSession(identity.request);return !!current&&(await world.challengeAccess(current,'dodgeball'))&&(!identity.director||await world.canDirect(current));}});
const messages=createWorldMessages({db,json,fail,body,checkRate});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.mp4':'video/mp4','.webm':'video/webm'};
async function api(req,res,url){
 checkRate(req,'api',300,60000);
 if(req.method==='GET'&&url.pathname==='/api/health')return json(res,{ok:true,service:'world',separateProcess:true});
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{fail(403,'Origen inválido.');}if(origin.host!==req.headers.host)fail(403,'Abre esta acción dentro de World.');}
 if(req.method==='POST'&&url.pathname==='/api/world/session'){checkRate(req,'session',30,60000);return json(res,await auth.exchange(req,res,await body(req)));}
 const user=await getSession(req);
 if(await world.handle(req,res,url,user))return;
 if(!(await world.access(user)).canPlay)fail(user?403:401,'Entra a World desde tu cuenta del universo.');
 if(await messages.handle(req,res,url,user))return;
 if(url.pathname.startsWith('/api/arcade/ice-breaker')||url.pathname==='/api/arcade/games'||url.pathname==='/api/arcade/games/ice-breaker'){if(await arcade.handle(req,res,url,user))return;}
 fail(404,'Esta función pertenece al universo o no está disponible en World.');
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 try{
  const url=new URL(req.url,'http://localhost');if(await reviewEntry(req,res,url))return;if(url.pathname.startsWith('/api/'))return await api(req,res,url);
  if(!['GET','HEAD'].includes(req.method))fail(405,'Método no permitido.');
  if(url.pathname==='/'){res.writeHead(302,{Location:'/juegos/'});return res.end();}
  if(url.pathname==='/world-config.js'){res.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'no-store'});return res.end('globalThis.XpeditionUniverseURL='+JSON.stringify(universe.origin)+';');}
  let relative=decodeURIComponent(url.pathname);if(/^\/juegos\/x-protocol\/?$/.test(relative))relative='/juegos/x-protocol/index.html';if(/^\/juegos\/last-grip\/?$/.test(relative))relative='/juegos/last-grip/index.html';if(relative==='/auth')relative='/juegos/auth.html';if(/^\/juegos\/?$/.test(relative))relative='/juegos/index.html';if(/^\/juegos\/reto-pelotas\/?$/.test(relative))relative='/juegos/reto-pelotas/index.html';if(/^\/simulator\/ice-breaker\/?$/.test(relative))relative='/simulator/ice-breaker/index.html';
  const filename=path.resolve(publicDir,'.'+relative),asset=path.relative(publicDir,filename).replace(/\\/g,'/');
  if(!filename.startsWith(publicDir+path.sep)||!(/^(?:juegos\/|assets\/maps\/apocalypse\/|assets\/branding\/apocalypse\/|simulator\/ice-breaker\/|brand\/|arcade\/ice-breaker|performance\.(?:js|mjs|css)$)/.test(asset))||!fs.existsSync(filename)||!fs.statSync(filename).isFile())fail(404,'Página no encontrada.');
  if(asset==='juegos/recorrido-visual.html'){const user=await getSession(req);if(!(await world.access(user)).canPlay)fail(user?403:401,'La revisión es privada.');}
  if(asset.startsWith('juegos/x-protocol/')||asset.startsWith('juegos/last-grip/')){const user=await getSession(req);if(!(await world.access(user)).canPlay)fail(user?403:401,'Entra al reto desde tu sesión de World.');}
  if(asset.startsWith('juegos/last-grip/review')){const user=await getSession(req);if(!await world.canDirect(user))fail(403,'La revisión con bots es exclusiva de Dirección.');}
  if(asset.startsWith('juegos/reto-pelotas/')){const user=await getSession(req);if(!(await world.access(user)).canPlay)fail(user?403:401,'El reto está disponible desde tu sesión de World.');}
  if(asset==='juegos/reto-pelotas/index.html'){const user=await getSession(req);if(!await world.challengeAccess(user,'dodgeball'))fail(user?403:401,'Esquiva Pelotas está cerrado. Dirección decide cuándo abrirlo.');}
  const shared=/^simulator\/ice-breaker\/(?:[^/]+\.mjs|art\/)/.test(asset);
  if(asset.startsWith('simulator/ice-breaker/')){const user=await getSession(req);if(!(shared?(await world.access(user)).canPlay:await world.challengeAccess(user)))fail(user?403:401,'Este espacio está cerrado. Entra desde World.');}
  const stat=fs.statSync(filename),etag='W/"'+stat.size.toString(16)+'-'+stat.mtimeMs.toString(16)+'"';res.setHeader('Cache-Control',asset.startsWith('simulator/')?'private, no-cache':/\.(mjs|js|html|json|css)$/.test(asset)?'no-cache':'private, max-age=86400');res.setHeader('Vary','Cookie');res.setHeader('ETag',etag);
  if(req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}
  const headers={'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'Accept-Ranges':'bytes'};let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||!m[1]&&!m[2]){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end();}start=m[1]?Number(m[1]):Math.max(0,stat.size-Number(m[2]));end=m[1]&&m[2]?Math.min(stat.size-1,Number(m[2])):stat.size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});return res.end();}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;headers['Content-Length']=end-start+1;}
  res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(filename,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }catch(e){if(res.headersSent)return res.end();if(!e.status)console.error(e);json(res,{error:e.status?e.message:'No se pudo completar la operación.'},e.status||500);}
});
server.on('upgrade',(req,socket,head)=>{
 if(req.url?.split('?')[0]==='/juegos/reto-pelotas/ws'){
  void (async()=>{const origin=req.headers.origin&&new URL(req.headers.origin);if(!origin||origin.host!==req.headers.host){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}const user=await getSession(req);if(!user||!(await world.access(user)).canPlay||!await world.challengeAccess(user,'dodgeball')){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    dodgeball.upgrade(req,socket,head,{name:user.name,director:await world.canDirect(user),request:req});
  })().catch(()=>socket.destroy());return;
 }
 void world.upgrade(req,socket,head).then(handled=>{if(!handled)socket.destroy();}).catch(()=>socket.destroy());
});
server.listen(Number(process.env.PORT||3001),process.env.HOST||'127.0.0.1',()=>console.log('The Xpedition World · http://localhost:'+server.address().port));
setInterval(()=>{const t=Date.now();for(const [key,value]of limits)if(value.until<t)limits.delete(key);},60000).unref();
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;await world.close();dodgeball.close();server.close(async()=>{await db.close();process.exit(0);});});
