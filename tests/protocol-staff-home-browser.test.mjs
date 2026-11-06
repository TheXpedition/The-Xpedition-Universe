import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';

test('STAFF can launch a ceremony with bots from World home even while its World socket is offline', {timeout:120000},async()=>{
 const f=await liveFixture('protocol-home-start',[{id:STAFF_ID,character:'maria-villegas',zone:'base',x:900,y:700}]);
 let browser;
 try{
  await claimFixtureCharacter(f.base,STAFF_ID,'maria-villegas');
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addCookies([{name:'xp_world_session',value:STAFF_ID,url:f.base}]);
  await context.addInitScript(()=>{
   const Native=window.WebSocket;
   window.WebSocket=new Proxy(Native,{construct(Target,args){
    // The user opened the menu before entering the live World map.
    // No playable socket exists, but the authenticated HTTP ceremony
    // controls must still work. Only the home menu connection is blocked.
    if(location.pathname==='/juegos/'&&String(args[0]).includes('/api/world/live'))return new Target('ws://127.0.0.1:1/');
    return new Target(...args);
   }});
  });
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(f.base+'/juegos/',{waitUntil:'domcontentloaded'});
  await page.locator('#world-main[aria-busy="false"]').waitFor({timeout:45000});
  await page.locator('[data-action="ceremony"]').click();
  await page.locator('.protocol-history[open] [data-history-start]').click();
  await page.locator('.protocol-history [data-fill-bots="yes"]').waitFor({timeout:12000});
  const startResponse=page.waitForResponse(r=>r.url().includes('/api/world/x-protocol/start-live')&&r.request().method()==='POST',{timeout:30000});
  await page.locator('.protocol-history [data-fill-bots="yes"]').click();
  const response=await startResponse;
  assert.equal(response.status(),200,'HTTP should start the ceremony without an existing World WebSocket: '+(await response.text()).slice(0,350));
  await page.waitForURL(/\/juegos\/x-protocol\//,{timeout:30000});
  await page.waitForFunction(()=>document.body.dataset.phase==='ELIMINATION_LOADING'||document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),undefined,{timeout:30000});
  const result=await f.call('/api/world/x-protocol',STAFF_ID);
  assert.equal(result.status,200);
  assert.equal(result.episode.roster.length,18);
  assert.equal(result.episode.enrolled,true,'STAFF must be enrolled after redirecting from menu');
  assert.equal(result.episode.staff,true);
  assert.equal(pageErrors.length,0,'no JavaScript errors in the real menu-to-live ceremony flow: '+pageErrors.join(', '));
 }finally{await browser?.close();await f.close();}
});
