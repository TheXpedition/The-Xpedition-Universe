export const phoneViewport=()=>matchMedia('(any-pointer: coarse)').matches&&Math.min(innerWidth,innerHeight)<=600;

export function installLandscapeMode(){
 if(!document.querySelector('link[href="/world-landscape.css"]')){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='/world-landscape.css';
  document.head.append(css);
 }
 const gate=document.createElement('div');
 gate.id='world-landscape-gate';
 gate.hidden=true;
 gate.setAttribute('role','dialog');
 gate.setAttribute('aria-label','Gira tu celular');
 gate.innerHTML='<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><rect x="21" y="9" width="38" height="62" rx="7" transform="rotate(-32 40 40)"/><path d="M7 29A34 34 0 0 1 56 8M56 8l-10 1m10-1-1 10M73 51A34 34 0 0 1 24 72m0 0 10-1m-10 1 1-10"/></svg><strong>GIRA TU CELULAR</strong><p>World se juega mejor en horizontal.</p><button type="button">Continuar de todos modos</button>';
 document.body.append(gate);
 const landscape=matchMedia('(orientation: landscape)'),orientation=screen.orientation;
 let blocked=false,continueAnyway=false,recheck=0;

 function update(){
  const horizontal=innerWidth>=innerHeight||landscape.matches||
   orientation?.type?.startsWith('landscape')||Math.abs(window.orientation)===90;
  const next=phoneViewport()&&!horizontal&&!continueAnyway;
  if(next===blocked)return;
  blocked=next;
  gate.hidden=!blocked;
  document.documentElement.classList.toggle('world-needs-landscape',blocked);
  if(blocked)window.dispatchEvent(new Event('world-landscape-blocked'));
 }

 function rotationChanged(){
  update();
  window.clearTimeout(recheck);
  // Safari can report the rotation before its layout viewport has settled.
  recheck=window.setTimeout(update,250);
 }

 gate.querySelector('button').onclick=()=>{continueAnyway=true;update();};
 window.addEventListener('resize',update);
 window.addEventListener('orientationchange',rotationChanged);
 window.addEventListener('pageshow',rotationChanged);
 document.addEventListener('visibilitychange',rotationChanged);
 window.visualViewport?.addEventListener('resize',update);
 orientation?.addEventListener?.('change',rotationChanged);
 if(landscape.addEventListener)landscape.addEventListener('change',rotationChanged);
 else landscape.addListener?.(rotationChanged);
 update();

 return {destroy(){
  window.clearTimeout(recheck);
  window.removeEventListener('resize',update);
  window.removeEventListener('orientationchange',rotationChanged);
  window.removeEventListener('pageshow',rotationChanged);
  document.removeEventListener('visibilitychange',rotationChanged);
  window.visualViewport?.removeEventListener('resize',update);
  orientation?.removeEventListener?.('change',rotationChanged);
  if(landscape.removeEventListener)landscape.removeEventListener('change',rotationChanged);
  else landscape.removeListener?.(rotationChanged);
  gate.remove();
  document.documentElement.classList.remove('world-needs-landscape');
 }};
}
