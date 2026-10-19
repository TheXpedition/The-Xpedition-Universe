'use strict';

let awardsArchivePromise=null;
const awardsView={record:null,item:null,winnersOnly:false};
const awardProfileAliases={'andromeda':'Andromeda','alexandromartin':'Alexandro','juliansanchez':'Julián','coronelsanders':'Coronel'};
const awardIdentity=name=>awardProfileAliases[castKey(name)]||name;
const awardCategories=record=>record.groups.flatMap(group=>group.categories);
const awardCount=record=>awardCategories(record).reduce((n,category)=>n+category.nominees.length,0);
const awardInitials=name=>name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();

function awardBannerCard(item){
 return `<article class="season-card award-banner-card" data-content-id="${esc(item.id)}"><button class="season-art" data-action="content" data-id="${esc(item.id)}" data-kind="Awards" aria-label="Ver ${esc(item.name)}"><img class="season-background" src="${esc(item.banner)}" alt="${esc(item.name)}" loading="lazy" decoding="async">${item.upcoming?'<span class="aw-coming-label">Próximamente</span>':''}<span class="card-reveal" aria-hidden="true">${icon('info')}</span></button><button class="save-button ${saved(item.id)?'saved':''}" data-action="save" data-id="${esc(item.id)}" aria-label="${saved(item.id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(item.id)}">${icon(saved(item.id)?'check':'plus')}</button><div class="season-info"><h3>${['Primera','Segunda','Tercera'][item.edition-1]} edición</h3><p>${item.year} <span aria-hidden="true">·</span> ${item.upcoming?'La próxima gran noche':'Nominados y ganadores'}</p></div></article>`;
}
function awardsRail(){
 const title='The Xpedition Awards';
 return `<section class="catalog-row awards-row" aria-labelledby="awardsHomeTitle"><div class="section-head"><h2 id="awardsHomeTitle">${title}</h2><a href="#explorar/awards" class="link-button">Ver ediciones ${icon('arrow')}</a></div><p class="row-subtitle">Los rostros, las historias y los momentos que merecen un premio.</p><div class="rail-shell">${controls(title)}<div class="rail awards-rail" tabindex="0" aria-label="${title}">${state.catalog.content.awards.map(awardBannerCard).join('')}</div></div></section>`;
}
function awardPoster(item){
 return `<div class="aw-poster"><img src="${esc(contentArt(item))}" alt="Arte de la ${item.edition}.ª edición de The Xpedition Awards" loading="eager">${brandArt(item,'aw-poster-logo')}</div>`;
}
async function loadAwardsArchive(){
 if(!awardsArchivePromise)awardsArchivePromise=fetch('awards/editions.json?v=1').then(response=>{if(!response.ok)throw new Error('No se pudo cargar la edición.');return response.json();}).catch(error=>{awardsArchivePromise=null;throw error;});
 return awardsArchivePromise;
}
async function renderAwardsPage(id){
 if($('#modal').open)closeModal();
 const item=state.catalog.content.awards.find(entry=>entry.url==='#premios/'+id);
 if(!item){$('#main').innerHTML='<div class="empty-state"><h1>Esta edición no está disponible.</h1><a class="btn primary" href="#explorar/awards">Ver ediciones</a></div>';return;}
 $('#main').innerHTML='<div class="loading-screen"><span class="spinner"></span> Preparando la noche de premios…</div>';
 try{
  const archive=await loadAwardsArchive();
  if(state.route!=='premios'||decodeURIComponent(location.hash.split('/')[1]||'')!==id)return;
  const record=archive.editions[id];if(!record)throw new Error('Edición no disponible');
  awardsView.record=record;awardsView.item=item;awardsView.winnersOnly=false;
  document.title=`The Xpedition Awards ${item.year} | ${item.edition}.ª edición`;
  const categories=awardCategories(record),upcoming=record.status==='upcoming';
  $('#main').innerHTML=`<div class="aw-page" data-award-theme="${esc(item.theme)}"><nav class="ch-breadcrumb" aria-label="Ruta de la edición"><a href="#explorar/awards">${icon('back')} The Xpedition Awards</a><span aria-hidden="true">/</span><span>${item.edition}.ª edición · ${item.year}</span></nav>
   <nav class="aw-editions" aria-label="Ediciones de The Xpedition Awards">${state.catalog.content.awards.map(edition=>`<a href="${esc(edition.url)}" ${edition.id===item.id?'aria-current="page"':''}><span>${edition.edition}.ª edición</span><strong>${edition.year}</strong>${edition.upcoming?'<small>Próximamente</small>':''}</a>`).join('')}</nav>
   <section class="aw-hero" aria-labelledby="awardsPageTitle"><img class="aw-atmosphere" src="${esc(item.banner)}" alt=""><div class="aw-hero-copy"><div class="eyebrow">LA GRAN NOCHE DEL UNIVERSO <span aria-hidden="true">/</span> ${item.year}</div><h1 id="awardsPageTitle" class="sr-only">The Xpedition Awards · ${item.edition}.ª edición · ${item.year}</h1>${brandArt(item,'aw-hero-logo')}<p>${esc(item.desc)}</p><div class="aw-hero-facts"><span><strong>${item.edition}.ª</strong> edición</span>${upcoming?'<span><strong>'+categories.length+'</strong> categorías</span><span class="aw-release"><i aria-hidden="true"></i> Próximamente · 2026</span>':`<span><strong>${categories.length}</strong> categorías</span><span><strong>${awardCount(record)}</strong> nominaciones</span>`}</div>${'<button class="btn primary aw-hero-cta" data-award-action="jump" data-target="awards-principales">'+(upcoming?'Ver las categorías':'Explorar los premios')+' '+icon('arrow')+'</button>'}</div>${awardPoster(item)}</section>
   ${upcoming?awardUpcoming(item,record):`<div class="aw-tools"><div class="aw-group-links" aria-label="Grupos de categorías">${record.groups.map(group=>`<button data-award-action="jump" data-target="awards-${esc(group.id)}">${esc(group.name.replace('Categorías ',''))}</button>`).join('')}</div><div class="aw-search-tools"><label class="search-field aw-search">${icon('search')}<input id="awardsSearch" type="search" aria-label="Buscar categoría o nominado" placeholder="Buscar categoría o nominado…"></label><button class="aw-winners-toggle" data-award-action="winners" aria-pressed="false">Solo ganadores ${icon('check')}</button></div></div><div id="awardsCategories">${record.groups.map((group,index)=>awardGroup(group,index,item)).join('')}</div><p class="aw-empty" id="awardsEmpty" hidden>No encontramos premios con esa búsqueda.</p>`}
   <section class="aw-other-editions" aria-labelledby="otherAwardsTitle"><div class="section-head"><div><div class="eyebrow">LA HISTORIA DE LOS PREMIOS</div><h2 id="otherAwardsTitle">Otras ediciones</h2></div><a class="link-button" href="#explorar/awards">Ver todas ${icon('arrow')}</a></div><div class="aw-other-grid">${state.catalog.content.awards.filter(edition=>edition.id!==item.id).map(awardBannerCard).join('')}</div></section></div>`;
 }catch(error){if(state.route==='premios'&&decodeURIComponent(location.hash.split('/')[1]||'')===id)$('#main').innerHTML='<div class="empty-state"><h1>No pudimos abrir esta edición.</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><button class="btn primary" data-award-action="retry" data-id="'+esc(id)+'">Volver a intentar</button><a class="btn secondary" href="#explorar/awards">Ver ediciones</a></div>';}
}
function awardUpcoming(item,record){
 return `<section class="aw-upcoming" aria-labelledby="upcomingAwardTitle"><img src="${esc(item.trophy)}" alt="Trofeo de la tercera edición" loading="lazy"><div><div class="eyebrow">TERCERA EDICIÓN · 2026</div><h2 id="upcomingAwardTitle">La próxima historia<br>también merece un premio.</h2><p>Las 15 categorías de esta edición ya están anunciadas. Los nominados se revelarán próximamente.</p><a href="#premios/edicion-2" class="link-button">Revive la segunda edición ${icon('arrow')}</a></div></section><div class="aw-pending-groups">${record.groups.map((group,index)=>`<section class="aw-group" id="awards-${esc(group.id)}" aria-labelledby="awardGroup-${esc(group.id)}"><div class="aw-group-heading"><span class="aw-section-number">0${index+1}</span><div><div class="eyebrow">2026 <span aria-hidden="true">/</span> ${group.categories.length} CATEGORÍAS</div><h2 id="awardGroup-${esc(group.id)}" tabindex="-1">${esc(group.name)}</h2></div></div><div class="aw-pending-categories">${group.categories.map((category,i)=>`<article class="aw-pending-category"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(category.name)}</h3><p>Nominados por anunciar</p></div></article>`).join('')}</div></section>`).join('')}</div>`;
}
function awardGroup(group,index,item){
 return `<section class="aw-group" id="awards-${esc(group.id)}" aria-labelledby="awardGroup-${esc(group.id)}"><div class="aw-group-heading"><span class="aw-section-number">0${index+1}</span><div><div class="eyebrow">${item.year} <span aria-hidden="true">/</span> ${group.categories.length} PREMIOS</div><h2 id="awardGroup-${esc(group.id)}" tabindex="-1">${esc(group.name)}</h2></div></div>${group.categories.map((category,i)=>`<section class="aw-category" aria-labelledby="award-${esc(category.id)}" data-category-name="${esc(norm(category.name))}"><header><span>${String(i+1).padStart(2,'0')}</span><h3 id="award-${esc(category.id)}">${esc(category.name)}</h3><small>${category.nominees.length} nominaciones</small></header><div class="aw-nominees">${category.nominees.map(nominee=>awardNominee(nominee,category.trophy?{...item,trophy:category.trophy}:item)).join('')}</div></section>`).join('')}</section>`;
}
function awardPerson(name){
 const canonical=awardIdentity(name),profile=castProfile(canonical),image=state.catalog.characters.find(person=>castKey(person.name)===castKey(canonical))?.image;
 const portrait=image?`<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`:`<span class="aw-initials" aria-hidden="true">${esc(awardInitials(name))}</span>`;
 return profile?`<button class="aw-person" data-action="profile" data-id="${esc(profile.id)}" aria-label="Ver perfil de ${esc(name)}">${portrait}</button>`:`<span class="aw-person" aria-label="${esc(name)}">${portrait}</span>`;
}
function awardNominee(nominee,item){
 const search=norm([nominee.title,nominee.description,...nominee.people,nominee.note||''].join(' '));
 const show=nominee.show?allContent().find(content=>content.id===nominee.show):null;
 const visual=show?`<div class="aw-episode-art"><img src="${esc(contentArt(show))}" alt="" loading="lazy">${brandArt(show,'aw-show-logo')}</div>`:nominee.people.length?`<div class="aw-nominee-faces ${nominee.people.length>2?'aw-ensemble':''}">${nominee.people.map(awardPerson).join('')}</div>`:`<div class="aw-team-symbol" aria-hidden="true">${icon('users')}</div>`;
 return `<article class="aw-nominee ${nominee.winner?'is-award-winner':''}" data-nominee-search="${esc(search)}" data-winner="${!!nominee.winner}">${nominee.winner?`<div class="aw-prize"><img src="${esc(item.trophy)}" alt="Trofeo de la ${item.edition}.ª edición" loading="lazy"><span>${nominee.people.length>1?'Ganadores':'Ganador'}</span></div>`:''}${visual}<h4>${esc(nominee.title)}</h4>${nominee.description?`<p>${esc(nominee.description)}</p>`:''}${nominee.note?`<small class="aw-recipient-note">${esc(nominee.note)}</small>`:''}</article>`;
}
function filterAwards(){
 const query=norm($('#awardsSearch').value),only=awardsView.winnersOnly;
 $$('.aw-category').forEach(category=>{
  const categoryMatches=category.dataset.categoryName.includes(query);
  const nominees=$$('.aw-nominee',category);
  nominees.forEach(nominee=>{nominee.hidden=(only&&nominee.dataset.winner!=='true')||(!categoryMatches&&!nominee.dataset.nomineeSearch.includes(query));});
  category.hidden=nominees.every(nominee=>nominee.hidden);
 });
 $$('.aw-group').forEach(group=>{group.hidden=$$('.aw-category',group).every(category=>category.hidden);});
 $('#awardsEmpty').hidden=$$('.aw-group').some(group=>!group.hidden);
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-award-action]');if(!button)return;
 const action=button.dataset.awardAction;
 if(action==='open-edition'){event.preventDefault();closeModal();go('premios/edicion-'+button.dataset.edition);return;}
 if(action==='retry'){renderAwardsPage(button.dataset.id);return;}
 if(action==='jump'){
  const target=document.getElementById(button.dataset.target);if(!target)return;
  target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  $('h2',target)?.focus({preventScroll:true});
 }
 if(action==='winners'){
  awardsView.winnersOnly=!awardsView.winnersOnly;button.setAttribute('aria-pressed',String(awardsView.winnersOnly));filterAwards();
 }
});
document.addEventListener('input',event=>{if(event.target.id==='awardsSearch')filterAwards();});
