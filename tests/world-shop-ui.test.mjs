import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';import {createWorldShopUI} from '../public/juegos/world-shop-ui.mjs';import {SHOP_CHARACTERS,SHOP_FOODS,SHOP_ADVANTAGES} from '../public/juegos/world-shop-catalog.mjs';
function fixture(){const dom=new JSDOM('<main id="menu"></main>',{url:'http://localhost/juegos/',pretendToBeVisual:true}),w=dom.window,old={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};Object.assign(globalThis,{window:w,document:w.document,fetch:async()=>({ok:true,json:async()=>({inventory:{capacity:48,items:[{foodId:'apple',quantity:2}]}})})});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};const state={wallet:{coins:10000,tickets:9000},catalog:{characters:SHOP_CHARACTERS.filter(c=>c.id!=='maria-villegas'),pets:[],wallpapers:[],foods:SHOP_FOODS,advantages:SHOP_ADVANTAGES,crate:{price:5000,image:'/juegos/shop/crate.webp'}},inventory:[{id:'character',kind:'character',ref:'bruno',name:'Bruno'},{id:'pet',kind:'pet',ref:'bat',name:'Murciélago',image:'/juegos/shop/pets/bat.webp'},{id:'advantage',kind:'advantage',ref:'spy',name:'Espiar',image:'/juegos/shop/icons/spy.webp'},{id:'crate',kind:'crate',name:'Caja de suministros',image:'/juegos/shop/crate.webp'}],equipped:{},notices:[],participants:[]};const ui=createWorldShopUI({initial:state}),root=w.document.querySelector('main');return {w,state,ui,root,close(){ui.destroy();w.close();Object.assign(globalThis,old);}};}
test('native shop uses individually centered original frames, special prices and never overwrites another menu after leaving',()=>{const f=fixture();try{f.ui.render(f.root);assert(!f.root.textContent.includes('María Villegas'));for(const id of ['arisalgado','pablo','luis','teseo']){const svg=f.root.querySelector('svg[aria-label="'+SHOP_CHARACTERS.find(c=>c.id===id).name+'"]');assert(svg?.getAttribute('viewBox'));assert(svg.querySelector('image').getAttribute('href').includes(id));}assert(f.root.textContent.includes('1.000 MONEDAS'));assert(f.root.textContent.includes('500.000 MONEDAS'));f.ui.detach();f.root.innerHTML='<h2>Desafíos</h2><a href="/juegos/last-grip/">The Last Grip</a>';f.ui.update({...f.state,wallet:{coins:0,tickets:0}});assert.equal(f.root.querySelector('h2').textContent,'Desafíos');assert(f.root.querySelector('[href="/juegos/last-grip/"]'));}finally{f.close();}});
test('personal objects show rewards first, food second and no duplicated character or pet collection',async()=>{const f=fixture();try{f.ui.inventory();await new Promise(r=>setImmediate(r));const d=f.w.document.querySelector('.shop-inventory-dialog');assert(d.textContent.includes('Tus objetos'));assert(d.textContent.indexOf('Espiar')<d.textContent.indexOf('Comida'));assert(!d.textContent.includes('Bruno'));assert(!d.textContent.includes('Murciélago'));assert.equal(d.querySelectorAll('.food-vacant-slot').length,0);assert(d.textContent.includes('3 objetos'));}finally{f.close();}});
test('World navigation follows the requested order and the Last Grip card has its own illustrated style',()=>{const html=fs.readFileSync(new URL('../public/juegos/index.html',import.meta.url),'utf8'),dom=new JSDOM(html);assert.deepEqual([...dom.window.document.querySelectorAll('.wood-nav button')].map(b=>b.getAttribute('data-view')||b.getAttribute('data-action')),['home','return-play','shop','characters','map','challenges','ceremony']);assert.equal(dom.window.document.querySelector('[data-action="inventory"] [data-icon]').getAttribute('data-icon'),'backpack');assert(fs.readFileSync(new URL('../public/juegos/world-ui.mjs',import.meta.url),'utf8').includes('juegos/last-grip/art/logo.webp'));dom.window.close();});

test('advantage catalog is informational and random crate is the only purchasable item in that tab',()=>{
 const f=fixture();try{
  f.ui.render(f.root);
  const tab=[...f.root.querySelectorAll('[data-shop-action="section"]')].find(b=>b.dataset.section==='advantages');
  tab.click();
  const cards=f.root.querySelectorAll('.shop-product.advantage');
  assert(cards.length>10);
  assert.equal(f.root.querySelector('[data-shop-action="buy-dialog"][data-kind="advantage"]'),null);
  assert.equal(f.root.querySelectorAll('.shop-product.advantage button').length,0);
  assert.match(f.root.textContent,/5.000 TICKETS · COMPRAR CAJA/);
  assert.match(f.root.textContent,/Solo para consultar/);
  assert.match(f.root.textContent,/Espiar/);
  f.root.querySelector('[data-shop-action="buy-dialog"][data-kind="crate"]').click();
  const dialog=f.w.document.querySelector('.shop-inventory-dialog');
  assert.match(dialog.textContent,/5.000 TICKETS/);
 }finally{f.close();}
});
test('Isabel and Dua Lingo have visible purchase cards at their original prices',()=>{
 const f=fixture();try{
  f.ui.render(f.root);
  const isabel=f.root.querySelector('[data-shop-action="buy-dialog"][data-ref="isabel"]');
  const dua=f.root.querySelector('[data-shop-action="buy-dialog"][data-ref="dua-lingo"]');
  assert(isabel&&!isabel.disabled);
  assert(dua&&!dua.disabled);
  assert.match(isabel.textContent,/500.000 MONEDAS/);
  assert.match(dua.textContent,/1.000 MONEDAS/);
 }finally{f.close();}
});

test('sold-out Isabel remains visible but cannot be bought in that World server',()=>{
 const f=fixture();
 try{
  f.state.catalog.characters=f.state.catalog.characters.map(c=>c.id==='isabel'?{...c,soldOut:true,canBuy:false}:c);
  f.ui.update(f.state);f.ui.render(f.root);
  const isabel=f.root.querySelector('[data-shop-action="buy-dialog"][data-ref="isabel"]');
  assert(isabel);
  assert.equal(isabel.disabled,true);
  assert.match(isabel.textContent,/AGOTADA/);
  const dua=f.root.querySelector('[data-shop-action="buy-dialog"][data-ref="dua-lingo"]');
  assert(dua&&!dua.disabled);
 }finally{f.close();}
});
