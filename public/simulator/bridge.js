'use strict';
(()=>{
 if(!parent.XPSimulator){location.replace('/simulator/');return;}
 const host=parent.XPSimulator,key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let seed=crypto.getRandomValues(new Uint32Array(1))[0],checkpoint=null,ready=false,restoring=false,replaying=false,startBusy=false,notifyTimer=null,changeTimer=null;
 Math.random=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
 function encode(value,seen=new WeakSet()){
  if(value===undefined||typeof value==='function'||typeof value==='symbol')return undefined;
  if(value===null||typeof value!=='object')return value;
  if(value instanceof Node||value instanceof Event||(typeof AudioContext!=='undefined'&&value instanceof AudioContext)||seen.has(value))return undefined;
  seen.add(value);let result;
  if(value instanceof Set)result={__xpType:'set',values:[...value].map(v=>encode(v,seen))};
  else if(value instanceof Map)result={__xpType:'map',values:[...value].map(([k,v])=>[encode(k,seen),encode(v,seen)])};
  else if(Array.isArray(value))result=value.map(v=>encode(v,seen));
  else if(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null){result={};for(const[k,v]of Object.entries(value)){if(['timers','stripersAudio','finalVoteTimers'].includes(k))continue;const copy=encode(v,seen);if(copy!==undefined)result[k]=copy;}}
  seen.delete(value);return result;
 }
 function decode(value){if(!value||typeof value!=='object')return value;if(value.__xpType==='set')return new Set(value.values.map(decode));if(value.__xpType==='map')return new Map(value.values.map(([k,v])=>[decode(k),decode(v)]));if(Array.isArray(value))return value.map(decode);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v)]));}
 const clone=value=>encode(value);
 function forms(){return [...document.querySelectorAll('select,input,textarea')].filter(el=>!['file','password'].includes(el.type)&&!!el.closest('.stage.active,#mainHeader')).map(el=>{const scope=el.closest('.stage.active,#mainHeader');return {id:el.id||null,scope:scope.id,index:[...scope.querySelectorAll('select,input,textarea')].indexOf(el),value:el.value,checked:el.checked};});}
 function restoreForms(values){for(const item of values||[]){const scope=item.scope?document.getElementById(item.scope):document;const el=item.id?document.getElementById(item.id):scope?.querySelectorAll('select,input,textarea')[item.index];if(!el||el.type==='file')continue;if(el.type==='checkbox'||el.type==='radio'){if(el.checked!==item.checked){el.checked=item.checked;el.dispatchEvent(new Event('change',{bubbles:true}));}}else if(el.value!==item.value){el.value=item.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}}
 function progress(state,name){const v=state.vars||{},world=state.world;let completed=0,winner=null,reps=[];
  if(v.currentSeason==='world'&&world){completed=world.records?.length||0;winner=world.winner;reps=world.cast?.length?world.reps||[]:[];}
  else if(v.currentSeason==='race'&&v.raceSeason){completed=v.raceSeason.records?.length||0;winner=v.raceSeason.winner?(v.raceSeason.teams?.find(t=>t.id===v.raceSeason.winner)?.members?.join(' & ')||String(v.raceSeason.winner)):null;}
  else if(window.XPState?.engine==='house'){completed=Math.max(0,(v.currentWeek||1)-(/renderTrackRecord|Final/.test(name)?0:1));winner=Object.entries(v.finalPlacements||{}).find(([,p])=>p==='Winner')?.[0];}
  else if(window.XPState?.engine==='traitor'){completed=Math.max(0,(v.episode||1)-(/buildTR|initStatus/.test(name)?0:1));winner=Object.entries(v.trackData||{}).find(([,cells])=>cells.some(c=>c.cls==='champ'))?.[0];}
  else{completed=Math.max(0,(v.episode||1)-(name==='core:6'||/renderCruiseStatus|Final/.test(name)?0:1));winner=v.finalState?.winner||v.cruise?.winner||v.cruise?.finalWinner||null;}
  return {completed,winner,reps};
 }
 function notify(){if(!ready||restoring||!checkpoint||!host.run)return;const currentForms=forms();const snapshot={...checkpoint,forms:currentForms};host.checkpoint(snapshot);}
 function mark(name,args=[]){if(!ready||restoring||host.readOnly)return;const state=clone(window.XPState.capture());if(name==='setup')state.vars.currentSeason=host.run?.mode||state.vars.currentSeason;checkpoint={version:1,engine:window.XPState.engine,point:name,args:clone(args),state,random:seed,forms:forms(),progress:progress(state,name)};clearTimeout(notifyTimer);notifyTimer=setTimeout(notify,35);}
 function refreshConfiguration(){if(restoring||!checkpoint)return;if(['world:renderCast','world:renderStats'].includes(checkpoint.point))mark(checkpoint.point,decode(checkpoint.args));}
 function owns(kind,value){return host.owns(kind,value);}
 function characters(){return host.data.shop.items.filter(i=>i.kind==='character'&&owns('character',i.name)).map(i=>i.name);}
 function teams(){return host.data.shop.items.filter(i=>i.kind==='team'&&owns('team',i.name)).map(i=>i.name);}
 function image(name){const normalized=key(name),item=host.data.shop.items.find(i=>i.id==='character:'+(host.data.shop.aliases[normalized]||normalized));return item?.image||'/personajes/dani.png';}
 function filterSelects(){for(const select of document.querySelectorAll('select')){const options=[...select.options];for(const option of options){if(!option.value)continue;const n=key(option.value),id=host.data.shop.aliases[n]||n;const kind=host.data.shop.items.find(i=>(i.id==='character:'+id||i.id==='team:'+id||i.id==='challenge:'+id))?.kind;if(kind&&!owns(kind,option.value))option.remove();}select.dataset.xpFiltered='true';}}
 function locks(){for(const card of document.querySelectorAll('[data-season]')){const mode=host.data.shop.modes.find(m=>m.id===card.dataset.season);if(!mode)continue;const open=host.available(mode.id);card.classList.toggle('xp-locked',!open);card.setAttribute('aria-disabled',String(!open));let badge=card.querySelector('.xp-season-lock');if(!badge){badge=document.createElement('span');badge.className='xp-season-lock';card.append(badge);}badge.textContent=mode.upcoming?'Próximamente':open?'✓ Disponible':host.data.wallet.level<mode.level?'🔒 Nivel '+mode.level:mode.price+' ✦ monedas';}}
 function refresh(){const saved=forms();window.XPState?.refresh();const selectData=new Map();for(const select of document.querySelectorAll('select')){if(!select.dataset.xpFiltered)continue;const kinds=new Set([...select.options].map(o=>host.data.shop.items.find(i=>i.id==='character:'+key(o.value)||i.id==='team:'+key(o.value)||i.id==='challenge:'+key(o.value))?.kind).filter(Boolean));if(kinds.size!==1)continue;const kind=[...kinds][0];for(const item of host.data.shop.items.filter(i=>i.kind===kind&&!i.system&&owns(kind,i.value||i.name))){if(kind==='challenge'&&item.modes&&!item.modes.includes(window.XPState.engine==='game'?'game':window.XPState.engine))continue;const val=item.value||item.name;if(![...select.options].some(o=>o.value===val))select.add(new Option(item.name,val));}}
  filterSelects();restoreForms(saved);locks();if(typeof enforceUniqueSelects==='function')enforceUniqueSelects();
 }
 document.addEventListener('click',async event=>{const el=event.target.closest('button,a');if(!el)return;
  if(el.closest('[data-season]')&&el.dataset.season&&!host.available(el.dataset.season)){event.preventDefault();event.stopImmediatePropagation();host.openShop('mode');return;}
  if(el.id==='seasonConfirmBtn'&&!replaying){event.preventDefault();event.stopImmediatePropagation();if(startBusy)return;const mode=document.querySelector('.season-card.selected')?.dataset.season||'antarctica';startBusy=true;try{const allowed=await host.start(mode);if(allowed){replaying=true;el.click();replaying=false;setTimeout(()=>mark('setup'),40);}}finally{startBusy=false;}return;}
  if(el.id==='homeBtn'||el.classList.contains('v3-home')||/Simular de nuevo|Simular otra vez/.test(el.textContent)){event.preventDefault();event.stopImmediatePropagation();host.home();return;}
  if(!restoring&&!host.readOnly)setTimeout(refreshConfiguration,80);
  if(!event.isTrusted||restoring||host.readOnly)return;
  const label=(el.textContent||el.getAttribute('aria-label')||el.id).trim().slice(0,100);let kind=/random|azar|aleatori/i.test(label+' '+el.id)?'random':/siguiente|continuar|ver |comenzar|iniciar|avanzar/i.test(label)?'advance':'choice';const match=host.data.shop.items.find(i=>i.kind==='character'&&key(i.name)===key(label));if(match)kind='character';host.decision(kind,match?.name||label||el.id);
 },true);
 document.addEventListener('change',event=>{if(restoring||host.readOnly)return;const el=event.target;if(event.isTrusted&&el.value){let kind=el.id==='challengeSelect'?'challenge':el.closest('#castGrid')?'character':/team|equipo/i.test(el.id)?'team':'choice';const found=host.data.shop.items.find(i=>i.id===kind+':'+key(el.value));if(['character','team','challenge'].includes(kind)&&!found)kind='choice';host.decision(kind,el.value);}clearTimeout(changeTimer);changeTimer=setTimeout(()=>{if(!checkpoint||checkpoint.point==='setup')mark('setup');else notify();},100);},true);
 window.XPBridge={owns,characters,teams,image,talents:()=>Object.fromEntries(host.data.shop.items.filter(i=>i.kind==='character').map(i=>[key(i.name),i.talent])),talentLabels:()=>Object.fromEntries(host.data.shop.items.filter(i=>i.kind==='character').map(i=>[i.name,i.talent])),checkpoint:mark,serializable:v=>encode(v)!==undefined,replace:(target,value)=>{if(target instanceof Set){target.clear();for(const v of value)target.add(v);}else if(target instanceof Map){target.clear();for(const[k,v]of value)target.set(k,v);}else{for(const k of Object.keys(target))delete target[k];Object.assign(target,value);}},locks,refresh,filterSelects,openMode:mode=>host.openMode(mode),clone,decode,forms,restoreForms,
  initialize(){ready=true;locks();filterSelects();const observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&((n.tagName==='OPTION'||n.tagName==='SELECT'&&!n.dataset.xpFiltered)||n.querySelector?.('select:not([data-xp-filtered])'))))){filterSelects();}});observer.observe(document.body,{childList:true,subtree:true});},
  restore(snapshot){restoring=true;checkpoint=snapshot;try{seed=snapshot.random;window.XPState.restore(decode(snapshot.state));const name=snapshot.point,args=decode(snapshot.args||[]);if(name.startsWith('world:')){window.XPWorld.render[name.slice(6)](...args);}else if(name==='setup'){window.XPEngine.setup(snapshot.state.vars?.currentSeason||host.run.mode);restoreForms(snapshot.forms);}else{window.XPEngine.resume(name,args);restoreForms(snapshot.forms);}locks();filterSelects();}finally{restoring=false;}setTimeout(notify,200);},
  setupCheckpoint:()=>mark('setup')};
})();
