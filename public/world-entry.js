'use strict';
const worldLandscapeModule=import('/world-landscape.mjs');
const worldIntroModule=import('/world-intro-player.mjs');
let activeWorldFrame=null;

async function renderWorldEntry(){
 const root=document.createElement('section');root.className='world-entry';
 root.innerHTML=`<div class="world-entry-backdrop"></div><div class="world-entry-copy"><span class="eyebrow">UNA NUEVA FORMA DE VIVIR EL UNIVERSO</span><h1>THE XPEDITION<br><em>WORLD</em></h1><img class="world-entry-logo" src="/assets/branding/apocalypse/apocalypse-ii-logo.webp" alt="Campria Presents: Apocalypse II"><p>Cada servidor tiene su propia historia. Elige una partida, vuelve a tu progreso o empieza una nueva aventura.</p><div class="world-entry-actions"><span class="world-entry-status" role="status">Consultando el acceso…</span></div><div class="world-entry-details"><span>DESAFÍOS CON BOTS</span><span>CEREMONIAS EN VIVO</span><span>TU PROPIA TEMPORADA</span></div></div><section class="world-server-browser" aria-label="Servidores de World"><header><div><span class="eyebrow">ELIGE TU PARTIDA</span><h2>Servidores</h2></div><button class="btn small world-create-toggle" hidden>Crear servidor ${icon('plus')}</button></header><div class="world-server-create" hidden><form><label>Nombre del servidor<input name="name" maxlength="60" minlength="2" placeholder="Ej. Mi temporada Apocalypse" required></label><label class="world-bots-option"><input type="checkbox" name="autoBots" checked>Completar retos y ceremonias con bots</label><p>Los participantes conectados ocupan sus plazas; los bots completan las demás.</p><div><button class="btn primary small" type="submit">Crear servidor</button><button class="btn secondary small" type="button" data-cancel-server>Cancelar</button></div><span role="status"></span></form></div><div class="world-server-list" aria-live="polite">Preparando servidores…</div></section>`;
 $('#main').replaceChildren(root);
 const status=$('.world-entry-status',root),list=$('.world-server-list',root),create=$('.world-server-create',root),toggle=$('.world-create-toggle',root);let snapshot,showArchived=false;const archivedToggle=document.createElement('button');archivedToggle.className='world-archive-toggle';archivedToggle.textContent='Servidores eliminados';archivedToggle.hidden=true;list.after(archivedToggle);archivedToggle.onclick=()=>{showArchived=!showArchived;archivedToggle.textContent=showArchived?'Volver a servidores':'Servidores eliminados';void refresh().catch(e=>toast(e.message,true));};
 function draw(){
  archivedToggle.hidden=!snapshot.staff;
  list.innerHTML=snapshot.servers.length?snapshot.servers.map(server=>`<article class="world-server-card"><div class="world-server-cover" aria-hidden="true"><span>${icon('compass')}</span></div><div class="world-server-card-copy"><div class="world-server-name"><h3>${esc(server.name)}</h3><span class="world-server-status ${server.enabled?'open':'closed'}">${server.archived?'Eliminado':server.enabled?'Abierto':'Cerrado'}</span></div><p>${server.archived?'Progreso archivado':'Temporada independiente'+(server.autoBots?' · Plazas con bots':'')}</p><div class="world-server-card-actions">${server.archived?`<button class="btn secondary small" data-restore-server="${esc(server.id)}">Restaurar servidor</button>`:`<button class="btn primary small" data-enter-server="${esc(server.id)}" ${!snapshot.configured?'disabled':''}>Entrar ${icon('arrow')}</button>${snapshot.staff?`<button class="world-server-lock" data-server-id="${esc(server.id)}" data-server-enabled="${!server.enabled}" aria-label="${server.enabled?'Cerrar':'Abrir'} ${esc(server.name)}" title="${server.enabled?'Cerrar':'Abrir'} servidor">${icon(server.enabled?'lock':'check')}</button><button class="world-server-delete" data-delete-server="${esc(server.id)}" aria-label="Eliminar ${esc(server.name)}" title="Eliminar servidor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7"/></svg></button>`:''}`}</div></div></article>`).join(''):'<div class="world-server-empty"><span>WORLD</span><h3>'+(showArchived?'No hay servidores eliminados':'Aún no hay servidores')+'</h3><p>'+(showArchived?'Aquí podrás recuperar las partidas archivadas.':snapshot.staff?'Crea el primero para empezar una temporada.':'El STAFF está preparando las próximas partidas.')+'</p></div>';
 }
 async function refresh(){snapshot=await api('/world/servers'+(showArchived?'?archived=1':''));if(root.isConnected)draw();}
 try{
  const gate=await api('/world/access');if(!root.isConnected)return;
  const staff=gate.role==='staff';status.textContent=staff?(gate.publicEnabled?'World está abierto a los perfiles Apocalypse II.':'Por ahora, World está reservado al STAFF.'):!state.user?'Inicia sesión con tu cuenta del universo.':!gate.confirmed?'Necesitas el estilo Apocalypse II en tu perfil.':!gate.publicEnabled?'El STAFF aún no ha abierto World.':'Tu estilo Apocalypse II te permite entrar.';
  if(!state.user){const login=document.createElement('button');login.className='btn primary small';login.textContent='Iniciar sesión';login.onclick=()=>openAuth('login');$('.world-entry-actions',root).prepend(login);}
  if(staff){toggle.hidden=false;const manage=document.createElement('a');manage.className='world-entry-manage';manage.href='#moderacion/world';manage.textContent='Administrar acceso';$('.world-entry-actions',root).append(manage);}
  if(!gate.canPlay){list.innerHTML='<div class="world-server-empty"><span>APOCALYPSE II</span><h3>Acceso reservado</h3><p>'+esc(status.textContent)+'</p></div>';return;}
  await refresh();
  if(!snapshot.configured){status.textContent='Preparando el acceso a los servidores…';const poll=()=>{if(!root.isConnected)return;void refresh().then(()=>{if(!snapshot.configured)setTimeout(poll,1500);else status.textContent=staff?'Acceso de STAFF':'Elige un servidor para entrar.';}).catch(()=>setTimeout(poll,2000));};setTimeout(poll,1500);}
 }catch(error){if(root.isConnected)list.textContent=error.message||'No pudimos cargar los servidores.';}
 toggle.onclick=()=>{create.hidden=!create.hidden;if(!create.hidden)$('input[name="name"]',create).focus();};
 $('[data-cancel-server]',root).onclick=()=>create.hidden=true;
 $('form',create).onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=$('button[type="submit"]',form),notice=$('[role="status"]',form);button.disabled=true;notice.textContent='';try{await api('/world/servers',{method:'POST',body:{name:$('[name="name"]',form).value,autoBots:$('[name="autoBots"]',form).checked}});form.reset();create.hidden=true;await refresh();toast('Servidor creado. Su temporada empieza desde cero.');}catch(error){notice.textContent=error.message;}finally{button.disabled=false;}};
 list.onclick=async event=>{
  const remove=event.target.closest('[data-delete-server]');if(remove&&!remove.disabled){const server=snapshot.servers.find(s=>s.id===remove.dataset.deleteServer);remove.disabled=true;try{if(await confirmWorldServerRemoval(server)){await api('/world/servers/'+encodeURIComponent(server.id),{method:'DELETE',body:{confirm:true}});await refresh();}}catch(error){toast(error.message,true);}finally{remove.disabled=false;}return;}
  const restore=event.target.closest('[data-restore-server]');if(restore&&!restore.disabled){restore.disabled=true;try{await api('/world/servers/'+encodeURIComponent(restore.dataset.restoreServer),{method:'PATCH',body:{restore:true}});await refresh();}catch(error){restore.disabled=false;toast(error.message,true);}return;}
  const enter=event.target.closest('[data-enter-server]');if(enter&&!enter.disabled){const selected=snapshot.servers.find(server=>server.id===enter.dataset.enterServer);if(snapshot.inline)openWorldFrame(selected);else location.assign('/juegos/?server='+encodeURIComponent(selected.id));return;}
  const lock=event.target.closest('[data-server-id]');if(!lock||lock.disabled)return;lock.disabled=true;try{await api('/world/servers/'+encodeURIComponent(lock.dataset.serverId),{method:'PATCH',body:{enabled:lock.dataset.serverEnabled==='true'}});await refresh();}catch(error){lock.disabled=false;toast(error.message,true);}
 };
}

function confirmWorldServerRemoval(server){return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='world-server-confirm';dialog.setAttribute('aria-labelledby','world-remove-title');dialog.innerHTML=`<span class="eyebrow">WORLD · STAFF</span><h2 id="world-remove-title">Eliminar servidor</h2><p>¿Eliminar <strong>${esc(server.name)}</strong> de la lista?</p><p class="archive-note">Su progreso quedará archivado. Podrás recuperarlo en «Servidores eliminados».</p><div><button class="btn secondary small" data-no>Cancelar</button><button class="btn danger small" data-yes>Eliminar servidor</button></div>`;document.body.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value);};dialog.querySelector('[data-no]').onclick=()=>finish(false);dialog.querySelector('[data-yes]').onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false);};dialog.showModal();dialog.querySelector('[data-no]').focus();});}

function openWorldFrame(server){
 if(activeWorldFrame)return;
 const iframe=document.createElement('iframe');iframe.className='world-server-frame';iframe.title='World · '+server.name;iframe.allow='autoplay; fullscreen';
 const warm=document.createElement('video');warm.playsInline=true;warm.preload='auto';warm.volume=1;warm.muted=false;warm.hidden=true;warm.src='/world-intro-warmup.mp4';document.body.append(warm);
 const warmed=warm.play().catch(()=>{});
 const previousTitle=document.title;document.title=server.name+' · World';document.documentElement.classList.add('world-frame-open');
 const record={iframe,warm,previousTitle,closed:false,abort:new AbortController()};activeWorldFrame=record;void worldLandscapeModule.then(m=>{if(!record.closed){record.landscape=m.installLandscapeMode();void record.landscape.request();}});
 record.listener=async event=>{
  if(event.source!==iframe.contentWindow||event.origin!==location.origin||event.data?.type!=='world-intro-ready'||!event.ports?.[0])return;
  const port=event.ports[0],pending=new Map();let sequence=0;port.onmessage=message=>{const value=message.data;if(value?.reply){const callback=pending.get(value.reply);if(callback){pending.delete(value.reply);value.error?callback.reject(Error(value.error)):callback.resolve(value.value);}}};port.postMessage({type:'accepted'});
  const request=(action,body)=>{const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});port.postMessage({id,action,body});});};
  try{await warmed;if(record.closed)return;const module=await worldIntroModule;await module.playWorldIntro({...event.data.config,url:'/world-intro-video.mp4',mobileUrl:'/world-intro-video-mobile.mp4'},{video:warm,signal:record.abort.signal,request:(action,body)=>action==='start'?Promise.resolve(event.data.session):request(action,body)});if(!record.closed)port.postMessage({type:'finished'});}catch(error){port.postMessage({type:'failed',error:error.message});}
 };
 window.addEventListener('message',record.listener);iframe.src='/juegos/?server='+encodeURIComponent(server.id);document.body.append(iframe);
}
function closeWorldFrame(){const record=activeWorldFrame;if(!record)return;record.closed=true;record.landscape?.destroy();record.abort.abort();window.removeEventListener('message',record.listener);record.iframe.remove();record.warm.pause();record.warm.remove();document.documentElement.classList.remove('world-frame-open');document.title=record.previousTitle;activeWorldFrame=null;}
window.addEventListener('hashchange',()=>{if(location.hash!=='#world')closeWorldFrame();});

moderationTabs.push(['world','World']);
const beforeWorldModeration=loadModerationBody;
loadModerationBody=async function(){
 if(moderationView.tab!=='world')return beforeWorldModeration();
 const root=$('#moderationBody');if(!root)return;root.innerHTML='<div class="mod-panel">Consultando World…</div>';
 try{const {access}=await api('/moderation/world');if(!root.isConnected||moderationView.tab!=='world')return;
  root.innerHTML=`<section class="mod-panel world-access-panel"><div><span class="mod-eyebrow">THE XPEDITION WORLD</span><h2>${access.publicEnabled?'World está abierto.':'World está cerrado al público.'}</h2><p>${access.publicEnabled?'Solo los perfiles con estilo Apocalypse II pueden entrar a los servidores. El STAFF crea y administra las partidas.':'Solo el STAFF puede entrar. Puedes revisar el mundo antes de abrirlo a la comunidad.'}</p></div><button class="btn ${access.publicEnabled?'secondary':'primary'}" data-world-access="${!access.publicEnabled}" ${!access.configured&&!access.publicEnabled?'disabled':''}>${access.publicEnabled?'Cerrar World':'Abrir World'}</button>${!access.configured?'<p class="world-entry-status">El servidor de World aún está preparando su acceso.</p>':''}<a href="#world" class="world-entry-manage">Ver la entrada de World ${icon('arrow')}</a></section>`;
 }catch(error){if(root.isConnected)root.textContent=error.message;}
};
const beforeWorldModerationRoute=renderModeration;
renderModeration=function(){if(location.hash==='#moderacion/world')moderationView.tab='world';return beforeWorldModerationRoute();};
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-world-access]');if(!button||button.disabled||!state.user?.staff)return;
 button.disabled=true;try{await api('/moderation/world',{method:'PUT',body:{enabled:button.dataset.worldAccess==='true'}});await loadModerationBody();toast(button.dataset.worldAccess==='true'?'World está abierto.':'World está cerrado al público.');}catch(error){button.disabled=false;toast(error.message,true);}
});
