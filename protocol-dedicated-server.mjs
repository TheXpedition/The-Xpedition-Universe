// Independent, authoritative X Protocol process.
// This service owns *all* ceremony state transitions, votes, advantages, results,
// inventory transactions and socket fan-out. World only forwards authenticated
// player presence/controls, preserving the existing client and URLs.
import http from 'node:http';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {openDatabase} from './database.mjs';
import {serverDatabase} from './world-server-store.mjs';
import {loadAccountVerifications,isStaff} from './account-roles.mjs';
import {createWorldShop} from './world-shop-service.mjs';
import {createWorldParticipation} from './world-participation.mjs';
import {createProtocolService} from './world-protocol-service.mjs';

const validScope=value=>value===''||/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const sendJson=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
const safeSecret=(given,secret)=>{
 if(typeof given!=='string'||!secret)return false;
 const a=Buffer.from(given),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
};
const readBody=async req=>{
 let count=0;const chunks=[];
 for await(const piece of req){count+=piece.length;if(count>65536)fail(413,'Solicitud demasiado grande.');chunks.push(piece);}
 try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
 catch{fail(400,'JSON inválido.');}
};

export async function startProtocolDedicatedServer({
 port=Number(process.env.PORT||3002),host=process.env.HOST||'127.0.0.1',
 secret=process.env.PROTOCOL_BRIDGE_SECRET||'',
 database=null,now=Date.now,
 engineWorker=process.env.PROTOCOL_ENGINE_WORKER
}={}){
 if(secret.length<32)throw Error('PROTOCOL_BRIDGE_SECRET requiere al menos 32 caracteres, configurados en Render sin publicarlos.');
 // Production must share the same Supabase database as World; never fork an isolated SQLite account inventory.
 if(!database&&process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL)throw Error('El motor independiente necesita el mismo DATABASE_URL de World.');
 const base=database||await openDatabase(path.resolve(process.env.DATA_DIR||'data'),{initialize:true});
 await loadAccountVerifications(base);
 const rooms=new Map(),wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
 let closed=false;
 const validUser=id=>typeof id==='string'&&id.length>0&&id.length<=128&&!/[^a-zA-Z0-9_-]/.test(id);
 const sendBridge=(bridge,value)=>{if(bridge.readyState===WebSocket.OPEN&&bridge.bufferedAmount<1048576)bridge.send(JSON.stringify(value));};
 async function createRoom(scope){
  const db=scope?await serverDatabase(base,scope):base;
  const peers=new Set(),clients=new Map(),members=new Map();
  const can=async(user,capability)=>{
   if(!user)return false;
   if(isStaff(user.id))return true;
   const row=await db.one('SELECT permissions FROM world_permissions WHERE user_id=?',user.id);
   let values=[];try{values=JSON.parse(row?.permissions||'[]');}catch{}
   return Array.isArray(values)&&values.includes(capability);
  };
  const signal=(message,filter=()=>true)=>{for(const peer of peers)if(filter(peer))sendBridge(peer,message);};
  const shop=createWorldShop({db,now,canDirect:u=>can(u,'direct'),canStaff:u=>can(u,'moderate'),canNurse:async()=>false,onChange:async ids=>{
   for(const id of ids)signal({type:'inventory-refresh',userId:id});
  }});
  const participation=createWorldParticipation({db,now});
  let environment=null;
  const protocol=createProtocolService({
   db,clients,send:(client,data)=>{
    if(client.bridge)sendBridge(client.bridge,{type:'deliver',userId:client.user.id,data});
   },can,now,shop,
   canParticipate:u=>participation.canCompete(u),
   getEnvironment:()=>environment,
   onRetreat:async c=>signal({type:'retreat',userId:c.user.id},peer=>peer===c.bridge),
   onRosterChange:async()=>signal({type:'roster-change'}),
   refreshInventory:async id=>signal({type:'inventory-refresh',userId:id}),
   onSpeech:announcement=>signal({type:'speech',announcement}),
   cancelSpeech:id=>signal({type:'speech-cancel',id}),
   // STAFF pre-start validation and player persistence have already happened
   // on the authenticated World gateway, before it forwards this action.
   beforeStart:async()=>{}
  });
  await protocol.ready;
  const status=()=>protocol.bridgeView();
  function remove(peer,userId){
   const member=members.get(userId);
   if(!member||member.bridge!==peer)return;
   protocol.disconnect(member);clients.delete(member.ws);members.delete(userId);
  }
  async function receive(peer,message){
   if(!message||typeof message!=='object'||Array.isArray(message))return;
   if(message.type==='attach'){
    const info=message.player||{};
    if(!validUser(info.id))return;
    const user=await base.one('SELECT id,name FROM users WHERE id=?',info.id);
    if(!user)return sendBridge(peer,{type:'error',userId:info.id,message:'Usuario no registrado.'});
    const old=members.get(info.id);
    if(old)remove(old.bridge,info.id);
    const fakeSocket={readyState:WebSocket.OPEN};
    const c={user,ws:fakeSocket,bridge:peer,direct:await can(user,'direct'),characterId:typeof info.characterId==='string'?info.characterId:'dani',zone:{id:info.zoneId||'base'},p:{x:Number(info.x)||0,y:Number(info.y)||0},vitals:info.vitals||{},lastChat:0};
    clients.set(fakeSocket,c);members.set(user.id,c);
    if(message.environment)environment=message.environment;
    await protocol.attach(c);
    sendBridge(peer,{type:'status',state:status()});
    return;
   }
   if(message.type==='detach'){
    if(validUser(message.userId))remove(peer,message.userId);
    return;
   }
   if(message.type==='input'){
    const c=members.get(message.userId);
    if(!c||c.bridge!==peer)return;
    const input=message.data;
    if(!input||typeof input.type!=='string'||!input.type.startsWith('protocol-'))return;
    if(input.type==='protocol-action'&&input.action?.type==='start'&&!message.startValidated)return;
    try{await protocol.handle(c,input);}
    catch(error){sendBridge(peer,{type:'deliver',userId:c.user.id,data:{type:'error',message:error.status?error.message:'La ceremonia no pudo completar la acción.'}});}
    return;
   }
   if(message.type==='sync')sendBridge(peer,{type:'status',state:status()});
  }
  const timer=setInterval(()=>signal({type:'status',state:status()}),900);
  timer.unref();
  return {db,peers,clients,members,protocol,shop,receive,remove,status,async close(){clearInterval(timer);for(const p of peers)p.close(1001,'Reinicio del motor');await protocol.close();}};
 }
 function room(scope){
  if(!validScope(scope))fail(400,'Servidor de World inválido.');
  if(!rooms.has(scope)){const task=createRoom(scope);rooms.set(scope,task);task.catch(()=>{if(rooms.get(scope)===task)rooms.delete(scope);});}
  return rooms.get(scope);
 }
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://protocol.invalid');
   if(url.pathname==='/api/health')return sendJson(res,{ok:true,service:'x-protocol-dedicated',rooms:rooms.size});
   if(!safeSecret(req.headers['x-protocol-bridge-secret'],secret))fail(403,'Puente privado de World no autorizado.');
   const scope=String(req.headers['x-protocol-scope']||'');
   const target=await room(scope);
   if(url.pathname==='/bridge/status')return sendJson(res,target.status());
   if(!url.pathname.startsWith('/api/world/x-protocol'))fail(404,'Función no disponible.');
   const actorId=String(req.headers['x-protocol-user']||'');
   if(!validUser(actorId))fail(401,'Usuario inválido.');
   const user=await base.one('SELECT id,name FROM users WHERE id=?',actorId);
   if(!user)fail(401,'Sesión no disponible.');
   await target.protocol.handleHttp(req,res,url,user,{body:readBody,json:sendJson});
  }catch(error){if(res.headersSent)return res.destroy();sendJson(res,{error:error.status?error.message:'El motor de la ceremonia no está disponible.'},error.status||503);}
 });
 server.on('upgrade',(req,socket,head)=>{
  void(async()=>{
   const url=new URL(req.url,'http://protocol.invalid');
   if(url.pathname!=='/bridge/live'||!safeSecret(req.headers['x-protocol-bridge-secret'],secret))fail(403,'Puente no autorizado.');
   const target=await room(url.searchParams.get('scope')||'');
   wss.handleUpgrade(req,socket,head,peer=>{
    target.peers.add(peer);
    sendBridge(peer,{type:'status',state:target.status()});
    peer.on('message',raw=>{
     let value;try{value=JSON.parse(raw.toString());}catch{return;}
     void target.receive(peer,value).catch(error=>console.error('Protocol dedicated bridge:',String(error.message).slice(0,140)));
    });
    peer.on('close',()=>{target.peers.delete(peer);for(const [id,c] of [...target.members])if(c.bridge===peer)target.remove(peer,id);});
   });
  })().catch(error=>{socket.end('HTTP/1.1 '+(error.status||503)+' Connection refused\r\nConnection: close\r\n\r\n');});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 const shutdown=async()=>{
  if(closed)return;closed=true;
  for(const task of rooms.values())await task.then(r=>r.close()).catch(()=>{});
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections?.();});
  if(!database)await base.close();
 };
 return {server,port:server.address().port,close:shutdown,rooms};
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const service=await startProtocolDedicatedServer();
 console.log('The X Protocol dedicated engine listening on '+service.port);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void service.close().then(()=>process.exit(0)));
}
