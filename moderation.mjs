import {Worker} from 'node:worker_threads';
export function explicitContent(predictions){
  const p=Object.fromEntries(predictions.map(x=>[x.className,x.probability]));
  return (p.Porn||0)>=.70||(p.Hentai||0)>=.75||(p.Porn||0)+(p.Hentai||0)>=.85;
}
// Keep moderation mandatory, without retaining an unused inference model beside
// live Worlds on a small host. Never interrupt an image that is being reviewed.
export function createImageModeration({createWorker=()=>new Worker(new URL('./moderation-worker.mjs',import.meta.url),{execArgv:[],resourceLimits:{maxOldGenerationSizeMb:160}}),idleMs=45000,timeoutMs=45000}={}){
 let worker=null,retiring=Promise.resolve(),sequence=0,chain=Promise.resolve(),pending=0,status='idle',idleTimer;
 const jobs=new Map(),unavailable=()=>Object.assign(Error('La revisión de imágenes no está disponible. Inténtalo de nuevo en un momento.'),{status:503});
 async function releaseIdle(){
  if(pending||jobs.size)return false;
  if(!worker){await retiring;return false;}
  clearTimeout(idleTimer);const previous=worker;worker=null;status='idle';
  retiring=retiring.then(()=>previous.terminate()).catch(()=>{});await retiring;return true;
 }
 function scheduleRelease(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>void releaseIdle(),idleMs);idleTimer.unref?.();}
 function getWorker(){
  if(worker)return worker;
  const active=createWorker();worker=active;status='starting';active.unref?.();
  const rejectJobs=()=>{for(const [id,job]of jobs)if(job.worker===active){clearTimeout(job.timer);jobs.delete(id);job.reject(unavailable());}if(worker===active){worker=null;status='unavailable';}};
  active.on('message',r=>{const job=jobs.get(r.id);if(job?.worker===active){jobs.delete(r.id);clearTimeout(job.timer);r.error?job.reject(Object.assign(Error(r.error),{status:r.status||503})):job.resolve(r);}});
  active.on('error',rejectJobs);active.on('exit',rejectJobs);return active;
 }
 async function moderate(bytes){
  if(pending>=3)throw Object.assign(Error('Hay otras imágenes en revisión. Inténtalo en un momento.'),{status:429});
  pending++;clearTimeout(idleTimer);
  const task=chain.then(async()=>{await retiring;return new Promise((resolve,reject)=>{
   const id=++sequence,w=getWorker();
   const timer=setTimeout(()=>{jobs.delete(id);if(worker===w)worker=null;retiring=Promise.resolve(w.terminate()).catch(()=>{});reject(Object.assign(Error('La revisión tardó demasiado. La imagen no se publicó; vuelve a intentar.'),{status:503}));},timeoutMs);
   jobs.set(id,{resolve,reject,timer,worker:w});w.postMessage({id,bytes});
  });});chain=task.catch(()=>{});
  try{const result=await task;status='ready';if(explicitContent(result.predictions))throw Object.assign(Error('Esta imagen parece contener desnudos o contenido sexual explícito y no puede publicarse.'),{status:422});return Buffer.from(result.image);}
  catch(error){if(error.status===503)status='unavailable';throw error;}
  finally{pending--;if(!pending)scheduleRelease();}
 }
 return {moderate,releaseIdle,status:()=>status};
}
const moderation=createImageModeration();
export const moderateImage=bytes=>moderation.moderate(bytes);
export const moderationStatus=moderation.status;
export const releaseIdleModeration=moderation.releaseIdle;
export async function warmModeration(bytes){try{await moderateImage(bytes);}catch(error){console.error('Revisión de imágenes no disponible:',error.status||503);}}
