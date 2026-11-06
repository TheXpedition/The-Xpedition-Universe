import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';

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
   const c=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:800}});
   await c.addCookies([{name:'xp_world_session',value:id,url:f.base}]);
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
  await control('start');

  await staff.waitForFunction(()=>document.body.dataset.phase==='ELIMINATION_LOADING'||document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:15000});
  await staff.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:30000});
  await player.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',undefined,{timeout:30000});
  await staff.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},undefined,{timeout:25000});
  await player.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},undefined,{timeout:25000});

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
  await staff.locator('#choose-results').click();
  const dialogDiagnostics=await staff.evaluate(()=>({phase:document.body.dataset.phase,select:document.querySelector('#results-select')?.value,dialogOpen:document.querySelector('#dialog')?.open,confirmHidden:document.querySelector('#dialog-confirm')?.hidden,notice:document.querySelector('#notice')?.textContent,title:document.querySelector('#dialog-title')?.textContent}));
  assert.equal(dialogDiagnostics.dialogOpen,true,'STAFF result confirmation must open: '+JSON.stringify(dialogDiagnostics));
  await staff.locator('#dialog-confirm').click();
  await staff.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',undefined,{timeout:12000});
  await player.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',undefined,{timeout:12000});
  assert.deepEqual(errors,[],'no browser runtime errors during the complete intro and STAFF result controls');
 }finally{await browser?.close();await f.close();}
});
