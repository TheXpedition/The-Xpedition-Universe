import {test} from 'node:test';import assert from 'node:assert/strict';import {BootProgress,BOOT_WEIGHTS,optionalBootResource} from '../public/juegos/world-boot.mjs';
import {JSDOM} from 'jsdom';import {createBootDisplay} from '../public/juegos/world-boot.mjs';
import fs from 'node:fs';
import {showBootWallpaper} from '../public/juegos/world-boot.mjs';
test('the default cover is requested by HTML and remains visible while the equipped one loads',async()=>{
 const html=fs.readFileSync(new URL('../public/juegos/index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html),root=dom.window.document.querySelector('#loading');
 const art=root.querySelector('.boot-art'),cover=art.getAttribute('src');
 try{
  assert.match(cover,/portada-reparto-entrada\.webp$/);
  assert.equal(dom.window.document.querySelector('link[rel=preload][as=image]').getAttribute('href'),cover);
  let finish;
  const pending=showBootWallpaper(root,'/new.webp',{load:()=>new Promise(r=>finish=r)});
  assert.equal(art.getAttribute('src'),cover);
  finish({src:'/new.webp'});
  await pending;
  assert.equal(art.getAttribute('src'),'/new.webp');
 }finally{dom.window.close();}
});
test('an older loading attempt cannot overwrite the current wallpaper if its image finishes later',async()=>{const dom=new JSDOM('<div><img class="boot-art"><div class="boot-bleed"></div></div>'),root=dom.window.document.querySelector('div');let turn=1,finishOld;try{const old=showBootWallpaper(root,'/old.webp',{isCurrent:()=>turn===1,load:()=>new Promise(r=>finishOld=r)});turn=2;await showBootWallpaper(root,'/current.webp',{isCurrent:()=>turn===2,load:async()=>({src:'/current.webp'})});finishOld({src:'/old.webp'});await old;assert.equal(root.querySelector('img').getAttribute('src'),'/current.webp');assert(root.querySelector('.boot-bleed').style.getPropertyValue('--boot-wallpaper').includes('/current.webp'));}finally{dom.window.close();}});
test('loading percentage reflects completed work and reaches 100 only after the interface is ready',async()=>{const events=[],p=new BootProgress((value,id)=>events.push({value,id}));assert.equal(p.value,0);let release;const deferred=new Promise(r=>release=r),work=p.track('scene',deferred);assert.equal(p.value,0);release('scene image');assert.equal(await work,'scene image');assert.equal(p.value,17);for(const id of Object.keys(BOOT_WEIGHTS).filter(id=>id!=='scene'&&id!=='interface'))p.complete(id);assert.equal(p.value,90);p.complete('interface');assert.equal(p.value,100);p.complete('interface');assert.equal(p.value,100);assert(events.every((v,i)=>!i||v.value>=events[i-1].value));});
test('a failed required resource cannot report successful completion',async()=>{const p=new BootProgress();await assert.rejects(p.track('character',Promise.reject(Error('Missing sprite'))));assert.equal(p.value,0);assert.throws(()=>p.complete('invented'));});
test('a failed loading screen keeps its error visible when another resource completes late',()=>{const dom=new JSDOM('<div id="loading"><div role="progressbar"></div><b id="boot-percent"></b><p id="boot-message"></p><div id="boot-actions"></div></div>'),previous={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};Object.assign(globalThis,{document:dom.window.document,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});try{const root=document.querySelector('#loading'),display=createBootDisplay(root);display.update(20,'art');display.error('Falta autorización.');display.update(60,'module');assert.equal(root.querySelector('#boot-message').textContent,'Falta autorización.');assert(!root.querySelector('#boot-actions').hidden);assert(!root.hidden);assert(root.classList.contains('boot-error'));}finally{Object.assign(globalThis,previous);dom.window.close();}});

test('a desktop wallpaper that never decodes cannot keep World blocked forever',async()=>{
 const warnings=[],start=Date.now();
 const value=await optionalBootResource(()=>new Promise(()=>{}),{name:'stalled wallpaper',timeoutMs:35,onWarning:m=>warnings.push(m)});
 assert.equal(value,null);assert(Date.now()-start<700,'optional artwork must not block the game');
 assert(warnings[0].includes('stalled wallpaper'));
});
test('optional visual failure falls back without rejecting the World bootstrap',async()=>{
 const warnings=[];
 const image=await optionalBootResource(()=>Promise.reject(Error('Image decode failed')),{name:'sprite',timeoutMs:200,onWarning:m=>warnings.push(m)});
 assert.equal(image,null);assert.match(warnings[0],/Image decode failed/);
});
test('available optional image remains part of the normal entry',async()=>{
 const image={src:'sprite.webp'};
 assert.equal(await optionalBootResource(async()=>image,{name:'sprite',timeoutMs:300}),image);
});
