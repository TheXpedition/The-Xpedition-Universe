'use strict';
const showdownView={id:null,episode:1,bracket:null};
const showdownSeasonTabs=()=>[['resumen','El torneo'],['episodios','Episodios'],['brackets','Brackets y estrellas'],['participantes','Participantes'],['track-record','Track record']];
const showdownName=name=>name==='Andromeda'?'Andrómeda':name;
function showdownPortrait(name){
 const person=seasonView.record.participants.find(p=>norm(p.name)===norm(name));
 return person?.image||seasonPortrait(name);
}
function showdownAvatar(name,cls='',label=''){
 const profile=castProfile(name),inside=`<img src="${esc(showdownPortrait(name))}" alt="" loading="lazy">${label?`<span>${esc(label)}</span>`:''}`;
 return profile?`<button class="sh-avatar ${cls}" data-action="profile" data-id="${esc(profile.id)}" aria-label="Ver perfil de ${esc(showdownName(name))}">${inside}</button>`:`<span class="sh-avatar ${cls}">${inside}</span>`;
}
function showdownPeople(names,cls=''){
 return `<div class="sh-people ${cls}">${names.map(name=>`<div class="sh-person-tile">${showdownAvatar(name)}<strong>${esc(showdownName(name))}</strong></div>`).join('')}</div>`;
}
function showdownSection(kicker,title,copy=''){
 return `<div class="sh-section-head"><span class="sh-eyebrow">${esc(kicker)}</span><h2>${esc(title)}</h2>${copy?`<p>${esc(copy)}</p>`:''}</div>`;
}
function showdownScores(group,through=Infinity){
 const rows=group.people.map(name=>({name,top:0,duel:0,votes:0,total:group.stars?.[name]??null}));
 if(seasonView.record.number!==1)return rows;
 const byName=new Map(rows.map(row=>[row.name,row]));
 for(const ep of seasonView.record.tournament.episodes.filter(ep=>ep.bracket===group.id&&ep.number<=through)){
  for(const duel of ep.duels||[]){for(const name of duel.people)if(byName.has(name))byName.get(name).top+=2;if(duel.winner&&byName.has(duel.winner))byName.get(duel.winner).duel++;}
  for(const vote of ep.votes||[])if(vote.to&&byName.has(vote.to))byName.get(vote.to).votes++;
 }
 rows.forEach(row=>row.total=row.top+row.duel+row.votes);return rows;
}
function renderShowdownPage(){
 const {record,item,id}=seasonView,t=record.tournament;
 if(showdownView.id!==id)Object.assign(showdownView,{id,episode:1,bracket:t.groups[0].id});
 const extra=decodeURIComponent(location.hash.split('/')[3]||'');
 if(seasonView.tab==='episodios'&&t.episodes.some(ep=>String(ep.number)===extra))showdownView.episode=Number(extra);
 if(seasonView.tab==='brackets'&&t.groups.some(group=>group.id===extra))showdownView.bracket=extra;
 const siblings=state.catalog.content.spinoffs.filter(entry=>entry.saga==='showdown');
 $('#main').innerHTML=`<div class="season-page sd-page sh-page sh-season-${record.number}">
  <nav class="sh-topline" aria-label="Temporadas de Showdown"><a href="#explorar/showdown">${icon('back')} Todos los Showdown</a><div>${siblings.map(sibling=>`<a href="#temporada/${esc(sibling.id)}" ${sibling.id===id?'aria-current="page"':''}>Temporada ${sibling.id==='safari-showdown'?'1':'2'}</a>`).join('')}</div></nav>
  <header class="sh-hero" aria-labelledby="seasonPageTitle"><h1 id="seasonPageTitle" class="sr-only">${esc(item.name)}</h1>
   <div class="sh-hero-image"><img src="${esc(record.poster)}" alt="Bonju presenta ${esc(item.name)}" fetchpriority="high"></div>
   <div class="sh-hero-copy"><div class="sh-hero-caption"><span class="sh-live-dot"></span> TEMPORADA ${String(record.number).padStart(2,'0')} <span class="sh-caption-divider">/</span> ${record.year}</div>${brandArt(item,'sh-logo')}<h2>${record.number===1?'LA BATALLA POR<br>LAS ESTRELLAS.':'MÁS ESTRELLAS.<br>MÁS SHOWDOWN.'}</h2><p>${record.number===1?'Las estrellas de Safari vuelven para enfrentarse por el título. Cada reto, cada duelo y cada voto cuenta.':'Las estrellas de The Traitor toman el escenario. Nuevos duelos, nuevas decisiones y un título por conquistar.'}</p><div class="sh-hero-actions"><button class="btn primary" data-season-action="tab" data-tab="episodios">ENTRAR AL TORNEO ${icon('arrow')}</button><button class="hero-save ${saved(id)?'saved':''}" data-action="save" data-id="${esc(id)}" aria-label="${saved(id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(id)}">${icon(saved(id)?'check':'plus')}</button></div><div class="sh-hero-meta"><span><b>${record.number===1?'18':'27'}</b> participantes</span><i></i><span><b>${t.episodeCount}</b> episodios</span><i></i><span>Presenta <b>${castNames(['Bonju'])}</b></span></div></div>
   <div class="sh-hero-stamp" aria-hidden="true"><span>THE STARS</span><strong>ARE BACK</strong><i>✦</i></div>
   <div class="sh-compact-heading">${brandArt(item,'sh-compact-logo')}<div><span>TEMPORADA ${String(record.number).padStart(2,'0')} · ${record.year}</span><strong>${record.number===1?'Safari All Stars':'The Traitor All Stars'}</strong></div></div>
  </header>
  <div class="ch-tabs sh-tabs" role="tablist" aria-label="Contenido de ${esc(item.name)}">${showdownSeasonTabs().map(([key,label])=>`<button role="tab" id="season-tab-${key}" aria-controls="seasonPanel" aria-selected="${key===seasonView.tab}" tabindex="${key===seasonView.tab?0:-1}" data-season-action="tab" data-tab="${key}">${label}</button>`).join('')}</div>
  <section id="seasonPanel" class="ch-panel sh-panel" role="tabpanel" aria-labelledby="season-tab-${seasonView.tab}" tabindex="0">${showdownSeasonPanel()}</section>
  <footer class="sh-footer">${brandArt(item,'sh-footer-logo')}<a href="#temporada/${id==='safari-showdown'?'traitor-showdown':'safari-showdown'}">Descubre la temporada ${record.number===1?'2':'1'} ${icon('arrow')}</a></footer></div>`;
}
function showdownGroupCards(){
 const t=seasonView.record.tournament;
 return `<div class="sh-group-cards">${t.groups.map((group,i)=>`<button class="sh-group-card" style="--group:${group.color}" data-showdown-action="open-bracket" data-bracket="${group.id}"><span class="sh-card-episode">EP. ${String(group.episodes[0]).padStart(2,'0')}—${String(group.episodes.at(-1)).padStart(2,'0')}</span><span class="sh-card-number" aria-hidden="true">0${i+1}</span><div class="sh-card-cast">${(group.advanced||group.people).slice(0,3).map(name=>`<img src="${esc(showdownPortrait(name))}" alt="" loading="lazy">`).join('')}</div><div class="sh-card-bottom"><div><span>BRACKET 0${i+1}</span><h3>${esc(group.name)}</h3></div><span class="sh-card-arrow">${icon('arrow')}</span></div><p>${group.people.length} participantes <span>·</span> ${group.status==='partial'?'Por completar':'Ver resultados'}</p></button>`).join('')}</div>`;
}
function showdownOverview(){
 const r=seasonView.record,t=r.tournament;
 return `<div class="sh-overview-title"><div><span class="sh-eyebrow">EL TORNEO EMPIEZA AQUÍ</span><h2>ELIGE TU BRACKET<span>.</span></h2></div><p>Tres grupos. Un escenario.<br>Las estrellas se lo juegan todo.</p></div>${showdownGroupCards()}
  <div class="sh-overview-lower"><section class="sh-road"><span class="sh-eyebrow">EL CAMINO AL TÍTULO</span><h2>DE LA PRIMERA ESTRELLA<br>A LA GRAN FINAL.</h2><div class="sh-road-stages"><button data-showdown-action="open-episode" data-episode="1"><b>01</b><div><strong>Brackets</strong><span>Episodios 1—9</span></div>${icon('arrow')}</button><button data-showdown-action="open-episode" data-episode="10"><b>02</b><div><strong>${r.number===1?'Semifinales':'Fase 2 y semifinales'}</strong><span>Episodios 10—${r.number===1?'15':'19'}</span></div>${icon('arrow')}</button><button data-showdown-action="open-episode" data-episode="${t.episodeCount}"><b>03</b><div><strong>La gran final</strong><span>Episodio ${t.episodeCount}</span></div>${icon('arrow')}</button></div></section>
  ${t.champion?`<section class="sh-champion"><div class="sh-champion-art"><img src="${esc(showdownPortrait(t.champion))}" alt="${esc(t.champion)}" loading="lazy"><span aria-hidden="true">✦</span></div><div class="sh-champion-copy"><span class="sh-eyebrow">GANADOR DE SHOWDOWN</span><h2>IGNACIO<br>RICCI</h2><button class="link-button" data-showdown-action="open-episode" data-episode="16">Ver la gran final ${icon('arrow')}</button></div></section>`:`<section class="sh-next-final"><span class="sh-eyebrow">EL ÚLTIMO ESCENARIO</span><strong>LA FINAL<br>ESTÁ POR<br>ESCRIBIRSE<span>.</span></strong><button data-showdown-action="open-episode" data-episode="20">Episodio 20 · Por hacerse ${icon('arrow')}</button><span class="sh-final-star" aria-hidden="true">✦</span></section>`}</div>
  ${r.number===1?`<section class="sh-rules"><article><span>✦ ✦</span><div><h3>TOP 2</h3><p>Los dos mejores del reto reciben <b>dos estrellas</b>.</p></div></article><article><span>VS</span><div><h3>VERSUS</h3><p>Ganar el duelo suma <b>una estrella extra</b>.</p></div></article><article><span>+✦</span><div><h3>THE X VOTE</h3><p>El resto del grupo da <b>una estrella</b> a alguien más.</p></div></article></section>`:`<div class="sh-season-note"><span aria-hidden="true">✦</span><p><strong>La temporada sigue en juego.</strong> El bracket Naranja ya está completo. Rosa y Morado se completarán próximamente.</p></div>`}
  ${t.semifinalists.length?`<section class="sh-qualifiers"><div class="sh-overview-title"><div><span class="sh-eyebrow">EL SIGUIENTE NIVEL</span><h2>LAS ESTRELLAS QUE AVANZAN<span>.</span></h2></div><span class="sh-count-pill">9 clasificados + 1 Wild Card</span></div>${showdownPeople([...t.semifinalists,t.wildcard].filter(Boolean))}<p class="sh-wildcard-caption">✦ Esteban regresa como Wild Card en el episodio 10.</p></section>`:''}`;
}
function showdownDuel(duel,index,final=false){
 const status=(duel.noWinner?'Sin ganador':duel.winner?`${showdownName(duel.winner)} gana el duelo`:'Resultado por confirmar')+(duel.eliminated?` · Eliminado: ${showdownName(duel.eliminated)}`:'');
 return `<article class="sh-duel"><div class="sh-duel-label"><span>${final?'DUELO '+String(index+1).padStart(2,'0'):'VERSUS'}</span><span>${duel.people.length>2?'TRIPLE DUELO':'FRENTE A FRENTE'}</span></div><div class="sh-duel-faces ${duel.people.length>2?'sh-triple':''}">${duel.people.map((name,i)=>`${i?'<span class="sh-vs" aria-hidden="true">VS</span>':''}<div class="sh-duelist ${name===duel.winner?'is-winner':''}" data-contender="${esc(name)}">${showdownAvatar(name)}<strong>${esc(showdownName(name))}</strong><div class="sh-duel-status">${name===duel.winner?'<span class="sh-duel-badge">✦ Ganador del Versus</span>':''}${name===duel.eliminated?'<span class="sh-duel-badge sh-out-badge">Eliminado de la final</span>':''}</div></div>`).join('')}</div><p class="sh-duel-result ${duel.winner?'has-winner':''}">${duel.winner?'<span aria-hidden="true">✦</span> ':''}${esc(status)}</p></article>`;
}
function showdownVoteList(votes,label='THE X VOTE'){
 return `<section class="sh-vote-section"><div class="sh-subhead"><div><span class="sh-eyebrow">${label==='THE X VOTE'?'EL PODER DEL GRUPO':'LAS DECISIONES DEL BRACKET'}</span><h3>${label}</h3></div><span class="sh-vote-icon" aria-hidden="true">✦</span></div><div class="sh-vote-list">${votes.map(vote=>`<div class="sh-vote-row"><div class="sh-voter">${showdownAvatar(vote.from)}<strong>${esc(showdownName(vote.from))}</strong></div><span class="sh-vote-arrow" aria-label="votó por">→</span>${vote.to?`<span class="sh-vote-target">${showdownAvatar(vote.to)}<strong>${esc(showdownName(vote.to))}</strong></span>`:'<span class="sh-no-vote">No otorgó estrella</span>'}</div>`).join('')}</div></section>`;
}
function showdownEpisodeDetail(ep){
 const t=seasonView.record.tournament,group=t.groups.find(g=>g.id===ep.bracket),final=ep.phase==='final',phase=ep.phase==='fase-2'?'FASE 2':'SEMIFINALES';
 const advanced=final?t.finalists:ep.number===10?[...t.semifinalists,t.wildcard].filter(Boolean):[];
 const exits=ep.eliminated?.length?`<section class="sh-eliminations"><div class="sh-subhead"><div><span class="sh-eyebrow">${group?'AL CIERRE DEL BRACKET':'FIN DEL RECORRIDO'}</span><h3>ELIMINADOS</h3></div><span>${ep.eliminated.length}</span></div>${showdownPeople(ep.eliminated,'sh-people-compact')}</section>`:'';
 const special=ep.wildcard?`<div class="sh-event sh-wildcard"><span aria-hidden="true">✦</span>${showdownAvatar('Esteban')}<div><small>WILD CARD</small><strong>Esteban vuelve al juego.</strong><p>Se une a los nueve semifinalistas.</p></div></div>`:ep.quit?`<div class="sh-event sh-quit"><span aria-hidden="true">↗</span><div class="sh-event-people">${ep.quit.map(name=>showdownAvatar(name)).join('')}</div><div><small>RENUNCIA</small><strong>${esc(ep.quit.join(', '))} abandona la competencia.</strong></div></div>`:'';
 const side=ep.votes?showdownVoteList(ep.votes):exits||special;
 return `<article class="sh-episode-detail" id="showdownEpisodeDetail" style="--group:${group?.color||'#ffd077'}"><header class="sh-episode-heading"><span class="sh-episode-big-number" aria-hidden="true">${String(ep.number).padStart(2,'0')}</span><div><div class="sh-episode-meta"><span>EPISODIO ${String(ep.number).padStart(2,'0')}</span><span>${group?'BRACKET '+group.name.toUpperCase():final?'LA GRAN FINAL':phase}</span>${ep.status==='upcoming'?'<span class="sh-pending">Por hacerse</span>':''}</div><h3>${esc(ep.challenge)}</h3></div><span class="sh-episode-heading-star" aria-hidden="true">✦</span></header>
  <div class="sh-episode-main ${side?'has-side':''} ${final?'is-final':''}"><div class="sh-episode-contest">${ep.duels?.length?`<div class="sh-duels">${ep.duels.map((duel,i)=>showdownDuel(duel,i,final)).join('')}</div>`:`<div class="sh-no-results"><span aria-hidden="true">✦</span><h3>${ep.status==='upcoming'?'EL GRAN CIERRE<br>ESTÁ POR LLEGAR.':'LA HISTORIA<br>CONTINÚA.'}</h3><p>${ep.status==='upcoming'?'La final todavía está por hacerse.':'Los resultados de este episodio se completarán próximamente.'}</p></div>`}</div>${side?`<aside class="sh-episode-side" aria-label="${ep.votes?'Votos del episodio':'Momentos del episodio'}">${side}</aside>`:''}</div>
  ${ep.votes&&exits?exits:''}${!side&&special?special:''}
  ${ep.champion?`<div class="sh-final-winner"><span aria-hidden="true">✦</span><div><small>GANADOR DE SHOWDOWN</small><strong>${esc(ep.champion)}</strong></div><span class="sh-winner-word" aria-hidden="true">WINNER</span></div>`:''}
  ${advanced.length?`<section class="sh-stage-cast"><div class="sh-subhead"><div><span class="sh-eyebrow">${final?'EL ÚLTIMO ESCENARIO':'UNA NUEVA FASE'}</span><h4>${final?'LOS FINALISTAS':'QUIENES AVANZARON'}</h4></div><span>${advanced.length} participantes</span></div>${showdownPeople(advanced,'sh-people-compact')}</section>`:''}
  <nav class="sh-episode-paging" aria-label="Cambiar episodio">${ep.number>1?`<button data-showdown-action="episode" data-episode="${ep.number-1}">← Episodio ${String(ep.number-1).padStart(2,'0')}</button>`:'<span></span>'}${ep.number<t.episodeCount?`<button data-showdown-action="episode" data-episode="${ep.number+1}">Episodio ${String(ep.number+1).padStart(2,'0')} →</button>`:'<span></span>'}</nav></article>`;
}
function showdownEpisodes(){
 const t=seasonView.record.tournament,selected=t.episodes.find(ep=>ep.number===showdownView.episode)||t.episodes[0];
 const sections=[...t.groups.map(group=>({id:group.id,label:group.name,color:group.color,episodes:t.episodes.filter(ep=>ep.bracket===group.id)})),{id:'fase-2',label:'Fase 2',color:'#e3a8cf',episodes:t.episodes.filter(ep=>ep.phase==='fase-2')},{id:'semifinales',label:'Semifinales',color:'#c7a4ee',episodes:t.episodes.filter(ep=>ep.phase==='semifinales')},{id:'final',label:'La final',color:'#ffd077',episodes:t.episodes.filter(ep=>ep.phase==='final')}].filter(section=>section.episodes.length);
 const active=selected.bracket||selected.phase;
 return `<div class="sh-episode-browser"><div class="sh-browser-header"><h2>LOS EPISODIOS<span>.</span></h2><span>${t.episodeCount} retos en el escenario</span></div><nav class="sh-phase-nav" aria-label="Fases de la temporada">${sections.map(section=>`<button style="--group:${section.color}" data-showdown-action="episode" data-episode="${section.episodes[0].number}" aria-pressed="${active===section.id}"><i></i>${section.label}<span>${section.episodes.length}</span></button>`).join('')}</nav><nav class="sh-episode-nav" aria-label="Elegir episodio">${sections.map(section=>`<div class="sh-episode-group" style="--group:${section.color}" ${section.id===active?'':'hidden'}><div>${section.episodes.map(ep=>`<button data-showdown-action="episode" data-episode="${ep.number}" aria-pressed="${ep.number===selected.number}" aria-controls="showdownEpisodeDetail"><span>${String(ep.number).padStart(2,'0')}</span><div><small>EPISODIO ${ep.number}</small><strong>${esc(ep.challenge)}</strong></div><i aria-hidden="true">↗</i></button>`).join('')}</div></div>`).join('')}</nav></div>${showdownEpisodeDetail(selected)}`;
}
function showdownVoteMatrix(group){
 const episodes=seasonView.record.tournament.episodes.filter(ep=>ep.bracket===group.id);
 return `<section class="sh-matrix-section"><div class="sh-subhead"><h3>THE X VOTE</h3><span>Quién le dio su estrella a quién.</span></div><div class="sh-table-scroll" tabindex="0" role="region" aria-label="Votos del bracket ${esc(group.name)}"><table class="sh-vote-matrix"><thead><tr><th scope="col">Participante</th>${episodes.map(ep=>`<th scope="col">Ep. ${String(ep.number).padStart(2,'0')}</th>`).join('')}</tr></thead><tbody>${group.people.map(name=>`<tr><th scope="row">${esc(showdownName(name))}</th>${episodes.map(ep=>{const vote=ep.votes.find(vote=>vote.from===name);return `<td>${vote?esc(vote.to?showdownName(vote.to):'Nadie'):'<span class="sh-top-two">Top 2</span>'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function showdownBracketDetail(group){
 const r=seasonView.record,first=r.number===1,rows=showdownScores(group).sort((a,b)=>(b.total??-1)-(a.total??-1));
 const episodes=group.episodes.map(number=>r.tournament.episodes[number-1]);
 return `<section class="sh-bracket" style="--group:${group.color}"><header class="sh-bracket-heading"><div><span class="sh-eyebrow">EPISODIOS ${String(group.episodes[0]).padStart(2,'0')}—${String(group.episodes.at(-1)).padStart(2,'0')}</span><h3>BRACKET <em>${esc(group.name.toUpperCase())}</em></h3></div><span class="sh-bracket-status">${group.status==='partial'?'Por completar':first?'Resultados del bracket':'Estrellas finales'}</span></header>
  <div class="sh-bracket-body"><section class="sh-score-panel" aria-label="Estrellas de ${esc(group.name)}"><div class="sh-standings-head"><span>${group.people.length} PARTICIPANTES</span><span>ESTRELLAS</span></div><div class="sh-standings">${rows.map((row,i)=>`<div class="sh-standing"><span class="sh-standing-position">${row.total===null?'—':String(rows.findIndex(other=>other.total===row.total)+1).padStart(2,'0')}</span>${showdownAvatar(row.name)}<div class="sh-standing-name"><strong>${esc(showdownName(row.name))}</strong>${group.advanced?.includes(row.name)?'<small class="sh-qualified">Clasifica a semifinales ↗</small>':group.eliminated?.includes(row.name)?'<small>Eliminado del bracket</small>':''}</div><strong class="sh-total" aria-label="${row.total===null?'Estrellas por confirmar':row.total+' estrellas'}"><span aria-hidden="true">✦</span> ${row.total===null?'—':row.total}</strong></div>`).join('')}</div>${first?'<p class="sh-score-legend">✦ Top 2 + Versus + The X Vote</p>':!group.stars?'<p class="sh-score-legend">Las estrellas finales se añadirán próximamente.</p>':''}</section>
  <section class="sh-bracket-rounds" aria-label="Retos y duelos del bracket">${episodes.map((ep,i)=>showdownRoundCard(ep,first?ep.duels?.[0]:group.duels?.[i])).join('')}${group.verdict?`<section class="sh-verdict"><span class="sh-eyebrow">THE X VERDICT</span><h3>LA DECISIÓN DE BONJU.</h3><p>Empate entre ${group.verdict.people.map(name=>esc(showdownName(name))).join(' y ')}.</p><strong>Avanza ${esc(group.verdict.advanced)} ${icon('arrow')}</strong></section>`:''}</section></div>
  ${first?showdownVoteMatrix(group):group.reveal?showdownVoteList(group.reveal,'THE X REVEAL'):''}
  ${first?`<div class="sh-advance-strip"><span>AVANZAN A SEMIFINALES</span><div>${group.advanced.map(name=>`<span>${showdownAvatar(name)}<strong>${esc(showdownName(name))}</strong></span>`).join('')}</div></div>`:''}</section>`;
}
function showdownBrackets(){
 const t=seasonView.record.tournament,selected=t.groups.find(group=>group.id===showdownView.bracket)||t.groups[0];
 return `<div class="sh-browser-header"><h2>LOS BRACKETS<span>.</span></h2><span>El marcador de las estrellas</span></div><div class="sh-group-picker" role="group" aria-label="Elegir bracket">${t.groups.map((group,i)=>`<button style="--group:${group.color}" data-showdown-action="bracket" data-bracket="${group.id}" aria-pressed="${group.id===selected.id}"><span>0${i+1}</span><div><strong>${esc(group.name)}</strong><small>${group.people.length} participantes</small></div><div class="sh-picker-faces" aria-hidden="true">${group.people.slice(0,3).map(name=>`<img src="${esc(showdownPortrait(name))}" alt="" loading="lazy">`).join('')}</div></button>`).join('')}</div>${showdownBracketDetail(selected)}`;
}
function showdownSeasonPanel(){
 const {tab,record,item}=seasonView;
 if(tab==='resumen')return showdownOverview();
 if(tab==='episodios')return showdownEpisodes();
 if(tab==='brackets')return showdownBrackets();
 if(tab==='participantes')return `${showdownSection('LAS ESTRELLAS DE LA TEMPORADA','El elenco de '+item.name+'.','Conoce a quienes se subieron al escenario.')}<label class="search-field ch-person-search sh-cast-search">${icon('search')}<input id="seasonParticipantSearch" type="search" placeholder="Buscar participante…" aria-label="Buscar participante"></label><div class="ch-participants-grid">${record.participants.map(seasonParticipantCard).join('')}</div><p id="seasonParticipantEmpty" class="ch-empty" hidden>No encontramos a ese participante.</p>`;
 return `${showdownSection('EL ARCHIVO DEL TORNEO','Track record.','La tabla original de la temporada. Amplía la imagen para consultar cada resultado.')} ${seasonTrackViewer(record)}<div class="ch-track-caption"><span>${esc(item.name)} · ${record.year}</span><span>Puedes ampliar y desplazar la tabla.</span></div>`;
}
function showdownSelect(action,button){
 const t=seasonView.record?.tournament;if(!t)return;
 if(action==='episode'||action==='open-episode'){
  const number=Number(button.dataset.episode);if(!t.episodes.some(ep=>ep.number===number))return;
  showdownView.episode=number;
  if(seasonView.tab!=='episodios')switchSeasonTab('episodios');else $('#seasonPanel').innerHTML=showdownSeasonPanel();
  history.replaceState(null,'','#temporada/'+seasonView.id+'/episodios/'+number);
  if(action==='episode'){
   const selected=$(`.sh-episode-nav [data-episode="${number}"]`);selected?.focus({preventScroll:true});
   if(button.closest?.('.sh-episode-paging'))$('#showdownEpisodeDetail')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
 }else if(action==='bracket'||action==='open-bracket'){
  const id=button.dataset.bracket;if(!t.groups.some(group=>group.id===id))return;
  showdownView.bracket=id;
  if(seasonView.tab!=='brackets')switchSeasonTab('brackets');else $('#seasonPanel').innerHTML=showdownSeasonPanel();
  history.replaceState(null,'','#temporada/'+seasonView.id+'/brackets/'+id);
  $(`.sh-group-picker [data-bracket="${id}"]`)?.focus({preventScroll:true});
 }
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-showdown-action]');if(button&&seasonView.record?.franchise==='Showdown')showdownSelect(button.dataset.showdownAction,button);});
document.addEventListener('keydown',event=>{
 if(!event.target.matches('.sh-episode-nav [data-episode]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 event.preventDefault();const count=seasonView.record.tournament.episodeCount,current=Number(event.target.dataset.episode),next=event.key==='Home'?1:event.key==='End'?count:Math.max(1,Math.min(count,current+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)));
 showdownSelect('episode',{dataset:{episode:String(next)}});
});

function showdownRoundCard(ep,duel){
 return `<article class="sh-round-card"><button class="sh-round-title" data-showdown-action="open-episode" data-episode="${ep.number}"><span>EP. ${String(ep.number).padStart(2,'0')}</span><h4>${esc(ep.challenge)}</h4>${icon('arrow')}</button>${duel?`<div class="sh-round-match">${duel.people.map((name,i)=>`${i?'<i aria-hidden="true">VS</i>':''}<div class="${duel.winner===name?'is-winner':''}">${showdownAvatar(name)}<strong>${esc(showdownName(name))}</strong>${duel.winner===name?'<small>✦ Gana el Versus</small>':''}</div>`).join('')}</div>${duel.noWinner?'<p class="sh-round-no-winner">Sin ganador</p>':''}`:'<p class="sh-round-pending">Resultados por completar</p>'}</article>`;
}
