export async function playWorldIntro(config){
 if(!config?.url)return;
 const request=async(action,body={})=>{const response=await fetch('/api/world/intro/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),value=await response.json();if(!response.ok)throw Error(value.error||'No se pudo guardar la introducción.');return value;};
 const session=await request('start'),seen=session.seen;
 const dialog=document.createElement('dialog');dialog.className='world-intro';dialog.setAttribute('aria-label','Introducción de The X World');
 dialog.innerHTML='<video playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback"></video><button class="intro-start" aria-label="Reproducir introducción" hidden><svg viewBox="0 0 24 24"><path d="m8 4 13 8-13 8z"/></svg></button><div class="intro-bottom"><button class="intro-pause" aria-label="Pausar introducción">Ⅱ</button><button class="intro-audio" aria-label="Silenciar introducción">♫</button><span class="intro-message" role="status"></span></div>'+(seen?'<button class="intro-skip">Omitir <span aria-hidden="true">›</span></button>':'');
 document.body.append(dialog);const video=dialog.querySelector('video'),start=dialog.querySelector('.intro-start'),message=dialog.querySelector('.intro-message');video.src=config.mobileUrl&&(globalThis.matchMedia?.('(max-width: 1024px), (pointer: coarse)').matches||globalThis.navigator?.connection?.saveData)?config.mobileUrl:config.url;video.volume=1;video.muted=false;
 let reached=0,lastTime=0,completing=false;dialog.addEventListener('cancel',e=>e.preventDefault());document.documentElement.classList.add('world-intro-playing');dialog.showModal();
 return new Promise(resolve=>{
  const finish=()=>{video.pause();dialog.close();dialog.remove();document.documentElement.classList.remove('world-intro-playing');resolve();};
  dialog.querySelector('.intro-skip')?.addEventListener('click',finish);
  const play=()=>{message.textContent='';void video.play().then(()=>{start.hidden=true;delete message.dataset.playError;message.removeAttribute('title');}).catch(error=>{start.hidden=false;message.dataset.playError=error.name;message.title=error.message;message.textContent=error.name==='NotSupportedError'?'No se pudo reproducir el video. Toca para reintentar.':'Toca para comenzar con sonido.';});};
  start.onclick=play;
  dialog.querySelector('.intro-pause').onclick=()=>{if(video.paused)play();else video.pause();};
  dialog.querySelector('.intro-audio').onclick=e=>{video.muted=!video.muted;e.currentTarget.setAttribute('aria-label',video.muted?'Activar sonido':'Silenciar introducción');e.currentTarget.classList.toggle('muted',video.muted);};
  video.onplay=()=>{dialog.querySelector('.intro-pause').textContent='Ⅱ';};video.onpause=()=>{dialog.querySelector('.intro-pause').textContent='▶';};
  video.ontimeupdate=()=>{if(!video.seeking){reached=Math.max(reached,video.currentTime);lastTime=video.currentTime;}};
  video.onseeking=()=>{if(!seen&&video.currentTime>reached+.75)video.currentTime=reached;};
  video.onratechange=()=>{if(!seen&&video.playbackRate!==1)video.playbackRate=1;};
  video.onwaiting=()=>{message.textContent='Cargando…';};video.onplaying=()=>{message.textContent='';start.hidden=true;};
  video.onerror=()=>{message.textContent='No pudimos cargar el video. Toca para volver a intentar.';start.hidden=false;start.onclick=()=>{video.load();play();};};
  async function ended(){if(completing)return;if(seen)return finish();completing=true;message.textContent='Guardando…';try{await request('complete',{session:session.session,position:Math.max(lastTime,video.currentTime)});finish();}catch(error){completing=false;message.textContent='No pudimos guardar que terminaste el video. Toca para reintentar.';start.hidden=false;start.setAttribute('aria-label','Guardar reproducción completa');start.onclick=()=>void ended();}}
  video.onended=()=>void ended();play();
 });
}
