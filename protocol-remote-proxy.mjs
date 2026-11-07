// World-side transport adapter. Existing World and X Protocol browser URLs are
// unchanged; only the authoritative ceremony implementation moves to Render.
// The browser never sees the private bridge key or the dedicated service URL.
import {WebSocket} from 'ws';
import {Readable} from 'node:stream';

const messageTypes=new Set(['protocol-subscribe','protocol-ready','protocol-viewer','protocol-media-started','protocol-media-ended','protocol-media-failed','protocol-action','protocol-chat']);
const fallbackState={id:null,phase:'CLOSED',revision:0,participants:[],invitees:[]};
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const decode=raw=>{try{return JSON.parse(raw.toString());}catch{return null;}};

export function createProtocolRemoteProxy({
 db,clients,send,can=async()=>false,now=Date.now,beforeStart=async()=>{},
 getEnvironment=()=>null,onRetreat=async()=>{},onRosterChange=async()=>{},
 refreshInventory=async()=>{},onSpeech=()=>{},cancelSpeech=()=>{},
 serviceURL=process.env.PROTOCOL_SERVICE_URL||(process.env.PROTOCOL_SERVICE_HOST?'https://'+process.env.PROTOCOL_SERVICE_HOST:''),
 secret=process.env.PROTOCOL_BRIDGE_SECRET||'',
 scope=process.env.WORLD_SCOPE_ID||'',
 makeSocket=(url,options)=>new WebSocket(url,options),
 request=fetch
}={}){
 if(!/^https?:\/\//.test(serviceURL)||secret.length<32)throw Error('El puente de The X Protocol necesita PROTOCOL_SERVICE_URL y PROTOCOL_BRIDGE_SECRET (32+ caracteres).');
 const base=new URL(serviceURL);
 if(process.env.NODE_ENV==='production'&&base.protocol!=='https:')throw Error('El puente remoto de The X Protocol requiere HTTPS.');
 if(base.username||base.password||base.search||base.hash)throw Error('Dirección de servicio de ceremonia inválida.');
 const endpoint=new URL('/bridge/live?scope='+encodeURIComponent(scope),base);
 endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';
 let socket=null,opening=null,closed=false,retry=null,revision=-1,status={...fallbackState},retryDelay=1000;const attached=new Set(),returned=new Set();
 const sendWire=data=>{if(socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify(data));return true;};
 const connected=()=>[...clients.values()];
 const find=id=>connected().find(c=>c.user.id===id);
 const description=c=>({
  id:c.user.id,characterId:c.characterId||'dani',zoneId:c.zone?.id||'base',
  x:c.p?.x||0,y:c.p?.y||0,
  vitals:c.vitals||{health:100,hunger:100,energy:100,sleep:100,stress:0}
 });
 function sendAttach(c){if(!sendWire({type:'attach',player:description(c),environment:getEnvironment()}))return;attached.add(c.user.id);if(c.protocolActive)sendWire({type:'input',userId:c.user.id,data:{type:'protocol-subscribe'}});}
 function schedule(){
  if(closed||retry)return;
  retry=setTimeout(()=>{retry=null;void open().catch(()=>{});},retryDelay);
  retry.unref?.();retryDelay=Math.min(15000,retryDelay*2);
 }
 const processPacket=async packet=>{
  if(!packet||typeof packet!=='object')return;
  if(packet.type==='status'&&packet.state){
   const next=packet.state;
   if(typeof next.phase==='string'&&Array.isArray(next.participants)&&Array.isArray(next.invitees)){
    // Do not convert every authoritative phase/revision update into a new
    // redirect. The original engine already emits the one-time protocol-start
    // for each player, including after a bridge reconnection.
    if(next.id!==status.id)returned.clear();
    status=next;revision=next.revision;
   }
   return;
  }
  if(packet.type==='deliver'){
   const c=find(packet.userId);
   if(c&&packet.data&&typeof packet.data.type==='string'){
    if(packet.data.type==='protocol-return')returned.add(c.user.id);
    if(packet.data.type==='protocol-start')returned.delete(c.user.id);
    send(c,packet.data);
   }
   return;
  }
  if(packet.type==='retreat'){
   const c=find(packet.userId);if(c)await onRetreat(c);
   return;
  }
  if(packet.type==='roster-change'){await onRosterChange();return;}
  if(packet.type==='inventory-refresh'){
   const c=find(packet.userId);if(c)await refreshInventory(c.user.id);
   return;
  }
  if(packet.type==='speech'&&packet.announcement)onSpeech(packet.announcement);
  if(packet.type==='speech-cancel')cancelSpeech(packet.id);
 };
 function open(){
  if(closed)return Promise.reject(fail(503,'Motor detenido.'));
  if(socket?.readyState===WebSocket.OPEN)return Promise.resolve();
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   let settled=false;
   const ws=makeSocket(endpoint.href,{headers:{'x-protocol-bridge-secret':secret},handshakeTimeout:20000,perMessageDeflate:false});
   socket=ws;
   const timeout=setTimeout(()=>{if(!settled){settled=true;ws.terminate();reject(fail(503,'El motor independiente está iniciando.'));}},23000);
   const success=()=>{
    if(settled)return;settled=true;clearTimeout(timeout);retryDelay=1000;
    // Reconnect reattaches every World client, including existing spectators
    // whose browser WebSocket remained connected during the bridge failure.
    attached.clear();for(const c of connected())sendAttach(c);
    sendWire({type:'sync'});resolve();
   };
   const failure=error=>{if(!settled){settled=true;clearTimeout(timeout);reject(fail(503,'No pudimos conectar el motor de la ceremonia.'));}};
   ws.on('open',success);
   ws.on('error',failure);
   ws.on('message',raw=>{const packet=decode(raw);void processPacket(packet).catch(error=>console.error('Protocol bridge event:',String(error.message||error).slice(0,100)));});
   ws.on('close',()=>{if(socket===ws)socket=null;failure();schedule();});
  }).finally(()=>{opening=null;});
  return opening;
 }
 // Schedule a connection immediately and keep retrying without touching the
 // player's existing World socket or reloading the intro.
 void open().catch(()=>{});
 const participants=()=>new Set(status.participants||[]);
 const invitees=()=>new Set(status.invitees||[]);
 return {
  ready:Promise.resolve(),
  engaged:id=>!returned.has(id)&&!!find(id)?.protocolActive&&participants().has(id),
  enrolled:id=>!returned.has(id)&&participants().has(id),
  phase:()=>status.phase,
  entry:id=>!returned.has(id)&&invitees().has(id)&&!['CLOSED','LOBBY','ELIMINATION_FINISHED'].includes(status.phase)?'/juegos/x-protocol/':null,
  async attach(c){
   c.protocolActive=false;
   try{await open();if(!attached.has(c.user.id))sendAttach(c);}catch(error){console.warn('Protocol bridge delayed:',error.message);}
  },
  disconnect(c){c.protocolActive=false;attached.delete(c.user.id);sendWire({type:'detach',userId:c.user.id});},
  async handle(c,input){
   if(!messageTypes.has(input?.type))return false;
   if(input.type==='protocol-subscribe')c.protocolActive=true;
   if(input.type==='protocol-action'&&input.action?.type==='start')await beforeStart(c);
   await open();sendWire({type:'input',userId:c.user.id,data:input,startValidated:input.type==='protocol-action'&&input.action?.type==='start'});
   return true;
  },
  async handleHttp(req,res,url,user,{body,json}){
   if(!url.pathname.startsWith('/api/world/x-protocol'))return false;
   if(!user)fail(401,'Entra desde tu cuenta de World.');
   if(req.method==='POST'&&(
      url.pathname==='/api/world/x-protocol/start-live'||url.pathname==='/api/world/x-protocol/control'
   )){
    if(url.pathname.endsWith('/start-live')){if(!await can(user,'direct'))fail(403,'Solo Dirección inicia ceremonias.');await beforeStart(find(user.id)||{user,direct:true,characterId:'maria-villegas'});}
    else{
     // A small STAFF control JSON can be read once, then forwarded verbatim.
     const input=await body(req);
     if(input?.type==='start'){if(!await can(user,'direct'))fail(403,'Solo Dirección inicia ceremonias.');await beforeStart(find(user.id)||{user,direct:true,characterId:'maria-villegas'});}
     req._protocolParsedInput=input;
    }
   }
   const headers={
    'x-protocol-bridge-secret':secret,
    'x-protocol-scope':scope,
    'x-protocol-user':user.id,
    'content-type':String(req.headers['content-type']||'application/json')
   };
   if(req.headers.range)headers.range=req.headers.range;
   const input=req._protocolParsedInput;
   const hasBody=!['GET','HEAD'].includes(req.method);
   let upstream;
   try{
    upstream=await request(new URL(url.pathname+url.search,base),{
     method:req.method,headers,
     ...(hasBody?{body:input!==undefined?JSON.stringify(input):req,duplex:'half'}:{}),
     signal:AbortSignal.timeout(45000)
    });
   }catch{fail(503,'El motor independiente de The X Protocol no respondió.');}
   const responseHeaders={};
   for(const name of ['content-type','content-length','content-range','accept-ranges','cache-control'])if(upstream.headers.get(name))responseHeaders[name]=upstream.headers.get(name);
   res.writeHead(upstream.status,responseHeaders);
   if(req.method==='HEAD'||!upstream.body){res.end();return true;}
   try{await new Promise((resolve,reject)=>{
    Readable.fromWeb(upstream.body).on('error',reject).pipe(res).on('finish',resolve).on('error',reject);
   });}catch{res.destroy();}
   return true;
  },
  async close(){
   closed=true;clearTimeout(retry);
   socket?.close(1000,'World cerrado');
  },
  notifyShopChange:ids=>{if(Array.isArray(ids))sendWire({type:'shop-change',userIds:ids.filter(id=>typeof id==='string').slice(0,25)});},
  bridgeStatus:()=>({connected:socket?.readyState===WebSocket.OPEN,phase:status.phase,revision,participants:participants().size})
 };
}
