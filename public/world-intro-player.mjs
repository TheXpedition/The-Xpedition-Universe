export async function playWorldIntro(config,options={}){
 if(!config?.url)return;
 const request=options.request||async function(action,body={}){const response=await fetch('/api/world/intro/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),value=await response.json();if(!response.ok)throw Error(value.error||'No se pudo guardar la introducción.');return value;};
 const session=await request('start'),seen=session.seen;
 const dialog=document.createElement('dialog');dialog.className='world-intro';dialog.setAttribute('aria-label','Introducción de The X World');
 dialog.innerHTML='<video playsinline preload="auto" disablepictureinpicture disableremoteplayback controlslist="nodownload noplaybackrate noremoteplayback"></video><button class="intro-start" aria-label="Entrar a World con sonido" hidden><span>Entrar</span><svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><div class="intro-bottom">'+(seen?'<button class="intro-pause" aria-label="Pausar introducción">Ⅱ</button><button class="intro-audio" aria-label="Silenciar introducción">♫</button>':'')+'<span class="intro-message" role="status"></span></div>'+(seen?'<button class="intro-skip">Omitir <span aria-hidden="true">›</span></button>':'');
 document.body.append(dialog);let video=dialog.querySelector('video');if(options.video){video.replaceWith(options.video);video=options.video;video.hidden=false;}video.controls=false;video.disablePictureInPicture=true;video.disableRemotePlayback=true;video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');const start=dialog.querySelector('.intro-start'),message=dialog.querySelector('.intro-message');video.src=config.mobileUrl&&(globalThis.matchMedia?.('(max-width: 1024px), (pointer: coarse)').matches||globalThis.navigator?.connection?.saveData)?config.mobileUrl:config.url;video.volume=1;video.muted=false;
 let reached=0,lastTime=0,completing=false,closing=false;dialog.addEventListener('cancel',e=>e.preventDefault());document.documentElement.classList.add('world-intro-playing');dialog.showModal();
 return new Promise(resolve=>{
  const finish=()=>{if(closing)return;closing=true;video.pause();dialog.close();dialog.remove();document.documentElement.classList.remove('world-intro-playing');options.signal?.removeEventListener('abort',finish);resolve();};
  if(options.signal?.aborted){finish();return;}options.signal?.addEventListener('abort',finish,{once:true});
  dialog.querySelector('.intro-skip')?.addEventListener('click',finish);
  const entry=label=>{dialog.classList.add('intro-awaiting-entry');start.hidden=false;start.querySelector('span').textContent=label;};
  const play=()=>{message.textContent='';void video.play().then(()=>{start.hidden=true;dialog.classList.remove('intro-awaiting-entry');delete message.dataset.playError;message.removeAttribute('title');}).catch(error=>{entry(error.name==='NotAllowedError'?'Entrar':'Reintentar');message.dataset.playError=error.name;message.title=error.message;message.textContent=error.name==='NotAllowedError'?'World está listo. Entra para continuar con sonido.':'No pudimos reproducir la introducción. Vuelve a intentar.';});};
  start.onclick=play;
  const pause=dialog.querySelector('.intro-pause'),audio=dialog.querySelector('.intro-audio');
  if(pause)pause.onclick=()=>{if(video.paused)play();else video.pause();};
  if(audio)audio.onclick=e=>{video.muted=!video.muted;e.currentTarget.setAttribute('aria-label',video.muted?'Activar sonido':'Silenciar introducción');e.currentTarget.classList.toggle('muted',video.muted);};
  video.onplay=()=>{if(pause)pause.textContent='Ⅱ';};video.onpause=()=>{if(pause)pause.textContent='▶';else if(!closing&&!completing&&!video.ended)play();};
  if(!seen){video.onvolumechange=()=>{if(video.muted)video.muted=false;if(video.volume!==1)video.volume=1;};video.oncontextmenu=e=>e.preventDefault();dialog.addEventListener('keydown',e=>{if(e.target===video&&[' ','k','K','m','M','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();});}
  video.ontimeupdate=()=>{if(!video.seeking){reached=Math.max(reached,video.currentTime);lastTime=video.currentTime;}};
  video.onseeking=()=>{if(!seen&&video.currentTime>reached+.75)video.currentTime=reached;};
  video.onratechange=()=>{if(!seen&&video.playbackRate!==1)video.playbackRate=1;};
  video.onwaiting=()=>{message.textContent='Cargando…';};video.onplaying=()=>{message.textContent='';start.hidden=true;dialog.classList.remove('intro-awaiting-entry');};
  video.onerror=()=>{message.textContent='No pudimos cargar la introducción. Vuelve a intentar.';entry('Reintentar');start.onclick=()=>{video.load();play();};};
  async function ended(){if(completing)return;if(seen)return finish();completing=true;message.textContent='Entrando a World…';const saved=Promise.resolve().then(()=>request('complete',{session:session.session,position:Math.max(lastTime,video.currentTime)})).then(()=>true,()=>false);await Promise.race([saved,new Promise(resolve=>setTimeout(()=>resolve(false),1500))]);finish();}
  video.onended=()=>void ended();play();
 });
}

