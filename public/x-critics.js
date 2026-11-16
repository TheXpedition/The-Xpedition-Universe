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
const criticsArt=season=>'/assets/x-critics/'+season.id+'.webp';
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

function criticsCard(season,data,index){
 const suit=season.id==='the-traitor-2';
 const score=criticsAverage(suit?criticsSuits.map(([id])=>data.ratings[season.id]?.[id]?.score):criticsRatings(season,data));
 return `<a class="critics-season-card" href="${criticsLink(season.id)}">
  <div class="critics-card-art ${season.series==='showdown'?'critics-card-showdown':''}"><img src="${criticsArt(season)}" alt="" loading="${index<4?'eager':'lazy'}" decoding="async"></div>
  <div class="critics-card-content"><div><span class="critics-meta">${season.years} · ${season.count} episodios</span><h3>${esc(season.title)}</h3>${suit?'<p>Notas por grupo</p>':''}</div>${Number.isFinite(score)?criticsScore(score):icon('arrow')}</div>
 </a>`;
}

function criticsRatings(season,data){
 return Array.from({length:season.count},(_,i)=>data.ratings[season.id]?.[i+1]?.score??data.showdownRatings[season.id]?.[i]??null);
}

function criticsOverview(data){
 const feature=criticsSeasons.find(season=>season.id==='showdown-2');
 const score=criticsAverage(criticsRatings(feature,data));
 return `<section class="critics-page" aria-labelledby="critics-title">
  <header class="critics-hero critics-overview-hero"><img class="critics-hero-art" src="${criticsArt(feature)}" alt="" fetchpriority="high"><div class="critics-hero-copy"><h1 id="critics-title">X Critics</h1><p>Las calificaciones del universo The Xpedition, episodio a episodio.</p><div class="critics-hero-actions"><a class="btn primary" href="${criticsLink(feature.id)}">Ver Showdown 2 ${icon('arrow')}</a>${criticsScore(score)}</div></div></header>
  ${criticsTabs()}
  <section class="critics-catalog" aria-labelledby="critics-catalog-title"><h2 id="critics-catalog-title">Todas las temporadas</h2><div class="critics-catalog-grid">${criticsSeasons.map((season,index)=>criticsCard(season,data,index)).join('')}</div></section>
 </section>`;
}

function criticsEpisodes(season,data,tournament){
 const ratings=criticsRatings(season,data);
 return ratings.map((score,i)=>{
  const number=i+1,record=tournament?.episodes.find(episode=>episode.number===number),entry=data.ratings[season.id]?.[number];
  return {id:String(number),number,score,title:entry?.title||record?.challenge||'Episodio '+number,summary:entry?.summary};
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

function criticsEpisodeGuide(episodes,requested,link){
 const current=episodes.find(episode=>episode.id===requested)||episodes[0];
 return `<div class="critics-guide"><div class="critics-guide-index">
  <nav class="critics-episode-grid" aria-label="Episodios">${episodes.map(episode=>`<a href="${link(episode.id)}" ${current.id===episode.id?'aria-current="page"':''} aria-label="Episodio ${episode.number}, ${criticsScoreText(episode.score)}"><span>E${episode.number}</span><b>${Number.isFinite(episode.score)?criticsScoreText(episode.score):'—'}</b>${Number.isFinite(episode.score)?'<span class="critics-episode-meter" aria-hidden="true" style="--episode-score:'+episode.score*10+'%"></span>':''}</a>`).join('')}</nav>
  </div><article class="critics-current"><div><span class="critics-meta">Episodio ${current.number}</span><h3>${esc(current.title==='Episodio '+current.number?'Calificación':current.title)}</h3>${current.summary?`<p>${esc(current.summary)}</p>`:''}</div>${criticsScore(current.score)}</article></div>`;
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
 const block=suit?criticsGroupGuide(season,data,stageId):`<section class="critics-section" aria-labelledby="critics-section-title">
  <h2 id="critics-section-title">${group?'Fases del torneo':'Episodios'}</h2>
  ${group?`<nav class="critics-stage-links" aria-label="Fases de ${esc(season.title)}">${groups.map(part=>`<a href="${criticsLink(season.id,part.id)}" ${part.id===group.id?'aria-current="page"':''}>${esc(part.title)}</a>`).join('')}</nav>
  <header class="critics-stage-heading"><div><h3>${esc(group.title)}</h3><p>Promedio de los episodios de esta fase</p></div>${criticsScore(criticsAverage(group.episodes.map(episode=>episode.score)))}</header>`:''}
  ${criticsEpisodeGuide(group?.episodes||episodes,group?episodeId:stageId,id=>group?criticsLink(season.id,group.id,id):criticsLink(season.id,id))}
 </section>`;
 return `<section class="critics-page critics-detail-page" data-critics-season="${season.id}" aria-labelledby="critics-title">
  <a class="critics-back" href="${criticsLink()}">${icon('back')} X Critics</a>
  <header class="critics-hero critics-detail-hero"><img class="critics-hero-art" src="${criticsArt(season)}" alt="" fetchpriority="high"><div class="critics-hero-copy"><span class="critics-meta">${criticsSeries[season.series]} · ${season.years}</span><h1 id="critics-title">${esc(season.title)}</h1><p>${season.count} episodios${suit?' · Calificación por grupo':''}</p><a class="critics-cast-link" href="${criticsLink('elenco',season.series)}">Ver elenco de ${criticsSeries[season.series]} ${icon('arrow')}</a>${item?.url?`<a class="critics-cast-link" href="${esc(item.url)}">Ir a la temporada ${icon('arrow')}</a>`:''}</div><div class="critics-hero-rating"><span>Promedio de ${suit?'grupos':'episodios'}</span>${criticsScore(score)}<small>${rated} de ${numbers.length} con nota</small></div></header>
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
 return `<article class="critics-cast-card">${profile?`<img src="${esc(profile.image)}" alt="" loading="lazy" decoding="async">`:`<span class="critics-cast-initials" aria-hidden="true">${esc(initials)}</span>`}<div><h3>${esc(person.name)}</h3><p>${esc(person.role)}</p><span>${person.episodes} episodios · ${esc(person.years.replace('-', '–'))}</span></div></article>`;
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
  if(focus)[...main.querySelectorAll('a')].find(link=>link.getAttribute('href')===focus)?.focus({preventScroll:true});
 }catch{
  if(state.route!=='x-critics'||turn!==criticsRequest)return;
  main.innerHTML='<div class="error-panel"><h1>X Critics</h1><p>No se pudieron cargar las calificaciones.</p><button type="button" class="btn primary">Volver a intentar</button></div>';
  main.querySelector('button').addEventListener('click',()=>renderXCritics(seasonId,stageId,episodeId),{once:true});
 }
}
