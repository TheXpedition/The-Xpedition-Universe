import {playWorldIntro as localIntro} from '../world-intro-player.mjs';
import {introVisit} from './world-entry-session.mjs';
const playing=new Map();
export function needsWorldIntro(config,options={}){return !!config?.url&&!introVisit(config,options).completed;}
export async function playWorldIntro(config,options={}){if(!config?.url)return;const visit=introVisit(config,options);if(visit.completed)return;if(playing.has(visit.id))return playing.get(visit.id);const promise=presentWorldIntro(config).then(()=>visit.complete()).finally(()=>playing.delete(visit.id));playing.set(visit.id,promise);return promise;}
async function presentWorldIntro(config){
 if(!config?.url)return;
 if(!globalThis.window||window.parent===window)return localIntro(config);
 const request=async(action,body={})=>{const response=await fetch('/api/world/intro/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),value=await response.json();if(!response.ok)throw Error(value.error||'No pudimos guardar la introducción.');return value;};
 const session=await request('start'),channel=new MessageChannel();
 return new Promise((resolve,reject)=>{
  let accepted=false;const timer=setTimeout(()=>{if(!accepted){channel.port1.close();void localIntro(config).then(resolve,reject);}},1800);
  channel.port1.onmessage=async event=>{const message=event.data;if(message?.type==='accepted'){accepted=true;clearTimeout(timer);return;}if(message?.type==='finished'){channel.port1.close();resolve();return;}if(message?.type==='failed'){channel.port1.close();reject(Error(message.error));return;}if(message?.action==='complete'&&message.id){try{const value=await request('complete',message.body);channel.port1.postMessage({reply:message.id,value});}catch(error){channel.port1.postMessage({reply:message.id,error:error.message});}}};
  window.parent.postMessage({type:'world-intro-ready',config,session},location.origin,[channel.port2]);
 });
}
