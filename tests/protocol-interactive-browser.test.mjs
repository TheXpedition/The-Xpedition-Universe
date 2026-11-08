import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

test('actual clicks, modals and phase changes stay synchronized on desktop and mobile', {timeout:450000},async()=>{
 const actors=[
  {id:STAFF_ID,character:'maria-villegas',zone:'base',x:900,y:700},
  {id:'click-winner',character:'bruno',zone:'base',x:1020,y:700},
  {id:'click-voter',character:'carmine',zone:'base',x:1080,y:700}
 ];
 const f=await liveFixture('protocol-visual-click-e2e',actors);
 let browser;
 const errors=[],measurements={};
 await mkdir('artifacts',{recursive:true});
 async function capture(page,label){await page.screenshot({path:'artifacts/protocol-click-'+label+'.png',animations:'disabled'}).catch(()=>{});}
 try{
  for(const a of actors)await claimFixtureCharacter(f.base,a.id,a.character);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  async function connect(id,mobile=false){
   const context=await browser.newContext(mobile?{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1366,height:820}});
   await context.addCookies([{name:'xp_world_session',value:id,url:f.base}]);
   const page=await context.newPage();
   page.on('pageerror',err=>errors.push(id+': '+err.message));
   page.on('console',msg=>{if(msg.type()==='error')errors.push(id+': console '+msg.text().slice(0,240));});
   await page.goto(f.base+'/juegos/x-protocol/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),{},{timeout:30000});
   return page;
  }
  const staff=await connect(STAFF_ID),winner=await connect('click-winner',true),voter=await connect('click-voter');
  const phase=async(page,value,limit=120000)=>{await page.waitForFunction(v=>document.body.dataset.phase===v,value,{timeout:limit});};
  const mark=async(label,click,ready,limit=7000)=>{
   const started=Date.now();await click();await ready(limit);
   const ms=Date.now()-started;measurements[label]=ms;
   assert(ms<limit, label+' took '+ms+'ms');
   console.log('CEREMONY_UI_CLICK',JSON.stringify({label,ms}));
  };
  await mark('help opens',()=>staff.locator('#help').click(),t=>staff.locator('#dialog').waitFor({state:'visible',timeout:t}),2500);
  assert.match(await staff.locator('#dialog-title').textContent(),/THE X PROTOCOL/);
  await mark('help closes',()=>staff.locator('#dialog-close').click(),t=>staff.locator('#dialog').waitFor({state:'hidden',timeout:t}),2500);
  await mark('staff controls open',()=>staff.locator('#staff-toggle').click(),t=>staff.locator('#direction').waitFor({state:'visible',timeout:t}),2500);
  await mark('staff controls close',()=>staff.locator('#close-direction').click(),t=>staff.locator('#direction').waitFor({state:'hidden',timeout:t}),2500);
  await mark('player chat opens',()=>voter.locator('#arena-chat-toggle').click(),t=>voter.locator('#chat').waitFor({state:'visible',timeout:t}),2500);
  await mark('player chat closes',()=>voter.locator('#close-protocol-chat').click(),t=>voter.locator('#chat').waitFor({state:'hidden',timeout:t}),2500);
  await capture(staff,'lobby-desktop');

  const startAt=Date.now();
  const start=await f.call('/api/world/x-protocol/start-live',STAFF_ID,'POST',{fillBots:true});
  assert.equal(start.status,200,'the real World control route must start a ceremony: '+JSON.stringify(start));
  await Promise.all([staff,winner,voter].map(p=>phase(p,'INTRO_VIDEO',50000)));
  measurements.introOnAllMs=Date.now()-startAt;
  await capture(winner,'intro-mobile');
  await Promise.all([staff,winner,voter].map(p=>phase(p,'RESULTS_SELECTION',100000)));
  await mark('staff panel after intro',()=>staff.locator('#staff-toggle').click(),t=>staff.locator('#direction').waitFor({state:'visible',timeout:t}),2500);
  const resultRank=['bruno',...SHELTER_PARTICIPANTS.filter(x=>x!=='bruno')];
  await staff.locator('#results-controls summary').click();
  await staff.locator('#result-name').fill('Desafio visual de botones');
  await staff.locator('#result-ranking').fill(resultRank.join('\n'));
  await mark('staff saves challenge result',()=>staff.locator('#save-result').click(),t=>staff.waitForFunction(()=>document.querySelector('#notice')?.textContent.includes('Resultado guardado'),null,{timeout:t}),9500);
  await staff.locator('#results-select option[value]:not([value=""])').first().waitFor({state:'attached',timeout:10000});
  await mark('ranking confirmation opens',()=>staff.locator('#choose-results').click(),t=>staff.locator('#dialog').waitFor({state:'visible',timeout:t}),2500);
  await mark('ranking confirmation reaches every player',()=>staff.locator('#dialog-confirm').click(),async t=>{await Promise.all([staff,winner,voter].map(p=>phase(p,'RESULTS_REVEAL',t)));},8000);
  await capture(staff,'ranking-desktop');
  await capture(winner,'ranking-mobile');

  await mark('pause button updates 3 screens',async()=>{
   await staff.locator('#staff-actions button[data-action="pause"]').click();
  },async t=>{await Promise.all([staff,winner,voter].map(p=>p.waitForFunction(()=>document.querySelector('#pause')?.hidden===false,null,{timeout:t})));},8000);
  await mark('resume button updates 3 screens',()=>staff.locator('#staff-actions button[data-action="resume"]').click(),async t=>{await Promise.all([staff,winner,voter].map(p=>p.waitForFunction(()=>document.querySelector('#pause')?.hidden===true,null,{timeout:t})));},8000);

  // Click-to-chat feedback: a real contestant message must appear on every
  // spectator screen through the actual browser WebSocket relay.
  await voter.locator('#arena-chat-toggle').click();
  await voter.locator('#chat-input').fill('QA sync chat 18 actores');
  await mark('chat send updates both players',()=>voter.locator('#chat-form button[type="submit"]').click(),async t=>{await Promise.all([winner,voter].map(p=>p.waitForFunction(()=>[...document.querySelectorAll('#chat-log p')].some(x=>x.textContent.includes('QA sync chat 18 actores')),null,{timeout:t})));},8500);

  // Wait through the full timed ranking instead of artificially changing
  // state. The actual winner must see and click the nomination interface.
  await Promise.all([staff,winner,voter].map(p=>phase(p,'WINNER_NOMINATION',125000)));
  await capture(winner,'nomination-mobile');
  const first=winner.locator('[data-purpose="nominate"] button.choice:not([disabled])').first();
  await first.waitFor({state:'visible',timeout:8000});
  await mark('winner nomination confirmation opens',()=>first.click(),t=>winner.locator('#dialog').waitFor({state:'visible',timeout:t}),3000);
  await mark('winner nomination reaches all screens',()=>winner.locator('#dialog-confirm').click(),async t=>{await Promise.all([staff,winner,voter].map(p=>phase(p,'GROUP_VOTE',t)));},8500);
  await capture(voter,'voting-desktop');
  const eligible=voter.locator('[data-purpose="vote"] button.choice:not([disabled])').first();
  await eligible.waitFor({state:'visible',timeout:9000});
  await mark('voter confirmation opens',()=>eligible.click(),t=>voter.locator('#dialog').waitFor({state:'visible',timeout:t}),3000);
  await mark('voter vote persists and UI acknowledges',()=>voter.locator('#dialog-confirm').click(),t=>voter.waitForFunction(()=>document.querySelector('#private-station')?.textContent.includes('Tu voto por'),null,{timeout:t}),8000);
  await capture(voter,'vote-ack-desktop');

  assert.deepEqual(errors.filter(e=>!e.includes('net::ERR_')),[],'browser console and runtime errors');
  console.log('CEREMONY_UI_FINAL_REPORT',JSON.stringify({measurements,users:3,mode:'actual Playwright browser clicks against real World + dedicated engine fixture'}));
 }catch(error){
  for(const [i,page] of (browser?.contexts()||[]).flatMap(ctx=>ctx.pages()).entries())await capture(page,'failure-'+i);
  console.error('CEREMONY_UI_DIAGNOSTICS',JSON.stringify({measurements,errors,reason:error.message}));
  throw error;
 }finally{await browser?.close();await f.close();}
});
