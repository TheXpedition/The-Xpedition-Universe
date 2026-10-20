import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const emojis=JSON.parse(fs.readFileSync(new URL('../public/chat-emojis.json',import.meta.url),'utf8'));
function messenger(stickers=[]){
 const dom=new JSDOM('<header class="topbar"></header><main><section class="messenger" id="messenger"><div id="chatHistory"></div><textarea id="messageInput"></textarea><button id="anchor" data-chat="reaction" data-id="one">Reaccionar</button></section></main>',{url:'https://test.invalid/#mensajes',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.state={user:{id:'viewer'},active:'chat',messages:[{id:'one',type:'text',text:'Hola',sender:{id:'other',name:'Chat QA'},created:Date.now(),reactions:[{user_id:'viewer',emoji:'❤️'}]}],conversations:[{id:'chat',type:'dm',members:[]}]};
 w.icons={};w.$=(s,root=w.document)=>root.querySelector(s);w.$$=(s,root=w.document)=>[...root.querySelectorAll(s)];w.startStream=()=>{};w.renderMessenger=()=>{};w.ResizeObserver=class{observe(){}};w.matchMedia=()=>({matches:true});
 w.icon=()=>'<svg></svg>';w.avatar=()=>'';w.esc=s=>String(s);w.linkify=s=>s;w.norm=s=>String(s||'').toLowerCase();w.time=()=>'';w.date=()=>'';w.messagePreview=m=>m.text;w.toast=message=>{throw new Error(message);};
 w.fetch=async url=>({json:async()=>url==='chat-emojis.json'?emojis:stickers});w.visualViewport=new w.EventTarget();Object.assign(w.visualViewport,{height:844,width:390,offsetTop:0,offsetLeft:0,scale:1});
 Object.defineProperty(w,'innerHeight',{value:844,configurable:true});Object.defineProperty(w,'innerWidth',{value:390,configurable:true});
 w.eval(fs.readFileSync(new URL('../public/messenger.js',import.meta.url),'utf8')+'\nwindow.messengerTest={renderMessages,stickerTiles};');
 return {dom,w};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,25));

test('todos los transparentes preceden a los cuadros aun con favoritos, en chat y publicaciones',async()=>{
 const stickers=JSON.parse(fs.readFileSync(new URL('../public/stickers.json',import.meta.url),'utf8')),opaque=stickers.find(s=>!s.transparent),transparent=stickers.filter(s=>s.transparent).at(-1),{dom,w}=messenger(stickers);
 try{w.state.user.stickerFavorites=[opaque.id,transparent.id];await settle();
  for(const mode of ['chat','post']){const root=w.document.createElement('div');root.innerHTML=w.messengerTest.stickerTiles(mode);const ids=[...root.querySelectorAll('[data-sticker-id]')].map(el=>el.dataset.stickerId),boundary=stickers.filter(s=>s.transparent).length;assert.equal(ids.length,77);assert.equal(ids[0],transparent.id);assert.equal(ids[boundary],opaque.id);assert(ids.slice(0,boundary).every(id=>stickers.find(s=>s.id===id).transparent));assert(ids.slice(boundary).every(id=>!stickers.find(s=>s.id===id).transparent));}
 }finally{dom.window.close();}
});

test('abrir + en móvil mantiene el selector al redimensionar, enfocar búsqueda y desplazar el viewport',async()=>{
 const {dom,w}=messenger();try{
  await settle();w.document.querySelector('#anchor').click();assert(w.document.querySelector('#chatPopover .reaction-plus'));
  w.document.querySelector('.reaction-plus').click();await settle();assert(w.document.querySelector('#chatEmojiSearch'));assert.notEqual(w.document.activeElement.id,'chatEmojiSearch');
  w.document.querySelector('#chatEmojiSearch').focus();Object.assign(w.visualViewport,{height:360,offsetTop:132});w.visualViewport.dispatchEvent(new w.Event('resize'));w.dispatchEvent(new w.Event('resize'));await settle();
  assert(w.document.querySelector('#chatPopover'));assert.equal(w.document.documentElement.style.getPropertyValue('--chat-screen-height'),'360px');assert.equal(w.document.documentElement.style.getPropertyValue('--chat-screen-top'),'132px');assert(w.document.body.classList.contains('chat-keyboard-open'));
  w.visualViewport.offsetTop=160;w.visualViewport.dispatchEvent(new w.Event('scroll'));w.document.dispatchEvent(new w.Event('scroll'));await settle();assert(w.document.querySelector('#chatEmojiSearch'));
  const input=w.document.querySelector('#chatEmojiSearch');input.value='corazón';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert(w.document.querySelector('#chatEmojiResults button'));
  let chosen;w.api=async(url,{body})=>{chosen=body.emoji;return {message:{...w.state.messages[0],conversation:'chat',reactions:[{user_id:'viewer',emoji:body.emoji}]}};};w.closeModal=()=>{};w.upsertMessage=m=>{w.state.messages=[m];};w.renderMessages=()=>{};
  w.document.querySelector('#chatEmojiResults button').click();await settle();assert(chosen);assert.equal(w.document.querySelector('#chatPopover'),null);
 }finally{dom.window.close();}
});

test('la reacción pertenece a la superficie de la burbuja y se actualiza sin reemplazar el texto',async()=>{
 const {dom,w}=messenger();try{await settle();w.messengerTest.renderMessages();const row=w.document.querySelector('.message-row'),bubble=row.querySelector('.bubble');assert.equal(row.querySelector('.message-reactions').parentElement.className,'message-surface');w.state.messages[0].reactions=[];w.messengerTest.renderMessages();assert.equal(row.querySelector('.message-reactions'),null);w.state.messages[0].reactions=[{user_id:'other',emoji:'😂'}];w.messengerTest.renderMessages();assert.equal(row.querySelector('.message-reactions').parentElement.className,'message-surface');assert.equal(row.querySelector('.bubble'),bubble);}finally{dom.window.close();}
});

test('pegar una imagen prepara el adjunto sin enviar ni perder el borrador; texto e imágenes inválidas no lo reemplazan',()=>{
 const dom=new JSDOM('<form class="composer"><textarea>Mi borrador</textarea></form><input id="elsewhere">',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window;
 try{
  w.state={user:{id:'qa'},active:'chat',attachment:null};let previews=0,warnings=0;
  w.clearAttachment=()=>{w.state.attachment=null;};w.attachmentPreview=()=>previews++;w.toast=()=>warnings++;
  w.URL.createObjectURL=()=> 'blob:qa';
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),start=app.indexOf('function stageChatAttachment('),end=app.indexOf("$('#attachmentInput')",start);
  w.eval(app.slice(start,end));w.eval(fs.readFileSync(new URL('../public/chat-input.js',import.meta.url),'utf8'));
  const image=new w.File(['png'],'captura.png',{type:'image/png'}),input=w.document.querySelector('textarea');
  function paste(files=[],items=[],target=input){const event=new w.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{files,items}});target.dispatchEvent(event);return event;}
  assert.equal(paste([], [{kind:'file',type:'image/png',getAsFile:()=>image}]).defaultPrevented,true);
  assert.equal(w.state.attachment.file,image);assert.equal(previews,1);assert.equal(input.value,'Mi borrador');
  const staged=w.state.attachment;assert.equal(paste().defaultPrevented,false);assert.equal(w.state.attachment,staged);
  paste([new w.File(['bad'],'bad.svg',{type:'image/svg+xml'})]);assert.equal(warnings,1);assert.equal(w.state.attachment,staged);
  paste([image],[],w.document.querySelector('#elsewhere'));assert.equal(previews,1);
  w.state.active=null;paste([image]);assert.equal(previews,1);
 }finally{w.close();}
});

test('el avatar de quien escribe lleva a su perfil, también en mensajes renderizados',async()=>{
 const {dom,w}=messenger();try{await settle();w.messengerTest.renderMessages();const link=w.document.querySelector('.message-row .chat-person-link');assert(link);assert.equal(link.getAttribute('href'),'#perfil/other');assert.match(link.getAttribute('aria-label'),/Chat QA/);}finally{dom.window.close();}
});
