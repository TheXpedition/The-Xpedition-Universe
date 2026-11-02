export class ProtocolCinema {
 constructor({video,note,onEnded=()=>{},onFailed=()=>{},onPlaying=()=>{},setTimer=(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer=id=>globalThis.clearTimeout(id)}){
  Object.assign(this,{video,note,onEnded,onFailed,onPlaying,setTimer,clearTimer,key:null,descriptor:null,retries:0,timer:null,pending:false,ended:false,failed:false,needsGesture:false,disposed:false,options:{paused:true,visible:true,enabled:true}});
  video.onended=()=>{if(!this.descriptor||this.ended)return;this.ended=true;this.note.hidden=true;this.onEnded(this.key);};
  video.onerror=()=>{if(this.descriptor)this.failure();};
  video.onwaiting=()=>{if(this.descriptor)this.message('Cargando la introducción…');};
  video.onplaying=()=>{if(!this.descriptor)return;this.failed=false;this.needsGesture=false;this.note.hidden=true;this.onPlaying(this.key);};
 }
 message(text){this.note.textContent=text;this.note.hidden=false;}
 sync(descriptor,options={}){
  if(this.disposed)return;this.options={...this.options,...options};
  if((descriptor?.key||null)!==this.key){this.clearTimer(this.timer);this.timer=null;this.key=descriptor?.key||null;this.descriptor=descriptor;this.retries=0;this.ended=false;this.failed=false;this.needsGesture=false;this.pending=false;this.video.pause();this.note.hidden=true;
   if(descriptor){this.video.src=descriptor.url;this.video.load();}else{this.video.removeAttribute('src');this.video.load();}
  }
  this.video.muted=!this.options.enabled;this.video.volume=1;
  if(!descriptor||this.options.paused||!this.options.visible){this.video.pause();return;}
  if(this.failed){this.retry();return;}
  this.play();
 }
 play(){
  if(this.disposed||!this.descriptor||this.ended||this.failed||this.pending||this.needsGesture||this.options.paused||!this.options.visible||!this.video.paused)return;
  const key=this.key;this.pending=true;
  let result;try{result=this.video.play();}catch(error){result=Promise.reject(error);}
  void Promise.resolve(result).catch(error=>{if(this.disposed||key!==this.key||this.options.paused||!this.options.visible)return;
   if(error.name==='NotAllowedError'){this.needsGesture=true;this.message('Toca la pantalla para activar el sonido de la introducción.');}
   else if(error.name!=='AbortError')this.failure();
  }).finally(()=>{if(key===this.key)this.pending=false;});
 }
 failure(){if(this.disposed||!this.descriptor||this.ended)return;this.failed=true;this.message('Reconectando la introducción…');this.onFailed(this.key);this.retry();}
 retry(){if(this.timer||this.disposed)return;const key=this.key;this.timer=this.setTimer(()=>{this.timer=null;if(this.disposed||key!==this.key)return;if(this.options.paused||!this.options.visible){this.retry();return;}this.failed=false;this.needsGesture=false;this.retries++;const join=this.descriptor.url.includes('?')?'&':'?';this.video.src=this.descriptor.url+join+'playback-retry='+this.retries;this.video.load();this.play();},Math.min(15000,1000*2**Math.min(this.retries,4)));}
 unlock(){if(this.disposed)return;if(this.descriptor){this.needsGesture=false;this.play();return;}if(this.warmed)return;this.warmed=true;this.video.src='/juegos/x-protocol/media/intro-warmup.mp4';void Promise.resolve(this.video.play()).then(()=>{if(!this.descriptor)this.video.pause();}).catch(()=>{this.warmed=false;});}
 destroy(){this.disposed=true;this.clearTimer(this.timer);this.video.pause();this.video.onended=null;this.video.onerror=null;this.video.onwaiting=null;this.video.onplaying=null;}
}
