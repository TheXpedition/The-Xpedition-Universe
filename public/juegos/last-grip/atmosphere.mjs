import {GRIP_EVENTS,activeGripEvents} from './events.mjs';
// Recorded ambience, decoded once and cross-faded when events change.
export class GripAtmosphere {
 constructor(){this.environment=null;this.buffers=new Map();this.voices=new Map();}
 label(){const e=this.environment;return e?`${e.time} · ${e.weatherName} · ${e.temperature}°C`:'Hora y clima de World';}
 load(ctx,name){if(!this.buffers.has(name))this.buffers.set(name,fetch('/juegos/last-grip/media/ambience/'+name).then(r=>{if(!r.ok)throw Error('Ambience unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(()=>null));return this.buffers.get(name);}
 update(s,{enabled,area,context:ctx,duck=1}){const desired=new Map(),inside=area==='changing';
  if(enabled&&ctx?.state==='running'&&!s.cinematic){if(['rain','storm'].includes(this.environment?.weather))desired.set('rain.mp3',inside?.055:.16);else desired.set('wind.mp3',inside?.025:.06);for(const e of activeGripEvents(s)){const event=GRIP_EVENTS[e.kind];desired.set(event.sound,Math.max(desired.get(event.sound)||0,event.gain*(inside?.2:1)));}}
  for(const [name,gain]of desired)desired.set(name,gain*duck);
  for(const [name,voice]of this.voices)if(!desired.has(name)){if(voice.source){voice.level.gain.cancelScheduledValues(ctx.currentTime);voice.level.gain.setTargetAtTime(0,ctx.currentTime,.18);voice.source.stop(ctx.currentTime+.8);}this.voices.delete(name);}
  if(!ctx)return;for(const [name,gain]of desired){const current=this.voices.get(name);if(current){if(current.level)current.level.gain.setTargetAtTime(gain,ctx.currentTime,.3);continue;}const pending={pending:true};this.voices.set(name,pending);void this.load(ctx,name).then(buffer=>{if(this.voices.get(name)!==pending||!buffer){if(this.voices.get(name)===pending)this.voices.delete(name);return;}const source=ctx.createBufferSource(),level=ctx.createGain();source.buffer=buffer;source.loop=true;level.gain.setValueAtTime(0,ctx.currentTime);level.gain.linearRampToValueAtTime(gain,ctx.currentTime+1);source.connect(level);level.connect(ctx.destination);source.onended=()=>{source.disconnect();level.disconnect();};source.start();this.voices.set(name,{source,level});});}
 }
 destroy(){for(const v of this.voices.values())if(v.source)try{v.source.stop();}catch{}this.voices.clear();}
}
