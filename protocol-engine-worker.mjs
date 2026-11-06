// Dedicated pure ceremony rules worker. It never opens a database, writes inventory,
// handles sessions or owns WebSockets. All side effects stay authoritative in World.
import {parentPort} from 'node:worker_threads';
import {tickProtocol} from './public/juegos/x-protocol/engine.mjs';

const seededRandom=initial=>{let value=initial>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};};
if(parentPort){
 parentPort.on('message',message=>{
  if(message?.type!=='tick')return;
  const {id,state,time,introComplete,seed}=message;
  try{
   const next=state;
   tickProtocol(next,time,{introComplete:!!introComplete,random:seededRandom(seed)});
   parentPort.postMessage({type:'result',id,state:next});
  }catch(error){
   parentPort.postMessage({type:'error',id,message:String(error?.message||error).slice(0,240)});
  }
 });
}
