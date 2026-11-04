import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountTradePanel} from '../public/juegos/world-trade-ui.mjs';

const fixture=()=>({id:'trade-1',selfId:'self',partner:{id:'other',name:'María'},inventories:[{userId:'self',name:'Luciano',food:[{foodId:'apple',quantity:3},{foodId:'banana',quantity:1}],medicines:[{medicineId:'dressing',quantity:2}]},{userId:'other',name:'María',food:[{foodId:'pear',quantity:2}],medicines:[]}]});
const page=()=>new JSDOM('<!doctype html><body><dialog open><main></main></dialog></body>');
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
function drag(window,target,type,dataTransfer,relatedTarget){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{dataTransfer:{value:dataTransfer},relatedTarget:{value:relatedTarget}});target.dispatchEvent(event);return event;}
const transfer=()=>({data:{},types:[],effectAllowed:'none',dropEffect:'none',setData(type,value){this.data[type]=value;this.types=Object.keys(this.data);},getData(type){return this.data[type]||'';}});

test('two personal inventories are visible; only clicking an owned item delivers one unit and duplicate pending clicks are ignored',async()=>{
 const dom=page(),root=dom.window.document.querySelector('main'),calls=[];let resolve;
 const panel=mountTradePanel(root,{data:fixture(),onTransfer:input=>{calls.push(input);return new Promise(done=>resolve=done);}});
 try{
  assert.equal(root.querySelectorAll('.trade-inventory').length,2);assert.match(root.querySelector('.trade-own h3').textContent,/Luciano.*Inventario/);assert.match(root.querySelector('.trade-partner h3').textContent,/María.*Inventario/);assert.equal(root.querySelectorAll('.trade-item').length,4);assert.equal(root.querySelector('.trade-own .trade-count').textContent,'6objetos');
  const other=root.querySelector('.trade-partner .trade-item');assert(other.disabled);other.click();assert.equal(calls.length,0);
  root.querySelector('.trade-own [data-trade-item=apple]').click();root.querySelector('.trade-own [data-trade-item=apple]').click();assert.deepEqual(calls,[{tradeId:'trade-1',kind:'food',itemId:'apple',quantity:1}]);assert.equal(root.getAttribute('aria-busy'),'true');assert.equal(root.querySelector('.trade-own [data-trade-item=apple] .trade-item-count').textContent,'×3','stock waits for the authoritative response');
  const next=fixture();next.inventories[0].food[0].quantity=2;next.inventories[1].food.push({foodId:'apple',quantity:1});resolve({trade:next});await settle();assert.equal(root.getAttribute('aria-busy'),'false');assert.equal(root.querySelector('.trade-own [data-trade-item=apple] .trade-item-count').textContent,'×2');assert.equal(root.querySelector('.trade-partner [data-trade-item=apple] .trade-item-count').textContent,'×1');assert.match(root.querySelector('[role=status]').textContent,/Entregaste una unidad de Manzana/);
 }finally{panel.destroy();dom.window.close();}
});

test('dragging owned food or medicine into the partner inventory transfers one unit; foreign owners and fabricated items are rejected',async()=>{
 const dom=page(),root=dom.window.document.querySelector('main'),calls=[];const panel=mountTradePanel(root,{data:fixture(),onTransfer:async input=>{calls.push(input);return fixture();}});
 try{
  const dt=transfer(),own=root.querySelector('.trade-own [data-trade-item=dressing]');drag(dom.window,own,'dragstart',dt);assert.equal(dt.effectAllowed,'move');assert.equal(JSON.parse(dt.getData('application/x-xpedition-trade')).kind,'medicine');
  const partner=root.querySelector('.trade-partner'),over=drag(dom.window,partner,'dragover',dt);assert(over.defaultPrevented);assert(partner.classList.contains('is-drop-target'));drag(dom.window,partner,'drop',dt);await settle();assert.deepEqual(calls,[{tradeId:'trade-1',kind:'medicine',itemId:'dressing',quantity:1}]);assert.equal(root.querySelectorAll('.is-drop-target').length,0);
  for(const altered of [{tradeId:'trade-else',ownerId:'self',kind:'food',itemId:'apple'},{tradeId:'trade-1',ownerId:'other',kind:'food',itemId:'apple'},{tradeId:'trade-1',ownerId:'self',kind:'food',itemId:'pear'},{tradeId:'trade-1',ownerId:'self',kind:'medicine',itemId:'apple'},{tradeId:'trade-1',ownerId:'self',kind:'food',itemId:'anything'}]){
   const forged=transfer();forged.setData('application/x-xpedition-trade',JSON.stringify(altered));drag(dom.window,root.querySelector('.trade-partner'),'drop',forged);await settle();
  }
  assert.equal(calls.length,1);const foreign=transfer();const blocked=drag(dom.window,root.querySelector('.trade-partner .trade-item'),'dragstart',foreign);assert(blocked.defaultPrevented);assert.equal(foreign.types.length,0);
  const ownDrop=transfer();drag(dom.window,root.querySelector('.trade-own [data-trade-item=apple]'),'dragstart',ownDrop);drag(dom.window,root.querySelector('.trade-own'),'drop',ownDrop);await settle();assert.equal(calls.length,1,'dropping on the owner is not a transfer');
 }finally{panel.destroy();dom.window.close();}
});

test('server updates preserve both inventory scroll positions, dialog scroll and keyboard focus; identical snapshots do not mutate the panel',()=>{
 const dom=page(),root=dom.window.document.querySelector('main'),dialog=root.closest('dialog'),data=fixture(),panel=mountTradePanel(root,{data,onTransfer:async()=>{}});
 try{
  const own=root.querySelector('.trade-own .trade-items'),other=root.querySelector('.trade-partner .trade-items'),button=root.querySelector('.trade-own [data-trade-item=apple]');own.scrollTop=194;other.scrollTop=87;dialog.scrollTop=43;button.focus();
  const observer=new dom.window.MutationObserver(()=>{});observer.observe(root,{subtree:true,attributes:true,childList:true,characterData:true});panel.update({...structuredClone(data),revision:12});assert.equal(observer.takeRecords().length,0);assert.equal(root.querySelector('.trade-own .trade-items'),own);assert.equal(dom.window.document.activeElement,button);observer.disconnect();
  const changed=structuredClone(data);changed.inventories[1].food[0].quantity=4;panel.update(changed);assert.equal(root.querySelector('.trade-own .trade-items').scrollTop,194);assert.equal(root.querySelector('.trade-partner .trade-items').scrollTop,87);assert.equal(dialog.scrollTop,43);assert.equal(dom.window.document.activeElement.dataset.tradeItem,'apple');assert.equal(root.querySelector('.trade-partner [data-trade-item=pear] .trade-item-count').textContent,'×4');
  panel.update({...fixture(),id:'another-trade'});assert.equal(root.querySelector('.trade-partner [data-trade-item=pear] .trade-item-count').textContent,'×4','a stale foreign trade cannot replace the current exchange');
 }finally{panel.destroy();dom.window.close();}
});

test('server rejection keeps personal stock, displays the error and permits retry; closing and destruction are explicit',async()=>{
 const dom=page(),root=dom.window.document.querySelector('main');let calls=0,closed=0;const panel=mountTradePanel(root,{data:fixture(),onTransfer:async()=>{calls++;throw Error('La otra persona ya cerró el intercambio.');},onClose:()=>closed++});
 try{
  root.querySelector('.trade-own [data-trade-item=apple]').click();await settle();assert.match(root.querySelector('[role=alert]').textContent,/ya cerró/);assert.equal(root.querySelector('.trade-own [data-trade-item=apple] .trade-item-count').textContent,'×3');assert.equal(root.getAttribute('aria-busy'),'false');root.querySelector('.trade-own [data-trade-item=apple]').click();await settle();assert.equal(calls,2);root.querySelector('[data-trade-close]').click();assert.equal(closed,1);
  panel.destroy();assert.equal(root.childElementCount,0);assert(!root.classList.contains('world-trade-panel'));panel.update(fixture());assert.equal(root.childElementCount,0);
 }finally{panel.destroy();dom.window.close();}
});

test('names are escaped, unknown catalog entries are omitted and an empty inventory offers no transfer buttons',()=>{
 const dom=page(),root=dom.window.document.querySelector('main'),data=fixture();data.partner.name='<img src=x onerror=alert(1)>';data.inventories[1].name=data.partner.name;data.inventories[0].food=[{foodId:'<script>',quantity:5},{foodId:'apple',quantity:0}];data.inventories[0].medicines=[{medicineId:'invalid',quantity:4}];data.inventories.push({userId:'stranger',name:'Secret',food:[{foodId:'apple',quantity:99}],medicines:[]});const panel=mountTradePanel(root,{data,onTransfer:async()=>{}});
 try{assert.equal(root.querySelectorAll('img,script').length,0);assert.equal(root.querySelectorAll('.trade-own .trade-item').length,0);assert.match(root.querySelector('.trade-own .trade-empty').textContent,/vacío/);assert(!root.textContent.includes('Secret'));assert(root.textContent.includes('<img src=x onerror=alert(1)>'));}
 finally{panel.destroy();dom.window.close();}
});

test('a completed request cannot recreate a panel that was destroyed while pending',async()=>{
 const dom=page(),root=dom.window.document.querySelector('main');let resolve;const panel=mountTradePanel(root,{data:fixture(),onTransfer:()=>new Promise(done=>resolve=done)});root.querySelector('.trade-own [data-trade-item=banana]').click();panel.destroy();resolve(fixture());await settle();assert.equal(root.childElementCount,0);dom.window.close();
});
