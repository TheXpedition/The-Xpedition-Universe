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
  <nav class="sh-topline" aria-label="Temporadas de Showdown"><a href="#explorar/showdown">${icon('back')} Showdown</a><div>${siblings.map(sibling=>`<a href="#temporada/${esc(sibling.id)}" ${sibling.id===id?'aria-current="page"':''}>Temporada ${sibling.id==='safari-showdown'?'01':'02'}</a>`).join('')}</div></nav>
  <header class="sh-hero" aria-labelledby="seasonPageTitle"><div class="sh-hero-image"><img src="${esc(record.poster)}" alt="Bonju presenta ${esc(item.name)}" fetchpriority="high"></div><div class="sh-hero-grid" aria-hidden="true"></div><div class="sh-hero-copy"><div class="sh-eyebrow"><span class="sh-spark" aria-hidden="true">✦</span> EL TORNEO DE ESTRELLAS <span class="sh-edition">${record.year}</span></div><h1 id="seasonPageTitle" class="sr-only">${esc(item.name)}</h1>${brandArt(item,'sh-logo')}<div class="sh-hero-caption"><span>TEMPORADA ${String(record.number).padStart(2,'0')}</span><i></i><span>${record.number===1?'SAFARI ALL STARS':'THE TRAITOR ALL STARS'}</span></div><h2>${record.number===1?'Cada estrella cuenta.':'El escenario vuelve a encenderse.'}</h2><p>${record.number===1?'Tres brackets, duelos frente a frente y un solo título. Sigue el camino de las estrellas de Safari hasta la gran final.':'Las estrellas de The Traitor regresan. Nuevos brackets, nuevos retos y decisiones que cambian el torneo.'}</p><div class="sh-host">${showdownAvatar('Bonju')}<span>UN TORNEO PRESENTADO POR<strong>${castNames(['Bonju'])}</strong></span></div><div class="sh-hero-actions"><button class="btn primary" data-season-action="tab" data-tab="episodios">Explorar episodios ${icon('arrow')}</button><button class="hero-save ${saved(id)?'saved':''}" data-action="save" data-id="${esc(id)}" aria-label="${saved(id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(id)}">${icon(saved(id)?'check':'plus')}</button></div></div><div class="sh-hero-side" aria-hidden="true"><span>✦</span>EL ESCENARIO<br>ES DE LAS ESTRELLAS</div><div class="sh-hero-stats"><div><strong>${record.number===1?'18':'27'}</strong><span>COMPETIDORES</span></div><div><strong>03</strong><span>BRACKETS</span></div><div><strong>${t.episodeCount}</strong><span>EPISODIOS</span></div><div><strong>01</strong><span>TÍTULO EN JUEGO</span></div></div></header>
  <div class="ch-tabs sh-tabs" role="tablist" aria-label="Contenido de ${esc(item.name)}">${showdownSeasonTabs().map(([key,label],i)=>`<button role="tab" id="season-tab-${key}" aria-controls="seasonPanel" aria-selected="${key===seasonView.tab}" tabindex="${key===seasonView.tab?0:-1}" data-season-action="tab" data-tab="${key}"><span aria-hidden="true">0${i+1}</span>${label}</button>`).join('')}</div>
  <section id="seasonPanel" class="ch-panel sh-panel" role="tabpanel" aria-labelledby="season-tab-${seasonView.tab}" tabindex="0">${showdownSeasonPanel()}</section>
  <footer class="sh-footer"><span aria-hidden="true">✦</span><p>UN ESCENARIO. MUCHAS ESTRELLAS.</p><a href="#temporada/${id==='safari-showdown'?'traitor-showdown':'safari-showdown'}">Explorar la temporada ${record.number===1?'02':'01'} ${icon('arrow')}</a></footer></div>`;
}
function showdownGroupCards(){
 const t=seasonView.record.tournament;
 return `<div class="sh-group-cards">${t.groups.map((group,i)=>`<button class="sh-group-card" style="--group:${group.color}" data-showdown-action="open-bracket" data-bracket="${group.id}"><div class="sh-card-top"><span>BRACKET 0${i+1}</span><span>${icon('arrow')}</span></div><h3>${esc(group.name)}</h3><div class="sh-avatar-stack">${group.people.slice(0,5).map(name=>`<img src="${esc(showdownPortrait(name))}" alt="" loading="lazy">`).join('')}<span>+${group.people.length-5}</span></div><p>${group.people.length} participantes <span>·</span> Ep. ${group.episodes[0]}—${group.episodes.at(-1)}</p><div class="sh-group-card-bottom">${group.advanced?'Ver clasificación':'Explorar el bracket'}<span aria-hidden="true">↗</span></div></button>`).join('')}</div>`;
}
function showdownOverview(){
 const r=seasonView.record,t=r.tournament;
 return `${showdownSection('EL RECORRIDO','De los brackets al título.',r.number===1?'Dieciséis episodios para llegar al último duelo.':'Tres grupos abren una nueva temporada de competencia.')}
  <div class="sh-stages"><button data-showdown-action="open-episode" data-episode="1"><span>01</span><div><small>EPISODIOS 01—09</small><strong>Brackets</strong><p>${r.number===1?'Rojo · Amarillo · Verde':'Naranja · Rosa · Morado'}</p></div>${icon('arrow')}</button><button data-showdown-action="open-episode" data-episode="10"><span>02</span><div><small>EPISODIOS 10—${r.number===1?'15':'19'}</small><strong>${r.number===1?'Semifinales':'La siguiente fase'}</strong><p>${r.number===1?'Una Wild Card cambia el juego.':'Fase 2 y semifinales.'}</p></div>${icon('arrow')}</button><button data-showdown-action="open-episode" data-episode="${t.episodeCount}"><span>03</span><div><small>EPISODIO ${t.episodeCount}</small><strong>La gran final</strong><p>${t.champion?'El duelo por el título.':'Próximamente en el escenario.'}</p></div>${icon('arrow')}</button></div>
  ${showdownSection('TRES COLORES. UN MISMO OBJETIVO.','Conoce los brackets.')} ${showdownGroupCards()}
  ${r.number===1?`<div class="sh-rule-section">${showdownSection('ASÍ SE JUEGA','El poder de una estrella.')}<div class="sh-rules"><article><span>✦ ✦</span><strong>El Top 2</strong><p>Los dos mejores de cada reto reciben <b>dos estrellas</b> y se enfrentan en un duelo.</p></article><article><span>VS <i>+✦</i></span><strong>El Versus</strong><p>Ganar el duelo significa sumar <b>una estrella extra</b> a tu marcador.</p></article><article><span>THE X VOTE</span><strong>Los demás deciden</strong><p>El resto del bracket otorga <b>una estrella a otra persona</b>. Cada voto puede cambiarlo todo.</p></article></div></div>`:`<div class="sh-season-note"><span aria-hidden="true">✦</span><div><strong>La historia sigue en juego.</strong><p>Ya puedes explorar los 20 retos y los tres brackets. Los resultados se completan a medida que avanza la temporada.</p></div></div>`}
  ${t.champion?`<section class="sh-champion"><div class="sh-champion-portrait">${showdownAvatar(t.champion)}<span aria-hidden="true">✦</span></div><div><span class="sh-eyebrow">LA ESTRELLA DE LA TEMPORADA</span><h2>${esc(t.champion)}</h2><p>Ganador de Showdown · ${r.year}</p><button class="link-button" data-showdown-action="open-episode" data-episode="16">Revive la final ${icon('arrow')}</button></div><strong class="sh-champion-word" aria-hidden="true">WINNER</strong></section>`:''}
  ${t.semifinalists.length?`<section class="sh-qualifiers">${showdownSection('EL SIGUIENTE ESCENARIO','A semifinales.',`${t.semifinalists.length} clasificados de los brackets y el regreso de Esteban como Wild Card en el episodio 10.`)}${showdownPeople([...t.semifinalists,t.wildcard].filter(Boolean))}</section>`:''}`;
}
function showdownDuel(duel,index,final=false){
 const status=(duel.noWinner?'Sin ganador':duel.winner?`${showdownName(duel.winner)} gana el duelo`:'Resultado por confirmar')+(duel.eliminated?` · Eliminado: ${showdownName(duel.eliminated)}`:'');
 return `<article class="sh-duel"><div class="sh-duel-label"><span>${final?'DUELO '+String(index+1).padStart(2,'0'):'VERSUS'}</span><span>${duel.people.length>2?'TRIPLE DUELO':'FRENTE A FRENTE'}</span></div><div class="sh-duel-faces ${duel.people.length>2?'sh-triple':''}">${duel.people.map((name,i)=>`${i?'<span class="sh-vs" aria-hidden="true">VS</span>':''}<div class="sh-duelist ${name===duel.winner?'is-winner':''}">${showdownAvatar(name)}<strong>${esc(showdownName(name))}</strong>${name===duel.winner?'<span class="sh-duel-badge">✦ Ganador del Versus</span>':''}${name===duel.eliminated?'<span class="sh-duel-badge sh-out-badge">Eliminado de la final</span>':''}</div>`).join('')}</div><p class="sh-duel-result ${duel.winner?'has-winner':''}">${duel.winner?'<span aria-hidden="true">✦</span> ':''}${esc(status)}</p></article>`;
}
function showdownVoteList(votes,label='THE X VOTE'){
 return `<section class="sh-vote-section"><div class="sh-subhead"><h3>${label}</h3><span>${label==='THE X VOTE'?'Una decisión, una estrella.':'Las decisiones del bracket.'}</span></div><div class="sh-vote-list">${votes.map(vote=>`<div>${showdownAvatar(vote.from)}<strong>${esc(showdownName(vote.from))}</strong><span class="sh-vote-arrow" aria-label="votó por">→</span>${vote.to?`<span class="sh-vote-target">${esc(showdownName(vote.to))}</span>`:'<span class="sh-no-vote">No otorgó estrella</span>'}</div>`).join('')}</div></section>`;
}
function showdownEpisodeDetail(ep){
 const t=seasonView.record.tournament,group=t.groups.find(g=>g.id===ep.bracket),final=ep.phase==='final',phase=ep.phase==='fase-2'?'FASE 2':'SEMIFINALES';
 const advanced=final?t.finalists:ep.number===10?[...t.semifinalists,t.wildcard].filter(Boolean):[];
 return `<article class="sh-episode-detail" id="showdownEpisodeDetail" style="--group:${group?.color||'#e9c879'}"><header class="sh-episode-heading"><div class="sh-episode-meta"><span>EPISODIO ${String(ep.number).padStart(2,'0')}</span><span>${group?'BRACKET '+group.name.toUpperCase():final?'LA GRAN FINAL':phase}</span>${ep.status==='upcoming'?'<span class="sh-pending">Por hacerse</span>':''}</div><h3>${esc(ep.challenge)}</h3><p>${group?'Tres retos. Cada estrella abre el camino.':final?'El último escenario. Un solo título.':'El torneo entra en su siguiente fase.'}</p></header>
  ${advanced.length?`<section class="sh-stage-cast"><div class="sh-subhead"><h4>${final?'LOS FINALISTAS':'QUIENES AVANZARON'}</h4><span>${advanced.length} estrellas en competencia</span></div>${showdownPeople(advanced,'sh-people-compact')}</section>`:''}
  ${ep.wildcard?`<div class="sh-event sh-wildcard"><span aria-hidden="true">✦</span><div><small>WILD CARD</small><strong>${esc(ep.wildcard.join(', '))} vuelve a la competencia</strong><p>Elegido para unirse a los semifinalistas.</p></div></div>`:''}
  ${ep.duels?.length?`<div class="sh-duels">${ep.duels.map((duel,i)=>showdownDuel(duel,i,final)).join('')}</div>`:`<div class="sh-no-results"><span aria-hidden="true">✦</span><strong>${ep.status==='upcoming'?'El escenario espera su gran final.':'El reto ya tiene nombre.'}</strong><p>${ep.status==='upcoming'?'La final todavía está por hacerse.':'Los duelos y resultados de este episodio se añadirán próximamente.'}</p></div>`}
  ${ep.votes?showdownVoteList(ep.votes):''}
  ${ep.quit?`<div class="sh-event"><span aria-hidden="true">↗</span><div><small>RENUNCIA</small><strong>${esc(ep.quit.join(', '))} abandona la competencia</strong></div></div>`:''}
  ${ep.eliminated?.length?`<section class="sh-eliminations"><div class="sh-subhead"><h3>${group?'AL CIERRE DEL BRACKET':'SALEN DE LA COMPETENCIA'}</h3><span>${ep.eliminated.length} eliminados</span></div>${showdownPeople(ep.eliminated,'sh-people-compact')}</section>`:''}
  ${ep.champion?`<div class="sh-final-winner"><span aria-hidden="true">✦</span><small>GANADOR DE SHOWDOWN</small><strong>${esc(ep.champion)}</strong><p>El título tiene dueño.</p></div>`:''}
  <nav class="sh-episode-paging" aria-label="Cambiar episodio">${ep.number>1?`<button data-showdown-action="episode" data-episode="${ep.number-1}">← Episodio ${String(ep.number-1).padStart(2,'0')}</button>`:'<span></span>'}${ep.number<t.episodeCount?`<button data-showdown-action="episode" data-episode="${ep.number+1}">Episodio ${String(ep.number+1).padStart(2,'0')} →</button>`:'<span></span>'}</nav></article>`;
}
function showdownEpisodes(){
 const t=seasonView.record.tournament,selected=t.episodes.find(ep=>ep.number===showdownView.episode)||t.episodes[0];
 const sections=[...t.groups.map(group=>({label:'BRACKET '+group.name.toUpperCase(),color:group.color,episodes:t.episodes.filter(ep=>ep.bracket===group.id)})),{label:'FASE 2',color:'#d9a4bd',episodes:t.episodes.filter(ep=>ep.phase==='fase-2')},{label:'SEMIFINALES',color:'#c9a8e5',episodes:t.episodes.filter(ep=>ep.phase==='semifinales')},{label:'LA FINAL',color:'#e9c879',episodes:t.episodes.filter(ep=>ep.phase==='final')}].filter(section=>section.episodes.length);
 return `${showdownSection('EL TORNEO, EPISODIO A EPISODIO','Dentro del escenario.','Elige un episodio para explorar su reto y lo que sucedió en la competencia.')}<div class="sh-episode-layout"><nav class="sh-episode-nav" aria-label="Elegir episodio">${sections.map(section=>`<div class="sh-episode-group" style="--group:${section.color}"><h3><i></i>${section.label}</h3><div>${section.episodes.map(ep=>`<button data-showdown-action="episode" data-episode="${ep.number}" aria-pressed="${ep.number===selected.number}" aria-controls="showdownEpisodeDetail"><span>${String(ep.number).padStart(2,'0')}</span><strong>${esc(ep.challenge)}</strong>${ep.number===selected.number?'<i aria-hidden="true">✦</i>':''}</button>`).join('')}</div></div>`).join('')}</nav>${showdownEpisodeDetail(selected)}</div>`;
}
function showdownVoteMatrix(group){
 const episodes=seasonView.record.tournament.episodes.filter(ep=>ep.bracket===group.id);
 return `<section class="sh-matrix-section"><div class="sh-subhead"><h3>THE X VOTE</h3><span>Quién le dio su estrella a quién.</span></div><div class="sh-table-scroll" tabindex="0" role="region" aria-label="Votos del bracket ${esc(group.name)}"><table class="sh-vote-matrix"><thead><tr><th scope="col">Participante</th>${episodes.map(ep=>`<th scope="col">Ep. ${String(ep.number).padStart(2,'0')}</th>`).join('')}</tr></thead><tbody>${group.people.map(name=>`<tr><th scope="row">${esc(showdownName(name))}</th>${episodes.map(ep=>{const vote=ep.votes.find(vote=>vote.from===name);return `<td>${vote?esc(vote.to?showdownName(vote.to):'Nadie'):'<span class="sh-top-two">Top 2</span>'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function showdownBracketDetail(group){
 const r=seasonView.record,first=r.number===1,rows=showdownScores(group).sort((a,b)=>(b.total??-1)-(a.total??-1));
 return `<section class="sh-bracket" style="--group:${group.color}"><header class="sh-bracket-heading"><div><span class="sh-eyebrow">EPISODIOS ${String(group.episodes[0]).padStart(2,'0')}—${String(group.episodes.at(-1)).padStart(2,'0')}</span><h3>Bracket <em>${esc(group.name)}</em></h3><p>${group.people.length} participantes${first?' · Clasificación al cierre del bracket':group.stars?' · Estrellas finales':' · El torneo sigue en juego'}</p></div><span class="sh-bracket-symbol" aria-hidden="true">✦</span></header>
  <div class="sh-standings"><div class="sh-standings-head"><span>PARTICIPANTE</span>${first?'<span class="sh-score-breakdown">TOP 2 / DUELO / VOTOS</span>':''}<span>ESTRELLAS</span></div>${rows.map((row,i)=>`<div class="sh-standing"><span class="sh-standing-position">${String(i+1).padStart(2,'0')}</span>${showdownAvatar(row.name)}<div class="sh-standing-name"><strong>${esc(showdownName(row.name))}</strong>${group.advanced?.includes(row.name)?'<small class="sh-qualified">Clasifica a semifinales</small>':group.eliminated?.includes(row.name)?'<small>Eliminado del bracket</small>':''}</div>${first?`<span class="sh-score-breakdown" aria-label="${row.top} estrellas por Top 2, ${row.duel} por duelos y ${row.votes} por votos">${row.top}<i>/</i>${row.duel}<i>/</i>${row.votes}</span>`:''}<strong class="sh-total" aria-label="${row.total===null?'Estrellas por confirmar':row.total+' estrellas'}"><span aria-hidden="true">✦</span> ${row.total===null?'—':row.total}</strong></div>`).join('')}</div>
  ${first?'<p class="sh-score-legend">El total suma las estrellas del Top 2, las victorias en Versus y las recibidas en The X Vote.</p>':!group.stars?'<p class="sh-score-legend">Las estrellas finales de este bracket se añadirán próximamente.</p>':''}
  <div class="sh-bracket-challenges"><h4>LOS RETOS DEL BRACKET</h4>${group.episodes.map(number=>{const ep=r.tournament.episodes[number-1];return `<button data-showdown-action="open-episode" data-episode="${number}"><span>${String(number).padStart(2,'0')}</span><strong>${esc(ep.challenge)}</strong>${icon('arrow')}</button>`;}).join('')}</div>
  ${group.duels?.length?`<section class="sh-bracket-versus"><div class="sh-subhead"><h3>LOS VERSUS</h3><span>Los duelos del bracket.</span></div><div class="sh-duels">${group.duels.map((duel,i)=>showdownDuel(duel,i)).join('')}</div></section>`:''}
  ${first?showdownVoteMatrix(group):group.reveal?showdownVoteList(group.reveal,'THE X REVEAL'):''}
  ${group.verdict?`<section class="sh-verdict"><div><span class="sh-eyebrow">THE X VERDICT</span><h3>La última palabra la tiene Bonju.</h3><p>Un empate entre ${group.verdict.people.map(name=>esc(showdownName(name))).join(' y ')}. Bonju rompe el empate.</p></div><div><span>AVANZA</span><strong>${esc(group.verdict.advanced)}</strong></div></section>`:''}
  ${first?`<div class="sh-advance-strip"><span>AVANZAN A SEMIFINALES</span><strong>${group.advanced.map(name=>esc(showdownName(name))).join(' <i>·</i> ')}</strong></div>`:''}</section>`;
}
function showdownBrackets(){
 const t=seasonView.record.tournament,selected=t.groups.find(group=>group.id===showdownView.bracket)||t.groups[0];
 return `${showdownSection('LAS ESTRELLAS SOBRE LA MESA','Tres brackets. Tres caminos.','Explora cada grupo, su marcador y las decisiones que cambian el torneo.')}<div class="sh-group-picker" role="group" aria-label="Elegir bracket">${t.groups.map((group,i)=>`<button style="--group:${group.color}" data-showdown-action="bracket" data-bracket="${group.id}" aria-pressed="${group.id===selected.id}"><span>0${i+1}</span><strong>${esc(group.name)}</strong><small>${group.people.length} participantes</small></button>`).join('')}</div>${showdownBracketDetail(selected)}`;
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
   if(window.matchMedia('(max-width: 850px)').matches)$('#showdownEpisodeDetail')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
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
 if(!event.target.matches('.sh-episode-nav [data-episode]')||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 event.preventDefault();const count=seasonView.record.tournament.episodeCount,current=Number(event.target.dataset.episode),next=event.key==='Home'?1:event.key==='End'?count:Math.max(1,Math.min(count,current+(event.key==='ArrowDown'?1:-1)));
 showdownSelect('episode',{dataset:{episode:String(next)}});
});
