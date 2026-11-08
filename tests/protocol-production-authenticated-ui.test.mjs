import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const root='https://the-xpedition-universe.onrender.com';
const login=process.env.XP_QA_LOGIN;
const password=process.env.XP_QA_PASSWORD;
const serverId=process.env.XP_QA_SERVER_ID;
const errors=[];
const report={target:root,source:'public-production-with-real-auth',devices:[],commands:[],note:'No gameplay writes, votes or STAFF start actions performed'};
const out='artifacts/protocol-production-authenticated';
await mkdir(out,{recursive:true});

test('production public login, World entry and real ceremony screen clicks', {timeout:330000, skip:!login||!password?'Add XP_QA_LOGIN and XP_QA_PASSWORD to GitHub Actions repository secrets':false},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const device of ['desktop','mobile']){
   const mobile=device==='mobile';
   const context=await browser.newContext(mobile
    ?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}
    :{viewport:{width:1440,height:900}});
   const page=await context.newPage();
   page.setDefaultTimeout(15000);
   page.on('pageerror',e=>errors.push({device,error:e.message}));
   const started=Date.now();
   const auth=await context.request.post(root+'/api/auth/login',{data:{login,password},timeout:90000});
   assert.equal(auth.status(),200,device+': login failed (HTTP '+auth.status()+'); no password printed');
   const authPayload=await auth.json();
   assert(authPayload.user?.id,device+': server did not establish user session');
   const list=await context.request.get(root+'/api/world/servers',{timeout:90000});
   assert.equal(list.status(),200,device+': cannot list real game servers: '+list.status());
   const config=await list.json();
   assert.equal(config.staff,true,device+': the supplied account must be an authorized STAFF account');
   const server=(config.servers||[]).find(s=>s.id===serverId)||(config.servers||[]).find(s=>s.enabled&&!s.archived);
   assert(server,'No enabled World servers available to check. The script will not create or modify one.');
   await page.goto(root+'/juegos/?server='+encodeURIComponent(server.id),{waitUntil:'domcontentloaded',timeout:100000});
   await page.locator('[data-action="ceremony"]').waitFor({state:'visible',timeout:100000});
   const worldEntryMs=Date.now()-started;
   await page.locator('[data-action="ceremony"]').click({timeout:20000});
   await page.locator('#connection').waitFor({state:'visible',timeout:85000});
   await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),null,{timeout:85000});
   const ceremonyEntryMs=Date.now()-started;
   const checks={device,server:server.name,worldEntryMs,ceremonyEntryMs,clicks:[],intro:null};
   async function click(label,button,condition,limit=4000){
    const start=Date.now();
    await page.locator(button).click({timeout:15000});
    await page.locator(condition).waitFor({state:'visible',timeout:limit});
    const totalMs=Date.now()-start;
    checks.clicks.push({label,totalMs});
    assert(totalMs<limit,device+': '+label+' slower than '+limit+' ms: '+totalMs);
   }
   await click('help opens','#help','#dialog',3500);
   await page.locator('#dialog-close').click();
   await page.locator('#dialog').waitFor({state:'hidden'});
   await click('Direction opens','#staff-toggle','#direction',3500);
   await page.locator('#close-direction').click();
   await page.locator('#direction').waitFor({state:'hidden'});
   await click('Chat opens','#arena-chat-toggle','#chat',3500);
   await page.locator('#close-protocol-chat').click();
   await page.locator('#chat').waitFor({state:'hidden'});
   // Read-only intro assessment. If no ceremony is running, report that fact:
   // never manufacture a pass or start/eliminate real contestants.
   checks.phase=await page.locator('body').getAttribute('data-phase');
   checks.intro=await page.evaluate(async()=>{
    const video=document.querySelector('video#cinema, #cinema video, video[autoplay]');
    if(!video)return {status:'NO_VIDEO_ELEMENT'};
    if(!video.currentSrc && !video.src)return {status:'NO_ACTIVE_CEREMONY_INTRO'};
    const before=video.currentTime;
    await new Promise(resolve=>setTimeout(resolve,1700));
    return {status:'VIDEO_PRESENT',readyState:video.readyState,paused:video.paused,advancedSeconds:Math.round((video.currentTime-before)*100)/100,sourcePresent:!!video.currentSrc};
   });
   await page.screenshot({path:out+'/'+device+'-ceremony.png',fullPage:true,timeout:25000});
   report.devices.push(checks);
   console.log('PUBLIC_PROTOCOL_DEVICE',JSON.stringify(checks));
   await context.close();
  }
  assert.deepEqual(errors,[],'JavaScript page errors on public production URL');
  console.log('PUBLIC_PROTOCOL_AUDIT',JSON.stringify(report));
 }catch(error){
  console.error('PUBLIC_PROTOCOL_AUDIT_FAILURE',JSON.stringify({message:error.message,report,errors}));
  throw error;
 }finally{await browser.close();}
});