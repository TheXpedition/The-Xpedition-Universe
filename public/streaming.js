'use strict';
state.filter='tops';
state.featureIndex=0;
const streamNav=[['inicio','Inicio'],['explorar','Explorar'],['noticias','Noticias'],['comunidad','Comunidad'],['guardados','Mi lista'],['simuladores','Simuladores'],['universo','El universo']];
renderChrome=function(){
  const unread=state.conversations.reduce((n,c)=>n+c.unread,0);document.body.dataset.view=state.route;
  $('#navigation').innerHTML=streamNav.map(([route,label],i)=>`<a href="#${route}" class="nav-link ${route===state.route?'active':''} ${i>=5?'nav-extra':''}" ${state.route===route?'aria-current="page"':''}><span>${label}</span></a>`).join('');
  $('#accountActions').innerHTML=state.user?`<button class="icon-button" data-action="go-messages" aria-label="Ver mensajes${unread?', '+unread+' sin leer':''}" style="position:relative">${icon('chat')}${unread?`<span style="position:absolute;right:-2px;top:-2px;background:#9570cd;color:white;font-size:8px;border-radius:4px;padding:0 4px">${unread}</span>`:''}</button><button data-action="account-menu" aria-label="Opciones de ${esc(state.user.name)}" aria-expanded="false">${avatar(state.user)}</button>`:`<button class="link-button" data-action="login">Iniciar sesión</button><button class="btn primary small" data-action="register">Regístrate</button>`;
  document.title=`${unread?'('+unread+') ':''}The Xpedition — ${streamNav.find(n=>n[0]===state.route)?.[1]||(state.route==='mensajes'?'Mensajes':'Universe')}`;
};
const featuredItems=()=>[state.catalog.content.xpedition[0],state.catalog.content.xpedition[1],state.catalog.content.spinoffs.find(c=>c.id==='traitor2'),state.catalog.content.xpedition[2],state.catalog.content.simulators.find(c=>c.id==='house')];
function featureHero(){const items=featuredItems(),item=items[state.featureIndex%items.length];return `<section class="feature-hero" aria-label="Destacado: ${esc(item.name)}"><img class="feature-image" src="${esc(contentArt(item))}" alt="${esc(item.name)}"><div class="feature-copy"><div class="feature-kicker">${item.disabled?'EL PRÓXIMO CAPÍTULO':'THE XPEDITION ORIGINAL'}</div>${logoFor(item)?`<img class="feature-logo" src="${esc(logoFor(item))}" alt="${esc(item.name)}">`:`<h1>${item.id==='house'?'<small class="house-prefix">THE XPEDITION</small>HOUSE':esc(item.name)}</h1>`}<div class="feature-meta"><span>${esc(item.meta.replace('Season','Temporada'))}</span><span>•</span><span>${item.kind==='Simulador'?'Simulación interactiva':'Competencia virtual'}</span><span class="rating">TX</span></div><p>${esc(item.desc)} ${item.id==='antarctica'?'Revive los desafíos, conoce a sus protagonistas y descubre dónde comenzó esta historia.':item.id==='safari'?'La expedición vuelve a poner a prueba cada alianza. Solo uno llegará hasta el final.':''}</p><div class="feature-actions">${item.disabled?`<button class="btn secondary" data-action="content" data-id="${esc(item.id)}">Conocer la temporada ${icon('info')}</button>`:`<a class="btn primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon('arrow')} ${item.kind==='Simulador'?'Jugar ahora':'Ir a la temporada'}</a><button class="btn secondary" data-action="content" data-id="${esc(item.id)}">Más información</button>`}<button class="hero-save" data-action="save" data-id="${esc(item.id)}" aria-label="${saved(item.id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}">${icon(saved(item.id)?'check':'plus')}</button></div></div><div class="hero-editorial">EL UNIVERSO TE ESPERA<strong>Historias que se quedan contigo.</strong></div><div class="feature-dots">${items.map((c,i)=>`<button class="${i===state.featureIndex?'active':''}" data-stream="feature" data-index="${i}" aria-label="Ver destacado ${esc(c.name)}" aria-pressed="${i===state.featureIndex}"></button>`).join('')}</div><div class="feature-counter"><span>0${state.featureIndex+1} / 0${items.length}</span><div class="feature-controls"><button data-stream="feature-prev" aria-label="Anterior destacado">${icon('back')}</button><button data-stream="feature-next" aria-label="Siguiente destacado">${icon('arrow')}</button></div></div></section>`;}
const controls=()=>`<div class="row-controls"><button data-stream="rail-prev" aria-label="Ver anteriores">${icon('back')}</button><button data-stream="rail-next" aria-label="Ver siguientes">${icon('arrow')}</button></div>`;
function catalogRail(title,items,poster=false,subtitle=''){return `<section class="catalog-row"><div class="section-head"><h2>${title}</h2>${controls()}</div>${subtitle?`<p class="row-subtitle">${subtitle}</p>`:''}<div class="rail ${poster?'poster-rail':''}">${items.map(contentCard).join('')}</div></section>`;}
function rankPoster(name,isSeason=false){
  const item=isSeason?allContent().find(c=>norm(c.name)===norm(name)):null;
  const profile=!item?state.profiles.find(p=>p.character&&norm(p.name)===norm(name)):null;
  const action=item?'content':'profile',id=item?.id||profile?.id;
  if(!id)return '';
  return `<div class="rank-poster"><button data-action="${action}" data-id="${esc(id)}" ${item?`data-kind="${esc(item.kind)}"`:''} aria-label="Ver ${esc(item?.name||profile.name)}"><img src="${esc(item?contentArt(item):imageFor(name))}" alt="${esc(item?.name||profile.name)}" loading="lazy">${item&&logoFor(item)?`<img class="rank-season-logo" src="${esc(logoFor(item))}" alt="" loading="lazy">`:''}</button><span class="rank-name">${esc(item?.name||profile.name)}</span></div>`;
}
function rankRow(list,home=false){return `<section class="ranked-section ${home?'home-ranked':''}"><div class="section-head"><div><h2>${esc(list.title)}</h2></div>${controls()}</div><div class="ranked-track">${list.items.map((entry,index)=>`<div class="rank-item ${list.isGroup?'group-rank':''}"><svg class="rank-number ${index===9?'two':''}" viewBox="0 0 ${index===9?240:145} 240" aria-hidden="true"><text x="4" y="205">${index+1}</text></svg>${list.isGroup?`<div class="rank-group">${entry.map(name=>rankPoster(name)).join('')}</div>`:rankPoster(entry,list.title.includes('Temporadas'))}</div>`).join('')}</div></section>`;}
renderHome=function(){
  const c=state.catalog.content,rankings=state.catalog.rankings||[];
  $('#main').innerHTML=`<div class="stream-home"><h1 class="sr-only">The Xpedition Universe</h1><div id="featuredArea">${featureHero()}</div><div class="catalog-body">${catalogRail('The Xpedition',c.xpedition,false,'Cada destino tiene una historia. Descubre la tuya.')}${rankings[0]?rankRow(rankings[0],true):''}<div class="franchise-logos"><a href="#explorar">THE XPEDITION<small>ORIGINALS</small></a><a href="#explorar">CAMPRIA<small>DONDE TODO COMENZÓ</small></a><a href="#explorar">THE TRAITOR<small>NO CONFÍES EN NADIE</small></a><a href="#simuladores">SIMULATORS<small>TÚ DECIDES</small></a></div>${catalogRail('Los spin-offs. La historia continúa.',c.spinoffs)}${catalogRail('Campria: el origen de un universo',c.campria,true)}${rankings[1]?rankRow(rankings[1],true):''}<section class="stream-banner"><div><div class="eyebrow">MÁS ALLÁ DE LA COMPETENCIA</div><h2>Los personajes son icónicos.<br>La comunidad la haces tú.</h2><p>Crea tu perfil, encuentra a otros participantes y lleva la conversación a tu propio chat.</p></div><a href="#comunidad" class="btn secondary">Entrar a la comunidad ${icon('arrow')}</a></section>${catalogRail('Ahora el juego lo escribes tú',c.simulators,false,'Simuladores oficiales. Tus participantes, tus alianzas, tus reglas.')}<section class="stream-news"><div class="section-head"><h2>Las historias detrás de la historia</h2><a href="#noticias" class="link-button">Todas las noticias ${icon('arrow')}</a></div><div class="news-grid">${state.catalog.news.slice(0,3).map(newsCard).join('')}</div></section></div></div>`;
};
renderExplore=function(){
  const tops=state.filter==='tops';
  $('#main').innerHTML=`<section class="explore-cover"><div class="eyebrow">LAS CARAS. LOS MOMENTOS. EL LEGADO.</div><h1>Los que dejaron huella.</h1><p>Ganadores, amistades, rivalidades y participantes inolvidables. Explora todas las colecciones del universo.</p><div class="explore-tabs"><button data-stream="explore-tab" data-id="tops" class="${tops?'active':''}">Los tops del universo</button><button data-stream="explore-tab" data-id="todos" class="${!tops?'active':''}">Todas las temporadas</button></div></section>${tops?`<p class="rank-note" style="margin-bottom:30px">Selecciones del universo. El orden de estas listas no representa un ranking oficial.</p>${(state.catalog.rankings||[]).map(list=>rankRow(list)).join('')}`:`<div class="chips">${[['todos','Todas'],['xpedition','The Xpedition'],['spinoffs','Spin-offs'],['campria','Campria']].map(([id,label])=>`<button class="chip ${state.filter===id?'active':''}" data-action="explore-filter" data-id="${id}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="exploreSearch" placeholder="Busca tu temporada…" aria-label="Buscar temporada" value="${esc(state.query)}"></label><div class="content-grid catalog-results" id="exploreResults">${(state.filter==='todos'?[...state.catalog.content.xpedition,...state.catalog.content.spinoffs,...state.catalog.content.campria]:(state.catalog.content[state.filter]||[])).filter(c=>norm(c.name).includes(norm(state.query))).map(contentCard).join('')}</div>`}`;
};
contentModal=function(id,kind){const item=allContent().find(c=>c.id===id&&(!kind||c.kind===kind));if(!item)return;modal(`<div class="content-modal-art"><img src="${esc(contentArt(item))}" alt="${esc(item.name)}">${logoFor(item)?`<img class="content-modal-logo" src="${esc(logoFor(item))}" alt="">`:''}</div><div class="modal-kicker">${esc(item.kind)} · ${esc(item.meta)}</div><h2 id="modalTitle">${esc(item.name)}</h2><p class="modal-intro">${esc(item.desc)}</p>${item.disabled||!item.url?'<div class="notice">El próximo capítulo está en camino. Esta temporada aún no tiene enlace disponible.</div>':`<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="btn primary full">${esc(item.actionLabel||'Ir a la temporada')} ${icon('external')}</a>`}`,true,'content');};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-stream]');if(!button)return;const action=button.dataset.stream;
  if(action.startsWith('feature')){const n=featuredItems().length;state.featureIndex=action==='feature'?Number(button.dataset.index):action==='feature-next'?(state.featureIndex+1)%n:(state.featureIndex-1+n)%n;$('#featuredArea').innerHTML=featureHero();}
  if(action==='rail-prev'||action==='rail-next'){const rail=button.closest('.catalog-row,.ranked-section')?.querySelector('.rail,.ranked-track');if(rail)rail.scrollBy({left:(action==='rail-prev'?-1:1)*rail.clientWidth*.78,behavior:'smooth'});}
  if(action==='explore-tab'){state.filter=button.dataset.id;state.query='';renderExplore();}
});

const baseChatAvatar=chatAvatar;
chatAvatar=function(c){return c.icon?`<img class="avatar" src="${esc(c.icon)}" alt="Foto del grupo ${esc(c.title)}">`:baseChatAvatar(c);};
function updateComposerAccess(c){
  const composer=$('.composer'),area=$('.composer-area');if(!composer||!area||!state.user)return;
  const role=c.members.find(m=>m.id===state.user.id)?.role;
  const locked=c.type==='group'&&c.onlyAdminWrite&&!['admin','mod'].includes(role);
  composer.classList.toggle('hidden',locked);$('.composer-caption')?.classList.toggle('hidden',locked);
  $('#chatLocked')?.remove();if(locked)area.insertAdjacentHTML('beforeend','<div class="chat-locked">Solo administradores y moderadores pueden escribir en este grupo.</div>');
}
const baseChatStatus=updateChatStatus;
updateChatStatus=function(){baseChatStatus();const c=state.conversations.find(c=>c.id===state.active);if(c)updateComposerAccess(c);};
chatInfo=function(){
  const c=state.conversations.find(c=>c.id===state.active);if(!c)return;
  const admin=c.members.find(m=>m.id===state.user.id)?.role==='admin';
  modal(`<div class="modal-kicker">${c.type==='group'?'TU GRUPO EN EL UNIVERSO':'CONVERSACIÓN PRIVADA'}</div><h2 id="modalTitle">${esc(chatTitle(c))}</h2><p class="modal-intro">${c.type==='group'?'Un espacio para tu gente, con las reglas que ustedes elijan.':'Los mensajes y archivos solo están disponibles para sus miembros.'}</p>${c.type==='group'&&admin?`<label class="form-field">Nombre del grupo<input id="groupRename" value="${esc(c.title)}" maxlength="70"></label><button class="btn secondary full" data-action="rename-group">Guardar nombre</button><label class="form-field" style="margin-top:16px">Foto del grupo<input type="file" id="groupPhoto" accept="image/png,image/jpeg,image/webp"></label><p class="form-hint">PNG, JPG o WebP · hasta 4 MB.</p><label class="group-settings"><input id="groupOnlyAdmin" type="checkbox" ${c.onlyAdminWrite?'checked':''}><span>Solo administradores y moderadores pueden enviar mensajes.</span></label><button class="btn secondary full" data-action="add-members">${icon('plus')} Añadir miembros</button>`:''}<div class="section-head" style="margin-top:25px"><h3 style="margin:0">${c.members.length} miembros</h3></div><div class="selection-list">${c.members.map(m=>`<div class="person-row">${avatar(m)}<span class="person-meta"><button data-action="profile" data-id="${esc(m.id)}"><strong>${esc(m.name)}</strong></button><small>${m.role==='admin'?'Administrador':m.role==='mod'?'Moderador':'Miembro'}${m.online?' · En línea':''}</small></span>${c.type==='group'&&admin&&m.id!==state.user.id?`<div class="group-member-tools"><select aria-label="Rol de ${esc(m.name)}" data-group-role="${m.id}"><option value="member" ${m.role==='member'?'selected':''}>Miembro</option><option value="mod" ${m.role==='mod'?'selected':''}>Moderador</option><option value="admin" ${m.role==='admin'?'selected':''}>Admin</option></select><button data-stream="remove-member" data-id="${m.id}" aria-label="Quitar a ${esc(m.name)}">Quitar</button></div>`:''}</div>`).join('')}</div>${c.type==='group'?'<button class="btn danger full" data-action="leave-group" style="margin-top:20px">Salir del grupo</button>':''}`,false,'chat-info');
};
document.addEventListener('change',async event=>{
  const input=event.target;const id=state.active;
  try{
    if(input.id==='groupOnlyAdmin'){await api('/conversations/'+encodeURIComponent(id),{method:'PATCH',body:{onlyAdminWrite:input.checked}});await refreshConversations();toast('Permisos de escritura actualizados.');}
    if(input.dataset.groupRole){await api('/conversations/'+encodeURIComponent(id)+'/members',{method:'PATCH',body:{userId:input.dataset.groupRole,role:input.value}});await refreshConversations();chatInfo();toast('Rol actualizado.');}
    if(input.id==='groupPhoto'){
      const file=input.files?.[0];if(!file)return;if(file.size>4*1024*1024)throw new Error('La foto puede pesar hasta 4 MB.');
      input.disabled=true;await api('/conversations/'+encodeURIComponent(id),{method:'PATCH',body:{iconData:await fileToBase64(file),mime:file.type}});await refreshConversations();chatInfo();toast('Foto del grupo actualizada.');
    }
  }catch(error){toast(error.message,true);if(input.id==='groupOnlyAdmin')input.checked=!input.checked;if(input.id==='groupPhoto')input.disabled=false;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-stream]');if(!button)return;
  if(button.dataset.stream==='remove-member'){
    const c=state.conversations.find(c=>c.id===state.active),member=c?.members.find(m=>m.id===button.dataset.id);
    if(!member)return;modal(`<h2 id="modalTitle">¿Quitar a ${esc(member.name)} del grupo?</h2><p class="modal-intro">Dejará de recibir mensajes y de acceder a los archivos de esta conversación. Podrás invitarle de nuevo.</p><button class="btn danger full" data-stream="confirm-remove-member" data-id="${member.id}">Quitar del grupo</button><button class="btn secondary full" style="margin-top:8px" data-action="close-modal">Cancelar</button>`);
  }
  if(button.dataset.stream==='confirm-remove-member'){
    button.disabled=true;try{await api('/conversations/'+encodeURIComponent(state.active)+'/members',{method:'DELETE',body:{userId:button.dataset.id}});await refreshConversations();chatInfo();toast('Miembro retirado del grupo.');}catch(error){toast(error.message,true);button.disabled=false;}
  }
});

const observedRails=new WeakSet();
function syncRailControls(){
  $$('.catalog-row,.ranked-section').forEach(section=>{
    const rail=$('.rail,.ranked-track',section),controls=$('.row-controls',section);if(!rail||!controls)return;
    const buttons=$$('button',controls),scrollable=rail.scrollWidth>rail.clientWidth+3;
    controls.hidden=!scrollable;buttons[0].disabled=rail.scrollLeft<3;buttons[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3;
    if(!observedRails.has(rail)){observedRails.add(rail);rail.addEventListener('scroll',syncRailControls,{passive:true});}
  });
}
new MutationObserver(()=>requestAnimationFrame(syncRailControls)).observe($('#main'),{childList:true,subtree:true});
window.addEventListener('resize',syncRailControls);document.fonts?.ready.then(syncRailControls);

const baseNewsCard=newsCard;
newsCard=function(n){return baseNewsCard(n).replace('<div class="news-actions">',`<button class="link-button news-read-link" data-stream="news-read" data-id="${esc(n.id)}">Leer la historia ${icon('arrow')}</button><div class="news-actions">`);};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-stream="news-read"]');if(!button)return;const n=state.catalog.news.find(n=>n.id===button.dataset.id);if(!n)return;
  const [image,category,portrait]=newsImage(n);modal(`<div class="news-art ${portrait?'portrait':''}" style="border-radius:9px;margin-bottom:25px"><img src="${esc(image)}" alt="${esc(n.title)}"></div><div class="modal-kicker">${esc(category)} · ARCHIVO DEL UNIVERSO</div><h2 id="modalTitle">${esc(n.title)}</h2><div class="news-byline" style="margin:16px 0">${avatar({name:n.author},'tiny')} ${esc(n.author)} · ${esc(n.role)}</div><p style="font-size:14px;line-height:1.95;color:#c6b9d3">${esc(n.text)}</p>`,true,'news');
});
renderAbout=function(){
  const staff=[['Dios','Creador'],['Bonju','The Xpedition Host'],['Maria','Campria Host'],['Dua Lingo','Staff'],['Nidia Mirella','Exconcursante / Staff'],['Edna Droga','Juez'],['Nicki Gorilaj','Coach musical'],['Chad Gil Pete','Psicólogo']];
  $('#main').innerHTML=`<div class="about-copy"><div class="eyebrow">THE XPEDITION UNIVERSE</div><h1 style="margin-top:17px">Cada temporada es una historia.<br>Juntos somos un universo.</h1><p><strong>The Xpedition</strong> es una competencia virtual basada en diversos reality shows con un toque único. Su propósito es divertir a los participantes, fomentar la creatividad y crear comunidad, con un formato más sólido y cambios en cada temporada.</p><div class="about-banner"><img src="backdrops/safari.jpg" alt="The Xpedition Safari"></div><h2>Campria. Donde comenzó todo.</h2><p><strong>Campria</strong> es la primera saga. Cada temporada cambió de formato e incorporó nuevas reglas, sistemas de eliminación y participantes, junto con caras reconocidas que regresaron a lo largo de los años.</p><h2>The Traitor. La confianza entra en juego.</h2><p><strong>The Traitor</strong> es la última entrega: una minisaga de roles entre inocentes y traidores, con temporadas cortas y una dinámica más psicológica.</p><div class="section-head" style="margin-top:40px"><h2>El equipo detrás del universo</h2></div><div class="staff-collection">${staff.map(([name,role])=>{const p=state.profiles.find(p=>p.character&&p.name===name);return p?`<button class="staff-profile" data-action="profile" data-id="${esc(p.id)}">${avatar(p)}<strong>${esc(name)}</strong><small>${esc(role)}</small></button>`:'';}).join('')}</div></div>`;
};
init();
