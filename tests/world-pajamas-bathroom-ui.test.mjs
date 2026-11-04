import test from 'node:test';
import assert from 'node:assert/strict';
import {worldUIPage} from './helpers/world-ui-fixture.mjs';
import {WorldScene} from '../public/juegos/world-scene.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {applySanitationProps} from '../public/juegos/world-sanitation.mjs';
const settle=()=>new Promise(r=>setImmediate(r));
async function playing(){const p=await worldUIPage({staff:true});await p.click('[data-view=characters]');await p.click('[data-shop-action=select-character][data-id=owned-maria-villegas]');p.resolveSelection();await settle();await settle();await p.click('[data-view=play]');return p;}
const actor=(zone='base')=>({userId:'self',name:'Prueba',characterId:'bruno',x:WORLD_MAPS[zone].spawn[0],y:WORLD_MAPS[zone].spawn[1],z:0,face:1,walk:0,state:'idle',moving:false,life:{status:'alive'}});

test('a brief lost connection retains the last visible actor and ignores messages from the replaced socket',async()=>{
 const draw=WorldScene.prototype.draw;let rendered=[];WorldScene.prototype.draw=function(){rendered=this.players.map(p=>({...p}));};
 const p=await playing();try{const original=p.Socket.last,person=actor();p.event({type:'welcome',zone:'base',players:[person],history:[]});p.frame(100);assert.equal(rendered[0].userId,'self');const x=rendered[0].x;
  original.readyState=3;original.onclose({code:1006});p.frame(200);assert.equal(rendered.length,1);assert.equal(rendered[0].x,x);assert.equal(rendered[0].moving,false);assert.match(p.q('#live-status').textContent,/RECONECTANDO/);
  p.w.document.dispatchEvent(new p.w.Event('visibilitychange'));assert.notEqual(p.Socket.last,original);original.onmessage({data:JSON.stringify({type:'players',players:[]})});p.frame(300);assert.equal(rendered.length,1);
  p.event({type:'welcome',zone:'base',players:[{...person,x:x+12}],history:[]});p.frame(400);assert.equal(rendered[0].x,x+12);assert.equal(p.q('#live-status').textContent,'EN VIVO');
 }finally{p.close();WorldScene.prototype.draw=draw;}
});

test('clicking the bathroom opens separate choices and sends the chosen use; later bed notices keep their own title',async()=>{
 applySanitationProps(WORLD_MAPS);const basket=WORLD_MAPS['refugio-1'].props.find(p=>p.sanitation),methods=['pick','pickAccess','pickObject'],originals=methods.map(k=>WorldScene.prototype[k]);WorldScene.prototype.pick=()=>null;WorldScene.prototype.pickAccess=()=>null;WorldScene.prototype.pickObject=()=>basket;
 const p=await playing();try{p.event({type:'welcome',zone:'refugio-1',players:[actor('refugio-1')],history:[],objects:{[basket.id]:{state:'dirty'}}});const canvas=p.q('#world-canvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:1200,height:675,bottom:675});canvas.dispatchEvent(new p.w.MouseEvent('pointerdown',{clientX:500,clientY:300,bubbles:true}));assert(p.q('#modal').open);assert.equal(p.q('.sanitation-defecate').textContent.slice(1),'Hacer Sal Lua');assert.equal(p.q('.sanitation-urinate').textContent.slice(1),'Orinar');assert.equal(p.q('.sanitation-clean').textContent.slice(1),'Limpiar');
  await p.click('.sanitation-urinate');assert(!p.q('#modal').open);assert(p.Socket.last.sent.some(m=>m.type==='interact'&&m.objectId===basket.id&&m.bedActivity==='urinate'));
  p.event({type:'sanitation-active',kind:'urinate',until:Date.now()+6500});assert.equal(p.q('.bed-cleaning-notice strong').textContent,'Canasta de aseo');await p.click('[data-action=bed-activity-cancel]');assert.equal(p.Socket.last.sent.at(-1).type,'stand');p.event({type:'sanitation-finished'});assert(p.q('.bed-cleaning-notice').hidden);
  p.event({type:'bed-activity',kind:'clean',until:Date.now()+5000});assert.equal(p.q('.bed-cleaning-notice strong').textContent,'Preparando la cama');assert.match(p.q('.bed-cleaning-notice small').textContent,/ropa de cama/);
 }finally{p.close();methods.forEach((k,i)=>WorldScene.prototype[k]=originals[i]);}
});
