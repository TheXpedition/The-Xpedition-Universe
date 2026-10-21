'use strict';
// Extend the existing Simuladores and Moderación views without changing their catalogs.
const closedArcade={id:'ice-breaker',name:'Antarctica — Ice Breaker',character:'Dani',url:'/simulator/ice-breaker/',cover:'/arcade/ice-breaker-cover.webp',publicEnabled:false,canPlay:false};
let arcadeRender=0;
function arcadeCard(game,moderation=false){
 const status=game.publicEnabled?'Abierto al público':'Cerrado · solo staff';
 return `<article class="arcade-card" data-arcade-id="${esc(game.id)}"><div class="arcade-art" style="background-image:url('${esc(game.cover)}')"><span class="arcade-status ${game.publicEnabled?'open':''}">${icon(game.publicEnabled?'game':'lock')} ${status}</span><div class="arcade-game-logo"><small>THE XPEDITION / ANTARCTICA</small><strong>ICE<br><em>BREAKER</em></strong><span>EL HIELO TIENE OTROS PLANES.</span></div></div><div class="arcade-copy"><span class="arcade-eyebrow">JUEGO DE AVENTURA · PRUEBA JUGABLE</span><h2>Un salto.<br>Y otro problema.</h2><p>Acompaña a Dani al otro lado del hielo. Recupera las balizas entre ramales de hielo, esquiva las cargas y vuelve a la base antes de que la marea te alcance.</p><div class="arcade-features"><span>Clic o toque</span><span>Teclado</span><span>9 niveles · 3 capítulos</span><span>Tickets al completar</span></div><div class="arcade-actions">${game.canPlay?`<a class="btn primary" href="${esc(game.url)}">${game.staffPreview?'Probar como staff':'Jugar Ice Breaker'} ${icon('arrow')}</a>`:`<button class="btn secondary" disabled>${icon('lock')} Cerrado al público</button>`}${moderation?`<button class="btn ${game.publicEnabled?'secondary':'primary'}" data-arcade="toggle" data-id="${esc(game.id)}" data-enabled="${game.publicEnabled}">${game.publicEnabled?'Cerrar al público':'Abrir al público'}</button>`:''}</div><p class="arcade-access-note">${game.publicEnabled?'La expedición está disponible para todos.':moderation?'Solo el staff puede entrar. Abrirlo habilita el acceso público de inmediato.':'El staff está preparando esta expedición. Pronto habrá novedades.'}</p></div></article>`;
}
const originalArcadeSimulators=renderSimulators;
renderSimulators=function(){
 originalArcadeSimulators();const serial=++arcadeRender;
 $('#main').insertAdjacentHTML('beforeend',`<section class="arcade-section" aria-labelledby="arcadeTitle"><div class="section-head"><div><div class="arcade-eyebrow">OTRA FORMA DE VIVIR THE XPEDITION</div><h2 id="arcadeTitle">Entra en la aventura.</h2><p>Explora, salta y acompaña a nuestros personajes.</p></div></div><div id="arcadeGames">${arcadeCard(closedArcade)}</div></section>`);
 fetch('/api/arcade/games',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(({games})=>{if(serial!==arcadeRender||state.route!=='simuladores'||!$('#arcadeGames'))return;$('#arcadeGames').innerHTML=games.map(g=>arcadeCard(g)).join('');}).catch(()=>{});
};
moderationTabs.splice(moderationTabs.findIndex(([id])=>id==='history'),0,['games','Juegos']);
const originalArcadeModerationBody=loadModerationBody;
loadModerationBody=async function(){
 if(moderationView.tab!=='games')return originalArcadeModerationBody();
 const root=$('#moderationBody');if(!root||!state.user?.staff||state.route!=='moderacion')return;
 const serial=++moderationView.serial;root.innerHTML='<div class="mod-loading">Cargando los juegos y sus permisos…</div>';
 try{const {games}=await api('/moderation/games');if(serial!==moderationView.serial||!root.isConnected)return;
  root.innerHTML='<div class="mod-section-title"><div><h2>La próxima aventura, bajo tu control.</h2><p>Cada juego tiene su propio acceso. Las pruebas nuevas empiezan cerradas al público.</p></div></div>'+games.map(g=>arcadeCard(g,true)).join('');
 }catch(error){if(serial===moderationView.serial&&root.isConnected)root.innerHTML=`<div class="mod-panel"><p class="form-error">${esc(error.message)}</p><button class="btn secondary" data-mod="retry">Volver a intentar</button></div>`;}
};
document.addEventListener('click',async event=>{const b=event.target.closest('[data-arcade="toggle"]');if(!b||!state.user?.staff)return;event.preventDefault();b.disabled=true;
 try{const {game}=await api('/moderation/games/'+encodeURIComponent(b.dataset.id),{method:'PUT',body:{publicEnabled:b.dataset.enabled!=='true'}});if(state.route==='moderacion'&&moderationView.tab==='games')await loadModerationBody();toast(game.publicEnabled?'Ice Breaker ya está abierto al público.':'Ice Breaker quedó cerrado. Solo el staff puede entrar.');}
 catch(error){toast(error.message,true);if(b.isConnected)b.disabled=false;}
});
const originalArcadeStartStream=startStream;
startStream=function(){originalArcadeStartStream();state.stream?.addEventListener('arcade-access',()=>{if(state.route==='simuladores')renderSimulators();if(state.route==='moderacion'&&moderationView.tab==='games')void loadModerationBody();});};
