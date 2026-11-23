import {SHELTERS,SHELTER_SIZE,SHELTER_MATERIALS,shelterAt} from './world-shelters.mjs';
import {worldCharacter} from './world-characters.mjs';
import {shelterMaterialArt} from './world-shelter-icons.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function styles(){if(document.getElementById('shelter-styles'))return;const link=document.createElement('link');link.id='shelter-styles';link.rel='stylesheet';link.href='/juegos/world-shelters.css';document.head.append(link);}
function people(s){
 const portraits=Array.from({length:Math.max(s.required||SHELTER_SIZE,s.members.length+(s.formerPortrait?1:0))},(_,i)=>{
  const former=i===s.members.length?s.formerPortrait:null;
  const person=s.members[i]||former;
  if(!person)return '<span class="shelter-empty-resident" aria-hidden="true"></span>';
  const portrait=worldCharacter(person.characterId)?.portrait||'/juegos/cast-apocalypse/'+person.characterId+'-portrait.webp';
  const label=esc(person.name+(former?' · Exintegrante':''));
  return '<img'+(former?' class="shelter-former-resident"':'')+' src="'+esc(portrait)+'" alt="'+label+'" title="'+label+'">';
 });
 return '<div class="shelter-residents" data-home="'+esc(s.id)+'" aria-label="Retratos de '+esc(s.name)+'">'+portraits.join('')+'</div>';
}
// Refugios are determined exclusively by the selected character, never by Staff.
export function shelterAssignmentMarkup(){return '';}
export function mountShelterPanel(root,{view,home,canContribute=false,onContribute=async()=>{},onEnter=()=>{}}){
 styles();let current=view,pending=false,closed=false;
 function render(){if(closed)return;const s=current?.shelters.find(s=>s.id===home);if(!s){root.textContent='Consultando el refugio…';return;}const own=current.home===home&&current.eligible,held=current.inventory||[],sent=current.delivered||[];
  root.innerHTML='<section class="shelter-panel"><header><div><p class="eyebrow">CONSTRUCCIÓN DEL CAMPAMENTO</p><h2>'+esc(s.name)+' <span>'+s.percent+' %</span></h2></div><span class="shelter-status">'+(s.built?'Construido':s.members.length+' personajes')+'</span></header><progress class="shelter-progress" max="100" value="'+s.percent+'" aria-label="Construcción de '+esc(s.name)+'"></progress>'+people(s)+'<p class="shelter-help">'+(s.built?'El refugio permanece construido. Solo sus integrantes pueden entrar.':own?'Cada integrante aporta una unidad de cada material. Tus materiales recogidos se guardan hasta que los entregues.':current.eligible?'Este personaje pertenece al otro refugio. Solo puede aportar y entrar en el suyo.':'Solo los 18 participantes activos asignados a este refugio pueden aportar y entrar.')+'</p><div class="shelter-materials">'+SHELTER_MATERIALS.map(m=>'<article class="shelter-material"><span class="shelter-material-art" aria-hidden="true">'+shelterMaterialArt(m.id)+'</span><div><strong>'+esc(m.name)+'</strong><small>'+(!own?'Una unidad por integrante':sent.includes(m.id)?'✓ Tu aporte entregado':held.includes(m.id)?'En tu mochila':'Por encontrar')+'</small></div><span class="shelter-material-count">'+s.counts[m.id]+'/'+(s.required||SHELTER_SIZE)+'</span></article>').join('')+'</div><footer>'+(s.built?'<button type="button" class="yellow-button" data-shelter-enter '+(!own?'disabled':'')+'>Entrar a '+esc(s.name)+'</button>':'<button type="button" class="yellow-button" data-shelter-contribute '+(!own||!canContribute||!held.length||pending?'disabled':'')+'>'+(pending?'Guardando aporte…':'Aportar materiales de mi mochila')+'</button>')+(!canContribute&&!s.built&&own?'<small>Acércate a la entrada del refugio para aportar.</small>':'')+'</footer></section>';
 }
 const click=async e=>{if(e.target.closest('[data-shelter-enter]'))return onEnter();if(!e.target.closest('[data-shelter-contribute]')||pending)return;pending=true;render();try{const value=await onContribute();if(value?.shelters)current=value.shelters;}finally{pending=false;render();}};root.addEventListener('click',click);render();
 return {update(value){if(value){current=value;render();}},destroy(){closed=true;root.removeEventListener('click',click);}};
}
export function mountShelterHUD(){
 styles();
 let view=null,signature='',lastPosition='';
 const badge=document.createElement('aside');
 badge.className='shelter-home-badge';
 badge.hidden=true;
 document.body.append(badge);
 function update(value){
  if(!value)return;
  view=value;
  const next=JSON.stringify(value.shelters);
  if(next===signature)return;
  signature=next;
  badge.dataset.home='';
 }
 function place({zone,playing,scene,canvas,map}){
  const def=shelterAt(zone),s=def&&view?.shelters.find(s=>s.id===def.id);
  if(!playing||!s){badge.hidden=true;return;}
  if(badge.dataset.home!==s.id){
   badge.dataset.home=s.id;
   const percent=s.built?'':'<span>'+s.percent+' %</span>';
   const progress=s.built?'':'<progress max="100" value="'+s.percent+'" aria-label="Construcción de '+esc(s.name)+'"></progress>';
   badge.innerHTML='<div class="shelter-badge-title"><strong>'+esc(s.name)+'</strong>'+percent+'</div>'+progress+people(s);
  }
  const portal=map?.props.find(p=>p.portal?.zone===def.entry);
  if(!portal){badge.hidden=true;return;}
  const anchor=portal.shelterBadgeAnchor||portal.contextAnchor||portal.portal;
  const q=scene.camera.project(anchor.x,anchor.y,0,scene.width,scene.height),r=canvas.getBoundingClientRect();
  const x=r.left+q.x/scene.width*r.width,projectedY=r.top+q.y/scene.height*r.height;
  const y=portal.shelterBadgeAnchor?projectedY:Math.max(200,projectedY-Math.max(170,r.height*.25));
  badge.hidden=x<0||x>innerWidth||y<70||y>innerHeight;
  if(badge.hidden)return;
  const left=Math.round(Math.max(130,Math.min(innerWidth-130,x))),top=Math.round(y);
  const position=left+','+top;
  if(position!==lastPosition){lastPosition=position;badge.style.left=left+'px';badge.style.top=top+'px';}
 }
 return {update,place,destroy(){badge.remove();}};
}
