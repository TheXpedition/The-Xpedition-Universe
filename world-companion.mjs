import {Worker} from 'node:worker_threads';
import {proxyWorldHTTP,proxyWorldSocket} from './world-http-proxy.mjs';

// A failure in World cannot stop the community server. An explicitly configured
// standalone service takes precedence; the companion needs no hosting login.
export function createWorldCompanion({publicURL,beforeWorld=async()=>{}}){
 const enabled=!process.env.WORLD_URL&&(process.env.NODE_ENV==='production'||process.env.WORLD_EMBEDDED==='true');
 let worker=null,pending=null,port=null,closing=false;
 async function start(){
  if(!enabled||closing)return null;if(port)return port;if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   worker=new Worker(new URL('./world-hub.mjs',import.meta.url),{workerData:{kind:'world-hub',options:{host:'127.0.0.1',port:0,publicURL:publicURL(),mount:'/world-play'}},env:{...process.env,WORLD_DATABASE_READY:'true',WORLD_PUBLIC_MOUNT:'/world-play',UNIVERSE_URL:publicURL()},resourceLimits:{maxOldGenerationSizeMb:64,stackSizeMb:4}});
   const timer=setTimeout(()=>reject(Error('World tardó demasiado en arrancar.')),45000);
   worker.on('message',message=>{if(message?.type==='ready'){clearTimeout(timer);port=message.port;resolve(port);}});
   worker.once('error',error=>{clearTimeout(timer);pending=null;reject(error);});
   worker.once('exit',code=>{if(!closing)console.error('World companion worker exited:',code,'rssMB='+Math.round(process.memoryUsage().rss/1048576));clearTimeout(timer);worker=null;port=null;pending=null;reject(Error('World se detuvo.'));});
  });return pending;
 }
 async function handle(req,res,url){if(!url.pathname.startsWith('/world-play/'))return false;await beforeWorld();const value=await start();if(!value)throw Object.assign(Error('World está preparando su acceso.'),{status:503});await proxyWorldHTTP(req,res,{port:value,path:req.url.slice('/world-play'.length)||'/'});return true;}
 function upgrade(req,socket,head){if(!req.url.startsWith('/world-play/')){socket.destroy();return;}void beforeWorld().then(start).then(value=>{if(!value)return socket.destroy();proxyWorldSocket(req,socket,head,{port:value,path:req.url.slice('/world-play'.length)});}).catch(error=>{console.warn('World companion WebSocket unavailable:',String(error.message||error).slice(0,160));socket.destroy();});}
 async function close(){closing=true;if(!worker)return;await new Promise(resolve=>{const active=worker,timer=setTimeout(()=>{void active.terminate();resolve();},10000);active.once('exit',()=>{clearTimeout(timer);resolve();});active.postMessage({type:'shutdown'});});}
 return {start,handle,upgrade,close,enabled};
}
