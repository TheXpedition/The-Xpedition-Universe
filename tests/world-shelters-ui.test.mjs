import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {mountShelterPanel,mountShelterHUD,shelterAssignmentMarkup} from '../public/juegos/world-shelters-ui.mjs';
import {SHELTERS,SHELTER_MATERIALS,shelterPortalContext} from '../public/juegos/world-shelters.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {organizeStaffPanel,staffShelterMarkup} from '../public/juegos/world-staff-layout.mjs';
test('the participant tab presents housing actions without the nursing account selector',()=>{
 const view=value();view.housing=[{characterId:'bruno',name:'Bruno',home:'left'},{characterId:'peggy',name:'Peggy',home:null}];
 for(const shelter of view.shelters)shelter.required=9;
 const dom=new JSDOM('<main><details id="dir-roster"><summary>Participantes fallecidos</summary><p>Sin fallecidos</p></details><div id="staff-medical-controls" hidden><label for="staff-target">Cuenta</label><select id="staff-target"><option>Cuenta</option></select></div><details id="dir-shelters"><summary>Refugios</summary>'+staffShelterMarkup(view)+'</details></main>');
 try{
  const root=dom.window.document.querySelector('main');
  organizeStaffPanel(root,'players');
  assert.equal(root.querySelector('#staff-target').closest('.staff-participant-picker').hidden,true);
  assert.deepEqual([...root.querySelectorAll('details:not([hidden]) summary')].map(el=>el.textContent),['Participantes fallecidos','Refugios']);
  assert.match(root.querySelector('#staff-shelter-character option[value=peggy]').textContent,/Sin refugio/);
  assert.deepEqual([...root.querySelectorAll('#dir-shelters [data-home]')].map(el=>el.dataset.home),['left','right','none']);
 }finally{dom.window.close();}
});
const settle=()=>new Promise(r=>setImmediate(r));
const value=()=>({revision:1,eligible:true,home:'left',inventory:['nails'],delivered:[],available:[],race:'Empate',shelters:SHELTERS.map(s=>({...s,built:false,percent:0,counts:Object.fromEntries(SHELTER_MATERIALS.map(m=>[m.id,0])),members:s.id==='left'?[{characterId:'bruno',name:'Bruno'}]:[]}))});
test('construction panel is a compact ten-material list, contributes once and reflects live counts and membership',async()=>{const dom=new JSDOM('<body><main id="panel"></main></body>');Object.assign(globalThis,{document:dom.window.document,window:dom.window});const root=document.querySelector('#panel'),view=value();let calls=0;const panel=mountShelterPanel(root,{view,home:'left',canContribute:true,onContribute:async()=>{calls++;const next=structuredClone(view);next.inventory=[];next.delivered=['nails'];next.shelters[0].counts.nails=1;next.shelters[0].percent=1;return {shelters:next};}});try{assert.equal(root.querySelectorAll('.shelter-material').length,10);assert.equal(root.querySelectorAll('.shelter-residents img').length,1);assert.match(root.textContent,/En tu mochila/);root.querySelector('[data-shelter-contribute]').click();root.querySelector('[data-shelter-contribute]').click();await settle();assert.equal(calls,1);assert.match(root.textContent,/1\/9/);assert.match(root.textContent,/Tu aporte entregado/);assert(root.querySelector('[data-shelter-contribute]').disabled);const other={...view,home:'right'};panel.update(other);assert(root.querySelector('[data-shelter-contribute]').disabled);}finally{panel.destroy();dom.window.close();}});
test('the door badge stays centered and keeps progress only while construction is active',()=>{
 const dom=new JSDOM('<body></body>');
 Object.assign(globalThis,{document:dom.window.document,window:dom.window,innerWidth:1200,innerHeight:800});
 const view=value(),p={userId:'a',characterId:'bruno',status:'active'};
 assert.equal(shelterAssignmentMarkup(p,view,true),'');
 assert.equal(shelterAssignmentMarkup(p,view,false),'');
 const hud=mountShelterHUD(),badge=document.querySelector('.shelter-home-badge');
 const draw=zone=>{
  const map=WORLD_MAPS[zone];
  hud.place({zone,playing:true,map,scene:{width:1200,height:800,camera:{project:(x,y)=>({x:x/map.width*1200,y:y/map.height*800})}},canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800})}});
 };
 try{
  assert.equal(shelterPortalContext({key:'door'},{zone:'refugio-1'},view).label,'Construir');
  const visitor=shelterPortalContext({key:'door'},{zone:'refugio-1'},view,true);
  assert.equal(visitor.label,'Entrar');assert.equal(visitor.detail,'Refugio 1');
  hud.update(view);draw('base');
  assert.equal(badge.style.left,'618px');assert.equal(badge.style.top,'336px');
  assert(badge.querySelector('progress'));
  view.shelters[0].built=true;view.shelters[0].percent=100;view.shelters[1].percent=57;
  hud.update(view);draw('base');
  assert(!badge.hidden);assert.equal(badge.querySelectorAll('img').length,1);
  assert.equal(badge.querySelector('progress'),null);assert(!badge.textContent.includes('100 %'));
  draw('refugio-2');
  assert.equal(badge.querySelector('progress').value,57);assert(badge.textContent.includes('57 %'));
  assert.equal(document.querySelector('.shelter-race'),null);
 }finally{hud.destroy();dom.window.close();}
});
