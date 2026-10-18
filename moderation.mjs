import {Worker} from 'node:worker_threads';
export function explicitContent(predictions){
  const p=Object.fromEntries(predictions.map(x=>[x.className,x.probability]));
  return (p.Porn||0)>=.70||(p.Hentai||0)>=.75||(p.Porn||0)+(p.Hentai||0)>=.85;
}
let worker,sequence=0,chain=Promise.resolve(),pending=0;
let status='starting';
export const moderationStatus=()=>status;
export async function warmModeration(bytes){try{await moderateImage(bytes);}catch(error){status='unavailable';console.error('Revisión de imágenes no disponible:',error.status||503);}}
const jobs=new Map();
function getWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('./moderation-worker.mjs',import.meta.url),{execArgv:[],resourceLimits:{maxOldGenerationSizeMb:160}});
  worker.unref();
  worker.on('message',r=>{const job=jobs.get(r.id);if(job){jobs.delete(r.id);clearTimeout(job.timer);r.error?job.reject(Object.assign(new Error(r.error),{status:r.status||503})):job.resolve(r);}});
  worker.on('error',()=>{for(const j of jobs.values()){clearTimeout(j.timer);j.reject(Object.assign(new Error('La revisión de imágenes no está disponible. Inténtalo de nuevo en un momento.'),{status:503}));}jobs.clear();worker=null;});
  worker.on('exit',()=>{worker=null;});
  return worker;
}
export async function moderateImage(bytes){
  if(pending>=3)throw Object.assign(new Error('Hay otras imágenes en revisión. Inténtalo en un momento.'),{status:429});
  pending++;
  const task=chain.then(()=>new Promise((resolve,reject)=>{
    const id=++sequence,w=getWorker();
    const timer=setTimeout(()=>{jobs.delete(id);w.terminate();reject(Object.assign(new Error('La revisión tardó demasiado. La imagen no se publicó; vuelve a intentar.'),{status:503}));},45000);
    jobs.set(id,{resolve,reject,timer});w.postMessage({id,bytes});
  }));
  chain=task.catch(()=>{});
  try{const result=await task;status='ready';if(explicitContent(result.predictions))throw Object.assign(new Error('Esta imagen parece contener desnudos o contenido sexual explícito y no puede publicarse.'),{status:422});return Buffer.from(result.image);}
  catch(error){if(error.status===503)status='unavailable';throw error;}
  finally{pending--;}
}
