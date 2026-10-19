'use strict';
const beforeModerationStream=startStream;
startStream=function(){beforeModerationStream();state.stream?.addEventListener('moderation',async event=>{
 const m=JSON.parse(event.data);
 if(m.kind==='post'){
  if(m.removed){postElement(m.id)?.remove();postCache.delete(m.id);commentThreads.delete(m.id);if($('#postsFeed')&&!$('#postsFeed .post-card'))await loadPosts();}
  else if($('#postsFeed'))await loadPosts();
 }else{
  const thread=commentThreads.get(m.post);if(thread){if(m.removed)thread.comments=thread.comments.filter(c=>c.id!==m.id);renderThread(m.post);if(!m.removed)await loadComments(m.post);}
  await refreshPostActivity({post:m.post});
 }
});};
async function moderationPanel(){
 if(!state.user?.staff)return;
 modal('<div class="modal-kicker">STAFF DE THE XPEDITION</div><h2 id="modalTitle">Contenido retirado.</h2><p class="modal-intro">Las eliminaciones se pueden deshacer aquí. El contenido y las cuentas se conservan.</p><div id="moderationList" class="moderation-list">Cargando…</div>',false,'moderation');
 try{const r=await api('/moderation');if(!$('#moderationList'))return;$('#moderationList').innerHTML=r.removals.map(item=>`<article><div><span>${item.kind==='post'?'PUBLICACIÓN':'COMENTARIO'} · ${esc(shortDate(item.created))}</span><p>${esc(item.text||'Publicación con contenido multimedia')}</p></div><button class="btn secondary small" data-moderation="restore" data-kind="${item.kind}" data-id="${esc(item.id)}">Restaurar</button></article>`).join('')||'<p>No hay contenido retirado. Todo está en su lugar.</p>';}catch(e){if($('#moderationList'))$('#moderationList').textContent=e.message;}
}
function confirmModeration(button){
 if(!state.user?.staff)return;
 const kind=button.dataset.kind,id=button.dataset.id,isPost=kind==='post';
 modal(`<div class="modal-kicker">MODERACIÓN DE LA COMUNIDAD</div><h2 id="modalTitle">¿Eliminar ${isPost?'esta publicación':'este comentario'}?</h2><p class="modal-intro">Dejará de ser visible en la comunidad. Podrás restaurarlo desde Moderación en el menú de tu cuenta.</p><p class="form-error" id="moderationError" role="alert"></p><div class="moderation-actions"><button class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn danger" id="confirmModeration">Eliminar ${isPost?'publicación':'comentario'}</button></div>`,false,'confirm-moderation');
 $('#confirmModeration').addEventListener('click',async event=>{
  event.target.disabled=true;try{await api('/'+(isPost?'posts':'comments')+'/'+id,{method:'DELETE'});closeModal();toast((isPost?'Publicación eliminada.':'Comentario eliminado.')+' Puedes restaurarlo desde Moderación.');if(isPost){postElement(id)?.remove();postCache.delete(id);}else{const post=button.dataset.post,thread=commentThreads.get(post);if(thread){thread.comments=thread.comments.filter(c=>c.id!==id);renderThread(post);}await refreshPostActivity({post});}}catch(error){$('#moderationError').textContent=error.message;event.target.disabled=false;}
 });
}
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-moderation]');if(!b)return;event.preventDefault();
 if(b.dataset.moderation==='panel'){$('.account-menu')?.remove();await moderationPanel();}
 if(b.dataset.moderation==='remove')confirmModeration(b);
 if(b.dataset.moderation==='restore'){b.disabled=true;try{await api('/moderation/'+b.dataset.kind+'/'+b.dataset.id+'/restore',{method:'POST',body:{}});await moderationPanel();toast('Contenido restaurado.');}catch(error){toast(error.message,true);b.disabled=false;}}
});
