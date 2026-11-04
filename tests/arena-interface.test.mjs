// Client behavior in a DOM harness. Layout and real browser rendering require visual review.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
test('arena uses the World account and separates room, chat and authorized staff controls',async()=>{
 const root=import.meta.dirname+'/../public/juegos/reto-pelotas/',dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'http://localhost/juegos/reto-pelotas/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,noop=()=>{};
 const c=new Proxy({measureText:t=>({width:t.length*7})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});w.HTMLCanvasElement.prototype.getContext=()=>c;
 class Img{complete=true;naturalWidth=1000;naturalHeight=500;addEventListener=noop;}
 class Socket{static OPEN=1;readyState=1;sent=[];constructor(){Socket.last=this;}send(s){this.sent.push(JSON.parse(s));}}
 w.Image=Img;w.WebSocket=Socket;w.requestAnimationFrame=()=>1;w.setInterval=()=>1;w.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('cast.json')?JSON.parse(fs.readFileSync(root+'cast.json','utf8')):{user:{name:'Cuenta real'},profile:{characterId:'bayron'}}});
 try{vm.runInContext(fs.readFileSync(root+'game.js','utf8'),dom.getInternalVMContext());await new Promise(r=>setImmediate(r));const q=s=>w.document.querySelector(s);assert.equal(q('#playerName').value,'Cuenta real');assert(q('#playerName').readOnly);assert.equal(q('#characterGallery').children.length,50);assert(q('[data-character=bayron]').classList.contains('selected'));assert(q('#arenaSidebar').hidden);q('#arenaMenu').click();assert.equal(q('#arenaMenu').getAttribute('aria-expanded'),'true');assert(!q('#arenaSidebar').hidden);
 q('[data-arena-tab=chat]').click();assert(!q('.chat-panel').hidden);assert(q('.roster-panel').hidden);assert(q('#staffPanel').hidden);
 q('#joinForm').dispatchEvent(new w.Event('submit',{cancelable:true}));Socket.last.onopen();assert(Socket.last.sent.some(m=>m.t==='join'&&m.name==='Cuenta real'));
 w.onMsg({t:'welcome',id:'me',team:'A',room:'TEST',name:'Cuenta real',host:false});w.onMsg({t:'state',phase:'countdown',countdown:3,time:150,round:1,score:{A:0,B:0},units:[],balls:[],players:1});assert.equal(q('#roundCountdown').textContent,'3');assert(!q('#roundCountdown').hidden);assert(q('#arenaStaffTab').hidden);
 w.onMsg({t:'state',phase:'finished',result:null,countdown:8,time:0,round:1,score:{A:0,B:0},units:[],balls:[],players:1});assert.match(q('#resultBanner').textContent,/EMPATE/);
 w.onMsg({t:'host',host:true});w.onMsg({t:'state',phase:'waiting',time:150,round:1,score:{A:0,B:0},units:[],balls:[],players:1});assert(!q('#arenaStaffTab').hidden);q('#arenaStaffTab').click();assert(!q('#staffPanel').hidden);q('[data-action=start]').click();assert(Socket.last.sent.some(m=>m.t==='staff'&&m.action==='start'));
 }finally{w.close();}
});
