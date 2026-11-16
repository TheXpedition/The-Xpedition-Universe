'use strict';

const criticsSeries={
 'the-xpedition':'The Xpedition', 'the-traitor':'The Traitor', showdown:'Showdown', campria:'Campria'
};
const criticsSeasons=[
 {id:'antarctica', title:'The Xpedition Antarctica', series:'the-xpedition', catalog:'antarctica', count:18, years:'2022'},
 {id:'safari', title:'The Xpedition Safari', series:'the-xpedition', catalog:'safari', count:30, years:'2023–2025'},
 {id:'the-traitor-1', title:'The Traitor 1', series:'the-traitor', catalog:'traitor', count:12, years:'2023'},
 {id:'the-traitor-2', title:'The Traitor 2', series:'the-traitor', catalog:'traitor2', count:40, years:'2025–2026'},
 {id:'showdown-1', title:'Showdown 1', series:'showdown', catalog:'safari-showdown', count:16, years:'2025'},
 {id:'showdown-2', title:'Showdown 2', series:'showdown', catalog:'traitor-showdown', count:20, years:'2026'},
 {id:'apocalypse-1', title:'Apocalypse 1', series:'campria', catalog:'apocalypse', count:14, years:'2020'},
 {id:'apocalypse-ii', title:'Apocalypse II', series:'campria', catalog:'apocalypse-ii', count:2, years:'2026'}
];
const criticsSuits=[
 ['corazon','Corazón','♥','hearts'], ['espada','Espada','♠','spades'], ['diamante','Diamante','♦','diamonds'],
 ['trebol','Trébol','♣','clubs'], ['joker','Joker','🃏','joker'], ['final','Final','♛','final']
];
const criticsArt=season=>season.id==='apocalypse-ii'?'/seasons/campria/apocalypse-ii/cover-world.webp':'/assets/x-critics/'+season.id+'.webp';
const criticsSeriesArt=series=>'/assets/x-critics/'+series+'-poster.webp';
const criticsLink=(...parts)=>'#x-critics'+(parts.length?'/'+parts.join('/'):'');
const criticsNumber=new Intl.NumberFormat('es-CO',{minimumFractionDigits:1,maximumFractionDigits:1});
const criticsStar='<svg class="critics-star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.3 7 .9-5 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-5 7-.9z"/></svg>';
const criticsAverage=ratings=>{
 const values=ratings.filter(Number.isFinite);
 return values.length?values.reduce((sum,score)=>sum+score,0)/values.length:null;
};
const criticsScoreText=value=>Number.isFinite(value)?criticsNumber.format(value):'Sin nota';
let criticsDataPromise=null,criticsRequest=0;
const loadCriticsData=()=>criticsDataPromise??=fetch('/x-critics-data.json').then(response=>{
 if(!response.ok)throw Error('No se pudieron cargar las calificaciones.');
 return response.json();
}).catch(error=>{criticsDataPromise=null;throw error;});

function criticsHomeLink(){
 return `<section class="critics-home-link"><div><h2>X Critics</h2><p>Notas por episodio, grupo y fase. Consulta también el elenco de cada saga.</p></div><a class="btn secondary" href="${criticsLink()}">Abrir X Critics ${icon('arrow')}</a></section>`;
}

function criticsScore(value){
 return Number.isFinite(value)?`<span class="critics-score">${criticsStar}<b>${criticsScoreText(value)}</b><small>/ 10</small></span>`:'<span class="critics-score is-unrated">Sin nota</span>';
}

function criticsTabs(castPage=false){
 return `<nav class="critics-tabs" aria-label="Secciones de X Critics"><a href="${criticsLink()}" ${castPage?'':'aria-current="page"'}>Temporadas</a><a href="${criticsLink('elenco','the-xpedition')}" ${castPage?'aria-current="page"':''}>Elenco</a></nav>`;
}

function criticsCard(season,data){
 const suit=season.id==='the-traitor-2';
 const score=criticsAverage(suit?criticsSuits.map(([id])=>data.ratings[season.id]?.[id]?.score):criticsRatings(season,data));
 const title=season.series==='the-xpedition'?season.title.replace(/^The Xpedition /,''):season.title;
 return `<a class="critics-season-card" href="${criticsLink(season.id)}" data-critics-match="${esc(norm(season.title+' '+criticsSeries[season.series]+' '+season.years))}">
  <span><strong>${esc(title)}</strong><small>${season.count} episodios${suit?' · Notas por grupo':''}</small></span>
  ${Number.isFinite(score)?criticsScore(score):icon('arrow')}
 </a>`;
}

function criticsRatings(season,data){
 return Array.from({length:season.count},(_,i)=>data.ratings[season.id]?.[i+1]?.score??data.showdownRatings[season.id]?.[i]??null);
}

function criticsOverview(data){
 return `<section class="critics-page critics-index" aria-labelledby="critics-title">
  <header class="critics-index-head"><div><h1 id="critics-title">X Critics</h1><p>Calificaciones y elenco de The Xpedition Universe.</p></div>
   <label class="critics-search">${icon('search')}<input type="search" data-critics-search placeholder="Buscar temporada o saga" aria-label="Buscar temporada o saga"></label>
  </header>${criticsTabs()}
  <section class="critics-catalog" aria-labelledby="critics-catalog-title"><h2 id="critics-catalog-title">Explorar sagas</h2>
   <div class="critics-catalog-grid">${Object.entries(criticsSeries).map(([series,label])=>`<article class="critics-franchise">
    <div class="critics-franchise-poster"><img src="${criticsSeriesArt(series)}" alt="" decoding="async"><h3>${esc(label)}</h3></div>
    ${criticsSeasons.filter(season=>season.series===series).map(season=>criticsCard(season,data)).join('')}
    <a class="critics-franchise-cast" href="${criticsLink('elenco',series)}">${icon('users')} Elenco ${icon('arrow')}</a>
   </article>`).join('')}</div><p class="critics-search-empty" hidden>Sin temporadas que coincidan con la búsqueda.</p>
  </section>
 </section>`;
}

function criticsEpisodes(season,data,tournament){
 const ratings=criticsRatings(season,data);
 return ratings.map((score,i)=>{
  const number=i+1,record=tournament?.episodes.find(episode=>episode.number===number),entry=data.ratings[season.id]?.[number];
  return {id:String(number),number,score,title:entry?.title||record?.challenge||'Episodio '+number,summary:entry?.summary,duels:record?.duels};
 });
}

function criticsStages(tournament,episodes){
 const map=new Map(episodes.map(episode=>[episode.number,episode]));
 const groups=tournament.groups.map((group,i)=>({id:group.id,title:`Bracket ${String(i+1).padStart(2,'0')} · ${group.name}`,episodes:group.episodes.map(number=>map.get(number))}));
 for(const [id,title] of [['fase-2','Fase 2'],['semifinales','Semifinales'],['final','Final']]){
  const stage=tournament.episodes.filter(episode=>episode.phase===id).map(episode=>map.get(episode.number));
  if(stage.length)groups.push({id,title,episodes:stage});
 }
 return groups;
}

function criticsEpisodeGuide(season,episodes,requested,link,sequence=episodes){
 const current=episodes.find(episode=>episode.id===requested)||episodes[0];
 const position=sequence.indexOf(current);
 const still=season.id==='showdown-2'&&current.number<=17?`/assets/x-critics/showdown-2-e${current.number}.webp`:null;
 const adjacent=(episode,label,direction)=>episode?`<a href="${link(episode.id)}" aria-label="${label}, episodio ${episode.number}">${icon(direction)}<span>${label}</span></a>`:'<span></span>';
 return `<div class="critics-guide">
  <div class="critics-chart-shell"><button type="button" data-critics-slide="-1" aria-label="Ver episodios anteriores">${icon('back')}</button>
  <nav class="critics-episode-grid critics-chart" aria-label="Calificaciones por episodio">${sequence.map(episode=>{
   const rated=Number.isFinite(episode.score);
   return `<a href="${link(episode.id)}" ${current.id===episode.id?'aria-current="page"':''} aria-label="Episodio ${episode.number}, ${criticsScoreText(episode.score)}"><span class="critics-bar-slot"><b class="${rated?'':'is-empty'}" style="--episode-height:${rated?Math.max(28,episode.score*10):0}%">${rated?criticsScoreText(episode.score):'—'}</b></span><span>E${episode.number}</span></a>`;
  }).join('')}</nav><button type="button" data-critics-slide="1" aria-label="Ver más episodios">${icon('arrow')}</button></div>
  <article class="critics-current critics-episode-view">
   <figure><img src="${still||criticsArt(season)}" alt="" decoding="async">${still?'':'<figcaption>Arte de la temporada</figcaption>'}</figure>
   <div class="critics-current-copy"><span class="critics-meta">${season.years} · Episodio ${current.number} de ${season.count}</span><h3>${esc(current.title)}</h3>
    <div class="critics-current-rating">${criticsScore(current.score)}<span>Nota de X Critics</span></div>${current.summary?`<p>${esc(current.summary)}</p>`:''}${current.duels?.length?`<dl class="critics-episode-facts">${current.duels.map(duel=>`<div><dt>Enfrentamiento</dt><dd>${esc(duel.people.join(' · '))}</dd>${duel.winner?`<dt>Victoria</dt><dd>${esc(duel.winner)}</dd>`:''}</div>`).join('')}</dl>`:''}
    <nav class="critics-episode-step" aria-label="Cambiar episodio">${adjacent(sequence[position-1],'Anterior','back')}${adjacent(sequence[position+1],'Siguiente','arrow')}</nav>
   </div>
   <div class="critics-personal" data-critics-rating="${season.id}:${current.id}"><div><strong>Tu calificación</strong><small>En este dispositivo</small></div>
    <div class="critics-personal-stars" role="group" aria-label="Puntuar del 1 al 10">${Array.from({length:10},(_,index)=>`<button type="button" value="${index+1}" aria-label="${index+1} de 10" aria-pressed="false">${criticsStar}</button>`).join('')}</div>
   </div>
  </article></div>`;
}

function criticsGroupGuide(season,data,requested){
 const current=criticsSuits.find(([id])=>id===requested)||criticsSuits[0];
 const [id,title,suit,theme]=current,entry=data.ratings[season.id]?.[id];
 return `<section class="critics-section" aria-labelledby="critics-section-title"><h2 id="critics-section-title">Notas por grupo</h2>
 <nav class="critics-stage-links critics-suit-links" aria-label="Grupos de The Traitor 2">${criticsSuits.map(([key,label,mark,color])=>`<a class="critics-suit ${color}" href="${criticsLink(season.id,key)}" ${key===id?'aria-current="page"':''}><span aria-hidden="true">${mark}</span>${label}</a>`).join('')}</nav>
 <article class="critics-current critics-current-group"><div class="critics-suit ${theme}"><span aria-hidden="true">${suit}</span><div><h3>${title}</h3>${entry?.summary?`<p>${esc(entry.summary)}</p>`:''}</div></div>${criticsScore(entry?.score)}</article></section>`;
}

function criticsSeasonPage(season,data,tournament,stageId,episodeId){
 const suit=season.id==='the-traitor-2',episodes=criticsEpisodes(season,data,tournament),groups=tournament?criticsStages(tournament,episodes):null;
 const numbers=suit?criticsSuits.map(([id])=>data.ratings[season.id]?.[id]?.score):episodes.map(episode=>episode.score);
 const rated=numbers.filter(Number.isFinite).length,score=criticsAverage(numbers),item=allContent().find(item=>item.id===season.catalog);
 const group=groups?.find(group=>group.id===stageId)||groups?.[0];
 const seasonTabs=`<nav class="critics-season-tabs" aria-label="Temporadas de ${esc(criticsSeries[season.series])}"><span>Temporada</span>${criticsSeasons.filter(part=>part.series===season.series).map(part=>`<a href="${criticsLink(part.id)}" ${part.id===season.id?'aria-current="page"':''}>${esc(part.title.replace(/^The Xpedition /,''))}</a>`).join('')}</nav>`;
 const episodeLink=id=>group?criticsLink(season.id,groups.find(part=>part.episodes.some(episode=>episode.id===id)).id,id):criticsLink(season.id,id);
 const block=suit?seasonTabs+criticsGroupGuide(season,data,stageId):`<section class="critics-section" aria-labelledby="critics-section-title">
  <h2 id="critics-section-title">Episodios <small>${season.count}</small></h2>
  ${seasonTabs}
  ${group?`<nav class="critics-stage-links" aria-label="Fases de ${esc(season.title)}">${groups.map(part=>`<a href="${criticsLink(season.id,part.id)}" ${part.id===group.id?'aria-current="page"':''}>${esc(part.title)}</a>`).join('')}</nav>
  <header class="critics-stage-heading"><div><h3>${esc(group.title)}</h3><p>Promedio de los episodios de esta fase</p></div>${criticsScore(criticsAverage(group.episodes.map(episode=>episode.score)))}</header>`:''}
  ${!group?`<div class="critics-stage-heading"><p>${rated} de ${episodes.length} episodios con nota</p>${criticsScore(score)}</div>`:''}
  ${criticsEpisodeGuide(season,group?.episodes||episodes,group?episodeId:stageId,episodeLink,episodes)}
 </section>`;
 return `<section class="critics-page critics-detail-page" data-critics-season="${season.id}" aria-labelledby="critics-title">
  <a class="critics-back" href="${criticsLink()}">${icon('back')} X Critics</a>
  <header class="critics-title-sheet"><div class="critics-season-cover"><img src="${criticsArt(season)}" alt="" fetchpriority="high"></div>
  <div class="critics-title-copy"><span class="critics-meta">${criticsSeries[season.series]}</span><h1 id="critics-title">${esc(season.title)}</h1><p class="critics-title-meta">${season.years} <span>·</span> ${season.count} episodios${suit?' <span>·</span> Notas por grupo':''}</p>
    ${item?.desc?`<p class="critics-description">${esc(item.desc)}</p>`:''}
    <div class="critics-title-actions"><a class="critics-cast-link" href="${criticsLink('elenco',season.series)}">${icon('users')} Elenco</a>${item?.url?`<a class="critics-cast-link" href="${esc(item.url)}">Ir a la temporada ${icon('arrow')}</a>`:''}</div></div>
  <div class="critics-hero-rating"><span>Promedio de X Critics</span>${criticsScore(score)}<small>${rated} de ${numbers.length} ${suit?'grupos':'episodios'} con nota</small></div></header>
  ${block}
 </section>`;
}

const criticsCastAliases={
 'bonju belluci':'Bonju', 'maria villegas':'Maria', 'isabel vilches':'Isabel', 'andromeda solis':'Andromeda',
 'bayron daniel':'Bayron', 'coronel sanders':'Coronel', 'julian sanchez':'Julián', 'daelly bonbom':'Daelly',
 'felix gagenze':'Felix', 'xina ro':'Sal Lua', 'marcos jc':'Marcos', 'vita molotov':'Vita',
 'ivy pierce':'Ivy', 'alice torrico':'Alice', 'renzo rodriguez':'Renzo', 'leandro lynx':'Leandro',
 'renata antonuccio':'Renata', 'camila burda':'Kim Camila', 'marianito moya':'Marianito',
 'peggy marianne':'Peggy', 'nahuee silva':'Nahuee', 'louis pivovarov':'Luis', 'ignacio vila':'Nacho',
 'ximena at':'Ximena', 'alexandro martin':'Alexandro', 'emanuel bagundo':'Emanuel', 'esteban cooper':'Esteban',
 'eduardo p. gonzalez':'Eduardo', 'lalamila gucci':'Lalamila', 'luciano funes':'Luciano', 'eduard salerno':'Eduard',
 'oscar barajas':'Oscar', 'catalina guicet':'Catalina', 'christopher gonzales':'Christopher',
 'mati aliaga':'Mati', 'damian bechara':'Damián', 'javier araya':'Amanda Lewis', 'beto trujillo':'Beto'
};
function criticsCastCard(person){
 const normalized=norm(person.name),profileName=norm(criticsCastAliases[normalized]||person.name);
 const profile=state.catalog.characters.find(c=>norm(c.name)===profileName);
 const initials=person.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('');
 return `<article class="critics-cast-card">${profile?`<img src="${esc(profile.image)}" alt="" loading="lazy" decoding="async">`:`<span class="critics-cast-initials" aria-hidden="true">${esc(initials)}</span>`}<div><h3>${esc(person.name)}</h3><p>${esc(person.role)}</p></div><div class="critics-cast-credits"><b>${person.episodes} episodios</b><span>${esc(person.years.replace('-', '–'))}</span></div></article>`;
}

function criticsCastPage(data,requested){
 const series=Object.hasOwn(criticsSeries,requested)?requested:'the-xpedition';
 return `<section class="critics-page critics-cast-page" aria-labelledby="critics-title"><a class="critics-back" href="${criticsLink()}">${icon('back')} X Critics</a><h1 id="critics-title">Elenco principal</h1>
 ${criticsTabs(true)}
 <nav class="critics-stage-links" aria-label="Elenco por saga">${Object.entries(criticsSeries).map(([id,title])=>`<a href="${criticsLink('elenco',id)}" ${series===id?'aria-current="page"':''}>${title}</a>`).join('')}</nav>
 <section aria-labelledby="critics-cast-title"><h2 id="critics-cast-title">${criticsSeries[series]}</h2><div class="critics-cast-grid">${data.cast[series].map(criticsCastCard).join('')}</div></section></section>`;
}

async function renderXCritics(seasonId,stageId,episodeId){
 const turn=++criticsRequest, main=$('#main'), focus=main.contains(document.activeElement)?document.activeElement.getAttribute('href'):null;
 const season=criticsSeasons.find(entry=>entry.id===seasonId);
 document.title='X Critics · The Xpedition';
 if(!main.querySelector('.critics-page'))main.innerHTML='<div class="loading-screen"><span class="spinner"></span> Abriendo X Critics…</div>';
 try{
  const [data,archive]=await Promise.all([loadCriticsData(),season?.series==='showdown'?loadSpinoffArchive():null]);
  if(state.route!=='x-critics'||turn!==criticsRequest)return;
  main.innerHTML=season?criticsSeasonPage(season,data,archive?.seasons[season.catalog].tournament,stageId,episodeId):seasonId==='elenco'?criticsCastPage(data,stageId):criticsOverview(data);
  const search=main.querySelector('[data-critics-search]');
  search?.addEventListener('input',()=>{
   const query=norm(search.value.trim());
   const franchises=[...main.querySelectorAll('.critics-franchise')];
   for(const franchise of franchises){
    const seasons=[...franchise.querySelectorAll('[data-critics-match]')];
    for(const card of seasons)card.hidden=!card.dataset.criticsMatch.includes(query);
    franchise.hidden=seasons.every(card=>card.hidden);
   }
   main.querySelector('.critics-search-empty').hidden=franchises.some(card=>!card.hidden);
  });
  const chart=main.querySelector('.critics-chart');
  if(chart){
   const selected=chart.querySelector('[aria-current]');
   const end=selected.offsetLeft+selected.offsetWidth;
   if(end>chart.clientWidth)chart.scrollLeft=end-chart.clientWidth;
   const [previous,next]=main.querySelectorAll('[data-critics-slide]');
   const updateArrows=()=>{previous.disabled=chart.scrollLeft<2;next.disabled=chart.scrollLeft+chart.clientWidth>=chart.scrollWidth-2;};
   chart.addEventListener('scroll',updateArrows,{passive:true});
   for(const button of [previous,next])button.addEventListener('click',()=>{
    chart.scrollBy({left:Number(button.dataset.criticsSlide)*chart.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   });
   updateArrows();
  }
  const personal=main.querySelector('[data-critics-rating]');
  if(personal){
   const key='xp:critics:'+personal.dataset.criticsRating,buttons=[...personal.querySelectorAll('button')];
   let value=0;
   try{value=Number(localStorage.getItem(key))||0;}catch{}
   const paint=()=>buttons.forEach(button=>{
    button.classList.toggle('is-filled',Number(button.value)<=value);
    button.setAttribute('aria-pressed',String(Number(button.value)===value));
   });
   personal.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    const score=Number(button.value);
    value=score===value?0:score;
    try{if(value)localStorage.setItem(key,String(value));else localStorage.removeItem(key);}catch{}
    paint();
   });
   paint();
  }
  if(focus)[...main.querySelectorAll('a')].find(link=>link.getAttribute('href')===focus)?.focus({preventScroll:true});
 }catch{
  if(state.route!=='x-critics'||turn!==criticsRequest)return;
  main.innerHTML='<div class="error-panel"><h1>X Critics</h1><p>No se pudieron cargar las calificaciones.</p><button type="button" class="btn primary">Volver a intentar</button></div>';
  main.querySelector('button').addEventListener('click',()=>renderXCritics(seasonId,stageId,episodeId),{once:true});
 }
}
