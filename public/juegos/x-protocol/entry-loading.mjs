// One authoritative barrier includes the connected audience as well as the cast.
// A slow connected client is never skipped. Departed clients get time to navigate
// and reconnect before they stop blocking the live presentation.
export function entryReadiness(s){
 const invited=s.loadingViewers?new Set(s.loadingViewers):null;
 const people=[...s.roster,...(s.visitors||[])].filter(p=>!p.bot&&(!invited||invited.has(p.id)));
 const elapsed=s.clock-s.phaseAt;
 const expected=people.filter(p=>p.connected||elapsed<15000);
 return {total:expected.length,ready:expected.filter(p=>p.assetsReady).length,pending:expected.filter(p=>!p.assetsReady).map(p=>p.id)};
}

// Resource jobs may finish out of order after reconnects or a new ceremony.
export class EntryResources {
 constructor(load,{timeoutMs=12000,setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id)}={}){this.load=load;this.timeoutMs=timeoutMs;this.setTimer=setTimer;this.clearTimer=clearTimer;this.job=null;this.ready=null;}
 key(s){return s.id+':'+s.roster.map(p=>p.characterId).sort().join(',')+':'+(s.entryMedia?.url||'');}
 async prepare(s){const key=this.key(s);if(this.job?.key!==key){const job={key};this.job=job;this.ready=null;let timer;const loaded=Promise.resolve().then(()=>this.load(s)).catch(()=>{});const timeout=new Promise(resolve=>{timer=this.setTimer(resolve,this.timeoutMs);});job.promise=Promise.race([loaded,timeout]).finally(()=>this.clearTimer(timer)).then(()=>{if(this.job===job)this.ready=key;return this.job===job;});}return this.job.promise;}
 isReady(s){return this.ready===this.key(s);}
}

// Load stage artwork in parallel; the intro can start as soon as its video plays.
export function prepareEntryResourcesForPlayback({artwork,media,fonts}){
 void Promise.resolve().then(artwork).catch(()=>{});
 return Promise.allSettled([Promise.resolve().then(media),Promise.resolve(fonts)]);
}
