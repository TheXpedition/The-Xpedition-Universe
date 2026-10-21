'use strict';
// Solo keeps the original simulation, its three formats and manual choices.
// Only stable scenes are checkpointed; animation callbacks are never restored.
(()=>{
 const host=parent.ShowdownSoloHost;if(!host){location.replace('/#showdown');return;}
 let restoring=false,saveTimer,scene='';
 const vars=()=>({step,episode,advFormat,castSize,selected18,groups,groupColors,groupOrder,groupSize,top3EpisodeByGroup,stars,advanced:[...advanced],alive,activeSet:[...activeSet],eliminatedSet:[...eliminatedSet],trackData,finalRank,eliminationOrder,nextSemiRank,nextBracketRank,episodeDone,currentDistIndex,expansionTriggered,userWildcardChoice,regularWildcard,trEpisodeCount,usedSpotifyTrackIds:[...usedSpotifyTrackIds]});
 function snapshot(stage){return {version:1,stage,vars:vars(),cast:$$('#castGrid select').map(s=>s.value),distribution:$$('#distributionSlotsGrid select').map(s=>s.value)};}
 function save(stage){if(!restoring)void host.save(snapshot(stage));}
 function stableScene(){const stage=$('.stage.active')?.id;if(stage==='stage-1')return 'cast';if(stage==='stage-format')return 'format';if(stage==='stage-distribution')return 'distribution';if(stage==='stage-6')return Object.values(finalRank).includes(1)?'finished':'track';if(stage==='stage-3'&&$('#winnersBox').classList.contains('hide'))return 'episode';return null;}
 function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const stable=stableScene();if(stable)save(stable);},160);}
 function decorate(){
  if(typeof document==='undefined'||!document?.body)return;const active=$('.stage.active');if(!active)return;$('#nextBtn').style.display=active.id==='stage-1'?'':'none';
  const group=active.id==='stage-distribution'?groupOrder[currentDistIndex]:currentActiveGroup(episode),colors={Rosa:'#ff55b0',Dorado:'#f8cd64',Rojo:'#ff565c',Naranja:'#ff9746',Morado:'#ac72ff'};document.body.style.setProperty('--bracket',group?colors[group]:'#c184ff');
  document.body.dataset.scene=active.id;host.resize();
  if(scene!==active.id){scene=active.id;window.scrollTo?.({top:0,behavior:'smooth'});parent.ShowdownSoloHost?.resize();}
  if(active.id==='stage-3'&&episodeDone[episode])$('#runChallenge').disabled=true;
  for(const card of active.querySelectorAll('.odo-card'))if(!card.querySelector('img')){const name=card.querySelector('.odo-name').textContent,img=document.createElement('img');img.className='solo-mirror-avatar';loadImg(img,imgFor(name),name);card.prepend(img);}
 }
 const originalFormatSelection=goFormatSelection;goFormatSelection=function(){originalFormatSelection();$('input[name="advCount"][value="'+advFormat+'"]').checked=true;};
 const originalGo=go;go=function(n){originalGo(n);decorate();if(n===6)save(Object.values(finalRank).includes(1)?'finished':'track');else queueSave();};
 for(const [name,fn]of [['group',finalizeGroupEpisodeRegular],['star',finalizeStarSemiEpisode],['semi',finalizeSemiBtm2Selection],['allStars',finalizeAdv4EliminationDecision]]){
  const wrapped=(...args)=>{if(episodeDone[episode])return;const result=fn(...args);episodeDone[episode]=true;$('#runChallenge').disabled=true;decorate();return result;};
  if(name==='group')finalizeGroupEpisodeRegular=wrapped;if(name==='star')finalizeStarSemiEpisode=wrapped;if(name==='semi')finalizeSemiBtm2Selection=wrapped;if(name==='allStars')finalizeAdv4EliminationDecision=wrapped;
 }
 // One click reveals each mirror vote. Bots never require a network countdown.
 runNextMirrorVote=function(){if(currentMirrorIndex>=currentMirrorGivers.length){$('#mirrorText').textContent='Todas las estrellas fueron reveladas. Bonju tiene el resultado del bracket.';$('#mirrorContinueBtn').textContent='Ver el resultado del bracket →';return;}const giver=currentMirrorGivers[currentMirrorIndex++],receiver=pickCompetitiveGiftReceiver(giver,currentMirrorPool);currentMirrorPairs.push({giver,receiver});adjustStars(receiver,1);$('#mirrorText').replaceChildren();const left=document.createElement('img'),right=document.createElement('img');loadImg(left,imgFor(giver),giver);loadImg(right,imgFor(receiver),receiver);const line=document.createElement('span');line.textContent=giver+' ★ → '+receiver;$('#mirrorText').append(left,line,right);updateOdoDisplay(receiver);$('#mirrorContinueBtn').textContent=currentMirrorIndex<currentMirrorGivers.length?'Revelar siguiente estrella →':'Ver el resultado del bracket →';decorate();};
 $('#mirrorContinueBtn').addEventListener('click',event=>{if(mirrorMode==='gift'&&currentMirrorIndex<currentMirrorGivers.length){event.stopImmediatePropagation();runNextMirrorVote();}},true);
 // Use a single, uniform image system for every selectable portrait.
 const observer=new MutationObserver(()=>{decorate();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('click',event=>{if(event.target.closest('#adv4DecisionContinue'))episodeDone[episode]=true;});
 document.addEventListener('change',queueSave);document.addEventListener('click',()=>{decorate();queueSave();});
 document.addEventListener('click',event=>{if(event.target.closest('#runChallenge')&&episodeDone[episode]){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('click',event=>{const slot=event.target.closest('#castGrid .slot .icon');if(!slot)return;slot.parentElement.querySelector('select').focus();slot.parentElement.querySelector('select').showPicker?.();});
 function restore(snapshot){
  if(!snapshot||snapshot.version!==1)return;restoring=true;const v=snapshot.vars;
  ({step,episode,advFormat,castSize,selected18,groups,groupColors,groupOrder,groupSize,top3EpisodeByGroup,stars,alive,trackData,finalRank,eliminationOrder,nextSemiRank,nextBracketRank,episodeDone,currentDistIndex,expansionTriggered,userWildcardChoice,regularWildcard,trEpisodeCount}=v);advanced=new Set(v.advanced);activeSet=new Set(v.activeSet);eliminatedSet=new Set(v.eliminatedSet);usedSpotifyTrackIds=new Set(v.usedSpotifyTrackIds||[]);
  buildCastGrid();$$('#castGrid select').forEach((s,i)=>{s.value=snapshot.cast[i]||'';s.dispatchEvent(new Event('change'));});
  if(snapshot.stage==='cast')go(1);
  else if(snapshot.stage==='format'){goFormatSelection();$('input[name="advCount"][value="'+advFormat+'"]').checked=true;}
  else if(snapshot.stage==='distribution'){startIndividualDistribution();$$('#distributionSlotsGrid select').forEach((s,i)=>{s.value=snapshot.distribution[i]||'';s.dispatchEvent(new Event('change'));});}
  else{syncTrEpisodeCount();buildTRSkeleton();if(snapshot.stage==='episode'){go(3);updateEpisodeUI();}else{go(6);$('#nextEpisode').style.display=snapshot.stage==='finished'?'none':'';$('#restartSim').style.display=snapshot.stage==='finished'?'inline-flex':'none';}}
  restoring=false;decorate();
 }
 // Shorten purely decorative delays while retaining the original reveals.
 if(host.snapshot)restore(host.snapshot);else{$('#playIntroBtn').click();$('#startCastBtn').click();$('input[name="advCount"][value="'+host.format+'"]').checked=true;advFormat=host.format;}
 decorate();host.ready();
 window.XPShowdownSolo={snapshot:()=>snapshot(stableScene()||'episode'),checkpoint:()=>{const stable=stableScene();if(stable)save(stable);},resize:decorate};
 window.addEventListener('beforeunload',()=>{const stable=stableScene();if(stable)host.save(snapshot(stable),true);});
})();
