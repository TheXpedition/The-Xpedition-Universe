'use strict';
window.addEventListener('DOMContentLoaded',()=>{
 const bridge=window.XPBridge,host=parent.XPSimulator,engine=window.XPState.engine;
 const call=(name,args=[])=>{const fn=window[name];if(typeof fn!=='function')throw new Error('Punto de control no disponible: '+name);return fn(...args);};
 window.XPEngine={setup(mode){if(engine==='game'){currentSeason=mode;pendingSeasonChoice=mode;if(mode==='world'){window.XPWorld.render.renderCast();return;}const s=document.getElementById('castSize');if(s)s.value=String(SEASON_CAST_SIZE[mode]||18);buildCastGrid();resetCastSelections();updateCastSlots();go(1);}else if(engine==='traitor'){initCastGrid();go('stage-1');}else{buildCastGrid();go(1);}},resume(name,args){
  if(name==='core:3'){resetEpisodeUI();go(3);updateChallengeAvailability();return;}
  if(name==='core:6'){buildTRTable();go(6);return;}
  call(name,args);
  if(name==='raceBuildPairs'){raceGo('race-pairs');return;}
  if(name==='raceRenderTrack'){raceGo('track');return;}
  const stage={build3TeamsBoard:2,build2TeamsBoard:'redis2',buildPurgeCastGrid:'purge',buildExpansionScreen15:'15-expansion',buildSwapScreen15:'15-swap',buildFinalistsScreen15:4,buildCruiseTeamsBoard:'cruise-teams',buildCruiseRedistribution:'cruise-redistribute',buildTR:'stage-6',renderTrackRecordTable:6,initTraitorsGrid:'stage-2'}[name];if(stage)go(stage);
 }};
 if(engine==='game'){
  const original=go;go=function(n){if(n===3||n===6||finalState?.winner)bridge.checkpoint(finalState?.winner?'core:6':'core:'+n);return original(n);};
  // A new cast must start a new cloud run, including restart buttons in the legacy views.
  for(const id of ['restartSim','restartBtn','raceRestartBtn','cruiseRestartBtn'])document.getElementById(id)?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();host.home();},true);
 }
 bridge.initialize();
 const cast=document.getElementById('castGrid');if(cast){const hint=document.createElement('p');hint.className='xp-engine-help';hint.innerHTML='Tu elenco disponible · <button type="button">Descubrir personajes en la tienda ↗</button>';hint.querySelector('button').onclick=()=>host.openShop('character');cast.insertAdjacentElement('afterend',hint);}
 const snapshot=host.restoreSnapshot;if(snapshot?.version===1&&snapshot.engine===engine){try{bridge.restore(snapshot);}catch(error){console.error('No se pudo restaurar el punto de control',error);host.toast('No se pudo abrir este punto de control. Tu guardado sigue en la cuenta; vuelve a cargar para intentarlo.',true);}}
 else if(host.run){window.XPEngine.setup(host.run.mode);bridge.setupCheckpoint();}
 if(host.readOnly){const bar=document.createElement('div');bar.className='xp-readonly';bar.textContent='Estás viendo una partida guardada.';const button=document.createElement('button');button.textContent='Volver al simulador';button.onclick=()=>parent.location.assign('/simulator/');bar.append(button);document.body.prepend(bar);document.addEventListener('click',e=>{if(e.target===button||e.target.closest('.xp-readonly'))return;const el=e.target.closest('button,select,input');if(el){e.preventDefault();e.stopImmediatePropagation();}},true);}
},{once:true});
