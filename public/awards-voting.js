'use strict';

const votingBanner='/awards/edition-3-banner.webp';
const votingTrophy='/awards/voting-trophy.webp';
const votingBase='#votacion';
const votingIntroKey='xp:awards:3:intro';
let votingBallot=null,votingChoices={},votingMember=null,votingRequest=0,votingModal=null,votingSaving=false;
const votingHref=(section,category)=>votingBase+(section?'/'+section+(category?'/'+category:''):'');
const votingCategories=()=>votingBallot.sections.flatMap(section=>section.categories);
const votingSignIn=()=>`<section class="vote-signin"><img src="${votingBanner}" alt="The Xpedition Awards · 3.ª edición"><div><h1>Vota en The Xpedition Awards</h1><p>Toda la audiencia con cuenta puede votar, incluido el Staff.</p><div><button class="vote-gold-button" data-action="login">Iniciar sesión</button><button class="btn secondary" data-action="register">Crear cuenta</button></div></div></section>`;

function renderVotingIntro(){
 const root=$('#main'),current=root.querySelector('.vote-page');
 const chapter=current?current.dataset.votingSection+'/'+current.dataset.votingCategory:'principales';
 root.innerHTML=`<section class="vote-intro" aria-labelledby="vote-intro-heading">
   <div class="vote-intro-spotlights" aria-hidden="true"></div>
   <div class="vote-intro-inner"><div class="vote-intro-art"><img src="${votingBanner}" alt="" fetchpriority="high" width="1440" height="810"><div class="vote-intro-sweep" aria-hidden="true"></div></div>
   <div class="vote-intro-copy"><small>THE XPEDITION AWARDS · 2026</small><h1 id="vote-intro-heading" tabindex="-1">Es hora<br>de votar<span>.</span></h1><p>Elige a tus favoritos en cada categoría.</p>
   <button type="button" class="vote-gold-button" data-vote="enter" data-chapter="${chapter}">Entrar a votar ${icon('arrow')}</button></div></div>
 </section>`;
 root.querySelector('#vote-intro-heading').focus({preventScroll:true});
}

async function renderAwardsVoting(sectionId,categoryId){
 const turn=++votingRequest,root=$('#main'),member=state.user?.id;
 if(!member){
  votingBallot=null;votingMember=null;votingChoices={};
  root.innerHTML=votingSignIn();
  return;
 }
 document.title='Votación · The Xpedition Awards';
 const reuse=votingBallot&&votingMember===member&&root.querySelector('.vote-page,.vote-intro');
 if(!reuse){
  root.innerHTML='<div class="loading-screen"><span class="spinner"></span> Preparando la papeleta…</div>';
  try{
   const {ballot,votes}=await api('/awards/voting');
   if(turn!==votingRequest||state.route!=='votacion'||state.user?.id!==member)return;
   votingBallot=ballot;votingChoices=votes;votingMember=member;
  }catch(error){
   if(turn!==votingRequest||state.route!=='votacion')return;
   root.innerHTML=error.status===401||error.status===403?votingSignIn():'<div class="empty-state"><h1>No pudimos abrir la votación.</h1><button class="btn secondary" type="button" data-vote="retry">Volver a intentar</button></div>';
   return;
  }
 }
 let watched=false;
 try{watched=sessionStorage.getItem(votingIntroKey)==='1';}catch{}
 if(!sectionId&&!watched&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  renderVotingIntro();
  return;
 }
 const section=votingBallot.sections.find(section=>section.id===sectionId)||votingBallot.sections[0];
 renderVotingBallot(section,section.categories.find(category=>category.id===categoryId)||section.categories[0]);
}

function votingPortrait(nominee){
 const face=person=>person.image?`<img src="${esc(person.image)}" alt="" loading="lazy" decoding="async">`:`<span class="vote-monogram" aria-hidden="true">${esc(person.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase())}</span>`;
 if(nominee.people?.length)return `<span class="vote-ensemble">${nominee.people.slice(0,6).map(face).join('')}</span>`;
 return face(nominee);
}

function votingCard(nominee,category,index){
 const checked=votingChoices[category.id]===nominee.id;
 return `<article class="vote-nominee" style="--vote-card-index:${index}">
   <button type="button" class="vote-card${nominee.isShow?' vote-show':''}" data-vote-nominee="${esc(nominee.id)}" aria-label="Votar por ${esc(nominee.name)}" aria-pressed="${checked}">
    <span class="vote-portrait">${votingPortrait(nominee)}<span class="vote-card-action" aria-hidden="true">${icon('check')} <span>${checked?'Tu voto':'Elegir'}</span></span></span>
    <span class="vote-card-text"><strong>${esc(nominee.name)}</strong>${nominee.details?`<small>${esc(nominee.details)}</small>`:''}</span>
   </button>
 </article>`;
}

function renderVotingBallot(section,category){
 const root=$('#main'),ordered=votingBallot.sections.flatMap(group=>group.categories.map(entry=>({group,entry})));
 const index=ordered.findIndex(item=>item.entry===category);
 const direction=(item,label,arrow)=>item?`<a class="vote-step-button" href="${votingHref(item.group.id,item.entry.id)}" aria-label="${label}, ${esc(item.entry.name)}">${icon(arrow)} <span>${label}</span></a>`:'<span></span>';
 root.innerHTML=`<div class="vote-page" data-voting-section="${section.id}" data-voting-category="${category.id}">
  <header class="vote-heading"><div><p>THE XPEDITION AWARDS <span>·</span> 3.ª EDICIÓN</p><h1>Votación<span>.</span></h1></div><div class="vote-progress" data-vote-progress role="status"></div></header>
  <nav class="vote-tabs" aria-label="Grupos de categorías">${votingBallot.sections.map(group=>`<a href="${votingHref(group.id)}" ${section.id===group.id?'aria-current="page"':''}>${esc(group.name)}</a>`).join('')}</nav>
  <div class="vote-layout"><aside class="vote-category-list"><div class="vote-category-title"><h2>Categorías</h2><small data-vote-group-progress></small></div>
    <nav aria-label="Categorías de la sección">${section.categories.map(entry=>`<a href="${votingHref(section.id,entry.id)}" data-vote-category="${entry.id}" ${entry.id===category.id?'aria-current="page"':''}><span>${esc(entry.name)}</span><span data-vote-mark>${votingCategoryMark(entry)}</span></a>`).join('')}</nav>
    <label class="vote-category-select"><span>Categoría</span><select data-vote-select>${section.categories.map(entry=>`<option value="${entry.id}" ${entry.id===category.id?'selected':''}>${esc(entry.name)}${votingChoices[entry.id]?' · Votaste':''}</option>`).join('')}</select></label>
   </aside>
   <section class="vote-stage" aria-labelledby="vote-stage-title">
    <header class="vote-stage-head"><div><p>${esc(section.name)}</p><h2 id="vote-stage-title">${esc(category.name)}</h2>${category.description?`<p class="vote-description">${esc(category.description)}</p>`:''}</div><figure class="vote-stage-decoration"><img src="${votingTrophy}" alt="" class="vote-stage-trophy" width="186" height="400"><img class="vote-stage-brand" src="/awards/voting-logo.webp" alt=""></figure></header>
    <div class="vote-line" aria-hidden="true"></div>
    ${category.nominees.length?`<div class="vote-nominees">${category.nominees.map((nominee,i)=>votingCard(nominee,category,i)).join('')}</div>`:'<p class="vote-pending">Los nominados de esta categoría se anunciarán próximamente.</p>'}
    <nav class="vote-stage-footer" aria-label="Navegar categorías">${direction(ordered[index-1],'Anterior','back')}<span>${index+1} / ${ordered.length}</span>${direction(ordered[index+1],'Siguiente','arrow')}</nav>
   </section>
  </div><footer class="vote-footer"><span>Un voto por categoría. Los resultados son visibles solo para el Staff.</span><button type="button" data-vote="intro">Repetir presentación</button></footer>
  <dialog class="vote-dialog" id="votingDialog" aria-labelledby="vote-dialog-name"></dialog>
 </div>`;
 updateVotingProgress(root,section);
 const dialog=$('#votingDialog');
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{if(!dialog.open)votingModal=null;});
}

function votingCategoryMark(category){
 return votingChoices[category.id]?icon('check'):category.nominees.length?icon('arrow'):icon('lock');
}

function updateVotingProgress(root,section){
 const all=votingCategories().filter(entry=>entry.nominees.length),voted=all.filter(entry=>votingChoices[entry.id]).length;
 $('[data-vote-progress]',root).innerHTML=`<div><strong>Tu papeleta</strong><span>${voted} de ${all.length} categorías</span></div><progress value="${voted}" max="${all.length}" aria-label="Avance de tu papeleta"></progress>`;
 $('[data-vote-group-progress]',root).textContent=section.categories.filter(entry=>votingChoices[entry.id]).length+' votadas';
 for(const entry of section.categories){
  const mark=$('[data-vote-category="'+entry.id+'"] [data-vote-mark]',root);
  if(mark)mark.innerHTML=votingCategoryMark(entry);
  const option=$('option[value="'+entry.id+'"]',root);
  if(option)option.textContent=entry.name+(votingChoices[entry.id]?' · Votaste':'');
 }
}

function openVotingNominee(nomineeId){
 const root=$('.vote-page'),section=votingBallot.sections.find(group=>group.id===root.dataset.votingSection);
 const category=section.categories.find(entry=>entry.id===root.dataset.votingCategory);
 const nominee=category.nominees.find(entry=>entry.id===nomineeId);
 if(!nominee)return;
 const dialog=$('#votingDialog'),current=category.nominees.find(entry=>entry.id===votingChoices[category.id]);
 const saved=current?.id===nominee.id;
 votingModal={category,nominee};
 dialog.classList.remove('vote-confirmed');
 dialog.innerHTML=`<div class="vote-dialog-shell"><button class="vote-dialog-close" type="button" aria-label="Cerrar" data-vote="close">${icon('close')}</button>
  <div class="vote-dialog-portrait">${votingPortrait(nominee)}</div><div class="vote-dialog-copy"><span>${esc(category.name)}</span><h2 id="vote-dialog-name">${esc(nominee.name)}</h2>
  ${nominee.details?`<p class="vote-dialog-detail">${esc(nominee.details)}</p>`:''}
  <p data-vote-message aria-live="polite">${saved?'Tu voto ya está guardado.':current?'Tu voto actual es para '+esc(current.name)+'.':'Confirma tu voto para esta categoría.'}</p>
  <button type="button" class="vote-gold-button" data-vote="${saved?'close':'confirm'}">${saved?'Volver a la papeleta':current?'Cambiar mi voto':'Confirmar voto'} ${icon(saved?'back':'check')}</button></div></div>`;
 dialog.showModal();
}

async function confirmAwardsVote(button){
 const selection=votingModal,dialog=$('#votingDialog');
 if(!selection||button.disabled||!state.user||votingSaving)return;
 const {category,nominee}=selection,member=state.user.id;
 votingSaving=true;button.disabled=true;
 $('[data-vote-message]',dialog).textContent='Guardando tu voto…';
 try{
  const vote=await api('/awards/voting',{method:'PUT',body:{category:category.id,nominee:nominee.id}});
  if(state.user?.id!==member||votingMember!==member)return;
  votingChoices[vote.category]=vote.nominee;
  const root=$('.vote-page');
  if(!root?.isConnected)return;
  const visibleSection=votingBallot.sections.find(group=>group.id===root.dataset.votingSection);
  updateVotingProgress(root,visibleSection);
  if(root.dataset.votingCategory===vote.category)for(const card of $$('[data-vote-nominee]',root)){
   const selected=card.dataset.voteNominee===vote.nominee;
   card.setAttribute('aria-pressed',String(selected));$('.vote-card-action span',card).textContent=selected?'Tu voto':'Elegir';
  }
  if(!dialog.open||votingModal!==selection)return;
  dialog.classList.add('vote-confirmed');
  $('[data-vote-message]',dialog).textContent='Voto guardado.';
  button.dataset.vote='close';
  button.innerHTML='Volver a la papeleta '+icon('check');
  button.disabled=false;
 }catch(error){
  if(!dialog?.open||votingModal!==selection)return;
  $('[data-vote-message]',dialog).textContent=error.message;
  button.disabled=false;
 }finally{votingSaving=false;}
}

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-vote],[data-vote-nominee]');
 if(!button||state.route!=='votacion')return;
 if(button.dataset.voteNominee){if(!votingSaving)openVotingNominee(button.dataset.voteNominee);return;}
 const action=button.dataset.vote;
 if(action==='enter'){
  try{sessionStorage.setItem(votingIntroKey,'1');}catch{}
  go('votacion/'+button.dataset.chapter);
 }
 if(action==='intro')renderVotingIntro();
 if(action==='retry')route();
 if(action==='close')$('#votingDialog')?.close();
 if(action==='confirm')void confirmAwardsVote(button);
});
document.addEventListener('change',event=>{
 const select=event.target.closest('[data-vote-select]');
 if(select)go('votacion/'+select.closest('.vote-page').dataset.votingSection+'/'+select.value);
});
