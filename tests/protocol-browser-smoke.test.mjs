import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
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
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const context=async id=>{
   const c=await browser.newContext();
   await c.addCookies([{name:'xp_world_session',value:id,url:f.base}]);
   const page=await c.newPage();
   page.on('pageerror',error=>errors.push(id+': '+error.message));
   await page.goto(f.base+'/juegos/x-protocol/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),{timeout:25000});
   return page;
  };
  const staff=await context(STAFF_ID),player=await context('browser-player');
  assert.equal(await staff.locator('#staff-toggle').isVisible(),true,'STAFF controls must be accessible');

  const control=async type=>{
   const response=await f.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type});
   assert.equal(response.status,200,type+' failed '+JSON.stringify(response));
   return response;
  };
  await control('open');
  await control('fillBots');
  await control('start');

  await staff.waitForFunction(()=>document.body.dataset.phase==='ELIMINATION_LOADING'||document.body.dataset.phase==='INTRO_VIDEO',{timeout:15000});
  await staff.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',{timeout:30000});
  await player.waitForFunction(()=>document.body.dataset.phase==='INTRO_VIDEO',{timeout:30000});
  await staff.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},{timeout:25000});
  await player.waitForFunction(()=>{const v=document.querySelector('#video');return v&&v.currentTime>0.5&&!v.paused;},{timeout:25000});

  await staff.locator('#staff-toggle').click();
  await staff.locator('#staff-actions button[data-action="pause"]').click();
  await staff.waitForFunction(()=>!document.querySelector('#pause').hidden,{timeout:10000});
  await staff.locator('#staff-actions button[data-action="resume"]').click();
  await staff.waitForFunction(()=>document.querySelector('#pause').hidden,{timeout:10000});

  await staff.waitForFunction(()=>document.body.dataset.phase==='RESULTS_SELECTION',{timeout:60000});
  await player.waitForFunction(()=>document.body.dataset.phase==='RESULTS_SELECTION',{timeout:15000});
  assert.equal(await staff.locator('#cinema').isVisible(),false,'video must no longer cover the ceremony stage');
  const saved=await f.call('/api/world/x-protocol/results',STAFF_ID,'POST',{name:'Reto de prueba',ranking:SHELTER_PARTICIPANTS.map(characterId=>({characterId,name:characterId}))});
  assert.equal(saved.status,200,'staff must be able to upload the challenge result');
  await staff.locator('#results-select option[value]:not([value=""])').first().waitFor({timeout:15000});
  await staff.locator('#choose-results').click();
  await staff.locator('#dialog-confirm').click();
  await staff.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',{timeout:12000});
  await player.waitForFunction(()=>document.body.dataset.phase==='RESULTS_REVEAL',{timeout:12000});
  assert.deepEqual(errors,[],'no browser runtime errors during the complete intro and STAFF result controls');
 }finally{await browser?.close();await f.close();}
});
