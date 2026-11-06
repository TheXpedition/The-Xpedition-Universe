// Dedicated pure ceremony rules worker. It never opens a database, writes inventory,
// handles sessions or owns WebSockets. All side effects stay authoritative in World.
import {parentPort} from 'node:worker_threads';
import {randomInt} from 'node:crypto';
import {tickProtocol} from './public/juegos/x-protocol/engine.mjs';

const random=()=>randomInt(0,1000000)/1000000;
if(parentPort){
 parentPort.on('message',message=>{
  if(message?.type!=='tick')return;
  const {id,state,time,introComplete}=message;
  try{
   const next=state;
   tickProtocol(next,time,{introComplete:!!introComplete,random});
   parentPort.postMessage({type:'result',id,state:next});
  }catch(error){
   parentPort.postMessage({type:'error',id,message:String(error?.message||error).slice(0,240)});
  }
 });
}
