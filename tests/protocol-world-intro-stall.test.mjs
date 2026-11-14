import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

// PUBLIC production document, but patched World entry JS and QA-only HTTP
// fixtures: no real account, server, inventory or elimination is modified.
test('desktop Edge enters inline World without fetching the intro and can recover an expired session', {timeout:135000},async()=>{
 const browser=await chromium.launch({channel:process.env.WORLD_TEST_BROWSER||'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({
  viewport:{width:1692,height:900},
  userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0'
 });
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const introRequests=[];
  page.on('request',request=>{if(/world-intro|the-x-world-intro/.test(request.url()))introRequests.push(request.url());});
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
  const child='<!doctype html><html><body><p id="phase">WORLD READY</p></body></html>';
  await page.route('**/juegos/?server=*',route=>route.fulfill({status:200,contentType:'text/html',body:child}));
  await page.route('https://the-xpedition-universe.onrender.com/',async route=>route.fulfill({status:200,contentType:'text/html',body:await readFile(new URL('../public/index.html',import.meta.url),'utf8')}));
  await page.goto('https://the-xpedition-universe.onrender.com/#world',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('[data-enter-server="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]').waitFor({state:'visible',timeout:20000});
  await page.locator('[data-enter-server]').click();
  const frame=page.frameLocator('iframe.world-server-frame');
  await frame.locator('#phase').getByText('WORLD READY').waitFor({timeout:8500});
  assert.deepEqual(introRequests,[]);
  // A revoked desktop cookie may redirect the iframe to the public home page.
  // Its full-screen index spinner must be replaced by an explicit login UI.
  await page.route('**/?auth=login*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>Login redirect</body></html>'}));
  await frame.locator('#phase').evaluate(()=>location.assign('/?auth=login&returnTo=%2Fjuegos%2F'));
  await page.locator('iframe.world-server-frame').waitFor({state:'detached',timeout:9500});
  await page.locator('#modal[open]').waitFor({state:'visible',timeout:5000});
  assert.match(await page.locator('#modal').innerText(),/Entra al universo|Qué bueno verte de nuevo/i);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});