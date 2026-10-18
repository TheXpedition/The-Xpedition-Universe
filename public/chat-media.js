'use strict';
let chatMediaView=null;
function chatMediaMarkup(m){
 const video=m.type==='video',label=(video?'Ampliar video':'Ampliar imagen')+' de '+m.sender.name;
 return `<button class="chat-media-preview ${video?'video-preview':''}" data-media="open" data-id="${esc(m.id)}" aria-label="${esc(label)}">${video?`<video class="chat-video" src="${esc(m.url)}#t=0.1" preload="metadata" muted playsinline aria-hidden="true"></video><span class="media-play">${icon('play')}</span>`:`<img class="chat-image" src="${esc(m.url)}" alt="Imagen enviada por ${esc(m.sender.name)}" loading="lazy">`}</button>`;
}
function mediaThumbnail(m){return m.type==='video'?`<video src="${esc(m.url)}#t=0.1" preload="metadata" muted playsinline aria-hidden="true"></video><span class="media-thumb-play">${icon('play')}</span>`:`<img src="${esc(m.url)}" alt="" loading="lazy">`;}
const mediaEndpoint=(id,limit=36,before)=>'/conversations/'+encodeURIComponent(id)+'/media?limit='+limit+(before?'&before='+before:'');
async function refreshChatMediaPreview(id){
 const root=$('#chatMediaPreview');if(!root||root.dataset.conversation!==id)return;
 try{const result=await api(mediaEndpoint(id,3));if(!root.isConnected)return;
  root.innerHTML=`<div class="section-head"><h3>Multimedia</h3>${result.total?`<button class="link-button" data-media="all" data-conversation="${esc(id)}">Ver todo · ${result.total}</button>`:''}</div>${result.total?`<div class="chat-media-summary">${result.media.map((m,i)=>`<button class="media-summary-tile" data-media="open" data-id="${esc(m.id)}" data-conversation="${esc(id)}" aria-label="Ver ${m.type==='video'?'video':'imagen'} de ${esc(m.sender.name)}${i===2&&result.total>3?' y '+(result.total-3)+' archivos más':''}">${mediaThumbnail(m)}${i===2&&result.total>3?`<span class="media-more-count">+${result.total-3}</span>`:''}</button>`).join('')}</div>`:'<p class="media-empty">Las imágenes y los videos que compartan aparecerán aquí.</p>'}`;
 }catch(error){if(root.isConnected)root.innerHTML=`<h3>Multimedia</h3><p class="form-error">${esc(error.message)}</p><button class="link-button" data-media="retry-preview" data-conversation="${esc(id)}">Reintentar</button>`;}
}
const beforeChatMediaInfo=chatInfo;
chatInfo=function(){beforeChatMediaInfo();const id=state.active;if(!id||!$('#modalContent'))return;const html=`<section id="chatMediaPreview" class="chat-media-info" data-conversation="${esc(id)}"><h3>Multimedia</h3><p class="media-empty">Cargando imágenes y videos…</p></section>`;const intro=$('.modal-intro',$('#modalContent'));if(intro)intro.insertAdjacentHTML('afterend',html);else $('#modalContent').insertAdjacentHTML('beforeend',html);refreshChatMediaPreview(id);};

const mediaDialog=document.createElement('dialog');mediaDialog.id='chatMediaDialog';mediaDialog.className='chat-media-viewer';mediaDialog.setAttribute('aria-labelledby','chatMediaTitle');document.body.append(mediaDialog);
function pauseChatMedia(){for(const media of $$('video,audio',mediaDialog))media.pause();}
function closeChatMedia(){pauseChatMedia();if(mediaDialog.open)mediaDialog.close();mediaDialog.innerHTML='';chatMediaView=null;}
mediaDialog.addEventListener('close',()=>{pauseChatMedia();mediaDialog.innerHTML='';chatMediaView=null;});
window.addEventListener('hashchange',closeChatMedia);
const beforeMediaLogout=logout;
logout=async function(){closeChatMedia();await beforeMediaLogout();};
function mediaStripMarkup(v){return v.items.map(item=>`<button class="media-viewer-thumb ${item.id===v.selected?'selected':''}" data-media="select" data-id="${esc(item.id)}" aria-label="Ver ${item.type==='video'?'video':'imagen'} de ${esc(item.sender.name)}" aria-pressed="${item.id===v.selected}">${mediaThumbnail(item)}</button>`).join('')+(v.hasMore?'<button class="media-load-more" data-media="load-more">Ver anteriores +</button>':'');}
function refreshChatMediaNavigation(){const v=chatMediaView,strip=$('.media-viewer-strip',mediaDialog);if(!v||!strip)return;strip.innerHTML=mediaStripMarkup(v);$('.media-viewer-footer>p',mediaDialog).textContent=v.total+' '+(v.total===1?'archivo compartido':'archivos compartidos');const i=v.items.findIndex(m=>m.id===v.selected);$('.media-viewer-arrow.previous',mediaDialog).disabled=i<=0;$('.media-viewer-arrow.next',mediaDialog).disabled=i>=v.items.length-1&&!v.hasMore;}
async function openChatMediaViewer(id,conversation=state.active){
 if(!requireAuth()||!conversation)return;
 closeChatPopover(false);closeChatMedia();
 const view={conversation,items:[],selected:id||null,before:null,hasMore:false,total:0,loading:false};chatMediaView=view;
 mediaDialog.innerHTML='<div class="media-viewer-toolbar"><h2 id="chatMediaTitle">Multimedia</h2><button class="icon-button" data-media="close" aria-label="Cerrar multimedia">'+icon('close')+'</button></div><p class="media-viewer-status">Cargando imágenes y videos…</p>';mediaDialog.showModal();
 try{const [page,selected]=await Promise.all([api(mediaEndpoint(conversation)),id?api('/messages/'+encodeURIComponent(id)):Promise.resolve(null)]);if(chatMediaView!==view)return;
  view.items=page.media;view.total=page.total;view.hasMore=page.hasMore;view.before=page.media.at(-1)?.created;
  const m=selected?.message;if(m&&m.conversation===conversation&&['image','video'].includes(m.type)&&!view.items.some(x=>x.id===m.id))view.items.push(m);
  view.items.sort((a,b)=>b.created-a.created);view.selected=m&&['image','video'].includes(m.type)?m.id:view.items[0]?.id;renderChatMediaViewer();
 }catch(error){if(chatMediaView===view){$('.media-viewer-status',mediaDialog).textContent=error.message;}}
}
function renderChatMediaViewer(){
 const v=chatMediaView;if(!v)return;pauseChatMedia();
 const index=v.items.findIndex(m=>m.id===v.selected),m=v.items[index],c=state.conversations.find(c=>c.id===v.conversation);
 mediaDialog.innerHTML=`<header class="media-viewer-toolbar"><div><h2 id="chatMediaTitle">${esc(c?chatTitle(c):'Multimedia')}</h2><p>${m?esc(m.sender.name)+' · '+esc(date(m.created))+' · '+esc(time(m.created)):''}</p></div><button class="icon-button" data-media="close" aria-label="Cerrar multimedia">${icon('close')}</button></header>${m?`<div class="media-viewer-stage"><button class="media-viewer-arrow previous" data-media="previous" aria-label="Archivo anterior" ${index<=0?'disabled':''}>${icon('back')}</button><div class="media-viewer-content">${m.type==='video'?`<video src="${esc(m.url)}" controls playsinline preload="metadata" aria-label="Video de ${esc(m.sender.name)}"></video>`:`<img src="${esc(m.url)}" alt="Imagen enviada por ${esc(m.sender.name)}">`}</div><button class="media-viewer-arrow next" data-media="next" aria-label="Archivo siguiente" ${index>=v.items.length-1&&!v.hasMore?'disabled':''}>${icon('arrow')}</button></div><footer class="media-viewer-footer"><p>${v.total} ${v.total===1?'archivo compartido':'archivos compartidos'}</p><div class="media-viewer-strip" aria-label="Imágenes y videos de la conversación">${v.items.map(item=>`<button class="media-viewer-thumb ${item.id===m.id?'selected':''}" data-media="select" data-id="${esc(item.id)}" aria-label="Ver ${item.type==='video'?'video':'imagen'} de ${esc(item.sender.name)}" aria-pressed="${item.id===m.id}">${mediaThumbnail(item)}</button>`).join('')}${v.hasMore?'<button class="media-load-more" data-media="load-more">Ver anteriores +</button>':''}</div><p class="media-viewer-error" role="alert"></p></footer>`:'<p class="media-viewer-status">Todavía no hay imágenes ni videos en esta conversación.</p>'}`;
 for(const media of $$('img,video',mediaDialog))media.addEventListener('error',()=>{const error=$('.media-viewer-error',mediaDialog);if(error&&media.closest('.media-viewer-content'))error.textContent='Este archivo no está disponible.';},{once:true});
 $('.media-viewer-content video',mediaDialog)?.addEventListener('play',event=>{for(const other of $$('audio,video'))if(other!==event.target)other.pause();});
 $('.media-viewer-thumb.selected',mediaDialog)?.scrollIntoView({block:'nearest',inline:'nearest'});
}
async function loadEarlierChatMedia(){
 const v=chatMediaView;if(!v||v.loading||!v.hasMore)return;v.loading=true;
 try{const page=await api(mediaEndpoint(v.conversation,36,v.before));if(chatMediaView!==v)return;
  v.items=[...new Map([...v.items,...page.media].map(m=>[m.id,m])).values()].sort((a,b)=>b.created-a.created);v.before=page.media.at(-1)?.created;v.hasMore=page.hasMore;v.total=page.total;refreshChatMediaNavigation();
 }catch(error){const el=$('.media-viewer-error',mediaDialog);if(el)el.textContent=error.message;}finally{v.loading=false;}
}
async function stepChatMedia(direction){const v=chatMediaView;if(!v)return;const index=v.items.findIndex(m=>m.id===v.selected);if(index+direction===v.items.length&&v.hasMore)await loadEarlierChatMedia();if(chatMediaView!==v)return;const next=v.items[index+direction];if(next){v.selected=next.id;renderChatMediaViewer();}}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-media]');if(!button)return;
 try{switch(button.dataset.media){
  case'open':await openChatMediaViewer(button.dataset.id,button.dataset.conversation||state.active);break;
  case'all':await openChatMediaViewer(null,button.dataset.conversation);break;
  case'retry-preview':await refreshChatMediaPreview(button.dataset.conversation);break;
  case'close':closeChatMedia();break;
  case'select':if(chatMediaView){chatMediaView.selected=button.dataset.id;renderChatMediaViewer();}break;
  case'previous':await stepChatMedia(-1);break;
  case'next':await stepChatMedia(1);break;
  case'load-more':await loadEarlierChatMedia();break;
 }}catch(error){toast(error.message,true);}
});
mediaDialog.addEventListener('keydown',event=>{if(['INPUT','TEXTAREA','VIDEO'].includes(event.target.tagName))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepChatMedia(event.key==='ArrowLeft'?-1:1);}});
const beforeMediaStream=startStream;
startStream=function(){beforeMediaStream();state.stream?.addEventListener('message',event=>{
 const {conversation,message}=JSON.parse(event.data);if($('#chatMediaPreview')?.dataset.conversation===conversation)refreshChatMediaPreview(conversation);
 const v=chatMediaView;if(!v||v.conversation!==conversation)return;const index=v.items.findIndex(m=>m.id===message.id);
 if(message.type==='deleted'&&index>=0){v.items.splice(index,1);v.total=Math.max(0,v.total-1);if(v.selected===message.id){v.selected=v.items[Math.min(index,v.items.length-1)]?.id;renderChatMediaViewer();}else refreshChatMediaNavigation();}
 else if(['image','video'].includes(message.type)&&index<0){v.items.unshift(message);v.total++;refreshChatMediaNavigation();}
});state.stream?.addEventListener('conversations',async()=>{const v=chatMediaView;if(v){try{await api(mediaEndpoint(v.conversation,1));}catch{if(chatMediaView===v)closeChatMedia();}}});};
