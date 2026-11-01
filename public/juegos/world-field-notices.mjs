import {resourceArt,RESOURCE_BY_ID} from './world-survival-catalog.mjs';
import {foodIcon,FOOD_BY_ID} from './world-foods.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function fieldNoticeMarkup({title,text='',items=[]}){
 return '<button type="button" class="field-notice-close" aria-label="Cerrar aviso">×</button><small>CUADERNO DE CAMPO</small><h3>'+esc(title)+'</h3>'+(items.length?'<div class="field-rewards">'+items.map(i=>'<div class="field-reward">'+(i.kind==='food'?foodIcon(i.id):resourceArt(i.id))+'<span><b>'+esc((i.kind==='food'?FOOD_BY_ID[i.id]:RESOURCE_BY_ID[i.id])?.name||i.id)+'</b><small>+'+esc(i.quantity)+' · En tu inventario</small></span></div>').join('')+'</div>':'')+(text?'<p>'+esc(text)+'</p>':'');
}
export function mountFieldNotices(parent=document.body){
 const root=document.createElement('aside');root.className='world-field-notice';root.hidden=true;root.setAttribute('aria-live','polite');parent.append(root);let timer;
 const close=()=>{clearTimeout(timer);root.hidden=true;};root.onclick=e=>{if(e.target.closest('.field-notice-close'))close();};
 return {show(value){clearTimeout(timer);root.innerHTML=fieldNoticeMarkup(value);root.hidden=false;timer=setTimeout(close,value.items?.length?5200:12000);},close,destroy(){close();root.remove();}};
}
