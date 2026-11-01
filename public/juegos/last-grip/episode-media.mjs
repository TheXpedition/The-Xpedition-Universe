// Each supplied clip plays through natively. The server waits for its ended event.
export class EpisodeMedia {
 constructor({video,playButton,notice=()=>{},onEnded=()=>{}}){this.video=video;this.onEnded=onEnded;this.finishedKey=null;this.playButton=playButton;this.notice=notice;this.enabled=false;this.key=null;this.voices=new Set();this.falls=new Set();this.helicopter=document.createElement('audio');this.helicopter.src='/juegos/last-grip/media/helicopter.mp3';this.helicopter.preload='auto';this.helicopter.loop=true;this.helicopter.volume=.48;this.blocked=false;playButton.onclick=()=>this.enable();video.onended=()=>{this.finishedKey=this.key;this.onEnded(this.key);};video.onerror=()=>{this.blocked=true;this.playButton.hidden=false;this.notice('No se pudo cargar el video. Se esperará a que termine la reproducción; comprueba la conexión.');};}
 enable(){if(this.video.error&&this.descriptor)this.video.load();this.enabled=true;this.blocked=false;this.playButton.hidden=true;if(this.state)this.sync(this.state);}

 play(audio){const attempt=audio.play();attempt?.catch(()=>{this.blocked=true;this.playButton.hidden=false;});}
 sound(url,{rate=1,volume=.5}={}){if(!this.enabled||document.hidden||this.voices.size>=5)return;const a=document.createElement('audio');a.src=url;a.volume=volume*(this.duck||1);a.playbackRate=rate;this.voices.add(a);const done=()=>this.voices.delete(a);a.onended=done;a.onerror=done;this.play(a);}
 sync(state){this.duck=state.announcementSpeaking?.22:1;this.video.volume=this.duck;this.state=state;const d=state.cinematic;this.descriptor=d;
  if((d?.key||null)!==this.key){this.key=d?.key||null;this.finishedKey=null;this.blocked=false;this.video.pause();if(d){this.video.src=d.url;this.video.load();}else this.video.removeAttribute('src');}
  this.video.hidden=!d;this.video.dataset.placement=d?.placement||'fullscreen';this.video.muted=!this.enabled;if(!d&&!this.blocked)this.playButton.hidden=true;
  if(d){if(state.paused||document.hidden)this.video.pause();else if(this.finishedKey!==this.key&&!this.video.ended&&this.video.paused&&!this.blocked)this.play(this.video);this.playButton.hidden=this.enabled&&!this.blocked;}
  const landing=state.phase==='arrival'&&state.clock-state.phaseAt<7200&&!state.paused&&!document.hidden&&this.enabled;
  if(landing){this.helicopter.volume=Math.max(.06,.5-(state.clock-state.phaseAt)/17000)*this.duck;if(this.helicopter.paused&&!this.blocked)this.play(this.helicopter);}else this.helicopter.pause();
  if(state.paused||document.hidden){for(const a of this.voices)a.pause();this.voices.clear();return;}
  for(const f of state.round?.falls||[]){const age=state.clock-f.clock,id=state.round.id+':'+f.id,p=state.roster.find(p=>p.id===f.id);if(!this.falls.has(id+':voice')){this.falls.add(id+':voice');if(age>=0&&age<1200)this.sound('/juegos/last-grip/media/fall-female.mp3',{rate:p?.gender==='male'?.78:1,volume:.5});}if(age>=650&&!this.falls.has(id+':water')){this.falls.add(id+':water');if(age<1700)this.sound('/juegos/audio/water-splash_1.wav',{volume:.65});}}
 }
 stop(){this.video.pause();this.helicopter.pause();for(const a of this.voices)a.pause();this.voices.clear();}
}
