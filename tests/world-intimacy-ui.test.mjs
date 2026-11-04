import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {mountIntimacyUI,bedMenuMarkup,invitationMarkup} from '../public/juegos/world-intimacy-ui.mjs';
test('bed actions restrict invitations to adult cast and explain limited protection without hiding empty nearby lists',()=>{
 assert(!bedMenuMarkup({id:'bed'},false).includes('bed-invite'));assert(bedMenuMarkup({id:'bed'},true).includes('bed-invite'));
 const dom=new JSDOM(invitationMarkup('bed',{people:[],hasProtection:false}));try{assert(dom.window.document.querySelector('[type=submit]').disabled);assert(dom.window.document.querySelector('[name=protected]').disabled);assert(dom.window.document.querySelector('[name=acknowledged]').required);}finally{dom.window.close();}
});
test('private notification requires consent, escapes names and closes its visual overlay on cancellation',async()=>{
 const dom=new JSDOM('<body></body>'),calls=[],messages=[];const ui=mountIntimacyUI(dom.window.document.body,{clock:()=>100,api:async(...v)=>{calls.push(v);},toast:v=>messages.push(v)});
 try{ui.show({id:'r',from:{name:'<img src=x>'},protectedEncounter:true,pregnancyConsent:true,expiresAt:5000});assert.equal(dom.window.document.querySelectorAll('img').length,0);const notice=dom.window.document.querySelector('.intimacy-invitation');notice.querySelector('[data-answer=accept]').click();assert.equal(calls.length,0);notice.querySelector('[data-consent]').checked=true;notice.querySelector('[data-answer=accept]').click();await new Promise(r=>setImmediate(r));assert.equal(calls[0][0],'/world/intimacy/accept');assert.equal(calls[0][1].acknowledged,true);
  ui.update({id:'s',phase:'private'});const curtain=dom.window.document.querySelector('.intimacy-curtain');assert(!curtain.hidden);curtain.querySelector('button').click();await new Promise(r=>setImmediate(r));assert.equal(calls[1][0],'/world/intimacy/cancel');ui.close({sessionId:'other'});assert(!curtain.hidden);ui.close({sessionId:'s'});assert(curtain.hidden);assert(notice.hidden);
 }finally{ui.destroy();dom.window.close();}
});
