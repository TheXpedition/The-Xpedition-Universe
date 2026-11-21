'use strict';

const votingBanner='/awards/edition-3-banner.webp';
const votingBase='#votacion';
const votingGroupIcons={principales:'compass',generales:'bookmark',especiales:'checks',otras:'more'};
const votingIntroKey='xp:awards:3:intro';
let votingBallot=null,votingChoices={},votingMember=null,votingRequest=0,votingModal=null,votingSaving=false,votingQuota=null;
const votingLegacySpecialIds=new Set(['traidor','inocente','sobreviviente','detective']);
const votingHref=(section,category)=>{const path=section==='especiales'&&votingLegacySpecialIds.has(category)?'generales':section;return votingBase+(path?'/'+path+(category?'/'+category:''):'');};
const votingCategories=()=>votingBallot.sections.flatMap(section=>section.categories);
const restrictedVoting=()=>`<section class="vote-signin"><div><h1>Inicia sesión para votar</h1><p>Necesitas una cuenta de The Xpedition para participar en las votaciones.</p><button type="button" class="vote-gold-button" data-vote="login">Iniciar sesión</button></div></section>`;

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
 if(!state.user){
  votingBallot=null;votingMember=null;votingChoices={};votingQuota=null;
  root.innerHTML=restrictedVoting();
  return;
 }
 document.title='Votación · The Xpedition Awards';
 const reuse=votingBallot&&votingMember===member&&root.querySelector('.vote-page,.vote-intro');
 if(!reuse){
  root.innerHTML='<div class="loading-screen"><span class="spinner"></span> Preparando la papeleta…</div>';
  try{
   const {ballot,votes,quota}=await api('/awards/voting');
   if(turn!==votingRequest||state.route!=='votacion'||state.user?.id!==member)return;
   votingBallot=ballot;votingChoices=votes;votingQuota=quota;votingMember=member;
  }catch(error){
   if(turn!==votingRequest||state.route!=='votacion')return;
   root.innerHTML=error.status===401||error.status===403?restrictedVoting():'<div class="empty-state"><h1>No pudimos abrir la votación.</h1><button class="btn secondary" type="button" data-vote="retry">Volver a intentar</button></div>';
   return;
  }
 }
 let watched=false;
 try{watched=sessionStorage.getItem(votingIntroKey)==='1';}catch{}
 if(!sectionId&&!watched&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  renderVotingIntro();
  return;
 }
 let section=votingBallot.sections.find(group=>group.id===sectionId)||votingBallot.sections[0];
 // Four existing The Traitor bookmarks continue to work after moving them to Especiales.
 if(sectionId==='generales'&&votingLegacySpecialIds.has(categoryId))section=votingBallot.sections.find(group=>group.id==='especiales')||section;
 renderVotingBallot(section,section.categories.find(category=>category.id===categoryId)||section.categories[0]);
}

function votingPortrait(nominee){
 const face=person=>person.image?`<img src="${esc(person.image)}" alt="" loading="eager" decoding="async">`:`<span class="vote-monogram" aria-hidden="true">${esc(person.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase())}</span>`;
 if(nominee.people?.length)return `<span class="vote-ensemble">${nominee.people.slice(0,6).map(face).join('')}</span>`;
 return face(nominee);
}

const votingCountLabel=votes=>votes+(votes===1?' voto':' votos');

function votingCard(nominee,category,index){
 const votes=votingChoices[category.id]?.[nominee.id]||0;
 const selected=(votingQuota?.selected[category.id]||[]).includes(nominee.id);
 return `<article class="vote-nominee" style="--vote-card-index:${index}">
   <button type="button" class="vote-card${nominee.isShow?' vote-show':''}" data-vote-nominee="${esc(nominee.id)}" aria-label="Votar por ${esc(nominee.name)}" data-personal-votes="${selected?votes:0}"${votes?` aria-description="${votingCountLabel(votes)} registrado${votes===1?'':'s'} por ti"`:''}>
    <span class="vote-portrait">${votingPortrait(nominee)}</span>
    <span class="vote-card-text"><strong>${esc(nominee.name)}</strong>${nominee.details?`<small>${esc(nominee.details)}</small>`:''}</span>
    <span class="vote-card-action" aria-hidden="true"><span>${votes?votingCountLabel(votes):'Votar'}</span>${icon(selected?'check':'arrow')}</span>
   </button>
 </article>`;
}

function renderVotingBallot(section,category){
 const root=$('#main'),ordered=votingBallot.sections.flatMap(group=>group.categories.map(entry=>({group,entry})));
 const index=ordered.findIndex(item=>item.entry===category);
 const previous=index===0?{group:section,entry:section.categories[section.categories.length-1]}:ordered[index-1];
 const direction=(item,label,arrow)=>item?`<a class="vote-step-button" href="${votingHref(item.group.id,item.entry.id)}" aria-label="${label}, ${esc(item.entry.name)}">${icon(arrow)} <span><small>${label}</small><strong>${esc(item.entry.name)}</strong></span></a>`:'<span></span>';
 root.innerHTML=`<div class="vote-page" data-nominee-count="${category.nominees.length}" data-voting-section="${section.id}" data-voting-category="${category.id}">
  <header class="vote-toolbar">
   <h1 class="vote-brand"><img src="/awards/voting-logo.webp" alt="The Xpedition Awards"><span>Votación</span><small class="vote-edition">${esc(String(votingBallot.edition))}.ª Edición</small></h1>
   <div class="vote-toolbar-actions"><div class="vote-credits" aria-live="polite"><small>Votos disponibles</small><strong data-vote-remaining></strong></div><button class="vote-replay" type="button" data-vote="intro" aria-label="Repetir presentación" title="Repetir presentación">${icon('play')}</button></div>
  </header>
  <div class="vote-layout">
   <aside class="vote-sidebar">
    <button class="vote-menu-toggle" data-vote="menu" type="button" aria-expanded="false" aria-controls="vote-navigation">
     ${icon('compass')} <strong>Menú de votación</strong><span>${esc(section.name)}</span>${icon('arrow')}
    </button>
    <nav class="vote-menu" id="vote-navigation" aria-label="Navegación de Awards">
     <h2>Categorías</h2>
     <div class="vote-menu-groups">${votingBallot.sections.map(group=>`
      <details class="vote-group" name="vote-groups" ${group.id===section.id?'open':''}>
       <summary ${group.id===section.id?'data-current-section':''}>${icon(votingGroupIcons[group.id])}<span>${esc(group.name)}</span>${icon('arrow')}</summary>
       <div>${group.categories.map(entry=>`<a href="${votingHref(group.id,entry.id)}" data-vote-category="${entry.id}" ${entry.id===category.id?'aria-current="page"':''}><span>${esc(entry.name)}</span><span data-vote-mark>${votingCategoryMark(entry)}</span></a>`).join('')}</div>
      </details>`).join('')}</div>
     <div class="vote-menu-tools">
      <button type="button" data-vote="ballot" aria-haspopup="dialog">${icon('bookmark')}<span>Tu papeleta</span><small data-vote-progress></small></button>
      <button type="button" data-vote="rules" aria-haspopup="dialog">${icon('info')}<span>Reglas de votación</span></button>
     </div>
    </nav>
   </aside>
   <section class="vote-stage" aria-labelledby="vote-stage-title">
    <header class="vote-stage-head"><div><h2 id="vote-stage-title">${esc(category.name)}</h2>${category.description?`<p class="vote-description">${esc(category.description)}</p>`:''}</div></header>
    ${category.nominees.length?`<div class="vote-nominees" style="--vote-columns:${category.nominees.length}">${category.nominees.map((nominee,i)=>votingCard(nominee,category,i)).join('')}</div>`:'<p class="vote-pending">Los nominados de esta categoría se anunciarán próximamente.</p>'}
    <nav class="vote-stage-footer" aria-label="Navegar categorías">${direction(previous,'Anterior','back')}<span class="vote-position"><span>Categoría</span> <strong>${index+1}</strong> de ${ordered.length}</span>${direction(ordered[(index+1)%ordered.length],'Siguiente','arrow')}</nav>
   </section>
  </div>
  <dialog class="vote-dialog" id="votingDialog" aria-labelledby="vote-dialog-name"></dialog>
  <dialog class="vote-dialog vote-info-dialog" id="votingInfo" aria-labelledby="vote-info-name"></dialog>
 </div>`;
 updateVotingProgress(root);
 updateVotingQuota(root);
 const dialog=$('#votingDialog');
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{if(!dialog.open)votingModal=null;});
 const info=$('#votingInfo',root);
 info.addEventListener('click',event=>{if(event.target===info)info.close();});
}

function updateVotingQuota(root){
 const remaining=root.querySelector('[data-vote-remaining]');
 if(remaining){const n=votingQuota?.remaining??100000;remaining.textContent=n.toLocaleString('es-CO');remaining.parentElement.title='Saldo diario de votos. Se renueva a las 00:00, hora de Colombia.';}
}
function votingCategoryMark(category){
 return votingChoices[category.id]?icon('check'):category.nominees.length?icon('arrow'):icon('lock');
}

function updateVotingProgress(root){
 const all=votingCategories().filter(category=>category.nominees.length);
 const count=all.filter(category=>votingChoices[category.id]).length;
 const badge=$('[data-vote-progress]',root);
 badge.textContent=count+'/'+all.length;
 badge.setAttribute('aria-label',count+' de '+all.length+' categorías con votos');
  badge.closest('[data-vote="ballot"]')?.style.setProperty('--vote-fraction',all.length?String(count/all.length):'0');
 for(const category of all){
  const mark=$('[data-vote-category="'+category.id+'"] [data-vote-mark]',root);
  if(mark)mark.innerHTML=votingCategoryMark(category);
 }
}

function openVotingInfo(mode){
 const ballot=mode==='ballot',dialog=$('#votingInfo');
 const staffLimits=votingQuota?.dailyLimit===400000&&votingQuota?.nomineeDailyLimit===100000;
 const summary=ballot?votingBallot.sections.map(section=>{
  const entries=section.categories.flatMap(category=>{
   const voted=category.nominees.filter(nominee=>votingChoices[category.id]?.[nominee.id]);
   if(!voted.length)return [];
   return [`<li><a href="${votingHref(section.id,category.id)}" data-vote="visit">${esc(category.name)} ${icon('arrow')}</a><ul>${voted.map(nominee=>`<li><span>${esc(nominee.name)}</span><strong>${votingCountLabel(votingChoices[category.id][nominee.id])}</strong></li>`).join('')}</ul></li>`];
  });
  return entries.length?`<section class="vote-summary-group"><h3>${esc(section.name)}</h3><ul>${entries.join('')}</ul></section>`:'';
 }).join(''):'';
 dialog.innerHTML=`<div class="vote-info-content">
  <header><h2 id="vote-info-name">${ballot?'Tu papeleta':'Reglas de votación'}</h2><button type="button" class="vote-dialog-close" data-vote="close" aria-label="Cerrar">${icon('close')}</button></header>
  <div class="vote-info-body">${ballot?(summary||'<p>Aún no has registrado votos. Elige una categoría y toca un nominado para votar.</p>'):`<ul class="vote-rules-list">
   <li>Para votar debes iniciar sesión con tu cuenta de The Xpedition.</li>
   <li>${staffLimits?'Tu cuenta Staff dispone de 400.000 votos diarios.':'Cada cuenta dispone de 100.000 votos diarios.'} El saldo se restablece a medianoche, hora de Colombia.</li>
   <li>En cada categoría puedes elegir un máximo de 2 nominados diferentes.</li>
   <li>${staffLimits?'Solo el Staff puede asignar hasta 100.000 votos diarios a una misma persona, sumando todas las categorías y nominaciones compartidas.':'Puedes asignar hasta 10.000 votos por día al mismo nominado dentro de una categoría.'}</li>
   <li>Reparte los votos restantes entre otros nominados y categorías; no es obligatorio gastarlos todos.</li>
   <li>Cuando agotes tus ${staffLimits?'400.000':'100.000'} votos aparecerá el mensaje «Ya no tienes más votos disponibles por hoy.»</li>
   <li>Solo el Staff puede consultar los resultados generales.</li>
  </ul>`}</div>
 </div>`;
 dialog.showModal();
}

function toggleVotingMenu(button,expanded){
 button.setAttribute('aria-expanded',String(expanded));
}

function openVotingNominee(nomineeId){
 const root=$('.vote-page'),section=votingBallot.sections.find(group=>group.id===root.dataset.votingSection);
 const category=section.categories.find(entry=>entry.id===root.dataset.votingCategory);
 const nominee=category.nominees.find(entry=>entry.id===nomineeId);
 if(!nominee)return;
 const dialog=$('#votingDialog'),votes=votingChoices[category.id]?.[nominee.id]||0;
 const used=votingQuota?.spentByNominee?.[category.id]?.[nominee.id]||0;
 const remaining=votingQuota?.remaining??100000;
 const nomineeLimit=votingQuota?.nomineeDailyLimit??10000;
 const selected=votingQuota?.selected?.[category.id]||[];
 const choicesFull=selected.length>=2&&!selected.includes(nominee.id);
 const allowance=Math.max(0,Math.min(nomineeLimit-used,remaining));
 const warning=choicesFull?'Solo puedes votar por un máximo de 2 nominados en la misma categoría.':!remaining?'Ya no tienes más votos disponibles por hoy.':!allowance?`Alcanzaste el máximo de ${nomineeLimit.toLocaleString('es-CO')} votos diarios para ${nomineeLimit>10000?'esta persona':'este nominado'}.`:'Selecciona cuántos votos quieres otorgar.';
 votingModal={category,nominee,requestId:null};
 dialog.classList.remove('vote-confirmed');
 dialog.innerHTML=`<div class="vote-dialog-shell"><button class="vote-dialog-close" type="button" aria-label="Cerrar" data-vote="close">${icon('close')}</button>
  <div class="vote-dialog-portrait">${votingPortrait(nominee)}</div><div class="vote-dialog-copy"><span>${esc(category.name)}</span><h2 id="vote-dialog-name">${esc(nominee.name)}</h2>
  ${nominee.details?`<p class="vote-dialog-detail">${esc(nominee.details)}</p>`:''}
  <p class="vote-dialog-balance">Disponibles hoy: <strong>${remaining.toLocaleString('es-CO')}</strong> · Para este nominado: <strong>${allowance.toLocaleString('es-CO')}</strong></p>
  <p data-vote-message aria-live="polite">${warning}</p>
  <label class="vote-quantity" for="vote-quantity">Cantidad de votos<input id="vote-quantity" type="number" min="1" max="${allowance}" step="1" inputmode="numeric" value="1" ${choicesFull||!allowance?'disabled':''}></label>
  <div class="vote-dialog-actions"><button type="button" class="vote-gold-button" data-vote="confirm" ${choicesFull||!allowance?'disabled':''}>Confirmar votos ${icon('check')}</button><button type="button" class="btn secondary" data-vote="close">Volver a la papeleta</button></div></div></div>`;
 dialog.showModal();
}

async function confirmAwardsVote(button){
 const selection=votingModal,dialog=$('#votingDialog');
 if(!selection||button.disabled||!state.user||votingSaving)return;
 const {category,nominee}=selection,member=state.user.id;
 const quantity=Number($('#vote-quantity',dialog)?.value);
 const allowed=Math.max(0,Math.min(votingQuota?.remaining??0,(votingQuota?.nomineeDailyLimit??10000)-(votingQuota?.spentByNominee?.[category.id]?.[nominee.id]||0)));
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>allowed){
  $('[data-vote-message]',dialog).textContent=allowed?'Introduce entre 1 y '+allowed.toLocaleString('es-CO')+' votos.':'Ya no tienes más votos disponibles por hoy.';
  return;
 }
 votingSaving=true;button.disabled=true;
 dialog.classList.remove('vote-confirmed');
 selection.requestId??=crypto.randomUUID();
 $('[data-vote-message]',dialog).textContent='Guardando tu voto…';
 try{
  const vote=await api('/awards/voting',{method:'POST',body:{category:category.id,nominee:nominee.id,votes:quantity,requestId:selection.requestId}});
  if(state.user?.id!==member||votingMember!==member)return;
  (votingChoices[vote.category]??={})[vote.nominee]=vote.votes;
  votingQuota=vote.quota;
  selection.requestId=null;
  const root=$('.vote-page');
  if(!root?.isConnected)return;
  updateVotingProgress(root);
  updateVotingQuota(root);
  if(root.dataset.votingCategory===vote.category){
   const card=$('[data-vote-nominee="'+vote.nominee+'"]',root);
   card.dataset.personalVotes=vote.votes;
   card.setAttribute('aria-description',votingCountLabel(vote.votes)+' registrado'+(vote.votes===1?'':'s')+' por ti');
   $('.vote-card-action',card).innerHTML='<span>'+votingCountLabel(vote.votes)+'</span>'+icon('check');
  }
  if(!dialog.open||votingModal!==selection)return;
  dialog.classList.add('vote-confirmed');
  $('[data-vote-message]',dialog).textContent=quantity.toLocaleString('es-CO')+' votos guardados correctamente.';
  button.innerHTML='Votar otra vez '+icon('check');
  button.disabled=false;
  const input=$('#vote-quantity',dialog),canVote=Math.max(0,Math.min(votingQuota.remaining,10000-(votingQuota.spentByNominee?.[category.id]?.[nominee.id]||0)));
  if(input){input.max=canVote;input.disabled=!canVote;input.value=canVote?'1':'0';}
  if(!canVote){button.disabled=true;}$('[data-vote-remaining]',root).textContent=votingQuota.remaining.toLocaleString('es-CO');
 }catch(error){
  if(!dialog?.open||votingModal!==selection)return;
  $('[data-vote-message]',dialog).textContent=error.message;
  button.disabled=false;
 }finally{votingSaving=false;}
}

document.addEventListener('click',event=>{
 if(state.route!=='votacion')return;
 const menu=$('.vote-menu-toggle');
 if(menu?.getAttribute('aria-expanded')==='true'&&!event.target.closest('.vote-sidebar,dialog'))toggleVotingMenu(menu,false);
 const button=event.target.closest('[data-vote],[data-vote-nominee]');
 if(!button)return;
 if(button.dataset.voteNominee){if(!votingSaving)openVotingNominee(button.dataset.voteNominee);return;}
 const action=button.dataset.vote;
 if(action==='login'){openAuth('login');return;}
 if(action==='enter'){
  try{sessionStorage.setItem(votingIntroKey,'1');}catch{}
  go('votacion/'+button.dataset.chapter);
 }
 if(action==='intro')renderVotingIntro();
 if(action==='menu')toggleVotingMenu(button,button.getAttribute('aria-expanded')!=='true');
 if(action==='ballot'||action==='rules')openVotingInfo(action);
 if(action==='retry')route();
 if(action==='close'||action==='visit')button.closest('dialog')?.close();
 if(action==='visit'&&menu)toggleVotingMenu(menu,false);
 if(action==='confirm')void confirmAwardsVote(button);
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||state.route!=='votacion'||$('dialog[open]'))return;
 const menu=$('.vote-menu-toggle[aria-expanded="true"]');
 if(menu){toggleVotingMenu(menu,false);menu.focus({preventScroll:true});}
});
