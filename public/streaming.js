'use strict';
state.filter='tops';
state.featureIndex=0;
state.previewMuted=true;
state.previewPaused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
icons.play='<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>';
icons.pause='<path d="M8 5v14M16 5v14" stroke-width="4"/>';
icons.volume='<path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>';
icons.muted='<path d="M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6"/>';
const streamNav=[['inicio','Inicio'],['explorar','Explorar'],['noticias','Noticias'],['comunidad','Comunidad'],['guardados','Mi lista'],['simuladores','Simuladores'],['universo','El universo']];
renderChrome=function(){
  const unread=state.conversations.reduce((n,c)=>n+c.unread,0);document.body.dataset.view=state.route;
  $('#navigation').innerHTML=streamNav.map(([route,label],i)=>`<a href="#${route}" class="nav-link ${route===state.route?'active':''} ${i>=5?'nav-extra':''}" ${state.route===route?'aria-current="page"':''}><span>${label}</span></a>`).join('');
  $('#accountActions').innerHTML=state.user?`<button class="icon-button" data-action="go-messages" aria-label="Ver mensajes${unread?', '+unread+' sin leer':''}" style="position:relative">${icon('chat')}${unread?`<span style="position:absolute;right:-2px;top:-2px;background:#9570cd;color:white;font-size:8px;border-radius:4px;padding:0 4px">${unread}</span>`:''}</button><button data-action="account-menu" aria-label="Opciones de ${esc(state.user.name)}" aria-expanded="false">${avatar(state.user)}</button>`:`<button class="link-button" data-action="login">Iniciar sesión</button><button class="btn primary small" data-action="register">Regístrate</button>`;
  document.title=`${unread?'('+unread+') ':''}The Xpedition — ${streamNav.find(n=>n[0]===state.route)?.[1]||(state.route==='mensajes'?'Mensajes':'Universe')}`;
};
const featuredItems=()=>['japan','safari','antarctica','traitor2','traitor-showdown'].map(id=>allContent().find(item=>item.id===id));
const contentPreviews={
  safari:{src:'media/safari-preview.mp4',title:'The Xpedition Safari',season:'Segunda temporada',note:'Segunda temporada · 2023 - 2025',description:'Cada alianza cuenta. Solo uno llegará hasta el final. Adéntrate en una expedición de desafíos, estrategia y supervivencia.'},
  japan:{src:'media/japan-preview.mp4',title:'The Xpedition Japan',season:'Tercera temporada',note:'Tercera temporada · Próximamente',description:'Un nuevo destino. Alianzas que se ponen a prueba y secretos que pueden cambiarlo todo. La próxima expedición comienza en Japón.'},
  traitor2:{src:'media/traitor-2-preview.mp4',title:'The Traitor 2',season:'Segunda temporada',note:'Segunda temporada · 2025',description:'Rostros ocultos, juego de azar. Secretos, sospechas y alianzas que ponen a prueba la confianza.'},
  'traitor-showdown':{src:'media/showdown-2-preview.mp4',title:'Showdown 2',season:'Segunda temporada',note:'Segunda temporada · 2026',description:'Las estrellas de The Traitor regresan para un nuevo duelo. Estrategia, rivalidades y una sola meta: llegar hasta el final.'}
};
function featureHero(){
  const items=featuredItems(),item=items[state.featureIndex%items.length],preview=contentPreviews[item.id],japan=item.id==='japan';
  const release=preview?.note||(item.id==='antarctica'?'Primera temporada · 2022':item.meta.replace('Season','Temporada'));
  const description=preview?.description||item.desc+' '+(item.id==='antarctica'?'Revive la expedición donde comenzó esta historia.':item.id==='safari'?'Cada alianza cuenta. Solo uno llegará hasta el final.':'');
  const primary=preview?`<button class="btn primary" data-stream="trailer" data-id="${esc(item.id)}">${icon('play')} Ver avance</button>`:item.disabled?`<button class="btn primary" data-action="content" data-id="${esc(item.id)}">Conocer la temporada ${icon('info')}</button>`:`<a class="btn primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon('play')} Ir a la temporada</a>`;
  return `<section class="feature-hero" data-content-id="${esc(item.id)}" aria-label="Destacado: ${esc(item.name)}">
    <img class="feature-image" src="${esc(contentArt(item))}" alt="" fetchpriority="high">
    ${preview?`<video class="feature-video" id="featurePreview" muted loop playsinline preload="metadata" poster="${esc(contentArt(item))}" aria-label="Previa de ${esc(preview.title)}"><source src="${esc(preview.src)}" type="video/mp4"></video>`:''}
    <div class="feature-shade"></div>
    <div class="feature-copy">
      <div class="feature-kicker"><span class="original-mark">X</span> THE XPEDITION ORIGINAL</div>
      ${logoFor(item)?brandArt(item,'feature-logo'):`<h1>${esc(item.name)}</h1>`}
      <div class="feature-release"><span class="release-dot" aria-hidden="true"></span>${esc(release)}</div>
      <div class="feature-meta">${japan?'2026 <span>•</span> Competencia virtual <span>•</span> Japan':'Competencia virtual <span>•</span> '+esc(item.name)}</div>
      <p>${esc(description)}</p>
      <div class="feature-actions">${primary}<button class="btn secondary" data-action="content" data-id="${esc(item.id)}">${icon('info')} Más información</button><button class="hero-save ${saved(item.id)?'saved':''}" data-action="save" data-id="${esc(item.id)}" aria-label="${saved(item.id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(item.id)}">${icon(saved(item.id)?'check':'plus')}</button></div>
    </div>
    <div class="feature-bottom">
      <div class="feature-dots" aria-label="Elegir destacado">${items.map((c,i)=>`<button class="${i===state.featureIndex?'active':''}" data-stream="feature" data-index="${i}" aria-label="Ver destacado ${esc(c.name)}" aria-pressed="${i===state.featureIndex}"><span>0${i+1}</span><i></i></button>`).join('')}</div>
      <div class="feature-counter">${preview?`<div class="preview-controls"><button data-stream="preview-pause" aria-label="${state.previewPaused?'Reproducir':'Pausar'} previa">${icon(state.previewPaused?'play':'pause')}</button><button data-stream="preview-mute" aria-label="${state.previewMuted?'Activar':'Silenciar'} sonido" aria-pressed="${!state.previewMuted}">${icon(state.previewMuted?'muted':'volume')}</button></div>`:''}<div class="feature-controls"><button data-stream="feature-prev" aria-label="Anterior destacado">${icon('back')}</button><button data-stream="feature-next" aria-label="Siguiente destacado">${icon('arrow')}</button></div></div>
    </div>
  </section>`;
}
icons.chevronLeft='<path d="m15 5-7 7 7 7"/>';
icons.chevronRight='<path d="m9 5 7 7-7 7"/>';
const controls=title=>`<div class="rail-controls" role="group" aria-label="Navegación de ${esc(title)}"><button class="rail-nav rail-prev" data-stream="rail-prev" aria-label="Ver anteriores en ${esc(title)}">${icon('chevronLeft')}</button><button class="rail-nav rail-next" data-stream="rail-next" aria-label="Ver siguientes en ${esc(title)}">${icon('chevronRight')}</button></div>`;
function catalogRail(title,items,poster=false,subtitle=''){
 return `<section class="catalog-row"><div class="section-head"><h2>${title}</h2></div>${subtitle?`<p class="row-subtitle">${subtitle}</p>`:''}<div class="rail-shell">${controls(title)}<div class="rail ${poster?'poster-rail':''}" tabindex="0" aria-label="${esc(title)}">${items.map(contentCard).join('')}</div></div></section>`;
}

function rankPoster(name,isSeason=false,position=0){
 const item=isSeason?allContent().find(c=>norm(c.name)===norm(name)):null;
 const profile=!item?state.profiles.find(p=>p.character&&norm(p.name)===norm(name)):null;
 const action=item?'content':'profile',id=item?.id||profile?.id;if(!id)return '';
 return `<div class="rank-poster"><button data-action="${action}" data-id="${esc(id)}" ${item?`data-kind="${esc(item.kind)}"`:''} aria-label="${position?'Puesto '+position+': ':''}Ver ${esc(item?.name||profile.name)}"><img src="${esc(item?contentArt(item):imageFor(name))}" alt="${esc(item?.name||profile.name)}" loading="lazy" decoding="async">${item?brandArt(item,'rank-season-logo'):''}<span class="rank-poster-glow" aria-hidden="true"></span></button><span class="rank-name">${esc(item?.name||profile.name)}</span></div>`;
}
function rankNumeral(number){
 const width=number===10?285:160;
 return `<svg class="rank-number ${number===10?'two':''}" viewBox="0 0 ${width} 250" aria-hidden="true"><text class="rank-depth" x="11" y="225">${number}</text><text class="rank-metal" x="8" y="222">${number}</text><text class="rank-glint" x="8" y="222">${number}</text></svg>`;
}
function rankRow(list,home=false){
 const match=list.title.match(/^TOP (\d+) (.+)$/),topic=match?.[2]||list.title;
 return `<section class="ranked-section ${home?'home-ranked':''}"><div class="section-head"><h2 class="rank-heading" aria-label="${esc(list.title)}"><span class="rank-heading-metal">TOP ${match?.[1]||list.items.length}</span><span class="rank-heading-topic">${esc(topic)}<small>DEL UNIVERSO</small></span></h2></div><div class="rail-shell rank-shell">${controls(list.title)}<div class="ranked-track" tabindex="0" aria-label="${esc(list.title)}">${list.items.map((entry,index)=>`<div class="rank-item ${list.isGroup?'group-rank':''}">${rankNumeral(index+1)}${list.isGroup?`<div class="rank-group">${entry.map(name=>rankPoster(name,false,index+1)).join('')}</div>`:rankPoster(entry,list.title.includes('Temporadas'),index+1)}</div>`).join('')}</div></div></section>`;
}
renderHome=function(){
  const c=state.catalog.content,rankings=state.catalog.rankings||[];
  $('#main').innerHTML=`<div class="stream-home"><h1 class="sr-only">The Xpedition Universe — temporadas, personajes y comunidad</h1><div id="featuredArea">${featureHero()}</div><div class="catalog-body">${catalogRail('The Xpedition',c.xpedition,false,'Cada destino tiene una historia. Descubre la tuya.')}${rankings[0]?rankRow(rankings[0],true):''}<div class="franchise-logos"><a href="#explorar/xpedition">THE XPEDITION<small>ORIGINALS</small></a><a href="#explorar/campria">CAMPRIA<small>DONDE TODO COMENZÓ</small></a><a href="#explorar/traitor">THE TRAITOR<small>NO CONFÍES EN NADIE</small></a><a href="#simuladores">SIMULATORS<small>TÚ DECIDES</small></a></div>${catalogRail('Los spin-offs. La historia continúa.',c.spinoffs)}${catalogRail('Campria: el origen de un universo',c.campria,true)}${rankings[1]?rankRow(rankings[1],true):''}<section class="stream-banner"><div><div class="eyebrow">MÁS ALLÁ DE LA COMPETENCIA</div><h2>Los personajes son icónicos.<br>La comunidad la haces tú.</h2><p>Crea tu perfil, encuentra a otros participantes y lleva la conversación a tu propio chat.</p></div><a href="#comunidad" class="btn secondary">Entrar a la comunidad ${icon('arrow')}</a></section>${catalogRail('Ahora el juego lo escribes tú',c.simulators,false,'Simuladores oficiales. Tus participantes, tus alianzas, tus reglas.')}<section class="stream-news"><div class="section-head"><h2>Las historias detrás de la historia</h2><a href="#noticias" class="link-button">Todas las noticias ${icon('arrow')}</a></div><div class="news-grid">${state.catalog.news.slice(0,3).map(newsCard).join('')}</div></section></div></div>`;
};
const sagaSections={
 todos:{title:'Todas las temporadas.',eyebrow:'UN UNIVERSO. MUCHAS HISTORIAS.',description:'Desde los primeros desafíos hasta las nuevas historias. Encuentra tu próxima temporada.'},
 xpedition:{title:'The Xpedition',eyebrow:'THE XPEDITION ORIGINALS',description:'De Antarctica a Japan. Cada destino tiene una historia y cada alianza puede cambiarlo todo.'},
 campria:{title:'Campria',eyebrow:'DONDE TODO COMENZÓ',description:'Doce temporadas que dieron origen al universo. Regresa a sus desafíos y protagonistas.'},
 traitor:{title:'The Traitor',eyebrow:'NO CONFÍES EN NADIE',description:'Secretos, sospechas y decisiones que cambian el juego. Explora The Traitor y su especial de estrellas.'},
 spinoffs:{title:'Las historias continúan.',eyebrow:'LOS SPIN-OFFS DEL UNIVERSO',description:'Descubre The Traitor, Showdown y nuevas formas de vivir la competencia.'}
};
function exploreContent(){
 const c=state.catalog.content;
 if(state.filter==='traitor')return c.spinoffs.filter(item=>item.id.startsWith('traitor'));
 if(state.filter==='todos')return [...c.xpedition,...c.spinoffs,...c.campria];
 return c[state.filter]||[];
}
renderExplore=function(){
 const tops=state.filter==='tops',section=sagaSections[state.filter]||sagaSections.todos;
 const title=tops?'Los que dejaron huella.':section.title;
 const description=tops?'Ganadores, amistades, rivalidades y participantes inolvidables. Explora todas las colecciones del universo.':section.description;
 const chips=[['todos','Todas'],['xpedition','The Xpedition'],['traitor','The Traitor'],['campria','Campria'],['spinoffs','Spin-offs']];
 $('#main').innerHTML=`<section class="explore-cover"><div class="eyebrow">${esc(tops?'LAS CARAS. LOS MOMENTOS. EL LEGADO.':section.eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p><div class="explore-tabs"><button data-stream="explore-tab" data-id="tops" class="${tops?'active':''}">Los tops del universo</button><button data-stream="explore-tab" data-id="todos" class="${!tops?'active':''}">Todas las temporadas</button></div></section>${tops?`<p class="rank-note" style="margin-bottom:30px">Selecciones del universo. El orden de estas listas no representa un ranking oficial.</p>${(state.catalog.rankings||[]).map(list=>rankRow(list)).join('')}`:`<div class="chips">${chips.map(([id,label])=>`<button class="chip ${state.filter===id?'active':''}" data-action="explore-filter" data-id="${id}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="exploreSearch" placeholder="Busca tu temporada…" aria-label="Buscar temporada" value="${esc(state.query)}"></label><div class="content-grid catalog-results" id="exploreResults">${exploreContent().filter(c=>norm(c.name).includes(norm(state.query))).map(contentCard).join('')}</div>`}`;
};

renderSimulators=function(){
 $('#main').innerHTML=`<section class="simulator-intro"><div class="eyebrow">TU PRÓXIMA PARTIDA EMPIEZA AQUÍ</div><h1>Tu temporada.<br><span>Tus reglas.</span></h1><p>Elige el escenario. Reúne a tus participantes.<br>El resto de la historia lo escribes tú.</p><div class="simulator-intro-meta">${icon('game')} ${state.catalog.content.simulators.length} experiencias del universo</div></section><div class="simulator-grid">${state.catalog.content.simulators.map(contentCard).join('')}</div>`;
};
const castProfileAliases={'mariavillegas':'Maria','marcosjc':'Marcos','jeremias':'Jere','javier':'Javi','felipe':'Felipe Vicente'};
const castKey=name=>norm(name).replace(/[^a-z0-9]/g,'');
function castProfile(name){
 const key=castKey(name),alias=castProfileAliases[key];
 return state.profiles.find(p=>p.character&&castKey(p.name)===key)||(alias?state.profiles.find(p=>p.character&&p.name===alias):null);
}
function castNames(names){return names.map(name=>{
 const profile=castProfile(name);
 return profile?`<button class="cast-person" data-action="profile" data-id="${esc(profile.id)}" aria-label="Ver perfil de ${esc(name)}">${esc(name)}</button>`:`<span class="cast-no-profile">${esc(name)}</span>`;
}).join('<span class="cast-comma">, </span>');}
function relatedContent(item){
 const c=state.catalog.content;
 if(item.kind==='Simulador')return c.simulators.filter(x=>x.id!==item.id).slice(0,3);
 if(item.kind==='Campria'){
  const index=c.campria.findIndex(x=>x.id===item.id);
  return c.campria.map((entry,i)=>({entry,distance:Math.abs(i-index)})).filter(x=>x.entry.id!==item.id).sort((a,b)=>a.distance-b.distance).slice(0,3).map(x=>x.entry);
 }
 const groups=[['antarctica','safari','japan','safari-showdown'],['traitor','traitor2','traitor3','traitor-showdown']];
 const group=groups.find(g=>g.includes(item.id));
 return (group?group.map(id=>allContent().find(x=>x.id===id)):c.spinoffs).filter(x=>x&&x.id!==item.id).slice(0,3);
}
contentModal=function(id,kind){
 const item=allContent().find(c=>c.id===id&&(!kind||c.kind===kind));if(!item)return;
 const detail=state.catalog.details[item.id]||{},simulator=item.kind==='Simulador',japan=item.id==='japan';
 const hasCast=!simulator&&detail.cast?.length;
 const moreCast=hasCast&&detail.cast.length>detail.previewCast.length;
 const action=japan?`<button class="btn primary" data-stream="trailer" data-id="${esc(item.id)}">${icon('play')} Ver avance</button>`:item.disabled||!item.url?'<span class="detail-upcoming">Próximamente</span>':`<a class="btn primary" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon(simulator?'game':'play')} ${simulator?'Jugar ahora':contentPreviews[item.id]?'Ver temporada':'Ir a la temporada'}</a>`;
 const recommendations=relatedContent(item);
 modal(`<div class="detail-hero ${simulator?'detail-game-hero':item.kind==='Campria'?'detail-campria-hero':''}" data-content-id="${esc(item.id)}"><img class="detail-hero-image" src="${esc(contentArt(item))}" alt="" loading="eager"><div class="detail-hero-shade"></div>${brandArt(item,'detail-logo')}<div class="detail-hero-actions">${action}${!japan&&contentPreviews[item.id]?`<button class="btn secondary" data-stream="trailer" data-id="${esc(item.id)}">${icon('play')} Ver avance</button>`:''}<button class="detail-save ${saved(item.id)?'saved':''}" data-action="save" data-id="${esc(item.id)}" aria-label="${saved(item.id)?'Quitar de':'Añadir a'} mi lista: ${esc(item.name)}" aria-pressed="${!!saved(item.id)}">${icon(saved(item.id)?'check':'plus')}</button></div></div><div class="detail-body"><div class="detail-summary"><div class="detail-main-copy"><div class="detail-meta"><span>${esc(item.meta.replace('Season','Temporada'))}</span><span class="detail-format">${esc(simulator?'INTERACTIVO':item.kind==='Campria'?'CAMPRIA':'ORIGINAL')}</span></div><h2 id="modalTitle" tabindex="-1">${esc(item.name)}</h2>${item.disabled?`<div class="detail-release">${japan?'Tercera temporada · Próximamente':'Próximamente en The Xpedition Universe'}</div>`:''}<p class="detail-description">${esc(japan?'Honor, tradición y traición. Un nuevo destino pone a prueba cada alianza. La tercera temporada de The Xpedition está por comenzar.':item.desc)}</p></div><div class="detail-credits">${hasCast?`<p><span class="credit-label">Elenco:</span> ${castNames(detail.previewCast)}${moreCast?'<span class="cast-comma">, </span><button class="cast-more" data-stream="cast-expand">Ver más</button>':''}</p>`:''}<p><span class="credit-label">Géneros:</span> ${detail.genres.map(esc).join(', ')}</p><p><span class="credit-label">Universo:</span> ${esc(simulator?'Simuladores':item.kind==='Campria'?'Campria':item.id.startsWith('traitor')?'The Traitor':'The Xpedition')}</p></div></div><section class="detail-related" aria-labelledby="relatedTitle"><div class="detail-section-heading"><h3 id="relatedTitle">Más títulos similares</h3><span>Explora la misma saga</span></div><div class="detail-recommendations">${recommendations.map(contentCard).join('')}</div></section><section class="detail-full" id="fullCast" tabindex="-1" aria-labelledby="fullCastHeading"><h3 id="fullCastHeading">Acerca de <strong>${esc(item.name)}</strong></h3><dl><div><dt>Temporada:</dt><dd>${esc(item.meta.replace('Season','Temporada'))}</dd></div>${hasCast?`<div class="full-cast-line"><dt>Elenco completo:</dt><dd>${castNames(detail.cast)}</dd></div>`:''}<div><dt>Géneros:</dt><dd>${detail.genres.map(esc).join(', ')}</dd></div><div><dt>Formato:</dt><dd>${esc(simulator?'Simulador interactivo':item.kind==='Campria'?'Temporada de Campria':item.kind==='Spin Off'?'Spin-off del universo The Xpedition':'Temporada de The Xpedition')}</dd></div>${item.disabled?'<div><dt>Disponibilidad:</dt><dd>Próximamente</dd></div>':''}</dl></section></div>`,true,'content');
 $('#modalTitle').focus({preventScroll:true});
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-stream="cast-expand"]');if(!button)return;
 const section=$('#fullCast');if(section){section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});section.focus({preventScroll:true});}
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-stream]');if(!button)return;const action=button.dataset.stream;
  if(action.startsWith('feature')){const n=featuredItems().length;state.featureIndex=action==='feature'?Number(button.dataset.index):action==='feature-next'?(state.featureIndex+1)%n:(state.featureIndex-1+n)%n;$('#featuredArea').innerHTML=featureHero();setupPreview();}
  if(action==='rail-prev'||action==='rail-next'){const rail=button.closest('.catalog-row,.ranked-section')?.querySelector('.rail,.ranked-track');if(rail)rail.scrollBy({left:(action==='rail-prev'?-1:1)*rail.clientWidth*.78,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  if(action==='explore-tab')go('explorar/'+button.dataset.id);
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

// Each rail updates only its own controls, once per animation frame.
const trackedRails=new Map(),pendingRails=new Set();let railFrame=0,scanFrame=0;
function queueRail(rail){pendingRails.add(rail);if(!railFrame)railFrame=requestAnimationFrame(()=>{
 railFrame=0;const changes=[...pendingRails].filter(r=>r.isConnected).map(rail=>{
  const visual=$('.season-art,.rank-poster>button',rail),shell=rail.parentElement,art=visual?.getBoundingClientRect(),bounds=shell.getBoundingClientRect();
  return {rail,shell,artTop:art?art.top-bounds.top:0,artHeight:art?.height||rail.clientHeight,scrollable:rail.scrollWidth>rail.clientWidth+3,atStart:rail.scrollLeft<3,atEnd:rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3};
 });pendingRails.clear();
 for(const {rail,shell,artTop,artHeight,scrollable,atStart,atEnd}of changes){
  const controls=trackedRails.get(rail)?.controls;if(!controls)continue;controls.hidden=!scrollable;
  const buttons=$$('button',controls);buttons[0].disabled=atStart;buttons[1].disabled=atEnd;
  shell.style.setProperty('--arrow-top',artTop+'px');shell.style.setProperty('--arrow-height',artHeight+'px');
  rail.classList.toggle('can-scroll-right',scrollable&&!atEnd);
 }
 });}
const railResize=new ResizeObserver(entries=>entries.forEach(entry=>queueRail(entry.target)));
function syncRailControls(){
 for(const [rail]of trackedRails)if(!rail.isConnected){railResize.unobserve(rail);trackedRails.delete(rail);}
 $$('.catalog-row,.ranked-section').forEach(section=>{
  const rail=$('.rail,.ranked-track',section),controls=$('.rail-controls',section);if(!rail||!controls)return;
  if(!trackedRails.has(rail)){trackedRails.set(rail,{controls});railResize.observe(rail);rail.addEventListener('scroll',()=>queueRail(rail),{passive:true});rail.addEventListener('keydown',event=>{if(event.target!==rail||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();rail.scrollBy({left:(event.key==='ArrowLeft'?-1:1)*rail.clientWidth*.78,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});}
  queueRail(rail);
 });
}
new MutationObserver(()=>{if(!scanFrame)scanFrame=requestAnimationFrame(()=>{scanFrame=0;syncRailControls();setupPreview();});}).observe($('#main'),{childList:true,subtree:true});
window.addEventListener('resize',syncRailControls);document.fonts?.ready.then(syncRailControls);

let currentPreview=null,previewOnscreen=true;
const previewObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.target===currentPreview){previewOnscreen=entry.isIntersecting;updatePreviewPlayback();}},{threshold:.1});
function updatePreviewPlayback(){
 const video=currentPreview;if(!video)return;
 if(!previewOnscreen||document.hidden||state.previewPaused||$('#modal').open){video.pause();return;}
 video.play().catch(error=>{if(video!==currentPreview||!video.isConnected||error.name==='AbortError')return;state.previewPaused=true;updatePreviewButtons();});
}
function updatePreviewButtons(){
 const mute=$('[data-stream="preview-mute"]'),pause=$('[data-stream="preview-pause"]');
 if(mute){mute.innerHTML=icon(state.previewMuted?'muted':'volume');mute.setAttribute('aria-label',state.previewMuted?'Activar sonido':'Silenciar sonido');mute.setAttribute('aria-pressed',String(!state.previewMuted));}
 if(pause){pause.innerHTML=icon(state.previewPaused?'play':'pause');pause.setAttribute('aria-label',state.previewPaused?'Reproducir previa':'Pausar previa');}
}
function setupPreview(){
 const video=$('#featurePreview');if(video===currentPreview)return;
 if(currentPreview){currentPreview.pause();previewObserver.unobserve(currentPreview);}
 currentPreview=video;if(!video)return;
 video.muted=state.previewMuted;previewOnscreen=true;
 video.addEventListener('playing',()=>video.classList.add('is-playing'));
 video.addEventListener('error',()=>video.classList.remove('is-playing'));
 previewObserver.observe(video);updatePreviewPlayback();
}
document.addEventListener('visibilitychange',updatePreviewPlayback);
const cinemaBaseModal=modal;
modal=function(...args){
 currentPreview?.pause();$$('video',$('#modal')).forEach(v=>v.pause());
 const value=cinemaBaseModal(...args);$('#modal').dataset.kind=args[2]||'generic';$('#modal').scrollTop=0;return value;
};
$('#modal').addEventListener('close',()=>{$$('video',$('#modal')).forEach(v=>{v.pause();v.removeAttribute('autoplay');v.removeAttribute('src');$$('source',v).forEach(s=>s.removeAttribute('src'));v.load();});updatePreviewPlayback();});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-stream]');if(!button)return;
 if(button.dataset.stream==='preview-mute'){state.previewMuted=!state.previewMuted;if(currentPreview)currentPreview.muted=state.previewMuted;updatePreviewButtons();}
 if(button.dataset.stream==='preview-pause'){state.previewPaused=!state.previewPaused;updatePreviewButtons();updatePreviewPlayback();}
 if(button.dataset.stream==='trailer'){
  const item=allContent().find(item=>item.id===button.dataset.id),preview=contentPreviews[button.dataset.id];if(!item||!preview)return;
  modal(`<div class="trailer-topline"><span class="eyebrow">THE XPEDITION ORIGINAL</span><span>${esc(preview.season)}</span></div><h2 id="modalTitle">${esc(preview.title)} · Avance oficial</h2><video class="trailer-player" controls autoplay playsinline preload="metadata" poster="${esc(contentArt(item))}" aria-label="Avance de ${esc(preview.title)}"><source src="${esc(preview.src)}" type="video/mp4"></video><p class="release-note">${esc(preview.note)}</p>`,true,'trailer');
  $('#modal .trailer-player').play().catch(()=>{});
 }
});
let headerFrame=0;
window.addEventListener('scroll',()=>{if(!headerFrame)headerFrame=requestAnimationFrame(()=>{headerFrame=0;$('.topbar').classList.toggle('is-scrolled',window.scrollY>24);});},{passive:true});

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
