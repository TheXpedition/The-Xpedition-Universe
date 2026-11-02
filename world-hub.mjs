import {serveWorldMedia,reclaimIdleWorlds} from './world-media-stream.mjs';
import http from 'node:http';import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Worker,parentPort,workerData,isMainThread} from 'node:worker_threads';
import {openDatabase} from './database.mjs';import {loadAccountVerifications} from './account-roles.mjs';
import {createWorldAuth} from './world-auth.mjs';import {createWorldGateway,applicationURL} from './world-gateway.mjs';import {createWorldServers} from './world-servers.mjs';
import {proxyWorldHTTP,proxyWorldSocket} from './world-http-proxy.mjs';

export async function startWorldHub({port=Number(process.env.PORT||3001),host=process.env.HOST||'127.0.0.1',publicURL=process.env.WORLD_PUBLIC_URL||process.env.RENDER_EXTERNAL_URL,mount=process.env.WORLD_PUBLIC_MOUNT||''}={}){
 const db=await openDatabase(path.resolve(process.env.DATA_DIR||path.join(import.meta.dirname,'data')));await loadAccountVerifications(db);
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});},json=(res,value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'});res.end(JSON.stringify(value));};
 const body=async req=>{const chunks=[];let size=0;for await(const chunk of req){if((size+=chunk.length)>16384)fail(413,'El mensaje es demasiado grande.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Solicitud inválida.');}};
 const auth=createWorldAuth({db,fail}),gateway=createWorldGateway({db,json,fail,body,getSession:auth.getSession}),rooms=createWorldServers({db,json,fail,body,access:gateway.access});
 const workers=new Map(),limit=Math.max(1,Math.min(8,Number(process.env.WORLD_MAX_ACTIVE_SERVERS)||2));let closed=false,creating=Promise.resolve();
 async function release(record){await db.run('DELETE FROM world_server_leases WHERE server_id=? AND owner=?',record.id,record.leaseOwner).catch(()=>{});}
 function stop(record){if(record.stopping)return record.stopping;record.stopping=(async()=>{await new Promise(resolve=>{const timer=setTimeout(()=>{void record.worker.terminate();resolve();},10000);record.worker.once('exit',()=>{clearTimeout(timer);resolve();});record.worker.postMessage({type:'shutdown'});});await release(record);if(workers.get(record.id)===record)workers.delete(record.id);})();return record.stopping;}
 async function allocate(server){
  let record=workers.get(server.id);if(record?.stopping){await record.stopping;record=workers.get(server.id);}if(record){record.used=Date.now();return record;}
  if(closed)fail(503,'World se está reiniciando.');
  if(workers.size>=limit){const idle=[...workers.values()].filter(r=>r.connections===0&&!r.requests&&!r.booting).sort((a,b)=>a.used-b.used)[0];if(idle)await stop(idle);else fail(503,'Los servidores están ocupados en este momento. Vuelve a intentar en unos minutos.');}
  const underPressure=()=>process.constrainedMemory()>0&&process.availableMemory()<128*1024*1024;
  if(underPressure())await reclaimIdleWorlds(workers.values(),stop,underPressure);
  if(underPressure())fail(503,'World está ocupado en este momento. Vuelve a intentar en unos minutos.');
  const leaseOwner=randomUUID(),deadline=Date.now()+50000;let acquired=false;
  while(!acquired){const at=Date.now(),row=await db.run('INSERT INTO world_server_leases(server_id,owner,expires) VALUES(?,?,?) ON CONFLICT(server_id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE world_server_leases.expires<? OR world_server_leases.owner=?',server.id,leaseOwner,at+45000,at,leaseOwner);acquired=!!row.changes;if(!acquired){if(Date.now()>deadline)fail(503,'El servidor se está recuperando. Vuelve a entrar en unos segundos.');await new Promise(resolve=>setTimeout(resolve,600));}}
  let worker;try{worker=new Worker(new URL('./world-instance.mjs',import.meta.url),{env:{...process.env,WORLD_SCOPE_ID:server.id,WORLD_LEASE_OWNER:leaseOwner,WORLD_PUBLIC_PREFIX:mount+'/servers/'+server.id,HOST:'127.0.0.1',PORT:'0',WORLD_REVIEW_ENTRY_KEY:'',WORLD_REVIEW_STAFF_ID:''},resourceLimits:{maxOldGenerationSizeMb:96,stackSizeMb:4}});}catch(error){await release({id:server.id,leaseOwner});throw error;}
  record={id:server.id,leaseOwner,worker,booting:true,used:Date.now(),connections:0,requests:0,peers:new Map()};workers.set(server.id,record);
  record.ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{void stop(record);reject(Object.assign(Error('El servidor está tardando en prepararse. Vuelve a intentar.'),{status:503}));},45000);worker.on('message',message=>{if(message?.type==='ready'){clearTimeout(timer);record.booting=false;record.port=message.port;resolve(record);}});worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('exit',code=>{clearTimeout(timer);void release(record);if(workers.get(server.id)===record)workers.delete(server.id);if(!record.port)reject(Object.assign(Error('No pudimos iniciar este servidor.'),{status:503}));if(code&&record.port)console.error('World server worker stopped:',server.id,code);});});
  return record;
 }
 function instance(server){const live=workers.get(server.id);if(live&&!live.stopping)return live.ready;const task=creating.then(()=>allocate(server));creating=task.then(()=>{},()=>{});return task.then(record=>record.ready);}
 async function route(req,{allocate=true}={}){const url=new URL(req.url,'http://localhost'),match=/^\/servers\/([0-9a-f-]{36})(\/.*)?$/.exec(url.pathname);if(!match)fail(404,'Elige un servidor desde World.');const room=await rooms.get(match[1]),relative=(match[2]||'/')+url.search;
  const bootstrap=relative==='/auth'||relative.startsWith('/auth?')||relative==='/world-config.js'||relative.startsWith('/performance.')||relative.startsWith('/brand/')||relative.startsWith('/juegos/auth.')||relative.startsWith('/juegos/universe-fonts.css')||relative.startsWith('/juegos/art/fonts.css')||relative.startsWith('/api/world/session');
  if(!bootstrap)await rooms.enter(await auth.getSession(req),room.id);
  const record=allocate?await instance(room):null;if(record)record.used=Date.now();return {record,room,relative,prefix:mount+'/servers/'+room.id};
 }
 const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/health')return json(res,{ok:true,service:'world-hub'});if(url.pathname==='/'){res.writeHead(302,{Location:(process.env.UNIVERSE_URL||'')+'/#world'});res.end();return;}const {room,relative,prefix}=await route(req,{allocate:false});if(serveWorldMedia(req,res,relative))return;const record=await instance(room);record.requests++;try{await proxyWorldHTTP(req,res,{port:record.port,path:relative,prefix});}finally{record.requests--;record.used=Date.now();}}catch(error){if(!res.headersSent)json(res,{error:error.status?error.message:'No pudimos preparar el servidor. Vuelve a intentar.'},error.status||503);else res.destroy();}});
 server.on('upgrade',(req,socket,head)=>{void (async()=>{const {record,relative}=await route(req);record.peers.set(socket,req);record.connections=record.peers.size;proxyWorldSocket(req,socket,head,{port:record.port,path:relative,onClose:()=>{record.peers.delete(socket);record.connections=record.peers.size;record.used=Date.now();}});})().catch(()=>socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 if(publicURL){applicationURL(publicURL);await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated','world-service:public-url',JSON.stringify({url:publicURL.replace(/\/$/,'')+mount,service:'world-hub'}),Date.now());}
 const timer=setInterval(()=>{for(const record of workers.values()){if(record.stopping)continue;if(!record.connections&&!record.requests&&Date.now()-record.used>120000){void stop(record);continue;}void db.run('UPDATE world_server_leases SET expires=? WHERE server_id=? AND owner=?',Date.now()+45000,record.id,record.leaseOwner).then(result=>{if(!result.changes)return stop(record);}).catch(()=>stop(record));for(const [socket,req]of record.peers)void auth.getSession(req).then(user=>rooms.enter(user,record.id)).catch(()=>socket.destroy());}},15000);timer.unref();
 const shutdown=async()=>{if(closed)return;closed=true;clearInterval(timer);await Promise.all([...workers.values()].map(stop));await new Promise(resolve=>server.close(resolve));await db.close();};
 const actualPort=server.address().port;console.log('The Xpedition World Hub · http://localhost:'+actualPort);parentPort?.postMessage({type:'ready',port:actualPort});
 return {port:actualPort,close:shutdown};
}
if(!isMainThread&&workerData?.kind==='world-hub'){const hub=await startWorldHub(workerData.options);parentPort.on('message',message=>{if(message?.type==='shutdown')void hub.close().then(()=>process.exit(0));});}
