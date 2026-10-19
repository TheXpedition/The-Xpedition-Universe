'use strict';

let campriaArchivePromise=null;
const seasonView={id:null,tab:'resumen',record:null,item:null};
const seasonInitials=name=>name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
const seasonTabs=record=>[['resumen','Resumen'],['participantes','Participantes'],['track-record','Track record'],...(record.versus?[['versus','Versus']]:[])];
function criticsBadge(item){
 if(!item.critics)return '';
 const score=Number(item.critics.score).toFixed(1);
 return `<span class="season-critics" aria-label="The X Critics: ${score} de 10"><span aria-hidden="true">★</span><strong>${score}</strong><span>The X Critics</span></span>`;
}
async function loadCampriaArchive(){
 if(!campriaArchivePromise)campriaArchivePromise=fetch('seasons/campria/seasons.json?v=2').then(r=>{if(!r.ok)throw new Error('No se pudo cargar esta temporada.');return r.json();}).catch(error=>{campriaArchivePromise=null;throw error;});
 return campriaArchivePromise;
}
async function renderSeasonPage(id){
 if($('#modal').open)closeModal();
 const item=state.catalog.content.campria.find(x=>x.id===id);
 if(!item){$('#main').innerHTML=empty('Esta temporada no está disponible.','Explora las doce temporadas de Campria.','go-explore','Ver temporadas');return;}
 $('#main').innerHTML='<div class="loading-screen"><span class="spinner"></span> Abriendo la temporada…</div>';
 try{
  const archive=await loadCampriaArchive();
  if(state.route!=='temporada'||decodeURIComponent(location.hash.split('/')[1]||'')!==id)return;
  const record=archive.seasons[id];if(!record)throw new Error('No se pudo cargar esta temporada.');
  const requested=location.hash.split('/')[2]||'resumen';
  seasonView.id=id;seasonView.item=item;seasonView.record=record;seasonView.tab=seasonTabs(record).some(([key])=>key===requested)?requested:'resumen';
  document.title=`${item.name} — Campria | The Xpedition`;
  const index=state.catalog.content.campria.findIndex(x=>x.id===id),previous=state.catalog.content.campria[index-1],next=state.catalog.content.campria[index+1];
  $('#main').innerHTML=`<div class="season-page"><div class="ch-breadcrumb"><a href="#explorar/campria">${icon('back')} Campria</a><span aria-hidden="true">/</span><span>${esc(item.name)}</span></div>
   <section class="ch-hero" aria-labelledby="seasonPageTitle"><img class="ch-atmosphere" src="${esc(contentArt(item))}" alt=""><div class="ch-hero-copy"><div class="eyebrow">CAMPRIA <span aria-hidden="true">/</span> TEMPORADA ${String(record.number).padStart(2,'0')} <span aria-hidden="true">/</span> ${esc(item.meta.match(/\d{4}/)?.[0]||'')}</div><h1 id="seasonPageTitle" class="sr-only">${esc(item.name)}</h1>${brandArt(item,'ch-logo')}<p class="ch-tagline">${esc(item.desc)}</p><div class="ch-hero-rating">${criticsBadge(item)}<span>Nota de la crítica · sobre 10</span></div><div class="ch-host">Presenta ${castNames(['Maria Villegas'])}</div><div class="ch-hero-actions"><button class="btn primary" data-season-action="tab" data-tab="participantes">${icon('users')} Conocer al elenco</button><button class="btn secondary" data-season-action="tab" data-tab="track-record">Track record ${icon('arrow')}</button><button class="hero-save ${saved(id)?'saved':''}" data-action="save" data-id="${esc(id)}" aria-label="${saved(id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(id)}">${icon(saved(id)?'check':'plus')}</button></div></div><figure class="ch-hero-poster"><img src="${esc(contentArt(item))}" alt="Ilustración de ${esc(item.name)}" fetchpriority="high"><figcaption>${esc(item.season)} <span>${esc(item.name)}</span></figcaption></figure></section>
   <div class="ch-facts">${Object.entries(record.stats).map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
   <div class="ch-tabs" role="tablist" aria-label="Contenido de ${esc(item.name)}">${seasonTabs(record).map(([key,label])=>`<button role="tab" id="season-tab-${key}" aria-controls="seasonPanel" aria-selected="${key===seasonView.tab}" tabindex="${key===seasonView.tab?0:-1}" data-season-action="tab" data-tab="${key}">${label}${key==='versus'?'<span class="ch-tab-dot" aria-hidden="true"></span>':''}</button>`).join('')}</div><section id="seasonPanel" class="ch-panel" role="tabpanel" aria-labelledby="season-tab-${seasonView.tab}" tabindex="0">${seasonPanel()}</section>
   <nav class="ch-season-navigation" aria-label="Cambiar temporada">${previous?`<a href="#temporada/${esc(previous.id)}"><small>${icon('back')} Temporada anterior</small><strong>${esc(previous.name)}</strong></a>`:'<span></span>'}<a class="ch-all-seasons" href="#explorar/campria">Ver todas las temporadas</a>${next?`<a class="ch-next" href="#temporada/${esc(next.id)}"><small>Siguiente temporada ${icon('arrow')}</small><strong>${esc(next.name)}</strong></a>`:'<span></span>'}</nav></div>`;
 }catch(error){if(state.route==='temporada'&&decodeURIComponent(location.hash.split('/')[1]||'')===id)$('#main').innerHTML=`<div class="empty-state"><h1>No pudimos abrir la temporada.</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><button class="btn primary" data-season-action="retry" data-id="${esc(id)}">Volver a intentar</button><a class="btn secondary" href="#explorar/campria">Ver Campria</a></div>`;}
}
function seasonPlacement(value){
 if(value==='Host')return 'Presentación';
 if(value==='Judge')return 'Jurado';
 if(/^winner$/i.test(value))return '1.er lugar';
 if(/^runner[ -]?up$/i.test(value))return '2.º lugar';
 const positions=value.match(/\d+/g);if(positions)return positions.map(n=>n+'.º').join(' / ')+' lugar';
 return value;
}
function seasonPortrait(name,record=seasonView.record){
 return record.images[name]||character(name)?.image||castProfile(name)&&imageFor(castProfile(name).name);
}
function seasonParticipantCard(person){
 const profile=castProfile(person.name),placement=seasonPlacement(person.place),winner=/^winner$/i.test(person.place);
 const picture=person.image?`<img src="${esc(person.image)}" alt="" loading="lazy" decoding="async">`:`<span class="ch-initials">${esc(seasonInitials(person.name))}</span>`;
 const body=`<div class="ch-person-image">${picture}<span class="ch-placement ${winner?'ch-winner':''}">${winner?'<span aria-hidden="true">★</span> ':''}${esc(placement)}</span></div><div class="ch-person-copy"><h3>${esc(person.name)}</h3>${person.season?`<p>${esc(person.season)}</p>`:''}${profile?'<span class="ch-person-link">Ver perfil ↗</span>':''}</div>`;
 return `<article class="ch-person-card" data-person-search="${esc(norm(person.name+' '+(person.season||'')))}">${profile?`<button data-action="profile" data-id="${esc(profile.id)}" aria-label="Ver perfil de ${esc(person.name)}">${body}</button>`:`<div>${body}</div>`}</article>`;
}
function seasonPanel(){
 const {record,item,tab}=seasonView;
 if(tab==='resumen')return `<div class="ch-overview"><article class="ch-story"><div class="eyebrow">LA HISTORIA DE LA TEMPORADA</div><h2>Acerca de ${esc(item.name)}</h2><p>${esc(record.description)}</p><div class="ch-genres">${(state.catalog.details[item.id]?.genres||[]).map(g=>`<span>${esc(g)}</span>`).join('')}</div><div class="ch-story-credits"><span>UNIVERSO</span><strong>Campria</strong><span>PRESENTACIÓN</span><strong>${castNames(['Maria Villegas'])}</strong></div></article><figure class="ch-original-poster"><button data-season-action="poster" aria-label="Ampliar póster original de ${esc(item.name)}"><img src="${esc(record.poster)}" alt="Póster original de ${esc(item.name)}" loading="lazy"><span>${icon('search')} Ampliar póster</span></button><figcaption>El arte de ${esc(item.name)}</figcaption></figure></div><div class="ch-section-head"><div><div class="eyebrow">LOS ROSTROS DE LA TEMPORADA</div><h2>Elenco Principal</h2></div><button class="link-button" data-season-action="tab" data-tab="participantes">Ver participantes ${icon('arrow')}</button></div><div class="ch-participants-preview">${record.mainCast.map(seasonParticipantCard).join('')}</div>${record.versus?`<button class="ch-extra-banner" data-season-action="tab" data-tab="versus"><span>${icon('game')} <span><strong>Los duelos que cambiaron el juego.</strong><small>${record.versus.rounds.length} enfrentamientos · Explora Versus</small></span></span>${icon('arrow')}</button>`:''}`;
 if(tab==='participantes'){
  const cast=state.catalog.details[item.id]?.cast||[];
  return `<div class="ch-section-head"><div><div class="eyebrow">EL ELENCO</div><h2>Participantes de ${esc(item.name)}</h2><p>Posiciones y nombres de la temporada.</p></div><label class="search-field ch-person-search">${icon('search')}<input id="seasonParticipantSearch" type="search" aria-label="Buscar participante" placeholder="Buscar participante…"></label></div><div class="ch-participants-grid">${record.participants.map(seasonParticipantCard).join('')}</div><p id="seasonParticipantEmpty" class="ch-empty" hidden>No encontramos a ese participante.</p><div class="ch-full-cast"><h3>Elenco de la temporada</h3><p>${castNames(cast)}</p></div>`;
 }
 if(tab==='track-record')return `<div class="ch-section-head"><div><div class="eyebrow">RONDA A RONDA</div><h2>Track record</h2><p>El recorrido completo de los participantes. Amplía la tabla para consultar cada resultado.</p></div></div>${seasonTrackViewer(record)}<div class="ch-track-caption"><span>${esc(item.name)} · ${esc(item.meta)}</span><span>Desplaza la tabla cuando la amplíes.</span></div>`;
 return `<div class="ch-section-head"><div><div class="eyebrow">${seasonVersusLabel(record.versus.format)}</div><h2>Los enfrentamientos</h2><p>Competidores, elecciones y resultados de cada versus.</p></div><label class="search-field ch-person-search">${icon('search')}<input id="seasonVersusSearch" type="search" aria-label="Buscar participante en Versus" placeholder="Buscar en los duelos…"></label></div><div class="ch-duels">${record.versus.rounds.map((round,i)=>seasonDuel(round,i,record)).join('')}</div><p id="seasonVersusEmpty" class="ch-empty" hidden>No hay duelos con ese nombre.</p>`;
}
function seasonVersusLabel(format){
 return ({assassin:'ASSASSIN',killer:'VERSUS KILLER','all-stars':'LIPSYNC · TOP2','top2-elimination':'TOP2 Y ELIMINACIÓN',elimination:'VERSUS'})[format]||'VERSUS';
}
function seasonDuelData(round,record){
 if(round.results)return {competitors:round.competitors,results:round.results};
 const names=round.competitors||[round.assassin,...round.opponents];
 return {competitors:names.map((name,index)=>({name,...(index===0?{badge:record.versus.format==='assassin'?'Assassin':'Versus Killer'}:{})})),results:[{type:'winner',people:round.winners.map(name=>({name}))}]};
}
function seasonDuel(round,index,record){
 const data=seasonDuelData(round,record);
 const search=data.competitors.flatMap(p=>[p.name,p.choice||'']).concat(data.results.flatMap(r=>r.people.flatMap(p=>[p.name,p.note||'']))).join(' ');
 return `<article class="ch-duel" data-duel-search="${esc(norm(search))}"><div class="ch-round"><span>VERSUS</span><strong>${index+1}</strong><small>Episodio ${esc(round.ep)}</small></div><div class="ch-duel-contenders">${data.competitors.map((person,i)=>`<div class="ch-contender">${i?'<span class="ch-vs-separator" aria-hidden="true">VS</span>':''}${seasonDuelPerson(person,record)}</div>`).join('')}</div><div class="ch-duel-result">${data.results.map(result=>{
  const eliminated=result.type==='eliminated',label=result.label||(eliminated?(result.people.length>1?'Eliminados':'Eliminado'):(result.people.length>1?'Ganadores':'Ganador'));
  return `<div class="ch-result-row" data-result-type="${esc(result.type)}"><span class="ch-result-label">${esc(label)}</span><div class="ch-result-people">${result.people.map(person=>seasonDuelPerson(person,record,{winner:!eliminated,eliminated})).join('')}</div></div>`;
 }).join('')}</div></article>`;
}
function seasonDuelPerson(person,record,{winner=false,eliminated=false}={}){
 const name=canonicalCastName(person.name),image=seasonPortrait(name,record),profile=castProfile(name),gray=eliminated||person.grayscale;
 const badge=person.badge||(winner?'Victoria':''),badgeClass=badge==='Top2'?'badge-top2':badge==='Winner'?'badge-winner':badge==='Ídolo'?'badge-idol':'';
 const choice=person.choice,choiceImage=choice?seasonPortrait(choice,record):null;
 const choiceHtml=choice?`<span class="ch-choice"><span>Elección</span><span>${choiceImage?`<img src="${esc(choiceImage)}" alt="">`:`<span class="ch-choice-initials">${esc(seasonInitials(choice))}</span>`}${esc(canonicalCastName(choice))}</span></span>`:'';
 const content=`${image?`<img src="${esc(image)}" alt="" loading="lazy">`:`<span class="ch-initials">${esc(seasonInitials(name))}</span>`}<strong>${esc(name)}</strong>${badge?`<small class="${badgeClass}">${winner?'★ ':''}${esc(badge)}</small>`:''}${person.note?`<small class="ch-result-note">${esc(person.note)}</small>`:''}${choiceHtml}`;
 const classes=`ch-duel-person ${winner?'is-winner':''} ${eliminated?'is-eliminated':''} ${gray?'is-gray':''}`;
 return profile?`<button class="${classes}" data-action="profile" data-id="${esc(profile.id)}" aria-label="Ver perfil de ${esc(name)}">${content}</button>`:`<div class="${classes}">${content}</div>`;
}

function seasonTrackViewer(record,expanded=false){
 return `<div class="ch-track-viewer" data-track-viewer><div class="ch-track-toolbar"><span>${expanded?'Vista ampliada':'Resultados de la temporada'}</span><div role="group" aria-label="Zoom del track record"><button data-season-action="zoom-out" aria-label="Reducir track record">−</button><output class="ch-zoom-value" aria-live="polite">Ajustado</output><button data-season-action="zoom-in" aria-label="Ampliar track record">+</button><button class="ch-zoom-fit" data-season-action="zoom-fit">Ajustar</button>${!expanded?'<button class="ch-zoom-expand" data-season-action="track-expand" aria-label="Abrir track record en vista ampliada">'+icon('search')+'<span>Ampliar vista</span></button>':''}</div></div><div class="ch-track-canvas" tabindex="0" role="region" aria-label="Tabla de resultados desplazable"><img src="${esc(record.track.src)}" width="${record.track.width}" height="${record.track.height}" data-native-width="${record.track.width}" alt="Track record de ${esc(seasonView.item.name)}: resultados originales de cada participante y ronda." loading="eager"></div></div>`;
}
function switchSeasonTab(tab,scroll=true){
 if(!seasonTabs(seasonView.record).some(([key])=>key===tab))return;
 seasonView.tab=tab;
 history.replaceState(null,'','#temporada/'+seasonView.id+'/'+tab);
 $$('.ch-tabs [role=tab]').forEach(button=>{button.setAttribute('aria-selected',String(button.dataset.tab===tab));button.tabIndex=button.dataset.tab===tab?0:-1;});
 const panel=$('#seasonPanel');panel.setAttribute('aria-labelledby','season-tab-'+tab);panel.innerHTML=seasonPanel();
 if(scroll){$('.ch-tabs').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('#season-tab-'+tab).focus({preventScroll:true});}
}
function seasonZoom(button,action){
 const viewer=button.closest('[data-track-viewer]'),image=$('img',viewer),output=$('output',viewer);
 if(action==='zoom-fit'){image.style.width='100%';output.textContent='Ajustado';return;}
 const native=Number(image.dataset.nativeWidth),scale=image.getBoundingClientRect().width/native;
 const next=Math.max(.2,Math.min(3,scale*(action==='zoom-in'?1.3:1/1.3)));
 image.style.width=Math.round(native*next)+'px';output.textContent=Math.round(next*100)+'%';
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-season-action]');if(!button)return;
 const action=button.dataset.seasonAction;
 if(action==='open-season'){event.preventDefault();closeModal();go('temporada/'+button.dataset.id);return;}
 if(action==='retry'){renderSeasonPage(button.dataset.id);return;}
 if(!seasonView.record)return;
 if(action==='tab')switchSeasonTab(button.dataset.tab);
 if(action.startsWith('zoom-'))seasonZoom(button,action);
 if(action==='track-expand')modal(`<h2 id="modalTitle">${esc(seasonView.item.name)} · Track record</h2>${seasonTrackViewer(seasonView.record,true)}`,true,'season-media');
 if(action==='poster')modal(`<h2 id="modalTitle">${esc(seasonView.item.name)} · Póster</h2><img class="ch-poster-expanded" src="${esc(seasonView.record.poster)}" alt="Póster original de ${esc(seasonView.item.name)}">`,true,'season-media');
});
document.addEventListener('input',event=>{
 if(!['seasonParticipantSearch','seasonVersusSearch'].includes(event.target.id))return;
 const participants=event.target.id==='seasonParticipantSearch',selector=participants?'[data-person-search]':'[data-duel-search]',key=participants?'personSearch':'duelSearch',query=norm(event.target.value);
 const cards=$$(selector,$('#seasonPanel'));cards.forEach(card=>card.hidden=!card.dataset[key].includes(query));
 $(participants?'#seasonParticipantEmpty':'#seasonVersusEmpty').hidden=cards.some(card=>!card.hidden);
});
document.addEventListener('keydown',event=>{
 if(!event.target.matches('.ch-tabs [role=tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const tabs=$$('.ch-tabs [role=tab]'),index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchSeasonTab(tabs[next].dataset.tab,false);tabs[next].focus();
});
