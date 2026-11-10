export const shouldShowProtocolCinema=(descriptor,endedKey)=>!!descriptor&&descriptor.key!==endedKey;

export class ProtocolCinema {
 constructor({video,note,onEnded=()=>{},onFailed=()=>{},onPlaying=()=>{},setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id)}){
  Object.assign(this,{video,note,onEnded,onFailed,onPlaying,setTimer,clearTimer,key:null,descriptor:null,retries:0,timer:null,pending:false,ended:false,failed:false,needsGesture:false,autoplayMuted:false,userInteracted:false,mobileStartMuted:typeof navigator!=='undefined'&&(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||navigator.maxTouchPoints>1),disposed:false,options:{paused:true,visible:true,enabled:true}});
  video.onended=()=>{if(!this.descriptor||this.ended)return;this.ended=true;this.note.hidden=true;this.onEnded(this.key);};
  video.onloadedmetadata=()=>this.align();
  video.onerror=()=>{if(this.descriptor)this.failure();};
  video.onwaiting=()=>{if(this.descriptor)this.message('Cargando la introducción…');};
  video.onplaying=()=>{if(!this.descriptor)return;this.failed=false;this.needsGesture=false;this.note.hidden=true;this.onPlaying(this.key);};
 }
 message(text){this.note.textContent=text;this.note.hidden=false;}
 prepare(media){
  if(!media?.url||this.descriptor||this.prepared===media.url&&this.video.readyState>=3)return Promise.resolve();
  if(this.preparing?.url===media.url)return this.preparing.promise;
  this.preparing?.cancel();
  const video=this.video;video.autoplay=false;video.pause();
  const job={url:media.url};this.preparing=job;
  job.promise=new Promise((resolve,reject)=>{
   let timer,localFallback=false;
   const cleanup=()=>{this.clearTimer(timer);video.removeEventListener('canplay',done);video.removeEventListener('error',fail);};
   job.cancel=()=>{cleanup();if(this.preparing===job)this.preparing=null;resolve();};
   const done=()=>{cleanup();if(this.preparing===job){this.prepared=media.url;this.preparing=null;}resolve();};
   const fail=()=>{
    if(this.preparing!==job)return;
    if(media.fallbackUrl&&!localFallback){localFallback=true;video.src=media.fallbackUrl;video.load();this.clearTimer(timer);timer=this.setTimer(fail,10000);return;}
    cleanup();this.preparing=null;reject(Error('No se pudo cargar la introducción. Reintentando…'));
   };
   video.addEventListener('canplay',done);video.addEventListener('error',fail);
   timer=this.setTimer(fail,10000);video.preload='auto';video.src=media.url;video.load();
  });
  return job.promise;
 }
 sync(descriptor,options={}){
  if(this.disposed)return;this.options={...this.options,...options};
  if((descriptor?.key||null)!==this.key){this.clearTimer(this.timer);this.timer=null;this.key=descriptor?.key||null;this.descriptor=descriptor;this.retries=0;this.ended=false;this.failed=false;this.needsGesture=false;this.pending=false;this.video.pause();this.note.hidden=true;
   this.autoplayMuted=this.mobileStartMuted&&!this.userInteracted;if(descriptor){const reuse=this.prepared===descriptor.url||this.preparing?.url===descriptor.url;this.preparing?.cancel();if(!reuse){this.video.src=descriptor.url;this.video.load();}try{this.video.currentTime=0;}catch{}}else{this.preparing?.cancel();this.prepared=null;this.video.removeAttribute('src');this.video.load();}
  }
  this.video.muted=!this.options.enabled||this.autoplayMuted;this.video.volume=1;
  if(!descriptor||this.options.paused){this.video.pause();this.align();return;}
  this.align();
  if(this.failed){this.retry();return;}
  this.play();
 }
 syncClock(clock){this.options.clock=clock;this.align(clock);}
 align(clock=this.options.clock){const d=this.descriptor;if(!d||this.ended||!Number.isFinite(clock)||!Number.isFinite(d.start)||clock>=d.start+d.duration||this.video.readyState<1)return;const duration=Number.isFinite(this.video.duration)&&this.video.duration>0?this.video.duration:Number(d.duration)/1000;if(!Number.isFinite(duration)||duration<=0)return;const target=Math.min(Math.max(0,(clock-d.start)/1000),Math.max(0,duration-.08));if(Math.abs((this.video.currentTime||0)-target)<.45)return;try{this.video.currentTime=target;}catch{}}
 play(){
  if(this.disposed||!this.descriptor||this.ended||this.failed||this.pending||this.needsGesture||this.options.paused||!this.video.paused)return;
  const key=this.key;this.pending=true;
  let result;try{result=this.video.play();}catch(error){result=Promise.reject(error);}
  void Promise.resolve(result).catch(error=>{if(this.disposed||key!==this.key||this.options.paused)return;
   if(error.name==='NotAllowedError'){if(this.options.enabled&&!this.autoplayMuted){this.autoplayMuted=true;this.video.muted=true;this.message('La introducción se reproducirá sin sonido. Toca para activar el audio.');}else{this.needsGesture=true;this.message('Toca la pantalla para iniciar la introducción.');}}
   else if(error.name!=='AbortError')this.failure();
  }).finally(()=>{if(key===this.key){this.pending=false;if(this.autoplayMuted&&!this.needsGesture&&this.video.paused)this.play();}});
 }
 failure(){if(this.disposed||!this.descriptor||this.ended)return;this.failed=true;this.message('Reconectando la introducción…');this.onFailed(this.key);this.retry();}
 retry(){if(this.timer||this.disposed)return;const key=this.key;this.timer=this.setTimer(()=>{this.timer=null;if(this.disposed||key!==this.key)return;if(this.options.paused){this.retry();return;}this.failed=false;this.needsGesture=false;this.retries++;const source=this.descriptor.fallbackUrl||this.descriptor.url;const join=source.includes('?')?'&':'?';this.video.src=source+join+'playback-retry='+this.retries;this.video.load();this.play();},Math.min(15000,1000*2**Math.min(this.retries,4)));}
 unlock(){if(this.disposed)return;this.userInteracted=true;if(this.descriptor){this.needsGesture=false;if(this.autoplayMuted){this.autoplayMuted=false;this.video.muted=!this.options.enabled;this.note.hidden=true;}this.play();return;}if(this.preparing||this.prepared||this.warmed)return;this.warmed=true;this.video.src='/juegos/x-protocol/media/intro-warmup.mp4';void Promise.resolve(this.video.play()).then(()=>{if(!this.descriptor)this.video.pause();}).catch(()=>{this.warmed=false;});}
 destroy(){this.disposed=true;this.preparing?.cancel();this.clearTimer(this.timer);this.video.pause();this.video.onended=null;this.video.onerror=null;this.video.onwaiting=null;this.video.onplaying=null;this.video.onloadedmetadata=null;}
}
