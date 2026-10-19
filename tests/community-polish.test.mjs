import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const emojis=JSON.parse(fs.readFileSync(new URL('../public/chat-emojis.json',import.meta.url),'utf8'));
function messenger(){
 const dom=new JSDOM('<header class="topbar"></header><main><section class="messenger" id="messenger"><div id="chatHistory"></div><textarea id="messageInput"></textarea><button id="anchor" data-chat="reaction" data-id="one">Reaccionar</button></section></main>',{url:'https://test.invalid/#mensajes',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.state={user:{id:'viewer'},active:'chat',messages:[{id:'one',type:'text',text:'Hola',sender:{id:'other',name:'Chat QA'},created:Date.now(),reactions:[{user_id:'viewer',emoji:'❤️'}]}],conversations:[{id:'chat',type:'dm',members:[]}]};
 w.icons={};w.$=(s,root=w.document)=>root.querySelector(s);w.$$=(s,root=w.document)=>[...root.querySelectorAll(s)];w.startStream=()=>{};w.renderMessenger=()=>{};w.ResizeObserver=class{observe(){}};w.matchMedia=()=>({matches:true});
 w.icon=()=>'<svg></svg>';w.avatar=()=>'';w.esc=s=>String(s);w.linkify=s=>s;w.norm=s=>String(s||'').toLowerCase();w.time=()=>'';w.date=()=>'';w.messagePreview=m=>m.text;w.toast=message=>{throw new Error(message);};
 w.fetch=async url=>({json:async()=>url==='chat-emojis.json'?emojis:[]});w.visualViewport=new w.EventTarget();Object.assign(w.visualViewport,{height:844,width:390,offsetTop:0,offsetLeft:0,scale:1});
 Object.defineProperty(w,'innerHeight',{value:844,configurable:true});Object.defineProperty(w,'innerWidth',{value:390,configurable:true});
 w.eval(fs.readFileSync(new URL('../public/messenger.js',import.meta.url),'utf8')+'\nwindow.messengerTest={renderMessages};');
 return {dom,w};
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,25));

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
