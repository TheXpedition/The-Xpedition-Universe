import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

test('real Chromium STAFF and participant screens play the complete intro, transition, and accept results', {timeout:120000},async()=>{
 const f=await liveFixture('protocol-browser-smoke',[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:900,y:700},
  {id:'browser-player',character:'bruno',zone:'base',x:1050,y:700}
 ]);
 let browser;
 const errors=[];
 try{
  await claimFixtureCharacter(f.base,STAFF_ID,'maria-villegas');
  await claimFixtureCharacter(f.base,'browser-player','bruno');
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=async(id,mobile=false)=>{
   const c=await browser.newContext(mobile?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:800}});
   await c.addCookies([{name:'xp_world_session',value:id,url:f.base}]);
   await c.addInitScript(()=>{
    window.__worldBootstrapRequests=0;
    const originalFetch=window.fetch;
    window.fetch=function(...args){if(String(args[0]).includes('/api/world/bootstrap'))window.__worldBootstrapRequests++;return originalFetch.apply(this,args);};
    const originalWebSocket=window.WebSocket;
    window.WebSocket=new Proxy(originalWebSocket,{construct(Target,args){const ws=new Target(...args);if(String(args[0]).includes('/api/world/live'))window.__worldTestSocket=ws;return ws;}});
   });
   const page=await c.newPage();
   page.on('pageerror',error=>errors.push(id+': '+error.message));
   await page.goto(f.base+'/juegos/x-protocol/',{waitUntil:'domcontentloaded'});
   try{await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),undefined,{timeout:25000});}
   catch(error){
    const debug=await page.evaluate(()=>({href:location.href,status:document.querySelector('#connection')?.textContent,phase:document.querySelector('#phase')?.textContent,notice:document.querySelector('#notice')?.textContent,video:document.querySelector('#video')?.currentSrc}));
    console.error('PROTOCOL_BROWSER_DIAGNOSTICS',JSON.stringify({user:id,mobile,debug,errors}));
    throw error;
   }
   return page;
  };
  const staff=await context(STAFF_ID),player=await context('browser-player',true);
  assert.equal(await staff.locator('#staff-toggle').isVisible(),true,'STAFF controls must be accessible');

  const control=async type=>{
   const response=await f.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type});
   assert.equal(response.status,200,type+' failed '+JSON.stringify(response));
   return response;
  };
  await control('open');
  await control('fillBots');
  const faces=await Promise.all(SHELTER_PARTICIPANTS.map(async characterId=>{
   const result=await staff.request.get(f.base+'/juegos/x-protocol/art/portraits/'+characterId+'-face.webp');
   return {characterId,status:result.status()};
  }));
  assert.deepEqual(faces.filter(a=>a.status!==200),[],'all 18 ranking portraits must load over the actual World HTTP route');
  await control('start');

  await staff.waitForFunction(()=>document.body.dataset.phase==='ELIMINATION_LOADING'||document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:15000});
  await staff.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:30000});
  await player.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:30000});
  await staff.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},undefined,{timeout:25000});
  await player.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},undefined,{timeout:25000});
  const beforeReconnect=await player.evaluate(()=>({time:document.querySelector('#video').currentTime,bootstraps:window.__worldBootstrapRequests}));
  await player.evaluate(()=>window.__worldTestSocket.close(1000,'test network interruption'));
  await player.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO')&&window.__worldTestSocket?.readyState===WebSocket.OPEN,undefined,{timeout:22000});
  const afterReconnect=await player.evaluate(()=>({time:document.querySelector('#video').currentTime,bootstraps:window.__worldBootstrapRequests}));
  assert.equal(afterReconnect.bootstraps,beforeReconnect.bootstraps,'socket reconnect must not reload expensive World bootstrap');
  assert(afterReconnect.time>=beforeReconnect.time,'the introduction must continue, not restart, after reconnect');

  await staff.locator('#staff-toggle').click();
  await staff.locator('#staff-actions button[data-action="pause"]').click();
  await staff.waitForFunction(()=>!document.querySelector('#pause').hidden,undefined,{timeout:10000});
  await staff.locator('#staff-actions button[data-action="resume"]').click();
  await staff.waitForFunction(()=>document.querySelector('#pause').hidden,undefined,{timeout:10000});

  await staff.waitForFunction(()=>document.body.dataset.phase==='RESULTS_SELECTION',undefined,{timeout:60000});
  await player.waitForFunction(()=>document.body.dataset.phase==='RESULTS_SELECTION',undefined,{timeout:15000});
  assert.equal(await staff.locator('#cinema').isVisible(),false,'video must no longer cover the ceremony stage');
  await staff.locator('#results-controls summary').click();
  await staff.locator('#result-name').fill('Reto de prueba');
  await staff.locator('#save-result').click();
  await staff.locator('#results-select option[value]:not([value=""])').first().waitFor({state:'attached',timeout:15000});
  await staff.evaluate(()=>{
   window.__modalTimeline=[];
   document.addEventListener('click',e=>window.__modalTimeline.push({event:'click',target:e.target?.id||e.target?.tagName,phase:document.body.dataset.phase,stamp:Math.round(performance.now())}),true);
   const previousSend=WebSocket.prototype.send;WebSocket.prototype.send=function(data){if(String(data).includes('"type":"results"'))window.__modalTimeline.push({event:'socket-results-action',phase:document.body.dataset.phase,stamp:Math.round(performance.now())});return previousSend.call(this,data);};
   const previousFetch=window.fetch;window.fetch=function(url,options){if(String(url).includes('/control')&&String(options?.body||'').includes('"type":"results"'))window.__modalTimeline.push({event:'http-results-action',phase:document.body.dataset.phase,stamp:Math.round(performance.now()),stack:new Error().stack?.slice(0,650)});return previousFetch.call(this,url,options);};
   const confirmButton=document.querySelector('#dialog-confirm');const originalConfirmHandler=confirmButton.onclick;
   confirmButton.onclick=function(event){window.__modalTimeline.push({event:'confirm-handler',target:event?.target?.id,phase:document.body.dataset.phase,stamp:Math.round(performance.now()),stack:new Error().stack?.slice(0,650)});return originalConfirmHandler.call(this,event);};
   const dialog=document.querySelector('#dialog');
   new MutationObserver(()=>window.__modalTimeline.push({event:'dialog-change',open:dialog.open,phase:document.body.dataset.phase,stamp:Math.round(performance.now())})).observe(dialog,{attributes:true,attributeFilter:['open']});
   new MutationObserver(()=>window.__modalTimeline.push({event:'phase-change',open:dialog.open,phase:document.body.dataset.phase,stamp:Math.round(performance.now())})).observe(document.body,{attributes:true,attributeFilter:['data-phase']});
  });
  await staff.locator('#choose-results').click();
  await staff.waitForTimeout(800);
  const dialogDiagnostics=await staff.evaluate(()=>({phase:document.body.dataset.phase,select:document.querySelector('#results-select')?.value,dialogOpen:document.querySelector('#dialog')?.open,confirmHidden:document.querySelector('#dialog-confirm')?.hidden,notice:document.querySelector('#notice')?.textContent,title:document.querySelector('#dialog-title')?.textContent,trace:window.__modalTimeline}));
  assert.equal(dialogDiagnostics.dialogOpen,true,'STAFF result confirmation must stay open: '+JSON.stringify(dialogDiagnostics));
  await staff.locator('#dialog-confirm').click({timeout:5000});
  await staff.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',undefined,{timeout:12000});
  await player.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',undefined,{timeout:12000});
  for(const [page,device] of [[staff,'desktop'],[player,'mobile']]){
   await page.waitForFunction(()=>{
    const picture=document.querySelector('#monitor-ranking .rank-hero>img');
    return picture&&!picture.hidden&&picture.complete&&picture.naturalWidth>0;
   },undefined,{timeout:20000});
   const layout=await page.evaluate(()=>{
    const monitor=document.querySelector('#monitor'),rank=document.querySelector('#monitor-ranking');
    const hero=rank.querySelector('.rank-hero'),picture=hero.querySelector('img'),copy=hero.querySelector('div');
    const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};};
    return {monitor:box(monitor),rank:box(rank),hero:box(hero),picture:box(picture),copy:box(copy),
     hidden:rank.hidden,rankText:rank.textContent,assetLoaderHidden:document.querySelector('#asset-loader').hidden,
     pictureLoaded:picture.complete&&picture.naturalWidth>0};
   });
   assert.equal(layout.hidden,false,device+' must see the results on the physical monitor');
   assert.equal(layout.pictureLoaded,true,device+' ranking portrait must load');
   assert.equal(layout.assetLoaderHidden,true,device+' must see the monitor and not an asset loading overlay');
   assert(layout.hero.width>50&&layout.hero.height>10,device+' ranking hero must have drawable space: '+JSON.stringify(layout));
   assert(layout.rank.left>=layout.monitor.left-2&&layout.rank.right<=layout.monitor.right+2,device+' ranking must stay inside the monitor frame');
   assert(layout.picture.right<=layout.copy.left+3,device+' ranking photo must not cover participant name');
   assert(layout.copy.scrollWidth<=layout.copy.clientWidth+2,device+' ranking name must not overflow the physical monitor');
   assert.match(layout.rankText,/PUESTO\s+\d+/,'ranking must display an official numbered place');
   await mkdir('artifacts',{recursive:true});
   await page.screenshot({path:'artifacts/protocol-monitor-'+device+'.png',animations:'disabled'});
  }
  assert.deepEqual(errors,[],'no browser runtime errors during the complete intro and STAFF result controls');
 }finally{await browser?.close();await f.close();}
});
