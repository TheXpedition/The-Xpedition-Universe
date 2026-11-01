(() => {
 'use strict';
 function performanceProfile({preference='auto',userAgent='',platform='',touchPoints=0,memory,cores,saveData=false,reducedMotion=false}={}){
 const mobile=/Android|iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&touchPoints>1),android=/Android/i.test(userAgent);
 const constrained=saveData||android||(Number.isFinite(memory)&&memory<=4)||(Number.isFinite(cores)&&cores<=2);
 const tier=preference==='lite'?'lite':preference==='standard'?'standard':constrained?'lite':mobile?'balanced':'standard';
 return Object.freeze({tier,lite:tier==='lite',mobile,reducedMotion,renderHeight:tier==='lite'?480:tier==='balanced'?640:720,fps:tier==='lite'?30:tier==='balanced'?45:60,introFps:tier==='lite'?12:tier==='balanced'?20:30,particles:tier==='lite'?8:28,textureEntries:tier==='lite'?1:2});
}

 globalThis.XpeditionPerformanceProfile=performanceProfile;
 if(typeof document==='undefined')return;
 const nav=navigator,root=document.documentElement;
 const media=query=>window.matchMedia?.(query).matches||false;
 let preference='auto';try{preference=localStorage.getItem('xp-performance')||'auto';}catch{}
 function profile(){return performanceProfile({preference,userAgent:nav.userAgent,platform:nav.platform,touchPoints:nav.maxTouchPoints,memory:nav.deviceMemory,cores:nav.hardwareConcurrency,saveData:!!nav.connection?.saveData,reducedMotion:media('(prefers-reduced-motion: reduce)')});}
 function apply(){Object.assign(api,profile(),{preference});root.dataset.performance=api.tier;window.dispatchEvent(new CustomEvent('xp:qualitychange',{detail:api}));}
 const api={asset(src){const key=String(src).replace(/^\//,'').split('?')[0],replacement=window.XpeditionImageAssets?.[key];return replacement||src;},set(value){preference=['auto','standard','lite'].includes(value)?value:'auto';try{localStorage.setItem('xp-performance',preference);}catch{}apply();}};
 window.XpeditionPerformance=api;apply();
 document.addEventListener('DOMContentLoaded',()=>{const footer=document.querySelector('.site-footer,.game-footer,.games-footer,.xm-footer');if(!footer||document.querySelector('#quality'))return;const label=document.createElement('label');label.className='xp-performance-control';label.innerHTML='Rendimiento <select aria-label="Modo de rendimiento"><option value="auto">Automático</option><option value="standard">Completo</option><option value="lite">Ligero · menos efectos</option></select>';const select=label.querySelector('select');select.value=preference;select.onchange=()=>api.set(select.value);footer.append(label);},{once:true});
})();
