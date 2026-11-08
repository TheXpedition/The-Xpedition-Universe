import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';

test('public URL leaves the forever-loading spinner and displays World entry', {timeout:200000},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const exceptions=[];
 page.on('pageerror',error=>exceptions.push(error.message));
 try{
  let success=false,last='';
  for(let attempt=0;attempt<3&&!success;attempt++){
   try{
    await page.goto('https://the-xpedition-universe.onrender.com/#world',{waitUntil:'domcontentloaded',timeout:65000});
    await page.locator('section.world-entry').waitFor({state:'visible',timeout:35000});
    const main=await page.locator('#main').innerText();
    assert(!main.includes('Preparando tu próxima aventura'),'initial loading placeholder still showing');
    assert.match(main,/THE XPEDITION|WORLD/);
    success=true;
   }catch(error){last=error.message;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,7000));}
  }
  assert(success,'PUBLIC WORLD DOES NOT BOOT: '+last+'; browser errors='+JSON.stringify(exceptions.slice(0,8)));
  assert.deepEqual(exceptions,[],'Public home must not produce uncaught JavaScript errors');
  console.log('PUBLIC_WORLD_ENTRY_VERIFIED',JSON.stringify({url:page.url(),mainVisible:true,loadingSpinnerAbsent:true}));
 }finally{await browser.close();}
});

test('STAFF and participant have actual visible open, fill bots, start and join buttons in Chromium', {timeout:180000},async()=>{
 const f=await liveFixture('protocol-director-options',[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:750,y:700},
  {id:'director-lobby-guest',character:'bruno',zone:'base',x:840,y:700}
 ]);
 let browser;
 try{
  await claimFixtureCharacter(f.base,STAFF_ID,'maria-villegas');
  await claimFixtureCharacter(f.base,'director-lobby-guest','bruno');
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const opening=async(id)=>{
   const ctx=await browser.newContext({viewport:{width:1366,height:820}});
   await ctx.addCookies([{name:'xp_world_session',value:id,url:f.base}]);
   const page=await ctx.newPage();
   await page.goto(f.base+'/juegos/x-protocol/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),null,{timeout:30000});
   return page;
  };
  const staff=await opening(STAFF_ID),guest=await opening('director-lobby-guest');
  await staff.locator('#staff-toggle').waitFor({state:'visible'});
  await staff.locator('#play-panel button[data-action="open"]').waitFor({state:'visible'});
  await staff.locator('#play-panel button[data-action="open"]').click();
  await staff.waitForFunction(()=>document.body.dataset.phase==='LOBBY',null,{timeout:15000});
  await guest.waitForFunction(()=>document.body.dataset.phase==='LOBBY',null,{timeout:15000});
  await guest.locator('#play-panel button[data-action="join"]').waitFor({state:'visible'});
  await guest.locator('#play-panel button[data-action="visit"]').waitFor({state:'visible'});
  await guest.locator('#play-panel button[data-action="join"]').click();
  await guest.waitForFunction(()=>document.querySelector('#play-panel')?.textContent.includes('YA FORMAS PARTE'),null,{timeout:15000});
  await staff.locator('#play-panel button[data-action="fillBots"]').waitFor({state:'visible'});
  await staff.locator('#play-panel button[data-action="fillBots"]').click();
  await staff.waitForFunction(()=>document.querySelector('#staff-summary')?.textContent.includes('18/18'),null,{timeout:15000});
  const start=staff.locator('#play-panel button[data-action="start"]');
  await start.click();
  await staff.locator('#dialog-confirm').waitFor({state:'visible',timeout:5000});
  await staff.locator('#dialog-confirm').click();
  await staff.waitForFunction(()=>['ELIMINATION_LOADING','INTRO_VIDEO','CEREMONY_STAGE_VISIBLE','MONITOR_BOOT'].includes(document.body.dataset.phase),null,{timeout:20000});
  console.log('STAFF_START_UI_VERIFIED',JSON.stringify({staffOptions:['open','fillBots','start'],participantOptions:['join','visit'],roster:18,started:true}));
 }finally{await browser?.close();await f.close();}
});