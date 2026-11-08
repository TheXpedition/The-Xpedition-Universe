import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// PUBLIC production document, but patched World entry JS and QA-only HTTP
// fixtures: no real account, server, inventory or elimination is modified.
test('desktop Edge enters inline World even if hidden intro warmup play() hangs forever', {timeout:135000},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({
  viewport:{width:1692,height:900},
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0'
 });
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>{
   window.HTMLMediaElement.prototype.play=function(){
    if(this.src?.includes('world-intro-warmup'))return new Promise(()=>{});
    return Promise.resolve();
   };
  });
  const mock=(suffix,body)=>page.route('**/api/'+suffix,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}));
  await mock('me',{user:{id:'qa-edge-desktop',name:'QA Test',avatar:'Dani',staff:true,saved:[],follows:[]}});
  await mock('config',{});
  await mock('profiles',{profiles:[]});
  await mock('news',{likes:[]});
  await mock('conversations',{conversations:[]});
  await mock('world/access',{role:'staff',canPlay:true,confirmed:true,publicEnabled:true,configured:true});
  await mock('world/servers',{staff:true,configured:true,inline:true,servers:[{
   id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'QA World',enabled:true,archived:false,autoBots:true
  }]});
  await page.route('**/world-entry.js*',async route=>route.fulfill({
   status:200,contentType:'text/javascript',
   body:await readFile(new URL('../public/world-entry.js',import.meta.url),'utf8')
  }));
  await page.route('**/world-intro-player.mjs',route=>route.fulfill({
   status:200,contentType:'text/javascript',
   body:'export async function playWorldIntro(){window.__introWasInvoked=(window.__introWasInvoked||0)+1;}'
  }));
  const child='<!DOCTYPE html><html><body><p id="phase">LOADING</p><script>'+
   'const channel=new MessageChannel();'+
   'channel.port1.onmessage=event=>{'+
   'if(event.data?.type==="accepted")document.querySelector("#phase").textContent="INTRO ACCEPTED";'+
   'if(event.data?.type==="finished")document.querySelector("#phase").textContent="INTRO FINISHED";'+
   'if(event.data?.type==="failed")document.querySelector("#phase").textContent="INTRO FAILED: "+event.data.error;'+
   '};'+
   'window.parent.postMessage({type:"world-intro-ready",session:{seen:true,session:"test"},'+
   'config:{url:"/world-intro-video.mp4",seen:true}},location.origin,[channel.port2]);'+
   '</script></body></html>';
  await page.route('**/juegos/?server=*',route=>route.fulfill({status:200,contentType:'text/html',body:child}));
  await page.goto('https://the-xpedition-universe.onrender.com/#world',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('[data-enter-server="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]').waitFor({state:'visible',timeout:20000});
  const clicked=Date.now();
  await page.locator('[data-enter-server]').click();
  const frame=page.frameLocator('iframe.world-server-frame');
  await frame.locator('#phase').getByText('INTRO FINISHED').waitFor({timeout:8500});
  const ms=Date.now()-clicked;
  assert(ms<8500,'World intro handshake blocked by a permanently pending warmup: '+ms+'ms');
  assert.equal(await page.evaluate(()=>window.__introWasInvoked),1);
  assert.deepEqual(errors,[],'Desktop JavaScript errors while playing World intro');
  console.log('EDGE_PUBLIC_WORLD_INTRO_WARMUP_VERIFIED',JSON.stringify({
   warmupPlay:'never settled',playerIntro:'invoked exactly once',frameCompletedMs:ms,errors
  }));
 }finally{await browser.close();}
});