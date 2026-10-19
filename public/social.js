'use strict';
state.communityTab='publicaciones';
state.pronounFilter='';
const postDraft={text:'',feeling:'',mentions:[],file:null,sticker:null,preview:null};
const originalLogout=logout;
logout=async function(){if(postDraft.preview)URL.revokeObjectURL(postDraft.preview);Object.assign(postDraft,{text:'',feeling:'',mentions:[],file:null,sticker:null,preview:null});await originalLogout();};
const originalStartStream=startStream;
startStream=function(){originalStartStream();state.stream?.addEventListener('posts',()=>{if(state.route==='comunidad'&&state.communityTab==='publicaciones'){const button=$('[data-social="refresh-feed"]');if(button)button.innerHTML='Hay publicaciones nuevas · Actualizar '+icon('arrow');}});};
const feelingList=[['feliz','😊','Feliz'],['triste','😢','Triste'],['enojada','😡','Enojada','Enojado','Enojade'],['burletona','😏','Burletona','Burletón','Burletone'],['enamorada','😍','Enamorada','Enamorado','Enamorade'],['orgullosa','🥹','Orgullosa','Orgulloso','Orgullose'],['traicionada','💔','Traicionada','Traicionado','Traicionade'],['asqueada','🤢','Asqueada','Asqueado','Asqueade'],['positiva','✨','Positiva','Positivo','Positive'],['decepcionada','😞','Decepcionada','Decepcionado','Decepcionade'],['enferma','🤒','Enferma','Enfermo','Enferme'],['solitaria','🌙','Solitaria','Solitario','Solitarie'],['cachonda','🔥','Cachonda','Cachondo','Cachonde']];
function feelingLabel(key,p){const f=feelingList.find(f=>f[0]===key);return f?f[1]+' '+(f[p?.pronouns==='el'?3:p?.pronouns==='elle'?4:2]||f[2]):'';}
const pronounName=p=>({ella:'Ella',el:'Él',elle:'Elle'})[p]||'';
const selectField=(label,id,options,value)=>`<label class="form-field" for="${id}">${label}<select id="${id}">${options.map(([key,label])=>`<option value="${esc(key)}" ${key===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
editProfile=function(onboarding=false){
  if(!requireAuth())return;const u=state.user;
  modal(`<div class="modal-kicker">TU IDENTIDAD, A TU MANERA</div><h2 id="modalTitle">${onboarding?'Completa tu perfil.':'Edita tu perfil.'}</h2><form id="profileForm">${field('Nombre de usuario','profileName','text','Tu nombre',u.name)}${field('Biografía','profileBio','textarea','Cuéntanos algo de ti.',u.bio)}${selectField('Me identifico como','profileGender',[['','Prefiero no indicarlo'],...['Mujer','Hombre','No Binario','Therian'].map(x=>[x,x])],u.genderIdentity||'')}<div id="preferredPronouns">${selectField('Mis pronombres','profilePronouns',[['','Elige tus pronombres'],['ella','Ella'],['el','Él'],['elle','Elle']],u.pronouns||'')}</div>${selectField('Orientación sexual (opcional)','profileOrientation',[['','Prefiero no indicarla'],...['Heterosexual','Homosexual','Bisexual','Pansexual','Otro'].map(x=>[x,x])],u.orientation||'')}<label class="privacy-choice"><input id="orientationVisible" type="checkbox" ${u.orientationVisible?'checked':''}><span>Mostrar mi orientación en el perfil<small>Si lo desactivas, solo tú puedes verla.</small></span></label><p class="form-hint">Puedes cambiar estos datos cuando quieras. Tus pronombres adaptan los sentimientos de tus publicaciones.</p><p class="form-error" id="profileError" role="alert"></p><button type="submit" class="btn primary full">Guardar cambios ${icon('check')}</button></form>`,false,'edit-profile');
  const gender=$('#profileGender');const update=()=>{$('#preferredPronouns').hidden=!['No Binario','Therian'].includes(gender.value);$('#profilePronouns').required=!$('#preferredPronouns').hidden;};gender.addEventListener('change',update);update();
  $('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const button=$('button[type=submit]',e.target);button.disabled=true;try{await updateMe({name:$('#profileName').value,bio:$('#profileBio').value,genderIdentity:gender.value,pronouns:$('#profilePronouns').value,orientation:$('#profileOrientation').value,orientationVisible:$('#orientationVisible').checked});closeModal();route();toast('Tu perfil está actualizado.');if(onboarding)openAvatarPicker();}catch(error){$('#profileError').textContent=error.message;}finally{button.disabled=false;}});
};
const originalMemberCard=memberCard;
memberCard=function(p){let html=originalMemberCard(p);if(p.character)html=html.replace('Personaje del universo · '+p.followers+' seguidores',`Popularidad <strong>#${p.popularityRank||'—'}</strong> · ${p.followers} seguidores`);return html;};
communityResults=function(){
  if(state.communityTab==='publicaciones'||!$('#communityResults'))return;
  const list=state.profiles.filter(p=>(state.communityTab==='personajes'?p.character:state.communityTab==='siguiendo'?state.user?.follows.includes(p.id):!p.character)&&norm(p.name).includes(norm(state.query))&&(!state.pronounFilter||p.pronouns===state.pronounFilter));
  if(state.communityTab==='personajes')list.sort((a,b)=>(a.popularityRank||999)-(b.popularityRank||999));
  $('#communityResults').innerHTML=list.map(memberCard).join('')||empty('No encontramos perfiles.','Prueba con otro nombre o filtro.');$('#communityCount').textContent=list.length+' perfiles';
};
renderCommunity=function(){
  const posts=state.communityTab==='publicaciones';
  const tabs=[['publicaciones','Publicaciones'],['cuentas','Comunidad'],['personajes','Personajes · '+state.catalog.characters.length],['siguiendo','Siguiendo']].map(([id,label])=>`<button class="chip ${state.communityTab===id?'active':''}" data-action="community-tab" data-id="${id}">${label}</button>`).join('');
  const feed=`<div class="feed-layout"><aside class="feed-intro panel"><span class="eyebrow">TU COMUNIDAD</span><h2>Algo que contar.</h2><p>Comparte un momento, menciona a tu gente o expresa cómo te sientes.</p><button class="btn primary" data-social="my-posts">${icon('edit')} Crear publicación</button></aside><section class="posts-column"><div class="feed-toolbar"><span>Más recientes primero</span><button class="link-button" data-social="refresh-feed">Actualizar ${icon('arrow')}</button></div><div id="postsFeed" data-author=""></div></section></div>`;
  const profiles=`<div class="community-search"><label class="search-field">${icon('search')}<input id="communitySearch" aria-label="Buscar perfiles" placeholder="Busca un nombre…" value="${esc(state.query)}"></label>${state.communityTab!=='personajes'?selectField('Pronombres','communityPronouns',[['','Todos'],['ella','Ella'],['el','Él'],['elle','Elle']],state.pronounFilter):''}</div><div class="section-head"><h2>${state.communityTab==='personajes'?'Popularidad de los personajes':'Exploradores'}</h2><span class="pill" id="communityCount"></span></div>${state.communityTab==='personajes'?'<p class="form-hint">La popularidad evoluciona con las visitas y los seguidores. Cada visita cuenta una vez al día.</p>':''}<div class="members-grid" id="communityResults"></div>`;
  $('#main').innerHTML=heading(posts?'Lo que está pasando.':'Encuentra a tu gente.',posts?'Las publicaciones más recientes de la comunidad.':'Perfiles, personajes y nuevas historias.')+`<div class="chips community-tabs">${tabs}</div>`+(posts?feed:profiles);
  if(posts)loadPosts();else{communityResults();$('#communityPronouns')?.addEventListener('change',e=>{state.pronounFilter=e.target.value;communityResults();});}
};
function postComposer(){return `<form id="postForm" class="post-composer panel"><div class="composer-person">${avatar(state.user)}<div><strong>${esc(state.user.name)}</strong><span>Publicación visible para todos</span></div></div><label class="sr-only" for="postText">¿Qué quieres compartir?</label><textarea id="postText" maxlength="3000" placeholder="¿Qué quieres compartir con el universo?">${esc(postDraft.text)}</textarea><div id="postMediaPreview"></div><div id="postMentionChips" class="mention-chips"></div><div class="post-tools"><button type="button" data-social="post-image">${icon('image')} Foto</button><button type="button" data-social="post-sticker">${icon('sticker')} Sticker</button><button type="button" data-social="post-mention">@ Mencionar</button></div><div class="feeling-field">${selectField('Me siento','postFeeling',[['','Añadir sentimiento'],...feelingList.map(f=>[f[0],feelingLabel(f[0],state.user)])],postDraft.feeling)}</div><div class="post-composer-footer"><small>Las imágenes se revisan antes de publicarse.</small><button type="submit" class="btn primary small" id="publishPost">Publicar ${icon('send')}</button></div><p class="form-error" id="postError" role="alert"></p><input type="file" id="postImageInput" accept="image/png,image/jpeg,image/webp" hidden></form>`;}
const baseRenderProfile=renderProfile;
const visitedCharacters=new Set();
renderProfile=function(id){
  baseRenderProfile(id);const p=getProfile(id);if(!p)return;
  if(p.character){
    loadProfileAwards(p);
    const count=$('.profile-counts [data-action="following"]');if(count)count.outerHTML=`<div class="popularity-stat"><strong>#${p.popularityRank||'—'}</strong><span>Popularidad</span></div>`;
    if(!visitedCharacters.has(id)){visitedCharacters.add(id);api('/characters/'+encodeURIComponent(id)+'/view',{method:'POST',body:{}}).then(refreshProfiles).then(()=>{if(state.route==='perfil'&&decodeURIComponent(location.hash.split('/')[1]||'')===id&&$('.popularity-stat strong'))$('.popularity-stat strong').textContent='#'+getProfile(id).popularityRank;}).catch(()=>visitedCharacters.delete(id));}return;
  }
  const own=id===state.user?.id,visible=own?state.user:p;
  const identity=$('.profile-identity');identity.insertAdjacentHTML('beforeend',`<div class="identity-tags">${visible.genderIdentity?`<span>${esc(visible.genderIdentity)}</span>`:''}${visible.pronouns?`<span>${esc(pronounName(visible.pronouns))}</span>`:''}${visible.orientation&&(visible.orientationVisible||own)?`<span>${esc(visible.orientation)}${!visible.orientationVisible?' · Solo tú':''}</span>`:''}</div>`);
  $('.profile-layout>section').innerHTML=`<div class="posts-column">${own?postComposer():''}<div class="feed-toolbar"><h2>Publicaciones</h2>${own?'<button class="link-button" data-social="archive-toggle">Ver archivo</button>':''}</div><div id="postsFeed" data-author="${esc(id)}"></div></div>`;
  if(own)bindPostComposer();loadPosts();
};
function bindPostComposer(){
  $('#postText').addEventListener('input',e=>{postDraft.text=e.target.value;});$('#postFeeling').addEventListener('change',e=>postDraft.feeling=e.target.value);
  $('#postForm').addEventListener('submit',publishPost);
  $('#postImageInput').addEventListener('change',e=>{
    const file=e.target.files[0];if(!file)return;
    if(file.size>4*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Elige una imagen PNG, JPG o WebP de hasta 4 MB.',true);e.target.value='';return;}
    if(postDraft.preview)URL.revokeObjectURL(postDraft.preview);postDraft.file=file;postDraft.sticker=null;postDraft.preview=URL.createObjectURL(file);renderPostDraft();
  });renderPostDraft();
}
function renderPostDraft(){
  if(!$('#postMediaPreview'))return;const src=postDraft.file?postDraft.preview:postDraft.sticker?.src;
  $('#postMediaPreview').innerHTML=src?`<div class="post-draft-media ${postDraft.sticker?'sticker':''}"><img src="${esc(src)}" alt="${postDraft.sticker?'Sticker elegido':'Imagen elegida'}"><button type="button" class="icon-button" data-social="remove-post-media" aria-label="Quitar imagen">${icon('close')}</button></div>`:'';
  $('#postMentionChips').innerHTML=postDraft.mentions.map(id=>{const p=getProfile(id);return p?`<button type="button" data-social="remove-mention" data-id="${esc(id)}">@${esc(p.name)} ${icon('close')}</button>`:'';}).join('');
}
function postHtml(post){
  const own=post.author.id===state.user?.id;
  postCache.set(post.id,post);
  return `<article class="post-card panel" data-post-id="${esc(post.id)}"><header><button class="post-author" data-action="profile" data-id="${esc(post.author.id)}">${avatar(post.author)}<span><strong>${esc(post.author.name)}</strong><small>${date(post.created)} · ${time(post.created)}</small></span></button>${own?`<button class="post-archive" data-social="archive-post" data-id="${esc(post.id)}" data-archived="${post.archived}" aria-label="${post.archived?'Restaurar':'Archivar'} publicación">${post.archived?'Restaurar':'Archivar'}</button>`:''}</header>${post.feeling?`<div class="post-feeling">Se siente ${esc(feelingLabel(post.feeling,post.author))}</div>`:''}${post.text?`<p class="post-text">${linkify(post.text)}</p>`:''}${post.image?`<button class="post-photo-button" data-social="view-post-image" data-src="${esc(post.image)}" aria-label="Ampliar imagen publicada"><img class="post-photo" src="${esc(post.image)}" alt="Imagen de la publicación de ${esc(post.author.name)}" loading="lazy"></button>`:''}${post.sticker?`<img class="post-sticker" src="${esc(post.sticker.src)}" alt="${esc(post.sticker.name||'Sticker')}" loading="lazy">`:''}${post.mentions.length?`<div class="post-mentions"><span>Con</span> ${post.mentions.map(p=>`<button data-action="profile" data-id="${esc(p.id)}">@${esc(p.name)}</button>`).join(' ')}</div>`:''}${post.archived?'':postEngagement(post)}</article>`;
}
async function loadPosts(more=false){
  const feed=$('#postsFeed');if(!feed)return;
  const author=feed.dataset.author,archived=feed.dataset.archived==='true';
  const params=new URLSearchParams();if(author)params.set('author',author);if(archived)params.set('archived','1');if(more&&feed.dataset.before){params.set('before',feed.dataset.before);params.set('beforeId',feed.dataset.beforeId||'');}
  const token=String((Number(feed.dataset.request)||0)+1);feed.dataset.request=token;
  if(!more)feed.innerHTML='<p class="feed-loading"><span class="spinner"></span> Cargando publicaciones…</p>';
  try{const result=await api('/posts?'+params);if(!feed.isConnected||feed.dataset.request!==token)return;
    if(!more)feed.innerHTML='';$('.load-posts',feed)?.remove();feed.insertAdjacentHTML('beforeend',result.posts.map(postHtml).join(''));
    if(!feed.children.length)feed.innerHTML=`<div class="panel feed-empty"><h3>${archived?'Tu archivo está vacío.':'Todavía no hay publicaciones.'}</h3><p>${archived?'Las publicaciones archivadas solo son visibles para ti.':'Aquí aparecerán las historias que comparta la comunidad.'}</p></div>`;
    if(result.posts.length){feed.dataset.before=result.posts.at(-1).created;feed.dataset.beforeId=result.posts.at(-1).id;}
    if(result.hasMore)feed.insertAdjacentHTML('beforeend','<button class="btn secondary full load-posts" data-social="more-posts">Ver publicaciones anteriores</button>');
  }catch(error){if(feed.isConnected)feed.innerHTML=`<div class="panel"><p>${esc(error.message)}</p><button class="btn secondary" data-social="refresh-feed">Reintentar</button></div>`;}
}
async function publishPost(e){
  e.preventDefault();if(postDraft.sending)return;postDraft.text=$('#postText').value;postDraft.feeling=$('#postFeeling').value;
  postDraft.sending=true;const button=$('#publishPost');button.disabled=true;button.textContent=postDraft.file?'Revisando imagen…':'Publicando…';$('#postError').textContent='';
  try{await api('/posts',{method:'POST',body:{text:postDraft.text,feeling:postDraft.feeling,mentions:postDraft.mentions,sticker:postDraft.sticker?.id,image:postDraft.file?await fileToBase64(postDraft.file):undefined}});
    if(postDraft.preview)URL.revokeObjectURL(postDraft.preview);Object.assign(postDraft,{text:'',feeling:'',mentions:[],file:null,sticker:null,preview:null});
    if($('#postText')){$('#postText').value='';$('#postFeeling').value='';renderPostDraft();}const feed=$('#postsFeed');if(feed)feed.dataset.archived='false';loadPosts();toast('Tu publicación ya está en la comunidad.');
  }catch(error){if($('#postError'))$('#postError').textContent=error.message;else toast(error.message,true);}finally{postDraft.sending=false;if(button.isConnected){button.disabled=false;button.innerHTML=`Publicar ${icon('send')}`;}}
}
async function postStickerPicker(){
  await chatAssetsReady;
  modal(`<h2 id="modalTitle">Un sticker para tu historia.</h2><p class="modal-intro">Elige uno de la colección. ♥ Tus favoritos van primero.</p><div class="post-sticker-picker">${stickerTiles('post')}</div>`,true,'post-sticker');
}
function postMentionPicker(){
  modal('<h2 id="modalTitle">Menciona a tu gente.</h2><p class="modal-intro">Personas de la comunidad y personajes del universo. Hasta 10 por publicación.</p><label class="search-field">'+icon('search')+'<input id="mentionSearch" aria-label="Buscar persona o personaje" placeholder="Busca un nombre…"></label><div class="mention-results" id="mentionResults"></div>',false,'post-mention');
  const show=q=>{$('#mentionResults').innerHTML=state.profiles.filter(p=>norm(p.name).includes(norm(q))).slice(0,25).map(p=>`<button class="person-row" data-social="choose-mention" data-id="${esc(p.id)}" ${postDraft.mentions.includes(p.id)?'disabled':''}>${avatar(p)}<span><strong>${esc(p.name)}</strong><small>${p.character?'Personaje':'Comunidad'}${postDraft.mentions.includes(p.id)?' · Añadido':''}</small></span>${icon('plus')}</button>`).join('')||'<p>No encontramos ese perfil.</p>';};show('');$('#mentionSearch').addEventListener('input',e=>show(e.target.value));$('#mentionSearch').focus();
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-social]');if(!b)return;e.preventDefault();
  try{switch(b.dataset.social){
    case'my-posts':if(requireAuth())go('perfil/'+encodeURIComponent(state.user.id));break;
    case'refresh-feed':await loadPosts();break;case'more-posts':await loadPosts(true);break;
    case'post-image':$('#postImageInput').click();break;case'post-sticker':await postStickerPicker();break;case'post-mention':postMentionPicker();break;
    case'choose-post-sticker':if(postDraft.preview)URL.revokeObjectURL(postDraft.preview);Object.assign(postDraft,{sticker:{id:b.dataset.id,src:b.dataset.src},file:null,preview:null});closeModal();renderPostDraft();break;
    case'remove-post-media':if(postDraft.preview)URL.revokeObjectURL(postDraft.preview);Object.assign(postDraft,{sticker:null,file:null,preview:null});renderPostDraft();break;
    case'choose-mention':if(postDraft.mentions.length>=10){toast('Puedes mencionar hasta 10 perfiles.',true);break;}postDraft.mentions.push(b.dataset.id);closeModal();renderPostDraft();break;
    case'remove-mention':postDraft.mentions=postDraft.mentions.filter(id=>id!==b.dataset.id);renderPostDraft();break;
    case'archive-toggle':{const f=$('#postsFeed');f.dataset.archived=String(f.dataset.archived!=='true');b.textContent=f.dataset.archived==='true'?'Ver publicaciones':'Ver archivo';loadPosts();break;}
    case'archive-post':b.disabled=true;await api('/posts/'+b.dataset.id,{method:'PATCH',body:{archived:b.dataset.archived!=='true'}});await loadPosts();toast(b.dataset.archived==='true'?'Publicación restaurada.':'Publicación archivada. Puedes restaurarla desde tu archivo.');break;
    case'view-post-image':modal(`<h2 id="modalTitle" class="sr-only">Imagen de la publicación</h2><img class="post-full-image" src="${esc(b.dataset.src)}" alt="Imagen ampliada">`,true,'post-image');break;
  }}catch(error){toast(error.message,true);b.disabled=false;}
});
