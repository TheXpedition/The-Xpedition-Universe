const ROOT='/juegos/audio/';
// One decode per AudioContext and file, with no timers, autoplay or oscillator fallback.
export class WorldSoundBank{
 constructor({fetcher=(...args)=>fetch(...args)}={}){this.fetcher=fetcher;this.contexts=new WeakMap();this.voices=new Set();}
 cache(ctx){let cache=this.contexts.get(ctx);if(!cache){cache=new Map();this.contexts.set(ctx,cache);}return cache;}
 load(ctx,name){const cache=this.cache(ctx);if(cache.has(name))return cache.get(name).promise;const entry={buffer:null,promise:null};cache.set(name,entry);entry.promise=Promise.resolve().then(()=>this.fetcher(ROOT+name)).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>(entry.buffer=buffer)).catch(()=>null);return entry.promise;}
 preload(ctx,names){return Promise.all(names.map(name=>this.load(ctx,name)));}
 buffer(ctx,name){const entry=this.cache(ctx).get(name);if(!entry)void this.load(ctx,name);return entry?.buffer||null;}
 play(ctx,name,{gain=.3,rate=1,loop=false,fade=.015}={}){
  if(!ctx||ctx.state!=='running')return null;const buffer=this.buffer(ctx,name);if(!buffer)return null;
  const source=ctx.createBufferSource(),level=ctx.createGain(),at=ctx.currentTime;source.buffer=buffer;source.loop=loop;source.playbackRate.setValueAtTime(rate,at);level.gain.setValueAtTime(0,at);level.gain.linearRampToValueAtTime(gain,at+fade);source.connect(level);level.connect(ctx.destination);
  const voice={source,level,stop:()=>{try{source.stop();}catch{}cleanup();}},cleanup=()=>{if(!this.voices.delete(voice))return;source.disconnect();level.disconnect();};this.voices.add(voice);source.onended=cleanup;source.start(at);if(!loop)source.stop(at+buffer.duration/rate+.02);return voice;
 }
 stop(){for(const voice of [...this.voices])voice.stop();}
}
