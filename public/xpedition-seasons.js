'use strict';

let xpeditionArchivePromise=null;
const xpeditionFilters={year:'todos'};
function xpeditionSeasonTabs(){
 return [['resumen','Resumen'],['participantes','Participantes'],['equipos','Equipos'],['versus','Versus'],['track-record','Track record']];
}
async function loadXpeditionArchive(){
 if(!xpeditionArchivePromise)xpeditionArchivePromise=fetch('seasons/xpedition/seasons.json?v=1').then(response=>{
  if(!response.ok)throw new Error('No se pudo cargar la temporada.');return response.json();
 }).catch(error=>{xpeditionArchivePromise=null;throw error;});
 return xpeditionArchivePromise;
}
async function renderXpeditionSeason(id){
 closeModal();
 const item=state.catalog.content.xpedition.find(entry=>entry.id===id);
 $('#main').innerHTML='<div class="loading-screen"><span class="spinner"></span> Abriendo la expedición…</div>';
 try{
  const archive=await loadXpeditionArchive();
  if(state.route!=='temporada'||decodeURIComponent(location.hash.split('/')[1]||'')!==id)return;
  const record=archive.seasons[id];if(!item||!record)throw new Error('Temporada no disponible');
  const requested=location.hash.split('/')[2]||'resumen';
  Object.assign(seasonView,{id,item,record,tab:xpeditionSeasonTabs().some(([key])=>key===requested)?requested:'resumen'});
  xpeditionFilters.year='todos';
  document.title=`${item.name} — The Xpedition`;
  const other=state.catalog.content.xpedition.find(entry=>entry.integrated&&entry.id!==id);
  $('#main').innerHTML=`<div class="season-page xp-season xp-${esc(id)}">
   <nav class="ch-breadcrumb" aria-label="Ruta de la temporada"><a href="#explorar/xpedition">${icon('back')} The Xpedition</a><span aria-hidden="true">/</span><span>${esc(item.name)}</span></nav>
   <header class="xp-hero" aria-labelledby="seasonPageTitle">
    <img class="xp-hero-atmosphere" src="${esc(contentArt(item))}" alt="">
    <div class="xp-hero-copy"><div class="xp-kicker"><span class="xp-original">X</span> THE XPEDITION ORIGINAL <span class="xp-season-number">T${record.number}</span></div>
     <h1 class="sr-only" id="seasonPageTitle">The Xpedition ${esc(item.name)}</h1>${brandArt(item,'xp-season-logo')}
     <div class="xp-release"><i aria-hidden="true"></i> Temporada ${record.number} <span>·</span> ${esc(record.years)}</div>
     <p class="xp-hero-tagline">${esc(record.heading)}</p><p class="xp-hero-description">${esc(item.desc)}</p>
     <div class="xp-host">Presenta ${castNames(['Bonju'])}<span>·</span> Staff ${castNames(['Dua Lingo'])}</div>
     <div class="xp-actions"><button class="btn primary" data-season-action="tab" data-tab="participantes">${icon('users')} Conocer al elenco</button><button class="btn secondary" data-season-action="tab" data-tab="track-record">Track record ${icon('arrow')}</button><button class="hero-save ${saved(id)?'saved':''}" data-action="save" data-id="${esc(id)}" aria-label="${saved(id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(id)}">${icon(saved(id)?'check':'plus')}</button></div>
    </div>
    <figure class="xp-hero-art"><img src="${esc(contentArt(item))}" alt="Arte de The Xpedition ${esc(item.name)}" fetchpriority="high"><figcaption><span>DESTINO ${String(record.number).padStart(2,'0')}</span><strong>${id==='antarctica'?'Hielo. Alianzas. Supervivencia.':'Instinto. Estrategia. Supervivencia.'}</strong></figcaption></figure>
   </header>
   <div class="xp-facts">${Object.entries(record.stats).map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
   <div class="ch-tabs" role="tablist" aria-label="Contenido de ${esc(item.name)}">${xpeditionSeasonTabs().map(([key,label])=>`<button role="tab" id="season-tab-${key}" aria-controls="seasonPanel" aria-selected="${key===seasonView.tab}" tabindex="${key===seasonView.tab?0:-1}" data-season-action="tab" data-tab="${key}">${label}${key==='versus'?`<span class="xp-tab-count">${record.versus.rounds.length}</span>`:''}</button>`).join('')}</div>
   <section id="seasonPanel" class="ch-panel" role="tabpanel" aria-labelledby="season-tab-${seasonView.tab}" tabindex="0">${xpeditionSeasonPanel()}</section>
   <nav class="xp-next-season" aria-label="Más expediciones"><a href="#explorar/xpedition">${icon('back')} Todas las expediciones</a><a href="#temporada/${esc(other.id)}"><span>${id==='antarctica'?'LA SIGUIENTE EXPEDICIÓN':'DONDE TODO COMENZÓ'}<strong>The Xpedition ${esc(other.name)} ${icon('arrow')}</strong></span><img src="${esc(contentArt(other))}" alt="" loading="lazy"></a></nav>
  </div>`;
 }catch(error){
  if(state.route==='temporada'&&decodeURIComponent(location.hash.split('/')[1]||'')===id)$('#main').innerHTML=`<div class="empty-state"><h1>No pudimos abrir la expedición.</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><button class="btn primary" data-season-action="retry" data-id="${esc(id)}">Volver a intentar</button><a class="btn secondary" href="#explorar/xpedition">Ver temporadas</a></div>`;
 }
}
function xpeditionSectionHead(kicker,title,description='',aside=''){
 return `<div class="ch-section-head"><div><div class="eyebrow">${esc(kicker)}</div><h2>${esc(title)}</h2>${description?`<p>${esc(description)}</p>`:''}</div>${aside}</div>`;
}
function xpeditionTeams(record,compact=false){
 return `<div class="xp-teams ${compact?'xp-teams-compact':''}" style="--team-count:${record.teams.length}">${record.teams.map((team,index)=>`<article class="xp-team" style="--team-color:${esc(team.color)}"><span class="xp-team-number">${String(index+1).padStart(2,'0')}</span><img src="${esc(team.image)}" alt="Emblema de ${esc(team.symbol)}" loading="lazy"><div><small>${esc(team.symbol)}</small><h3>${esc(team.name)}</h3></div></article>`).join('')}</div>`;
}
function xpeditionSeasonPanel(){
 const {record,item,tab}=seasonView;
 if(tab==='resumen')return `<div class="xp-overview"><article class="xp-story"><div class="eyebrow">LA EXPEDICIÓN</div><h2>${esc(record.heading)}</h2><p>${esc(record.description)}</p><div class="ch-genres">${state.catalog.details[item.id].genres.map(genre=>`<span>${esc(genre)}</span>`).join('')}</div></article><aside class="xp-field-notes"><span class="eyebrow">EL RECORRIDO</span><div><strong>${record.versus.rounds.length}</strong><span>versus para revivir</span></div><p>${item.id==='antarctica'?'Del primer duelo al comeback y la gran final.':'Dos etapas y dos comebacks: el recorrido de 2023 a 2025.'}</p><button data-season-action="tab" data-tab="versus">Explorar los duelos ${icon('arrow')}</button></aside></div>
  <section class="xp-overview-section">${xpeditionSectionHead('IDENTIDAD DE LA TEMPORADA','Los equipos','',`<button class="link-button" data-season-action="tab" data-tab="equipos">Ver equipos ${icon('arrow')}</button>`)}${xpeditionTeams(record,true)}</section>
  <section class="xp-overview-section">${xpeditionSectionHead('LOS ROSTROS DE LA EXPEDICIÓN','Elenco Principal','',`<button class="link-button" data-season-action="tab" data-tab="participantes">Ver todos ${icon('arrow')}</button>`)}<div class="ch-participants-preview">${record.mainCast.map(seasonParticipantCard).join('')}</div></section>
  <button class="ch-extra-banner" data-season-action="tab" data-tab="track-record"><span>${icon('game')}<span><strong>La historia, episodio a episodio.</strong><small>Consulta el track record completo de ${esc(item.name)}.</small></span></span>${icon('arrow')}</button>`;
 if(tab==='participantes'){
  const contestants=record.participants.filter(person=>!['Host','Staff'].includes(person.place)),staff=record.participants.filter(person=>['Host','Staff'].includes(person.place));
  return `${xpeditionSectionHead('EL ELENCO COMPLETO','Participantes de '+item.name,contestants.length+' participantes · Posiciones de la temporada',`<label class="search-field ch-person-search">${icon('search')}<input id="seasonParticipantSearch" type="search" aria-label="Buscar participante" placeholder="Buscar participante…"></label>`)}<div class="ch-participants-grid">${contestants.map(seasonParticipantCard).join('')}</div><div class="xp-staff-heading"><h3>Presentación y staff</h3></div><div class="ch-participants-grid xp-staff">${staff.map(seasonParticipantCard).join('')}</div><p id="seasonParticipantEmpty" class="ch-empty" hidden>No encontramos a ese participante.</p>`;
 }
 if(tab==='equipos')return `${xpeditionSectionHead('LA IDENTIDAD DEL JUEGO','Los equipos de '+item.name,record.teams.length+' equipos, una expedición. Sus emblemas y colores originales.')}${xpeditionTeams(record)}<div class="xp-team-footer"><span>${item.id==='antarctica'?'01 / ANTARCTICA':'02 / SAFARI'}</span><p>${item.id==='antarctica'?'Blanco, celeste y azul: los colores de la primera expedición.':'Leones, serpientes, cebras, guepardos y escorpiones: cinco identidades de Safari.'}</p></div>`;
 if(tab==='track-record')return `${xpeditionSectionHead('EPISODIO A EPISODIO','Track record','El recorrido completo de cada participante. Amplía la tabla y desplázala para consultar los resultados.')}${seasonTrackViewer(record)}<div class="ch-track-caption"><span>${esc(item.name)} · ${esc(record.years)}</span><span>Tabla original de la temporada</span></div><div class="xp-track-legend" aria-label="Leyenda del track record"><span><i class="legend-win"></i> WIN · Victoria</span><span><i class="legend-safe"></i> SAFE · A salvo</span><span><i class="legend-bottom"></i> BTM · En riesgo</span><span><i class="legend-elim"></i> ELIM · Eliminación</span><span><i class="legend-in"></i> IN · Regreso</span></div>`;
 xpeditionFilters.year='todos';
 const years=[...new Set(record.versus.rounds.map(round=>round.year))];
 return `${xpeditionSectionHead('LOS DUELOS DE LA EXPEDICIÓN','Versus','Todos los enfrentamientos, sus resultados y los comebacks.',`<label class="search-field ch-person-search">${icon('search')}<input id="xpeditionVersusSearch" type="search" aria-label="Buscar en los versus" placeholder="Buscar participante…"></label>`)}<div class="xp-versus-controls">${years.length>1?`<div class="xp-year-filters" role="group" aria-label="Filtrar versus por año">${['todos',...years].map(year=>`<button data-xpedition-year="${year}" aria-pressed="${xpeditionFilters.year===year}">${year==='todos'?'Todos los versus':year}</button>`).join('')}</div>`:'<span class="xp-versus-note">2022 · La primera expedición</span>'}<span id="xpeditionVersusCount" aria-live="polite">${record.versus.rounds.length} versus</span></div>${years.map(year=>`<section class="xp-versus-year" data-versus-year="${year}"><div class="xp-year-heading"><span>${year}</span><div></div><small>${item.id==='safari'?(year==='2023'?'LA EXPEDICIÓN COMIENZA':'EL REGRESO A SAFARI'):'ANTARCTICA'}</small></div><div class="xp-duels">${record.versus.rounds.map((round,index)=>round.year===year?xpeditionDuel(round,index,record):'').join('')}</div></section>`).join('')}<p id="xpeditionVersusEmpty" class="ch-empty" hidden>No hay duelos con ese nombre en esta etapa.</p>`;
}
function xpeditionDuel(round,index,record){
 const comeback=round.kind.startsWith('comeback'),ranked=round.kind==='comeback-ranking';
 const typeLabel=({comeback:'COMEBACK','comeback-ranking':'COMEBACK',tie:'EMPATE',victory:'POR LA VICTORIA',final:'GRAN FINAL'})[round.kind]||'VERSUS DE ELIMINACIÓN';
 const search=norm(round.competitors.join(' '));
 const person=(name,position,result=false)=>xpeditionDuelPerson(name,record,{position,winner:result&&round.winners.includes(name),grayscale:round.eliminated.includes(name)||(ranked&&!round.winners.includes(name))});
 const result=round.winners.length?`<span>${round.kind==='final'?'GANADORA':comeback?'VICTORIA EN EL COMEBACK':'GANADOR'}</span><div>${round.winners.map(name=>person(name,round.competitors.indexOf(name)+1,true)).join('')}</div>`:round.eliminated.length?`<span>${round.eliminated.length>1?'ELIMINADOS':'ELIMINADO'}</span><div>${round.eliminated.map(name=>person(name,round.competitors.indexOf(name)+1,true)).join('')}</div>`:`<span>${round.kind==='tie'?'EMPATE':'RESULTADO'}</span><p>Sin eliminación</p>`;
 return `<article class="xp-duel ${comeback?'xp-comeback':''}" data-duel-search="${esc(search)}" data-duel-year="${esc(round.year)}"><header><div><span>VERSUS ${String(index+1).padStart(2,'0')}</span><strong>Episodio ${esc(round.ep)}</strong></div><small>${typeLabel}</small></header><div class="xp-duel-body"><div class="xp-duel-players" aria-label="Posiciones del versus">${round.competitors.map((name,i)=>person(name,i+1)).join('')}</div><div class="xp-duel-result">${result}</div></div></article>`;
}
function xpeditionDuelPerson(name,record,{position,winner=false,grayscale=false}){
 const image=seasonPortrait(name,record),profile=castProfile(name);
 const content=`<span class="xp-duel-image">${image?`<img src="${esc(image)}" alt="" loading="lazy">`:`<span class="ch-initials">${esc(seasonInitials(name))}</span>`}<span class="xp-duel-position" aria-label="${position}.º puesto en este versus">${position}<sup>º</sup></span></span><strong>${esc(name)}</strong>${winner?'<small class="xp-duel-victory">★ Victoria</small>':''}`;
 const attributes=`class="xp-duel-person ${winner?'is-winner':''} ${grayscale?'is-gray':''}" data-versus-position="${position}"`;
 return profile?`<button ${attributes} data-action="profile" data-id="${esc(profile.id)}" aria-label="${esc(name)}, ${position}.º puesto en este versus. Ver perfil">${content}</button>`:`<div ${attributes}>${content}</div>`;
}
function filterXpeditionVersus(){
 const query=norm($('#xpeditionVersusSearch')?.value||''),year=xpeditionFilters.year;
 const cards=$$('[data-duel-year]',$('#seasonPanel'));
 cards.forEach(card=>card.hidden=!(year==='todos'||card.dataset.duelYear===year)||!card.dataset.duelSearch.includes(query));
 $$('[data-versus-year]',$('#seasonPanel')).forEach(group=>group.hidden=!$$('[data-duel-year]',group).some(card=>!card.hidden));
 const count=cards.filter(card=>!card.hidden).length;
 $('#xpeditionVersusCount').textContent=count+' versus';
 $('#xpeditionVersusEmpty').hidden=count>0;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-xpedition-year]');if(!button)return;
 xpeditionFilters.year=button.dataset.xpeditionYear;
 $$('[data-xpedition-year]').forEach(filter=>filter.setAttribute('aria-pressed',String(filter===button)));
 filterXpeditionVersus();
});
document.addEventListener('input',event=>{if(event.target.id==='xpeditionVersusSearch')filterXpeditionVersus();});
