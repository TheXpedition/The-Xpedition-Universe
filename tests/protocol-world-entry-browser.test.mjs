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

test('desktop signed-in simulated Edge reaches World despite stalled chats, profiles and news', {timeout:160000},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({
  viewport:{width:1692,height:900},
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0'
 });
 const page=await context.newPage();
 const pageErrors=[],resourceErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('response',response=>{if(response.status()>=500)resourceErrors.push(response.url()+' '+response.status());});
 try{
  await context.addCookies([{name:'xp_session',value:'synthetic-test-only-cookie',url:'https://the-xpedition-universe.onrender.com/'}]);
  await page.route('**/api/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    user:{id:'qa-session-only',name:'World QA Desktop',avatar:'Dani',staff:true,saved:[],follows:[]}
  })}));
  await page.route('**/api/world/access',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    role:'staff',canPlay:true,confirmed:true,publicEnabled:true,configured:true
  })}));
  await page.route('**/api/world/servers',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    staff:true,configured:true,inline:true,servers:[{id:'qa-no-real-room',name:'QA World',enabled:true,archived:false,autoBots:true}]
  })}));
  // These are low priority for a World entry. Their requests deliberately
  // never complete, reproducing the reported logged-in desktop spinner.
  const stalled=[];
  for(const endpoint of ['profiles','news','conversations']){
   await page.route('**/api/'+endpoint,async route=>{
    stalled.push(endpoint);
    await new Promise(()=>{});
   });
  }
  const start=Date.now();
  await page.goto('https://the-xpedition-universe.onrender.com/#world',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('.world-entry').waitFor({state:'visible',timeout:25000});
  await page.locator('[data-enter-server="qa-no-real-room"]').waitFor({state:'visible',timeout:12000});
  const elapsed=Date.now()-start;
  assert(elapsed<25000,'World still stalls when chats/news/profiles have stalled: '+elapsed+' ms');
  const textContent=await page.locator('#main').innerText();
  assert(!textContent.includes('Preparando tu próxima aventura'));
  assert.equal(pageErrors.length,0,'Desktop JavaScript errors: '+pageErrors.join(' / '));
  console.log('PUBLIC_DESKTOP_AUTHENTICATED_START_VERIFIED',JSON.stringify({
    elapsedMs:elapsed,serverListVisible:true,loadingSpinnerAbsent:true,
    simulatedAuthenticatedUser:true,stalledOptionalRequests:stalled,resourceErrors
  }));
 }finally{await context.close();await browser.close();}
});


test('desktop World entry is visible while own session profile stalls', {timeout:150000},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({
  viewport:{width:1692,height:900},
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0'
 });
 const page=await context.newPage();
 try{
  await page.route('**/api/me',async route=>{await new Promise(()=>{});});
  await page.route('**/api/world/access',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   role:'staff',canPlay:true,confirmed:true,publicEnabled:true,configured:true
  })}));
  await page.route('**/api/world/servers',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   staff:true,configured:true,inline:true,servers:[{id:'qa-no-real-room',name:'QA World',enabled:true,archived:false,autoBots:true}]
  })}));
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const started=Date.now();
  await page.goto('https://the-xpedition-universe.onrender.com/#world',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('.world-entry').waitFor({state:'visible',timeout:18000});
  await page.locator('[data-enter-server="qa-no-real-room"]').waitFor({state:'visible',timeout:12000});
  assert(!await page.locator('#main').innerText().then(x=>x.includes('Preparando tu próxima aventura')));
  console.log('PUBLIC_DESKTOP_USER_PROFILE_HANG_RECOVERED',JSON.stringify({
    startupMs:Date.now()-started,serverEntryVisible:true,
    profileEndpoint:'intentionally never resolves',errors
  }));
  assert.deepEqual(errors,[],'Desktop page script error while session request hangs');
 }finally{await context.close();await browser.close();}
});
