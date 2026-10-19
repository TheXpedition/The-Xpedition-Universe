'use strict';

let awardsArchivePromise=null;
const awardsView={record:null,item:null,winnersOnly:false};
const awardProfileAliases={'andromeda':'Andromeda','alexandromartin':'Alexandro','juliansanchez':'Julián','coronelsanders':'Coronel','mariavillegas':'Maria'};
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
 if(!awardsArchivePromise)awardsArchivePromise=fetch('awards/editions.json?v=2').then(response=>{if(!response.ok)throw new Error('No se pudo cargar la edición.');return response.json();}).catch(error=>{awardsArchivePromise=null;throw error;});
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
 return `<section class="aw-upcoming" aria-labelledby="upcomingAwardTitle"><img src="${esc(item.trophy)}" alt="Trofeo de la tercera edición" loading="lazy"><div><div class="eyebrow">TERCERA EDICIÓN · 2026</div><h2 id="upcomingAwardTitle">La próxima historia<br>también merece un premio.</h2><p>Las 15 categorías de esta edición ya están anunciadas. Los nominados se revelarán próximamente.</p><a href="#premios/edicion-2" class="link-button">Revive la segunda edición ${icon('arrow')}</a></div></section><div class="aw-pending-groups">${record.groups.map((group,index)=>awardPendingGroup(group,index,item)).join('')}</div>`;
}
function awardPendingGroup(group,index,item){
 const cards=group.id==='principales'?`<div class="aw-principal-grid">${group.categories.map((category,i)=>awardMainCategory(category,i,item,true)).join('')}</div>`:`<div class="aw-pending-categories">${group.categories.map((category,i)=>`<article class="aw-pending-category"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(category.name)}</h3><p>Nominados por anunciar</p></div></article>`).join('')}</div>`;
 return `<section class="aw-group" id="awards-${esc(group.id)}" aria-labelledby="awardGroup-${esc(group.id)}"><div class="aw-group-heading"><span class="aw-section-number">0${index+1}</span><div><div class="eyebrow">2026 <span aria-hidden="true">/</span> ${group.categories.length} CATEGORÍAS</div><h2 id="awardGroup-${esc(group.id)}" tabindex="-1">${esc(group.name)}</h2></div></div>${cards}</section>`;
}
function awardGroup(group,index,item){
 if(group.id==='principales')return `<section class="aw-group" id="awards-principales" aria-labelledby="awardGroup-principales"><div class="aw-group-heading"><span class="aw-section-number">0${index+1}</span><div><div class="eyebrow">${item.year} <span aria-hidden="true">/</span> ${group.categories.length} PREMIOS</div><h2 id="awardGroup-principales" tabindex="-1">${esc(group.name)}</h2></div></div><div class="aw-principal-grid">${group.categories.map((category,i)=>awardMainCategory(category,i,item)).join('')}</div></section>`;
 return `<section class="aw-group" id="awards-${esc(group.id)}" aria-labelledby="awardGroup-${esc(group.id)}"><div class="aw-group-heading"><span class="aw-section-number">0${index+1}</span><div><div class="eyebrow">${item.year} <span aria-hidden="true">/</span> ${group.categories.length} PREMIOS</div><h2 id="awardGroup-${esc(group.id)}" tabindex="-1">${esc(group.name)}</h2></div></div>${group.categories.map((category,i)=>`<section class="aw-category" aria-labelledby="award-${esc(category.id)}" data-category-name="${esc(norm(category.name))}"><header><span>${String(i+1).padStart(2,'0')}</span><h3 id="award-${esc(category.id)}">${esc(category.name)}</h3><small>${category.nominees.length} nominaciones</small></header><div class="aw-nominees">${category.nominees.map(nominee=>awardNominee(nominee,category.trophy?{...item,trophy:category.trophy}:item)).join('')}</div></section>`).join('')}</section>`;
}
function awardLaurels(){
 const points=[[71,162,-54],[56,146,-42],[44,128,-30],[38,107,-17],[37,86,-4],[40,65,11],[47,45,22]];
 const branch=`<path d="M83 176C36 152 21 90 48 32" fill="none" stroke="currentColor" stroke-width="2"/>${points.map(([x,y,rotation])=>`<path d="M0 0C-8-6-9-16-4-24C3-20 7-8 0 0Z" transform="translate(${x} ${y}) rotate(${rotation})" fill="currentColor"/><path d="M0 0C-6-7-4-16 3-22C9-16 7-5 0 0Z" transform="translate(${x+3} ${y-3}) rotate(${rotation+63})" fill="currentColor"/>`).join('')}`;
 return `<svg class="aw-laurels" viewBox="0 0 240 190" aria-hidden="true">${branch}<g transform="translate(240 0) scale(-1 1)">${branch}</g></svg>`;
}
function awardCrown(){
 return '<svg class="aw-crown" viewBox="0 0 50 34" aria-hidden="true"><path d="M5 10 15 19 25 3 35 19 45 10 40 29H10Z" fill="#ffe4a0" stroke="#f7ae43" stroke-width="1.4"/><path d="m25 5 0 22m-14-5h28M10 30h30" stroke="#b87921" stroke-width="2"/><circle cx="5" cy="9" r="3" fill="#fff0bd"/><circle cx="25" cy="3" r="3" fill="#fff0bd"/><circle cx="45" cy="9" r="3" fill="#fff0bd"/></svg>';
}
function awardMainCategory(category,index,item,pending=false){
 const winner=category.nominees.find(nominee=>nominee.winner),others=category.nominees.filter(nominee=>!nominee.winner);
 const subtitles={'fan-favorite':'El participante favorito del público','mejor-villano':'Quien hizo inolvidable el lado oscuro del juego','mejor-competidor':'Talento, constancia y espíritu de competencia',congeniality:'El carisma que dejó huella','poop-of-the-year':'Un reconocimiento imposible de olvidar'};
 const key=category.name.toLowerCase().startsWith('poop')?'poop-of-the-year':category.id.replace(/^principales-\d+$/,'');
 const subtitle=subtitles[key]||({'Fan Favorite':subtitles['fan-favorite'],'Mejor Villano':subtitles['mejor-villano'],'Mejor Competidor':subtitles['mejor-competidor']})[category.name]||'Uno de los grandes premios de la noche';
 const trophy=category.trophy||item.trophy;
 const winnerHtml=winner?`<article class="aw-nominee aw-main-winner is-award-winner" data-nominee-search="${esc(norm([winner.title,...winner.people,winner.description].join(' ')))}" data-winner="true"><div class="aw-winner-portrait">${awardCrown()}${awardLaurels()}${winner.people.map(awardPerson).join('')}<div class="aw-prize"><img src="${esc(trophy)}" alt="Trofeo de ${esc(category.name)}" loading="lazy"><span>${esc(winner.winnerLabel||'Ganador')}</span></div></div><h4>${esc(winner.title)}</h4></article>`:`<div class="aw-main-pending"><div class="aw-pending-medallion">${awardLaurels()}<span>${item.year}</span></div><strong>Nominados por anunciar</strong><span>Próximamente</span></div>`;
 return `<section class="aw-category aw-main-category ${pending?'aw-pending-category':''}" aria-labelledby="award-${esc(category.id)}" data-category-name="${esc(norm(category.name))}"><div class="aw-main-stage"><img class="aw-stage-background" src="${esc(item.stage)}" alt="" loading="lazy"><div class="aw-main-heading"><span>${String(index+1).padStart(2,'0')}</span><div><h3 id="award-${esc(category.id)}">${esc(category.name)}</h3><p>${esc(subtitle)}</p></div></div><span class="aw-edition-badge">${item.edition===1?'❄':item.edition===2?'✧':'✦'} EDICIÓN ${item.edition}</span>${winnerHtml}</div>${others.length?`<div class="aw-main-others"><p>OTROS NOMINADOS</p><div class="aw-nominees">${others.map(nominee=>awardNominee(nominee,item)).join('')}</div></div>`:''}</section>`;
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
  if(!category.hidden&&category.classList.contains('aw-main-category')){
   $('.aw-main-winner',category).hidden=false;
   const others=$('.aw-main-others',category);if(others)others.hidden=$$('.aw-nominee',others).every(nominee=>nominee.hidden);
  }
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

function awardProfileTotals(archive){
 const totals=new Map();
 const add=(name,nominations,awards)=>{const key=castKey(awardIdentity(name)),current=totals.get(key)||{nominations:0,awards:0};current.nominations+=nominations;current.awards+=awards;totals.set(key,current);};
 for(const edition of Object.values(archive.editions))for(const group of edition.groups)for(const category of group.categories)for(const nominee of category.nominees){
  const people=[...nominee.people,...(category.production||group.id==='produccion'?['Bonju']:[])];
  const credited=new Map(people.map(name=>[castKey(awardIdentity(name)),name]));
  for(const name of credited.values())add(name,1,nominee.winner?1:0);
 }
 for(const [name,extra] of Object.entries(archive.profileExtras||{}))add(name,extra.nominations,extra.awards);
 return totals;
}
function awardProfileSummary(profile,totals=null){
 return `<section class="profile-awards" data-awards-profile="${esc(profile.id)}" aria-labelledby="profileAwardsTitle" aria-busy="${!totals}"><h3 id="profileAwardsTitle">The Xpedition Awards</h3><div class="profile-awards-counts"><div><strong>${totals?totals.nominations:'—'}</strong><span>Nominaciones</span></div><div><strong>${totals?totals.awards:'—'}</strong><span>Premios</span></div></div><a href="#explorar/awards">Ver ediciones ${icon('arrow')}</a></section>`;
}
async function loadProfileAwards(profile){
 const target=$('[data-awards-profile]');if(!target)return;
 try{
  const archive=await loadAwardsArchive();
  if(!target.isConnected||target.dataset.awardsProfile!==profile.id)return;
  const totals=awardProfileTotals(archive).get(castKey(awardIdentity(profile.name)))||{nominations:0,awards:0};
  target.outerHTML=awardProfileSummary(profile,totals);
 }catch{
  if(target.isConnected){target.setAttribute('aria-busy','false');target.insertAdjacentHTML('beforeend','<button class="link-button" data-award-action="retry-profile" data-id="'+esc(profile.id)+'">Volver a cargar premios</button>');}
 }
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-award-action="retry-profile"]');if(button){const profile=getProfile(button.dataset.id);if(profile){button.remove();loadProfileAwards(profile);}}});
