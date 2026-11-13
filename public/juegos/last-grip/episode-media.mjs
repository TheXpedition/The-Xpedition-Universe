// Clips play natively from the beginning. The server tracks completion per viewer.
const START_TIMEOUT_MS=8000,MAX_RETRIES=2;
export class EpisodeMedia {
 constructor({video,playButton,status,onEnded=()=>{},onFailed=()=>{}}){
  Object.assign(this,{video,playButton,status,onEnded,onFailed,enabled:false,key:null,finishedKey:null,
   generation:0,frameReady:false,pending:false,autoplayMuted:false,needsGesture:false,retries:0,exhausted:false,
   retryTimer:null,startTimer:null,voices:new Set(),falls:new Set()});
  this.helicopter=document.createElement('audio');
  this.helicopter.src='/juegos/last-grip/media/helicopter.mp3';
  this.helicopter.preload='auto';this.helicopter.loop=true;this.helicopter.volume=.48;
  playButton.onclick=()=>this.enable();
  video.onplaying=()=>{if(!this.descriptor||video.readyState<2)return;this.clearStartTimer();this.frameReady=true;this.buffering=false;this.render();};
  video.onwaiting=()=>{this.buffering=true;if(this.descriptor&&!this.state?.paused&&!document.hidden&&!this.startTimer&&!this.retryTimer&&!this.needsGesture&&!this.exhausted)this.startTimer=setTimeout(()=>this.failure(),START_TIMEOUT_MS);this.render();};
  video.onended=()=>{if(!this.key||this.finishedKey===this.key)return;this.finishedKey=this.key;this.render();this.onEnded(this.key);};
  video.onerror=()=>this.failure();
 }
 clearStartTimer(){clearTimeout(this.startTimer);this.startTimer=null;}
 load(url){
  this.generation++;this.pending=false;this.frameReady=false;this.buffering=false;this.clearStartTimer();this.video.pause();
  if(url)this.video.src=url;else this.video.removeAttribute('src');
  this.video.load();
 }
 render(){
  const active=!!this.descriptor,ended=active&&this.finishedKey===this.key;
  this.video.hidden=!active||ended;
  this.video.dataset.frameReady=String(active&&this.frameReady&&!ended);
  this.playButton.hidden=!active||ended||this.enabled&&!this.autoplayMuted&&!this.needsGesture&&!this.exhausted;
  if(!this.status)return;
  const text=!active?'':ended?'Esperando a los demás espectadores…':this.exhausted?'No se pudo cargar el video. Pulsa Continuar para reintentar.':this.needsGesture?'Pulsa Continuar para reproducir el video.':this.retryTimer?'Reconectando el video…':!this.frameReady||this.buffering?'Cargando el video…':'';
  this.status.hidden=!text;
  if(this.status.textContent!==text)this.status.textContent=text;
 }
 failure(){
  if(!this.descriptor||this.finishedKey===this.key||this.retryTimer||this.exhausted)return;
  this.clearStartTimer();this.frameReady=false;this.video.pause();
  if(this.retries>=MAX_RETRIES){
   this.exhausted=true;this.onFailed(this.key);
  }else{
   this.retryTimer=setTimeout(()=>{
    this.retryTimer=null;this.retries++;
    const url=this.descriptor.url,join=url.includes('?')?'&':'?';
    this.load(url+join+'grip-retry='+this.retries);
    if(this.state)this.sync(this.state);
   },1000*(this.retries+1));
  }
  this.render();
 }
 enable(){
  this.enabled=true;this.autoplayMuted=false;this.needsGesture=false;this.helicopterBlocked=false;
  if(this.descriptor&&(this.exhausted||this.video.error)){
   clearTimeout(this.retryTimer);this.retryTimer=null;this.exhausted=false;this.retries=0;this.load(this.descriptor.url);
  }
  if(this.state)this.sync(this.state);
 }
 playVideo(){
  if(this.pending||!this.video.paused||this.needsGesture||this.retryTimer||this.exhausted)return;
  if(this.video.error){this.failure();return;}
  if(!this.frameReady&&!this.startTimer)this.startTimer=setTimeout(()=>this.failure(),START_TIMEOUT_MS);
  const generation=this.generation;this.pending=true;
  void Promise.resolve(this.video.play()).then(()=>{if(generation===this.generation)this.pending=false;},error=>{
   if(generation!==this.generation)return;this.pending=false;
   if(error.name==='NotAllowedError'){
    if(!this.video.muted){this.autoplayMuted=true;this.video.muted=true;this.playVideo();}
    else{this.clearStartTimer();this.needsGesture=true;}
    this.render();
   }else if(error.name!=='AbortError')this.failure();
  });
 }
 sound(url,{rate=1,volume=.5}={}){
  if(!this.enabled||document.hidden||this.voices.size>=5)return;
  const a=document.createElement('audio');a.src=url;a.volume=volume*(this.duck||1);a.playbackRate=rate;this.voices.add(a);
  const done=()=>this.voices.delete(a);a.onended=done;a.onerror=done;void a.play()?.catch(done);
 }
 sync(state){
  this.duck=state.announcementSpeaking?.22:1;this.video.volume=this.duck;this.state=state;
  const d=state.cinematic,key=d?.key||null;
  if(key!==this.key){
   clearTimeout(this.retryTimer);this.retryTimer=null;this.key=key;this.finishedKey=null;this.descriptor=d;
   this.retries=0;this.exhausted=false;this.autoplayMuted=false;this.needsGesture=false;
   this.load(d?.url);
  }
  this.video.dataset.placement=d?.placement||'fullscreen';
  this.video.muted=!this.enabled||this.autoplayMuted;
  if(d&&this.finishedKey!==this.key){
   if(state.paused||document.hidden){this.video.pause();this.clearStartTimer();}
   else {this.render();this.playVideo();}
  }
  this.render();
  const landing=state.phase==='arrival'&&state.clock-state.phaseAt<7200&&!state.paused&&!document.hidden&&this.enabled;
  if(landing){
   this.helicopter.volume=Math.max(.06,.5-(state.clock-state.phaseAt)/17000)*this.duck;
   if(this.helicopter.paused&&!this.helicopterBlocked)void this.helicopter.play()?.catch(()=>{this.helicopterBlocked=true;});
  }else this.helicopter.pause();
  if(state.paused||document.hidden){for(const a of this.voices)a.pause();this.voices.clear();return;}
  for(const f of state.round?.falls||[]){const age=state.clock-f.clock,id=state.round.id+':'+f.id,p=state.roster.find(p=>p.id===f.id);if(!this.falls.has(id+':voice')){this.falls.add(id+':voice');if(age>=0&&age<1200)this.sound('/juegos/last-grip/media/fall-female.mp3',{rate:p?.gender==='male'?.78:1,volume:.5});}if(age>=650&&!this.falls.has(id+':water')){this.falls.add(id+':water');if(age<1700)this.sound('/juegos/audio/water-splash_1.wav',{volume:.65});}}
 }
 stop(){this.clearStartTimer();this.video.pause();this.helicopter.pause();for(const a of this.voices)a.pause();this.voices.clear();}
 destroy(){
  clearTimeout(this.retryTimer);this.retryTimer=null;this.generation++;this.stop();
  this.video.onplaying=null;this.video.onwaiting=null;this.video.onended=null;this.video.onerror=null;
 }
}
