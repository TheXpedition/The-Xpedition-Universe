// Optional isolated rules engine for The X Protocol.
// Existing rules, inventory, player statistics and persisted ceremony state are
// unchanged. Opt-in via PROTOCOL_ENGINE_WORKER=true after staging verification.
import {Worker} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {randomInt} from 'node:crypto';
import {tickProtocol} from './public/juegos/x-protocol/engine.mjs';

const random=()=>randomInt(0,1000000)/1000000;
const clamp=v=>Math.round(v*100)/100;
export function createProtocolEngineRuntime({
 enabled=process.env.PROTOCOL_ENGINE_WORKER==='true',
 timeoutMs=1500,
 makeWorker=()=>new Worker(new URL('./protocol-engine-worker.mjs',import.meta.url),{resourceLimits:{maxOldGenerationSizeMb:48,stackSizeMb:2}})
}={}){
 let worker=null,broken=false,closed=false,serial=0;const pending=new Map();
 const metrics={workerRequested:!!enabled,workerActive:false,ticks:0,workerTicks:0,fallbackTicks:0,failovers:0,lastTickMs:0,maxTickMs:0,totalTickMs:0,maxPending:0,lastWorkerError:null};
 const record=(duration,workerUsed)=>{metrics.ticks++;metrics.lastTickMs=clamp(duration);metrics.maxTickMs=Math.max(metrics.maxTickMs,metrics.lastTickMs);metrics.totalTickMs+=duration;if(workerUsed)metrics.workerTicks++;else metrics.fallbackTicks++;};
 const local=(state,time,opts)=>{const s=structuredClone(state);tickProtocol(s,time,{introComplete:!!opts.introComplete,random:opts.random||random});return s;};
 const fail=error=>{
  if(broken||closed)return;
  broken=true;metrics.workerActive=false;metrics.failovers++;metrics.lastWorkerError=String(error?.message||error).slice(0,180);
  for(const request of pending.values())request.reject(error);
  pending.clear();if(worker){void worker.terminate().catch(()=>{});worker=null;}
 };
 if(enabled){
  try{
   worker=makeWorker();metrics.workerActive=true;
   worker.on('message',packet=>{
    const request=pending.get(packet?.id);if(!request)return;
    pending.delete(packet.id);
    if(packet.type==='result')request.resolve(packet.state);
    else request.reject(Error(packet.message||'Protocol engine tick failed'));
   });
   worker.on('error',fail);
   worker.on('exit',code=>{if(!closed)fail(Error('Protocol engine worker exited: '+code));});
  }catch(error){fail(error);}
 }
 const tick=async(state,time,opts={})=>{
  if(closed)throw Error('Protocol engine is closed');
  const started=performance.now();
  if(worker&&!broken){
   try{
    const id=++serial;
    const result=await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>{pending.delete(id);reject(Error('Protocol engine worker timed out'));},timeoutMs);
     pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
     metrics.maxPending=Math.max(metrics.maxPending,pending.size);
     try{worker.postMessage({type:'tick',id,state:structuredClone(state),time,introComplete:!!opts.introComplete});}
     catch(error){pending.delete(id);clearTimeout(timer);reject(error);}
    });
    record(performance.now()-started,true);
    return result;
   }catch(error){fail(error);}
  }
  const value=local(state,time,opts);
  record(performance.now()-started,false);
  return value;
 };
 return {
  tick,
  metrics:()=>({workerRequested:metrics.workerRequested,workerActive:metrics.workerActive,ticks:metrics.ticks,workerTicks:metrics.workerTicks,fallbackTicks:metrics.fallbackTicks,failovers:metrics.failovers,lastTickMs:metrics.lastTickMs,maxTickMs:metrics.maxTickMs,averageTickMs:metrics.ticks?clamp(metrics.totalTickMs/metrics.ticks):0,maxPending:metrics.maxPending,lastWorkerError:metrics.lastWorkerError}),
  async close(){closed=true;for(const request of pending.values())request.reject(Error('Protocol engine closed'));pending.clear();if(worker){const current=worker;worker=null;await current.terminate().catch(()=>{});}}
 };
}
