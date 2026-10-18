'use strict';
icons.sticker='<path d="M20 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8z"/><path d="M13 20v-5a2 2 0 0 1 2-2h5M7 8h.01M12 8h.01M7 12s2 2 5 0"/>';
icons.stop='<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>';
const defaultReactions=['❤️','😂','😮','😢','😡','👍'];
let emojiGroups=[],chatStickers=[],chatPopover=null,popoverAnchor=null,popoverContext=null,emojiQuery='',emojiCategory=0,customSlot=0;
const chatAssetsReady=Promise.all([fetch('chat-emojis.json').then(r=>r.json()),fetch('stickers.json').then(r=>r.json())]).then(([emojis,stickers])=>{emojiGroups=emojis;chatStickers=stickers;}).catch(()=>{emojiGroups=[{name:'Reacciones',items:defaultReactions.map(emoji=>({emoji,name:emoji}))}];});
const emojiList=()=>emojiGroups.flatMap(g=>g.items);
function quickReactions(){try{const list=JSON.parse(localStorage.getItem('xp-reactions:'+state.user?.id));if(Array.isArray(list)&&list.length===6&&new Set(list).size===6&&list.every(e=>emojiList().some(x=>x.emoji===e)))return list;}catch{}return [...defaultReactions];}
function clockTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');}

function syncChatViewport(){
 document.documentElement.style.setProperty('--chat-screen-height',(window.visualViewport?.height||innerHeight)+'px');
 document.documentElement.style.setProperty('--chat-nav-height',($('.topbar')?.getBoundingClientRect().height||84)+'px');
}
new ResizeObserver(syncChatViewport).observe($('.topbar'));
const originalMessengerPage=renderMessenger;
renderMessenger=function(){originalMessengerPage();document.body.classList.toggle('chat-fullscreen',!!$('#messenger'));syncChatViewport();};
window.visualViewport?.addEventListener('resize',syncChatViewport);window.addEventListener('resize',()=>{syncChatViewport();closeChatPopover(false);});
window.addEventListener('hashchange',()=>{closeChatPopover(false);syncChatViewport();});syncChatViewport();

function voiceMarkup(src,label,durationMs=0){
 return `<div class="voice-note" data-duration-ms="${Number(durationMs)||0}"><audio src="${esc(src)}" preload="metadata" aria-label="${esc(label)}"></audio><button class="voice-play" data-chat="voice-toggle" aria-label="Reproducir audio">${icon('play')}</button><div class="voice-main"><div class="voice-wave" aria-hidden="true">${Array.from({length:34},(_,i)=>`<i style="--bar:${[25,40,65,32,82,55,100,72,45,88,63,35,76,94,48,70,32][i%17]}%"></i>`).join('')}</div><input class="voice-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Avanzar o retroceder el audio"><div class="voice-details"><span class="voice-time">0:00</span><span class="voice-label">Nota de voz</span><span class="voice-total">${clockTime(durationMs/1000)}</span></div></div><button class="voice-speed" data-chat="voice-speed" aria-label="Velocidad de reproducción: 1">1×</button><span class="voice-error" role="status" hidden></span></div>`;
}
function hydrateVoiceNotes(root=document){
 $$('.voice-note',root).forEach(player=>{
  if(player.dataset.bound)return;player.dataset.bound='true';const audio=$('audio',player),seek=$('.voice-seek',player),button=$('.voice-play',player);
  audio.muted=false;audio.volume=1;
  const update=()=>{
   const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:Number(player.dataset.durationMs)/1000;
   const progress=duration?Math.min(1000,audio.currentTime/duration*1000):0;
   if(document.activeElement!==seek)seek.value=String(progress);seek.disabled=!duration;
   player.style.setProperty('--voice-progress',progress/10+'%');$('.voice-time',player).textContent=clockTime(audio.currentTime);$('.voice-total',player).textContent=clockTime(duration);
   const playing=!audio.paused&&!audio.ended;player.classList.toggle('playing',playing);button.innerHTML=icon(playing?'pause':'play');button.setAttribute('aria-label',playing?'Pausar audio':'Reproducir audio');
  };
  ['loadedmetadata','durationchange','timeupdate','pause','ended','playing','ratechange'].forEach(event=>audio.addEventListener(event,update));
  audio.addEventListener('play',()=>{$$('audio').forEach(other=>{if(other!==audio)other.pause();});player.classList.remove('loading');update();});
  audio.addEventListener('waiting',()=>player.classList.add('loading'));audio.addEventListener('canplay',()=>player.classList.remove('loading'));
  audio.addEventListener('error',()=>{player.classList.remove('loading');const error=$('.voice-error',player);error.textContent='No se pudo cargar. Toca reproducir para reintentar.';error.hidden=false;});
  seek.addEventListener('input',()=>{const duration=Number.isFinite(audio.duration)?audio.duration:Number(player.dataset.durationMs)/1000;if(duration>0){audio.currentTime=Number(seek.value)/1000*duration;update();}});update();
 });
}
function messageHtml(m){
 const own=m.sender.id===state.user.id,c=state.conversations.find(c=>c.id===state.active),seen=own&&c?.members.filter(u=>u.id!==state.user.id).every(u=>u.readAt>=m.created);
 const reactions=[...new Set(m.reactions.map(r=>r.emoji))];
 const body=m.type==='deleted'?'Mensaje eliminado':m.type==='audio'?voiceMarkup(m.url,'Nota de voz de '+m.sender.name,m.durationMs):m.type==='image'||m.type==='sticker'?`<img class="${m.type==='sticker'?'chat-sticker':'chat-image'}" src="${esc(m.url)}" alt="${m.type==='sticker'?'Sticker':'Imagen'} enviado por ${esc(m.sender.name)}" ${m.type==='image'?`data-action="view-image" data-id="${m.id}"`:''} loading="lazy">`:linkify(m.text);
 return `<article class="message-row ${own?'own':''}" id="message-${m.id}" data-message-id="${m.id}">${!own?avatar(m.sender,'tiny'):''}<div class="message-wrap">${!own&&c?.type==='group'?`<div class="message-name">${esc(m.sender.name)}</div>`:''}<div class="bubble ${m.type==='deleted'?'deleted':''} ${m.type==='audio'?'voice-bubble':''} ${m.type==='sticker'?'sticker-bubble':''} ${m.type==='image'?'image-bubble':''}">${m.reply?`<button class="message-reply" data-action="jump-message" data-id="${m.reply.id}"><strong>${esc(m.reply.name)}</strong>${esc(m.reply.text.slice(0,100))}</button>`:''}${body}${m.type!=='text'&&m.type!=='deleted'&&m.text?`<div class="media-caption">${linkify(m.text)}</div>`:''}</div>${m.type!=='deleted'?`<div class="message-tools"><button class="icon-button" data-chat="reaction" data-id="${m.id}" aria-label="Reaccionar al mensaje">${icon('smile')}</button><button class="icon-button" data-action="message-options" data-id="${m.id}" aria-label="Opciones de mensaje">${icon('more')}</button></div>`:''}${reactions.length?`<div class="message-reactions">${reactions.map(emoji=>`<button class="${m.reactions.some(r=>r.emoji===emoji&&r.user_id===state.user.id)?'mine':''}" data-action="react" data-id="${m.id}" data-emoji="${esc(emoji)}" aria-label="Reacción ${esc(emoji)}" aria-pressed="${m.reactions.some(r=>r.emoji===emoji&&r.user_id===state.user.id)}"><span>${esc(emoji)}</span><small>${m.reactions.filter(r=>r.emoji===emoji).length}</small></button>`).join('')}</div>`:''}<div class="message-meta"><time datetime="${new Date(m.created).toISOString()}">${time(m.created)}</time>${m.edited&&m.type!=='deleted'?'<span>· editado</span>':''}${own?`<span class="${seen?'read':''}" title="${seen?'Leído por todos':'Enviado al servidor'}">${icon(seen?'checks':'check')}</span>`:''}</div></div></article>`;
}
function renderMessages(scroll=false){
 const history=$('#chatHistory');if(!history||!state.user)return;
 const oldTop=history.scrollTop,wasBottom=history.scrollHeight-oldTop-history.clientHeight<120,search=norm(state.messageSearch),list=state.messages.filter(m=>!search||norm(m.text+' '+m.sender.name+' '+messagePreview(m)).includes(search));
 const existing=new Map([...history.children].map(el=>[el.dataset.renderKey,el])),wanted=[];let previous='';
 const make=(html,key)=>{const template=document.createElement('template');template.innerHTML=html;const el=template.content.firstElementChild;el.dataset.renderKey=key;return el;};
 if(!search&&state.hasMore)wanted.push(existing.get('older')||make('<button class="load-more" data-action="older-messages">Cargar mensajes anteriores</button>','older'));
 for(const m of list){
  const day=new Date(m.created).toDateString();if(day!==previous){const key='day:'+day;wanted.push(existing.get(key)||make(`<div class="date-divider"><span>${date(m.created)}</span></div>`,key));previous=day;}
  const key='message:'+m.id,fresh=make(messageHtml(m),key),old=existing.get(key),body=JSON.stringify([m.type,m.text,m.url,m.reply,m.durationMs]);
  if(old){
   if(old.dataset.body!==body){$('audio',old)?.pause();$('.bubble',old).replaceWith($('.bubble',fresh));old.dataset.body=body;}
   for(const selector of ['.message-tools','.message-reactions','.message-meta']){
    const a=$(selector,old),b=$(selector,fresh);if(a?.outerHTML===b?.outerHTML)continue;
    if(a&&b)a.replaceWith(b);else if(a)a.remove();else if(b)$('.message-wrap',old).insertBefore(b,selector==='.message-reactions'?$('.message-meta',old):null);
   }
   wanted.push(old);
  }else{fresh.dataset.body=body;wanted.push(fresh);}
 }
 if(!list.length)wanted.push(make(empty(search?'No hay coincidencias.':'El comienzo de una historia.','Escribe el primer mensaje para romper el hielo.','','','chat'),'empty'));
 const keep=new Set(wanted);for(const child of [...history.children])if(!keep.has(child)){$$('audio',child).forEach(a=>a.pause());child.remove();}
 let cursor=history.firstElementChild;for(const child of wanted){if(child!==cursor)history.insertBefore(child,cursor);cursor=child.nextElementSibling;}
 hydrateVoiceNotes(history);
 if(scroll||wasBottom)history.scrollTop=history.scrollHeight;else history.scrollTop=oldTop;
 $$('img',history).forEach(img=>{if(!img.dataset.scrollBound){img.dataset.scrollBound='true';img.addEventListener('load',()=>{if(history.scrollHeight-history.scrollTop-history.clientHeight<img.clientHeight+130)history.scrollTop=history.scrollHeight;},{once:true});}});
}

function closeChatPopover(restoreFocus=true){const focus=popoverAnchor;chatPopover?.remove();chatPopover=null;popoverAnchor=null;popoverContext=null;if(restoreFocus&&focus?.isConnected)focus.focus({preventScroll:true});}
function positionChatPopover(){
 if(!chatPopover||!popoverAnchor?.isConnected){closeChatPopover(false);return;}
 const box=popoverAnchor.getBoundingClientRect(),width=chatPopover.offsetWidth,height=chatPopover.offsetHeight;
 const left=Math.max(10,Math.min(innerWidth-width-10,box.left+box.width/2-width/2)),top=box.top-height-12>12?box.top-height-12:Math.min(innerHeight-height-12,box.bottom+12);
 chatPopover.style.left=left+'px';chatPopover.style.top=Math.max(12,top)+'px';
}
function showChatPopover(anchor,html,context,label='Reacciones'){
 closeChatPopover(false);popoverAnchor=anchor;popoverContext=context;chatPopover=document.createElement('div');chatPopover.id='chatPopover';chatPopover.className='chat-popover';chatPopover.setAttribute('role','dialog');chatPopover.setAttribute('aria-label',label);chatPopover.innerHTML=html;document.body.append(chatPopover);positionChatPopover();$('button,input',chatPopover)?.focus({preventScroll:true});
}
function reactionBar(id){return `<div class="quick-reactions" role="group" aria-label="Reacciones rápidas">${quickReactions().map(e=>`<button data-action="react" data-id="${id}" data-emoji="${esc(e)}" aria-label="Reaccionar con ${esc(e)}">${esc(e)}</button>`).join('')}<button class="reaction-plus" data-chat="reaction-more" aria-label="Más reacciones y personalizar">${icon('plus')}</button></div>`;}
function openReactions(id,anchor){if(!state.messages.some(m=>m.id===id&&m.type!=='deleted'))return;showChatPopover(anchor,reactionBar(id),{mode:'reaction',id},'Reaccionar al mensaje');}
async function reactToMessage(id,emoji,button){
 if(button)button.disabled=true;
 try{const result=await api('/messages/'+encodeURIComponent(id)+'/reaction',{method:'POST',body:{emoji}});closeChatPopover(false);closeModal();if(state.active===result.message.conversation){upsertMessage(result.message);renderMessages();}}
 finally{if(button?.isConnected)button.disabled=false;}
}
function emojiPickerMarkup(){
 const context=popoverContext,custom=context.mode==='custom',items=emojiQuery?emojiList().filter(e=>norm(e.name+' '+e.emoji).includes(norm(emojiQuery))):(emojiGroups[emojiCategory]?.items||[]);
 return `<div class="chat-picker"><div class="picker-heading"><strong>${custom?'Personalizar reacciones':context.mode==='composer'?'Emojis':'Más reacciones'}</strong><button data-chat="close-picker" aria-label="Cerrar selector">${icon('close')}</button></div><label class="picker-search">${icon('search')}<input id="chatEmojiSearch" type="search" placeholder="Buscar emoji" aria-label="Buscar emoji" value="${esc(emojiQuery)}"></label>${context.mode!=='composer'?`<div class="picker-shortcuts"><span>Tus reacciones</span><button data-chat="customize-reactions">${custom?'Listo':'Personalizar'}</button></div><div class="custom-reactions">${quickReactions().map((e,i)=>`<button class="${custom&&i===customSlot?'selected':''}" ${custom?`data-chat="custom-slot" data-slot="${i}"`:`data-action="react" data-id="${context.id}" data-emoji="${esc(e)}"`} aria-label="${custom?'Cambiar reacción '+(i+1):'Reaccionar con '+e}">${esc(e)}</button>`).join('')}</div>${custom?'<p class="picker-help">Elige un espacio y luego su nuevo emoji.</p>':''}`:''}<div class="emoji-categories" role="group" aria-label="Categorías de emojis">${emojiGroups.map((g,i)=>`<button data-chat="emoji-category" data-category="${i}" class="${i===emojiCategory?'selected':''}" aria-label="${esc(g.name)}">${['☺','♡','♧','♬'][i]||'☺'}</button>`).join('')}</div><div class="emoji-results" id="chatEmojiResults" aria-label="Emojis">${emojiItems(items,context)}</div></div>`;
}
function emojiItems(items,context=popoverContext){return items.length?items.map(e=>`<button data-chat="pick-emoji" data-emoji="${esc(e.emoji)}" aria-label="${esc(e.name)}" title="${esc(e.name)}">${esc(e.emoji)}</button>`).join(''):'<p class="picker-help">No encontramos ese emoji.</p>';}
function refreshEmojiPicker(){if(!chatPopover)return;chatPopover.innerHTML=emojiPickerMarkup();positionChatPopover();$(popoverContext.mode==='custom'?'.custom-reactions .selected':'.emoji-categories .selected',chatPopover)?.focus({preventScroll:true});}
async function openEmojiComposer(anchor){await chatAssetsReady;emojiQuery='';emojiCategory=0;showChatPopover(anchor,'',{mode:'composer'},'Elegir emoji');refreshEmojiPicker();$('#chatEmojiSearch')?.focus();}
function messageOptions(id){
 const m=state.messages.find(m=>m.id===id);if(!m)return;const anchor=$(`[data-message-id="${id}"] [data-action="message-options"]`);
 showChatPopover(anchor,`<div class="message-menu"><button data-chat="reaction-menu" data-id="${id}">${icon('smile')} Reaccionar</button><button data-action="reply" data-id="${id}">${icon('back')} Responder</button>${m.sender.id===state.user.id?`${m.type==='text'?`<button data-action="edit-message" data-id="${id}">${icon('edit')} Editar mensaje</button>`:''}<button class="danger" data-action="delete-message" data-id="${id}">${icon('close')} Eliminar para todos</button>`:''}</div>`,{mode:'menu',id},'Opciones del mensaje');
}
async function openStickers(anchor){
 await chatAssetsReady;if(!anchor.isConnected)return;
 showChatPopover(anchor,`<div class="chat-picker sticker-picker"><div class="picker-heading"><strong>Stickers del universo</strong><button data-chat="close-picker" aria-label="Cerrar stickers">${icon('close')}</button></div><p class="sticker-hint">Toca uno para enviarlo</p><div class="sticker-grid">${chatStickers.map(s=>`<button data-chat="send-sticker" data-sticker="${s.id}" aria-label="Enviar ${esc(s.name)}"><img src="${esc(s.src)}" alt="${esc(s.name)}" loading="lazy"></button>`).join('')}</div></div>`,{mode:'stickers'},'Enviar stickers');
}
async function sendSticker(id,button){
 if(state.sending||state.recording||!state.active)return;const chat=state.active;state.sending=true;button.disabled=true;
 try{const result=await api('/conversations/'+encodeURIComponent(chat)+'/messages',{method:'POST',body:{id:crypto.randomUUID(),type:'sticker',stickerId:id,replyTo:state.reply?.id}});closeChatPopover(false);if(state.active===chat){state.reply=null;$('#replyArea').innerHTML='';upsertMessage(result.message);renderMessages(true);}await refreshConversations();}
 catch(error){toast(error.message,true);}finally{state.sending=false;if(button.isConnected)button.disabled=false;}
}

function attachmentPreview(){
 if(!state.attachment||!$('#attachmentArea'))return;const a=state.attachment;
 if(a.type==='audio'){
  a.preview=a.preview||URL.createObjectURL(a.file);
  $('#attachmentArea').innerHTML=`<div class="voice-draft"><div class="voice-draft-heading"><span>Escucha tu nota antes de enviarla</span><button class="icon-button" data-action="cancel-attachment" aria-label="Descartar nota de voz">${icon('close')}</button></div>${voiceMarkup(a.preview,'Vista previa de tu nota de voz',a.durationMs)}</div>`;hydrateVoiceNotes($('#attachmentArea'));
 }else $('#attachmentArea').innerHTML=`<div class="attachment-preview"><img src="${esc(a.preview)}" alt="Vista previa de adjunto"><span>${esc(a.filename)}</span><button class="icon-button" data-action="cancel-attachment" aria-label="Quitar adjunto">${icon('close')}</button></div>`;
}
function recordingElapsed(r){return Date.now()-r.started-r.pausedMs-(r.pausedAt?Date.now()-r.pausedAt:0);}
function finishRecordingResources(r){clearInterval(r.timer);r.stream.getTracks().forEach(t=>t.stop());r.source?.disconnect();}
function recordingControls(r){
 const paused=!!r.pausedAt;$('#recordingArea').innerHTML=`<div class="recording-studio ${paused?'is-paused':''}"><button class="record-discard" data-action="cancel-recording" aria-label="Descartar grabación">${icon('close')}</button><span class="record-dot"></span><strong id="recordTime">${clockTime(recordingElapsed(r)/1000)}</strong><div class="record-level" aria-label="Nivel del micrófono">${Array.from({length:20},()=>'<i></i>').join('')}</div><button class="record-pause" data-chat="record-pause" aria-label="${paused?'Continuar':'Pausar'} grabación">${icon(paused?'play':'pause')}</button><button class="record-finish" data-action="stop-recording">Terminar</button></div>`;
}
async function speechWav(blob,context){
 const decoded=await context.decodeAudioData(await blob.arrayBuffer()),rate=24000,offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*rate),rate),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const mono=await offline.startRendering(),samples=mono.getChannelData(0),buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const text=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const sample=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}return {blob:new Blob([buffer],{type:'audio/wav'}),durationMs:Math.round(mono.duration*1000)};
}
async function startRecording(){
 if(state.recording){stopRecording();return;}if(state.audioProcessing)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Tu navegador no permite grabar. Abre la web en un navegador actualizado con acceso al micrófono.',true);return;}
 const chatId=state.active;let stream,context;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;context=Audio?new Audio():null;context?.resume().catch(()=>{});
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  if(state.active!==chatId||state.route!=='mensajes'){stream.getTracks().forEach(t=>t.stop());context?.close();return;}
  closeChatPopover(false);$$('audio').forEach(a=>a.pause());clearAttachment();
  const mime=['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
  const recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:96000}),chunks=[];
  const r={recorder,stream,context,started:Date.now(),pausedMs:0,pausedAt:0,cancelled:false,timer:null,chatId};state.recording=r;
  if(context){r.source=context.createMediaStreamSource(stream);r.analyser=context.createAnalyser();r.analyser.fftSize=256;r.source.connect(r.analyser);r.levels=new Uint8Array(r.analyser.frequencyBinCount);}
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onerror=()=>{r.cancelled=true;toast('No se pudo grabar el audio. Revisa el micrófono y vuelve a intentarlo.',true);stopRecording();};
  recorder.onstop=async()=>{
   const durationMs=recordingElapsed(r);finishRecordingResources(r);if(state.recording===r)state.recording=null;
   if($('#recordButton')){$('#recordButton').innerHTML=icon('mic');$('#recordButton').setAttribute('aria-label','Grabar nota de voz');}
   if(r.cancelled||state.active!==chatId||state.route!=='mensajes'){if($('#recordingArea'))$('#recordingArea').innerHTML='';context?.close();return;}
   state.audioProcessing=true;if($('#recordingArea'))$('#recordingArea').innerHTML='<div class="record-preparing" role="status"><span class="spinner"></span> Preparando tu nota de voz…</div>';
   try{
    let audio={blob:new Blob(chunks,{type:recorder.mimeType||mime}),durationMs};
    if(!audio.blob.size||durationMs<200)throw Error('La grabación es demasiado corta. Mantén el micrófono unos segundos.');
    if(context&&window.OfflineAudioContext)try{audio=await speechWav(audio.blob,context);}catch{}
    if(audio.blob.size>6*1024*1024)throw Error('La nota es demasiado larga. Graba una más corta.');
    if(state.active===chatId&&state.route==='mensajes'){
     clearAttachment();const ext=audio.blob.type.includes('wav')?'wav':audio.blob.type.includes('mp4')?'m4a':audio.blob.type.includes('ogg')?'ogg':'webm';
     state.attachment={file:audio.blob,filename:'Nota de voz.'+ext,type:'audio',durationMs:audio.durationMs,id:crypto.randomUUID()};attachmentPreview();
    }
   }catch(error){toast(error.message,true);}finally{state.audioProcessing=false;if($('#recordingArea'))$('#recordingArea').innerHTML='';context?.close();}
  };
  recorder.start(250);recordingControls(r);$('#recordButton').innerHTML=icon('stop');$('#recordButton').setAttribute('aria-label','Terminar grabación');
  r.timer=setInterval(()=>{
   if($('#recordTime'))$('#recordTime').textContent=clockTime(recordingElapsed(r)/1000);
   if(r.analyser&&recorder.state==='recording'){r.analyser.getByteFrequencyData(r.levels);$$('.record-level i').forEach((bar,i)=>bar.style.height=Math.max(3,r.levels[i*3]/255*30)+'px');}
   if(recordingElapsed(r)>=90000)stopRecording();
  },100);
 }catch(error){stream?.getTracks().forEach(t=>t.stop());context?.close();state.recording=null;toast(error.name==='NotAllowedError'?'Permite el micrófono en tu navegador para grabar una nota de voz.':'No pudimos abrir el micrófono. Revisa que esté conectado y disponible.',true);}
}
function stopRecording(){const r=state.recording;if(r&&r.recorder.state!=='inactive'){if(r.pausedAt){r.pausedMs+=Date.now()-r.pausedAt;r.pausedAt=0;}r.recorder.stop();}}
function cancelRecording(){const r=state.recording;if(r){r.cancelled=true;finishRecordingResources(r);if(r.recorder.state!=='inactive')r.recorder.stop();state.recording=null;}if($('#recordingArea'))$('#recordingArea').innerHTML='';}

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-chat]');
 if(!button){if(chatPopover&&!event.target.closest('#chatPopover')&&!event.target.closest('.message-tools'))closeChatPopover(false);return;}
 const action=button.dataset.chat,id=button.dataset.id;
 try{
  if(action==='reaction')openReactions(id,button);
  if(action==='reaction-menu'){const anchor=popoverAnchor;openReactions(id,anchor);}
  if(action==='reaction-more'){await chatAssetsReady;emojiQuery='';emojiCategory=0;popoverContext.mode='expanded';refreshEmojiPicker();$('#chatEmojiSearch')?.focus();}
  if(action==='close-picker')closeChatPopover();
  if(action==='customize-reactions'){popoverContext.mode=popoverContext.mode==='custom'?'expanded':'custom';customSlot=0;refreshEmojiPicker();}
  if(action==='custom-slot'){customSlot=Number(button.dataset.slot);refreshEmojiPicker();}
  if(action==='emoji-category'){emojiCategory=Number(button.dataset.category);emojiQuery='';refreshEmojiPicker();}
  if(action==='pick-emoji'){
   const emoji=button.dataset.emoji;
   if(popoverContext.mode==='custom'){
    const selected=quickReactions(),other=selected.indexOf(emoji);if(other>=0)selected[other]=selected[customSlot];selected[customSlot]=emoji;
    try{localStorage.setItem('xp-reactions:'+state.user.id,JSON.stringify(selected));}catch{}customSlot=(customSlot+1)%6;refreshEmojiPicker();
   }else if(popoverContext.mode==='composer'){
    const input=$('#messageInput');if(input){const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;input.setRangeText(emoji,start,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));}closeChatPopover(false);input?.focus();
   }else await reactToMessage(popoverContext.id,emoji,button);
  }
  if(action==='stickers')await openStickers(button);
  if(action==='send-sticker')await sendSticker(button.dataset.sticker,button);
  if(action==='voice-toggle'){
   const player=button.closest('.voice-note'),audio=$('audio',player);$('.voice-error',player).hidden=true;
   if(audio.paused){if(audio.error)audio.load();audio.muted=false;audio.volume=1;await audio.play();}else audio.pause();
  }
  if(action==='voice-speed'){const audio=$('audio',button.closest('.voice-note'));audio.playbackRate=audio.playbackRate===1?1.5:audio.playbackRate===1.5?2:1;button.textContent=audio.playbackRate+'×';button.setAttribute('aria-label','Velocidad de reproducción: '+audio.playbackRate);}
  if(action==='record-pause'){
   const r=state.recording;if(r){if(r.recorder.state==='recording'){r.pausedAt=Date.now();r.recorder.pause();}else if(r.recorder.state==='paused'){r.pausedMs+=Date.now()-r.pausedAt;r.pausedAt=0;r.recorder.resume();}recordingControls(r);}
  }
 }catch(error){toast(error.name==='NotSupportedError'?'Este navegador no pudo reproducir este formato de audio.':error.message||'No se pudo completar la acción.',true);}
});
document.addEventListener('click',event=>{if(event.target.closest('#chatPopover [data-action]'))closeChatPopover(false);},true);
document.addEventListener('input',event=>{if(event.target.id==='chatEmojiSearch'){emojiQuery=event.target.value;const items=emojiList().filter(e=>norm(e.name+' '+e.emoji).includes(norm(emojiQuery)));$('#chatEmojiResults').innerHTML=emojiItems(emojiQuery?items:emojiGroups[emojiCategory].items);}});
document.addEventListener('keydown',event=>{if(!chatPopover)return;if(event.key==='Escape'){event.preventDefault();closeChatPopover();}else if(event.key==='Tab'){const focusable=$$('button,input',chatPopover),first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
document.addEventListener('scroll',event=>{if(chatPopover&&!event.target.closest?.('#chatPopover'))closeChatPopover(false);},true);
let longPress=null,suppressMessageClickUntil=0;
document.addEventListener('click',event=>{if(Date.now()<suppressMessageClickUntil&&event.target.closest('.message-row')){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('pointerdown',event=>{const row=event.target.closest('.message-row');if(event.pointerType!=='touch'||!row||event.target.closest('button,input,a,audio'))return;longPress={x:event.clientX,y:event.clientY,timer:setTimeout(()=>{openReactions(row.dataset.messageId,$('.bubble',row));suppressMessageClickUntil=Date.now()+750;longPress=null;},450)};});
const cancelLongPress=()=>{clearTimeout(longPress?.timer);longPress=null;};document.addEventListener('pointerup',cancelLongPress);document.addEventListener('pointercancel',cancelLongPress);document.addEventListener('pointermove',event=>{if(longPress&&(Math.abs(event.clientX-longPress.x)>10||Math.abs(event.clientY-longPress.y)>10))cancelLongPress();});
document.addEventListener('contextmenu',event=>{if(event.target.closest('.message-row')&&chatPopover)event.preventDefault();});
