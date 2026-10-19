'use strict';
const postCache=new Map(),commentThreads=new Map(),commentSending=new Set();
function reactionSummary(reactions,kind,id,post){return (reactions||[]).map(r=>`<button class="social-reaction-chip ${r.mine?'mine':''}" data-social="social-pick-reaction" data-kind="${kind}" data-id="${esc(id)}" data-post="${esc(post)}" data-emoji="${esc(r.emoji)}" aria-label="Reaccionar con ${esc(r.emoji)} · ${r.count}" aria-pressed="${!!r.mine}"><span>${esc(r.emoji)}</span> ${r.count}</button>`).join('');}
function postEngagement(post){return `<div class="post-engagement"><div class="post-reactions" aria-label="Reacciones a la publicación">${reactionSummary(post.reactions,'post',post.id,post.id)}</div><div class="post-action-row"><button data-social="social-reactions" data-kind="post" data-id="${esc(post.id)}" data-post="${esc(post.id)}" aria-label="Reaccionar a la publicación">${icon('smile')} Reaccionar</button><button data-social="toggle-comments" data-id="${esc(post.id)}" aria-expanded="false">${icon('chat')} <span class="comment-count">Comentar${post.commentsCount?' · '+post.commentsCount:''}</span></button></div></div><section class="post-comments" data-comments-for="${esc(post.id)}" hidden><button class="older-comments link-button" data-social="older-comments" data-id="${esc(post.id)}" hidden>Ver comentarios anteriores</button><div class="comments-list" aria-live="polite"></div>${state.user?`<form class="comment-form" data-post="${esc(post.id)}"><label class="sr-only" for="comment-${esc(post.id)}">Escribe un comentario</label><textarea class="comment-input" id="comment-${esc(post.id)}" name="comment" rows="2" maxlength="1500" placeholder="Escribe un comentario…" required></textarea><button class="btn primary small" type="submit">Enviar ${icon('send')}</button><p class="form-error" role="alert"></p></form>`:'<button class="btn secondary small" data-action="login">Inicia sesión para comentar</button>'}</section>`;}
const postElement=id=>$(`.post-card[data-post-id="${CSS.escape(id)}"]`);
const threadElement=id=>$(`[data-comments-for="${CSS.escape(id)}"]`);
function commentHtml(c){return `<article class="social-comment" data-comment-id="${esc(c.id)}"><button class="comment-avatar" data-action="profile" data-id="${esc(c.author.id)}" aria-label="Ver perfil de ${esc(c.author.name)}">${avatar(c.author)}</button><div class="comment-main"><div class="comment-bubble"><button class="comment-author" data-action="profile" data-id="${esc(c.author.id)}">${esc(c.author.name)}${verifiedBadge(c.author)}</button><p>${linkify(c.text)}</p></div><div class="comment-meta"><span>${shortDate(c.created)}${c.edited?' · editado':''}</span><button data-social="social-reactions" data-kind="comment" data-id="${esc(c.id)}" data-post="${esc(c.post)}" aria-label="Reaccionar al comentario de ${esc(c.author.name)}">Reaccionar</button>${state.user?.staff?`<button class="moderation-delete" data-moderation="remove" data-kind="comment" data-id="${esc(c.id)}" data-post="${esc(c.post)}" aria-label="Eliminar comentario de ${esc(c.author.name)}">Eliminar</button>`:''}${c.author.id===state.user?.id?`<button data-social="edit-comment" data-id="${esc(c.id)}" data-post="${esc(c.post)}">Editar</button>`:''}</div><div class="comment-reactions">${reactionSummary(c.reactions,'comment',c.id,c.post)}</div></div></article>`;}
function renderThread(id){
  const root=threadElement(id),thread=commentThreads.get(id);if(!root||!thread)return;
  $('.comments-list',root).innerHTML=thread.comments.map(commentHtml).join('')||'<p class="comments-empty">Sé la primera persona en comentar.</p>';
  $('.older-comments',root).hidden=!thread.hasMore;
}
async function loadComments(id,older=false){
  const root=threadElement(id);if(!root)return;let thread=commentThreads.get(id)||{comments:[],hasMore:false};
  const params=new URLSearchParams();if(older&&thread.comments.length){params.set('before',thread.comments[0].created);params.set('beforeId',thread.comments[0].id);}
  if(!older&&!thread.comments.length)$('.comments-list',root).innerHTML='<p class="comments-empty">Cargando comentarios…</p>';
  try{const result=await api('/posts/'+id+'/comments?'+params);if(!root.isConnected)return;
    const merged=new Map((older?[...result.comments,...thread.comments]:result.comments).map(c=>[c.id,c]));thread={comments:[...merged.values()].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id)),hasMore:result.hasMore};commentThreads.set(id,thread);renderThread(id);
  }catch(error){$('.comments-list',root).innerHTML=`<p class="form-error">${esc(error.message)}</p>`;}
}
function mergeComment(comment){let thread=commentThreads.get(comment.post);if(!thread)return;const i=thread.comments.findIndex(c=>c.id===comment.id);if(i>=0)thread.comments[i]=comment;else thread.comments.push(comment);thread.comments.sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));renderThread(comment.post);}
function updatePostSummary(id,reactions,count){
  const p=postCache.get(id),root=postElement(id);if(p){p.reactions=reactions;if(count!==undefined)p.commentsCount=count;}
  if(!root)return;$('.post-reactions',root).innerHTML=reactionSummary(reactions,'post',id,id);if(count!==undefined)$('.comment-count',root).textContent='Comentar'+(count?' · '+count:'');
}
async function refreshPostActivity(payload){
  if(!postElement(payload.post))return;
  try{const data=await api('/posts/'+payload.post+'/activity');updatePostSummary(payload.post,data.reactions,data.commentsCount);
    if(payload.comment&&commentThreads.has(payload.post)){const c=await api('/comments/'+payload.comment);mergeComment(c.comment);}
  }catch{}
}
const priorSocialStream=startStream;
startStream=function(){priorSocialStream();state.stream?.addEventListener('post-activity',event=>refreshPostActivity(JSON.parse(event.data)));};
const priorSocialLogout=logout;
logout=async function(){closeChatPopover(false);postCache.clear();commentThreads.clear();await priorSocialLogout();};
async function socialReactionPicker(button,expanded=false){
  if(!requireAuth())return;await chatAssetsReady;
  const context={mode:'social',kind:button.dataset.kind,id:button.dataset.id,post:button.dataset.post};
  const data=e=>`data-social="social-pick-reaction" data-kind="${context.kind}" data-id="${esc(context.id)}" data-post="${esc(context.post)}" data-emoji="${esc(e)}"`;
  const quick=`<div class="quick-reactions">${quickReactions().map(e=>`<button ${data(e)} aria-label="Reaccionar con ${esc(e)}">${esc(e)}</button>`).join('')}<button class="reaction-plus" data-social="social-more" data-kind="${context.kind}" data-id="${esc(context.id)}" data-post="${esc(context.post)}" aria-label="Más reacciones">${icon('plus')}</button></div>`;
  const full=`<div class="chat-picker social-emoji-picker"><div class="picker-heading"><strong>Elige una reacción</strong><button data-social="close-social-picker" aria-label="Cerrar selector">${icon('close')}</button></div><label class="picker-search">${icon('search')}<input id="socialEmojiSearch" type="search" aria-label="Buscar reacción" placeholder="Buscar emoji"></label><div class="emoji-results" id="socialEmojiResults">${emojiList().map(e=>`<button ${data(e.emoji)} aria-label="${esc(e.name)}" title="${esc(e.name)}">${esc(e.emoji)}</button>`).join('')}</div></div>`;
  const anchor=expanded?(context.kind==='post'?postElement(context.id)?.querySelector('[data-social="social-reactions"]'):threadElement(context.post)?.querySelector(`[data-comment-id="${CSS.escape(context.id)}"] [data-social="social-reactions"]`)):button;
  if(!anchor)return;
  showChatPopover(anchor,expanded?full:quick,context,'Reaccionar '+(context.kind==='post'?'a la publicación':'al comentario'));
  if(expanded){$('#socialEmojiSearch').addEventListener('input',event=>{const q=norm(event.target.value);$('#socialEmojiResults').innerHTML=emojiList().filter(e=>norm(e.name+' '+e.emoji).includes(q)).map(e=>`<button ${data(e.emoji)} aria-label="${esc(e.name)}">${esc(e.emoji)}</button>`).join('');});$('#socialEmojiSearch').focus();}
}
async function setSocialReaction(button){
  if(!requireAuth())return;const {kind,id,post,emoji}=button.dataset;
  const reactions=kind==='post'?postCache.get(id)?.reactions:commentThreads.get(post)?.comments.find(c=>c.id===id)?.reactions;
  const chosen=reactions?.some(r=>r.mine&&r.emoji===emoji)?'':emoji;button.disabled=true;
  try{const result=await api('/'+(kind==='post'?'posts':'comments')+'/'+id+'/reaction',{method:'POST',body:{emoji:chosen}});closeChatPopover(false);
    if(kind==='post')updatePostSummary(id,result.reactions);else{const comment=commentThreads.get(post)?.comments.find(c=>c.id===id);if(comment){comment.reactions=result.reactions;renderThread(post);}}
  }finally{button.disabled=false;}
}
async function editSocialComment(button){
  const comment=commentThreads.get(button.dataset.post)?.comments.find(c=>c.id===button.dataset.id);if(!comment)return;
  modal(`<h2 id="modalTitle">Edita tu comentario.</h2><form id="editCommentForm"><label class="form-field">Comentario<textarea id="editCommentText" maxlength="1500" required>${esc(comment.text)}</textarea></label><p class="form-error" id="editCommentError" role="alert"></p><button class="btn primary full" type="submit">Guardar cambios</button></form>`,false,'edit-comment');
  $('#editCommentForm').addEventListener('submit',async event=>{event.preventDefault();const submit=$('button[type="submit"]',event.target);submit.disabled=true;try{const result=await api('/comments/'+comment.id,{method:'PATCH',body:{text:$('#editCommentText').value}});mergeComment(result.comment);closeModal();}catch(error){$('#editCommentError').textContent=error.message;}finally{submit.disabled=false;}});
}
const priorCoverProfile=renderProfile;
renderProfile=function(id){
  priorCoverProfile(id);const p=getProfile(id);if(!p||p.character)return;
  const cover=$('.profile-cover');if(!cover)return;
  if(p.cover){cover.classList.add('uploaded-cover');cover.innerHTML=`<img src="${esc(p.cover)}" alt="Foto de portada de ${esc(p.name)}" style="object-position:center ${Number(p.coverPosition??50)}%">`;}
  if(state.user?.id===id)cover.insertAdjacentHTML('beforeend',`<button class="btn secondary small cover-edit" data-social="edit-cover">${icon('image')} ${p.cover?'Cambiar portada':'Añadir portada'}</button>`);
};
function editCover(){
  if(!requireAuth())return;let file=null,preview=null;const u=state.user;
  modal(`<h2 id="modalTitle">Tu foto de portada.</h2><p class="modal-intro">Elige una imagen y ajusta el encuadre. Cubrirá toda la portada.</p><form id="coverForm"><div class="cover-preview">${u.cover?`<img id="coverPreviewImage" src="${esc(u.cover)}" style="object-position:center ${u.coverPosition}%" alt="Vista previa de la portada">`:'<span>Elige una imagen para tu portada</span>'}</div><label class="btn secondary full cover-file-label">${icon('image')} Elegir imagen<input type="file" id="coverInput" accept="image/png,image/jpeg,image/webp" hidden></label><label class="form-field cover-position-label">Encuadre vertical<input id="coverPosition" type="range" min="0" max="100" value="${u.coverPosition??50}"></label><p class="form-hint">PNG, JPG o WebP · Hasta 4 MB. La imagen se revisa antes de publicarse.</p><p id="coverError" class="form-error" role="alert"></p><button type="submit" class="btn primary full" id="saveCover">Guardar portada</button></form>`,true,'profile-cover');
  $('#coverPosition').addEventListener('input',event=>{const image=$('#coverPreviewImage');if(image)image.style.objectPosition='center '+event.target.value+'%';});
  $('#coverInput').addEventListener('change',event=>{const selected=event.target.files[0];if(!selected)return;if(selected.size>4*1024*1024||!['image/png','image/jpeg','image/webp'].includes(selected.type)){toast('Elige una imagen PNG, JPG o WebP de hasta 4 MB.',true);return;}file=selected;if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(file);$('.cover-preview').innerHTML=`<img id="coverPreviewImage" src="${esc(preview)}" alt="Vista previa de la portada" style="object-position:center ${$('#coverPosition').value}%">`;});
  $('#modal').addEventListener('close',()=>{if(preview)URL.revokeObjectURL(preview);},{once:true});
  $('#coverForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!file&&!u.cover){$('#coverError').textContent='Elige una imagen para tu portada.';return;}
    const form=event.target,button=$('#saveCover'),position=Number($('#coverPosition').value);button.disabled=true;button.textContent=file?'Revisando imagen…':'Guardando…';$('#coverError').textContent='';
    try{const result=await api('/me/cover',{method:'POST',body:{image:file?await fileToBase64(file):undefined,position}});state.user=result.user;await refreshProfiles();if(state.modal==='profile-cover')closeModal();if(state.route==='perfil')renderProfile(decodeURIComponent(location.hash.split('/')[1]||''));toast('Tu portada está actualizada.');}
    catch(error){if(form.isConnected)$('#coverError').textContent=error.message;else toast(error.message,true);}
    finally{if(button.isConnected){button.disabled=false;button.textContent='Guardar portada';}}
  });
}
document.addEventListener('submit',async event=>{
  const form=event.target.closest('.comment-form');if(!form)return;event.preventDefault();if(!requireAuth())return;
  const id=form.dataset.post,input=$('.comment-input',form),text=input.value.trim();if(!text||commentSending.has(id))return;
  const button=$('button[type="submit"]',form);commentSending.add(id);button.disabled=true;$('.form-error',form).textContent='';
  if(form.dataset.retryText!==text){form.dataset.retryText=text;form.dataset.retryId=crypto.randomUUID();}
  try{const result=await api('/posts/'+id+'/comments',{method:'POST',body:{text,id:form.dataset.retryId}});if(input.value.trim()===text)input.value='';delete form.dataset.retryId;delete form.dataset.retryText;mergeComment(result.comment);const p=postCache.get(id);updatePostSummary(id,p?.reactions||[],result.commentsCount);}
  catch(error){$('.form-error',form).textContent=error.message;}
  finally{commentSending.delete(id);button.disabled=false;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-social]');if(!button)return;
  try{switch(button.dataset.social){
    case'social-reactions':await socialReactionPicker(button);break;
    case'social-more':await socialReactionPicker(button,true);break;
    case'close-social-picker':closeChatPopover();break;
    case'social-pick-reaction':await setSocialReaction(button);break;
    case'toggle-comments':{const id=button.dataset.id,root=threadElement(id);root.hidden=!root.hidden;button.setAttribute('aria-expanded',String(!root.hidden));if(!root.hidden){if(!commentThreads.has(id))await loadComments(id);else renderThread(id);$('.comment-input',root)?.focus({preventScroll:true});}break;}
    case'older-comments':await loadComments(button.dataset.id,true);break;
    case'edit-comment':await editSocialComment(button);break;
    case'edit-cover':editCover();break;
  }}catch(error){toast(error.message,true);}
});
init();
