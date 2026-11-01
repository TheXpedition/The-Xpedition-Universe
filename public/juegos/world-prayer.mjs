export const PRAYER_REASONS=Object.freeze([
 ['food','Por Comida'],['health','Por Salud'],['life','Por Vida'],['peace','Por Paz'],
 ['companions','Por mis Compañeros'],['pet','Por mi Mascota'],['survive','Por Sobrevivir'],
 ['pregnancy','Por quedar en embarazo'],['maria','Por Maria Villegas'],
 ['bonju','Por Bonju Belluci'],['dave','Por Dave Fonsé'],['dua','Por Dua Lingo']
].map(([id,label])=>Object.freeze({id,label})));
export const PRAYER_DURATION=4000,PRAYER_COOLDOWN=10*60000;
export function mountPrayerPanel(root,{onPray}={}){
 let selected='peace',busy=false,disposed=false;
 root.classList.add('world-prayer-panel');
 root.innerHTML='<div class="prayer-art"></div><p class="prayer-kicker">IGLESIA · MOMENTO DE RECOGIMIENTO</p><h2>¿Por qué te gustaría orar?</h2><p class="prayer-description">Elige una intención. Este momento puede aliviar hasta 6 puntos de estrés; los cuidados y tratamientos siguen en Enfermería.</p><div class="prayer-reasons">'+PRAYER_REASONS.map(r=>'<button data-prayer="'+r.id+'" aria-pressed="'+(r.id===selected)+'">'+r.label+'</button>').join('')+'</div><button class="prayer-start">Orar</button><div class="prayer-progress" hidden><i></i></div><p role="status"></p>';
 const handler=async e=>{const b=e.target.closest('button');if(!b||busy||disposed)return;if(b.dataset.prayer){selected=b.dataset.prayer;root.querySelectorAll('[data-prayer]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));return;}if(!b.matches('.prayer-start'))return;busy=true;root.classList.add('is-praying');root.querySelector('.prayer-progress').hidden=false;root.querySelectorAll('button').forEach(n=>n.disabled=true);root.querySelector('[role=status]').textContent='Un momento de calma…';try{const next=await onPray({reason:selected});if(!disposed)root.querySelector('[role=status]').textContent=next.message;}catch(error){if(!disposed)root.querySelector('[role=status]').textContent=error.message;}finally{busy=false;if(!disposed){root.classList.remove('is-praying');root.querySelector('.prayer-progress').hidden=true;root.querySelectorAll('button').forEach(n=>n.disabled=false);}}};
 root.addEventListener('click',handler);return {destroy(){disposed=true;root.removeEventListener('click',handler);}};
}
