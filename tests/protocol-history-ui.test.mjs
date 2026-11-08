import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createProtocolHistoryUI} from '../public/juegos/protocol-history-ui.mjs';

test('public history has four working sections, no invented episode columns, and safely renders names and answers',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>'),w=dom.window,originals={document:globalThis.document,fetch:globalThis.fetch};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const cast=[{id:'a',characterId:'arisantana',name:'Ari Santana',userName:'Usuario A',result:'HIGH'},{id:'b',characterId:'ivy',name:'Ivy',userName:'Usuario B',result:'ELIM'},{id:'c',characterId:'carmine',name:'Carmine',userName:'Usuario C',result:'LOW'}];
 let data={episodes:[],cast:[],final:null},ui;
 Object.assign(globalThis,{document:w.document,fetch:async()=>({ok:true,status:200,headers:{get:()=> 'application/json; charset=utf-8'},text:async()=>JSON.stringify(data)})});
 try{
  ui=createProtocolHistoryUI();await ui.open();const q=s=>w.document.querySelector(s),click=id=>q('[data-history-tab="'+id+'"]').click();
  assert.equal(q('nav').children.length,4);click('performance');assert.equal(q('.track-episode'),null);assert.match(q('.history-body').textContent,/primer episodio/);
  data={cast,final:null,episodes:[{id:'episode-one',episode:1,challenge:'The Last Grip',cast,nominees:cast.map(p=>({id:p.id,reason:'Nominación',votes:p.id==='c'?4:0})),voteRounds:[{round:1,tally:{c:4,a:1}}],skulls:[{index:1,value:6,chosenBy:['c']},{index:2,value:2,chosenBy:[]}],bets:[{id:'a',target:'a',amount:100,result:'won',payout:200}],duel:{type:'rope',ids:['a','b'],winners:['a'],losers:['b'],annulled:[],actors:{a:{force:63},b:{force:37}},roundWins:{},interviews:[{id:'b',lastWords:'Gracias <img src=x>',seasonWinner:'c',shouldLeave:'a'}]}}]};
  await ui.open();assert.equal(q('tbody th .history-identity strong').textContent,'Ari Santana');assert.equal(q('.track-episode')!==null,true);assert.equal(q('.track-final'),null);assert.equal(q('tbody .track-ELIM').textContent,'ELIM');assert.equal(q('tbody tr:last-child th strong').textContent,'Ivy');
  click('ceremony');assert.equal(q('.history-nominees').children.length,3);assert.equal(q('.history-skull-art b').textContent,'6');assert(q('.history-skull-art img').src.endsWith('skull-v2.webp'));assert.match(q('.history-votes').textContent,/Carmine 4/);assert(!q('.history-votes').textContent.includes('Usuario A'));
  click('duel');assert.equal(q('.history-duel').children.length,2);assert.match(q('.history-answer').textContent,/Gracias <img src=x>/);assert.equal(q('.history-answer dd img'),null);assert.match(q('.history-answer').textContent,/Carmine/);
  click('bets');assert.equal(q('.history-bets').children.length,1);assert.match(q('.history-bets').textContent,/100 monedasGANÓ/);
  q('[data-history-close]').click();assert.equal(q('dialog').open,false);
 }finally{ui?.destroy();Object.assign(globalThis,originals);w.close();}
});
test('staff retains the four public sections and can explicitly accept or decline missing bots',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>'),w=dom.window,originals={document:globalThis.document,fetch:globalThis.fetch};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};let staff=false,started=null;const requests=[];
 Object.assign(globalThis,{document:w.document,fetch:async(url,options={})=>{requests.push({url,options});const value=url.endsWith('start-plan')?{connected:4,expected:18,missing:14}:url.endsWith('start-live')?{url:'/juegos/x-protocol/',ceremonyId:'live'}:{episodes:[],cast:[],final:null};return {ok:true,status:200,headers:{get:()=> 'application/json; charset=utf-8'},text:async()=>JSON.stringify(value)};}});const ui=createProtocolHistoryUI({canStart:()=>staff,onStarted:d=>started=d});const flush=()=>new Promise(r=>setImmediate(r)),q=s=>w.document.querySelector(s);
 try{await ui.open();assert.equal(q('[data-history-start]'),null);staff=true;await ui.open();assert.equal(q('nav').children.length,4);assert.equal(q('[data-history-start]').textContent,'Iniciar una Ceremonia');q('[data-history-start]').click();await flush();assert.match(q('.history-start-prompt').textContent,/14 puestos faltantes/);assert.equal(requests.filter(r=>r.url.endsWith('start-live')).length,0,'planning cannot silently fill bots');q('[data-fill-bots="no"]').click();await flush();assert.equal(JSON.parse(requests.at(-1).options.body).fillBots,false);assert.equal(started.ceremonyId,'live');await ui.open();q('[data-history-start]').click();await flush();q('[data-fill-bots="yes"]').click();await flush();assert.equal(JSON.parse(requests.at(-1).options.body).fillBots,true);
 }finally{ui.destroy();Object.assign(globalThis,originals);w.close();}
});
