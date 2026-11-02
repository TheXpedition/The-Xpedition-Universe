export const phoneViewport=()=>matchMedia('(any-pointer: coarse)').matches&&Math.min(innerWidth,innerHeight)<=600;
export function installLandscapeMode(){if(!document.querySelector('link[href="/world-landscape.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/world-landscape.css';document.head.append(css);}
 const gate=document.createElement('div');gate.id='world-landscape-gate';gate.hidden=true;gate.setAttribute('role','dialog');gate.setAttribute('aria-label','Gira tu celular');
 gate.innerHTML='<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><rect x="21" y="9" width="38" height="62" rx="7" transform="rotate(-32 40 40)"/><path d="M7 29A34 34 0 0 1 56 8M56 8l-10 1m10-1-1 10M73 51A34 34 0 0 1 24 72m0 0 10-1m-10 1 1-10"/></svg><strong>GIRA TU CELULAR</strong><p>World se juega en horizontal.</p>';
 document.body.append(gate);let fullscreen=false,trying=false;
 const update=()=>{const blocked=phoneViewport()&&innerHeight>innerWidth;gate.hidden=!blocked;document.documentElement.classList.toggle('world-needs-landscape',blocked);if(blocked)window.dispatchEvent(new Event('world-landscape-blocked'));};
 const request=async()=>{if(!phoneViewport()||trying)return;trying=true;try{if(screen.orientation?.lock){try{await screen.orientation.lock('landscape');}catch{if(!document.fullscreenElement&&document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'});fullscreen=true;await screen.orientation.lock('landscape');}}}}catch{}finally{trying=false;update();}};
 const gesture=()=>{if(phoneViewport()&&screen.orientation?.type?.startsWith('portrait'))void request();};
 window.addEventListener('resize',update);document.addEventListener('pointerdown',gesture,{passive:true});update();
 return {request,destroy(){window.removeEventListener('resize',update);document.removeEventListener('pointerdown',gesture);gate.remove();document.documentElement.classList.remove('world-needs-landscape');if(fullscreen&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}};
}
