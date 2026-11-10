import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {openDatabase} from '../database.mjs';
import {startProtocolDedicatedServer} from '../protocol-dedicated-server.mjs';
import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

test('browser audit from Staff start through real video, ranking, votes, duel and return', {timeout:360000},async()=>{
 const output=process.env.PROTOCOL_AUDIT_OUTPUT||'artifacts/protocol-audit';
 await mkdir(output,{recursive:true});
 const events={},errors=[],httpFailures=[],notes={};
 const actors=[
  {id:STAFF_ID,role:'staff',character:'maria-villegas',zone:'base',x:900,y:700},
  {id:'audit-winner',role:'jugador',character:'bruno',zone:'base',x:1000,y:700},
  {id:'audit-voter',role:'votante',character:'carmine',zone:'base',x:1100,y:700},
  {id:'audit-viewer',role:'espectador',character:'dua-lingo',spectator:true,zone:'base',x:1200,y:700}
 ];
 let simulated=Date.now(),real=simulated,scale=1,seed=31;
 const now=()=>simulated+(Date.now()-real)*scale;
 function speed(value){simulated=now();real=Date.now();scale=value;}
 const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const secret='isolated-browser-audit-bridge-fixture-32';
 let db,engine,f,browser;
 const pages=[];
 const phase=async(page,name,timeout=25000)=>page.waitForFunction(value=>document.body.dataset.phase===value,name,{timeout,polling:100});
 const capture=(page,label)=>page.screenshot({path:`${output}/${label}.png`,animations:'disabled',timeout:8000});
 const saw=(role,name)=>events[role].some(e=>e.phase===name);
 try{
  f=await liveFixture('protocol-audit-browser',actors,{beforeSpawn:async folder=>{
   db=await openDatabase(folder);
   engine=await startProtocolDedicatedServer({database:db,host:'127.0.0.1',port:0,secret,now,rng});
   return {PROTOCOL_ENGINE_REMOTE_ENABLED:'true',PROTOCOL_SERVICE_URL:'http://127.0.0.1:'+engine.port,PROTOCOL_BRIDGE_SECRET:secret};
  }});
  for(const a of actors)await claimFixtureCharacter(f.base,a.id,a.character);
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
  for(const a of actors){
   const mobile=a.role==='jugador';
   const context=await browser.newContext(mobile?{viewport:{width:844,height:390},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:820}});
   await context.addCookies([{name:'xp_world_session',value:a.id,url:f.base}]);
   await context.addInitScript(()=>{
    const Native=window.WebSocket;
    window.WebSocket=new Proxy(Native,{construct(Target,args){const ws=new Target(...args);if(String(args[0]).includes('/api/world/live'))window.auditSocket=ws;return ws;}});
    window.introEnded=false;
    document.addEventListener('ended',event=>{if(event.isTrusted&&event.target.id==='video')window.introEnded=true;},true);
   });
   const page=await context.newPage(),trace=events[a.role]=[];pages.push(page);
   page.on('pageerror',e=>errors.push({role:a.role,message:e.message}));
   page.on('response',r=>{if(r.status()>=400)httpFailures.push({role:a.role,status:r.status(),path:new URL(r.url()).pathname});});
   page.on('websocket',ws=>{
    trace.push({type:'ws-open',at:Date.now()});
    ws.on('close',()=>trace.push({type:'ws-close',at:Date.now()}));
    ws.on('framereceived',({payload})=>{
     try{const m=JSON.parse(payload);if(m.type==='protocol-state'&&trace.findLast(e=>e.type==='state')?.phase!==m.episode.phase)trace.push({type:'state',phase:m.episode.phase,revision:m.episode.revision,at:Date.now()});else if(['protocol-ready-ack','protocol-return'].includes(m.type))trace.push({type:m.type,at:Date.now()});}catch{}
    });
    ws.on('framesent',({payload})=>{try{const m=JSON.parse(payload);if(['protocol-subscribe','protocol-ready','protocol-media-started','protocol-media-ended','protocol-action'].includes(m.type))trace.push({type:m.type,action:m.action?.type,at:Date.now()});}catch{}});
   });
   if(mobile){
    let first=true;
    await page.route('**/x-protocol/assets.json',route=>{if(first){first=false;notes.transientManifestFailure=true;return route.fulfill({status:503,body:'temporary fixture failure'});}return route.continue();});
   }
   await page.goto(f.base+'/juegos/x-protocol/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('EN VIVO'),null,{timeout:20000});
  }
  const [staff,winner,voter,viewer]=pages;
  const staffClick=async(type,click)=>{
   const reply=staff.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/control')&&r.request().method()==='POST'&&r.request().postDataJSON()?.type===type,{timeout:15000});
   await click();
   const response=await reply,data=await response.json();
   assert.equal(response.status(),200,type+': '+(data.error||''));
   await staff.waitForFunction(()=>document.querySelector('#staff-actions')?.getAttribute('aria-busy')!=='true',null,{polling:100,timeout:5000});
  };
  await staff.locator('#staff-toggle').click();
  await staffClick('open',()=>staff.locator('#staff-actions [data-action=open]').click());
  await phase(staff,'LOBBY');
  await staffClick('fillBots',()=>staff.locator('#staff-actions [data-action=fillBots]').click());
  await staff.waitForFunction(()=>document.querySelector('#staff-summary')?.textContent.includes('18/18'),null,{timeout:15000,polling:100});
  await staff.locator('#staff-actions [data-action=start]').click();
  await staffClick('start',()=>staff.locator('#dialog-confirm').click());
  await Promise.all(pages.map(p=>phase(p,'INTRO_VIDEO',45000)));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>document.querySelector('#video').currentTime>.5,null,{timeout:16000})));
  notes.introSources=await Promise.all(pages.map(p=>p.locator('#video').evaluate(v=>new URL(v.currentSrc).pathname)));
  notes.introPlayback=await Promise.all(pages.map(p=>p.locator('#video').evaluate(v=>({position:v.currentTime,duration:v.duration}))));
  assert(notes.introSources.every(path=>path.endsWith('intro-apocalypse-ii-20261107.mp4')));
  await capture(winner,'01-intro-movil');
  await winner.evaluate(()=>window.auditSocket.close(4001,'simulated interruption'));
  await f.until(()=>events.jugador.filter(e=>e.type==='ws-open').length>=2,12000);
  await Promise.all(pages.map(p=>phase(p,'RESULTS_SELECTION',55000)));
  notes.nativeVideoEnd=await Promise.all(pages.map(p=>p.evaluate(()=>window.introEnded)));
  assert(notes.nativeVideoEnd.some(Boolean),'an uninterrupted browser must report the actual end of the intro video');
  for(const a of actors)assert(saw(a.role,'MONITOR_BOOT'),`${a.role} did not receive the monitor transition`);
  await capture(viewer,'02-monitor-espectador');
  if(!await staff.locator('#direction').isVisible())await staff.locator('#staff-toggle').click();
  await staff.locator('#results-controls summary').click();
  await staff.locator('#result-name').fill('Resultado de auditoría local');
  await staff.locator('#result-ranking').fill(['bruno',...SHELTER_PARTICIPANTS.filter(c=>c!=='bruno')].join('\n'));
  await staff.locator('#save-result').click();
  await staff.locator('#results-select option:not([value=""])').first().waitFor({state:'attached'});
  await staff.locator('#choose-results').click();await staffClick('results',()=>staff.locator('#dialog-confirm').click());
  await Promise.all(pages.map(p=>phase(p,'RESULTS_REVEAL')));
  await viewer.waitForFunction(()=>{const img=document.querySelector('#monitor-ranking img');return img?.naturalWidth>0&&!document.querySelector('#monitor-ranking').hidden;});
  await capture(viewer,'03-ranking-espectador');
  console.log('AUDIT_BROWSER_VIDEO_AND_RANKING_OK');
  speed(14);
  await phase(winner,'WINNER_NOMINATION');speed(1);
  const nominate=winner.locator('[data-purpose=nominate] button.choice:not([disabled])').filter({hasNotText:/carmine/i}).last();
  await nominate.click();await winner.locator('#dialog-confirm').click();
  await Promise.all(pages.map(p=>phase(p,'GROUP_VOTE')));
  await voter.locator('[data-purpose=vote] button.choice:not([disabled])').first().click();
  await voter.locator('#dialog-confirm').click();
  await voter.waitForFunction(()=>document.querySelector('#play-panel')?.textContent.includes('Tu voto por'));
  await capture(voter,'04-voto-confirmado');
  speed(14);
  await phase(staff,'THIRD_NOMINEE_CONFIRMATION');
  const getState=async()=> (await f.call('/api/world/x-protocol',STAFF_ID)).episode;
  const voting=await getState();
  assert(voting.tied.length>0);
  const confirm=await f.call('/api/world/x-protocol/control',STAFF_ID,'POST',{type:'confirmThird',target:voting.tied[0],resolveTie:true});
  assert.equal(confirm.status,200,confirm.error);
  await phase(viewer,'DUEL_ACTIVE',35000);
  await capture(viewer,'05-duelo');
  await phase(viewer,'DUEL_RESULT',45000);speed(1);
  const result=await getState();
  assert(result.duel.losers.length>0||result.duel.outcome==='double_save');
  await capture(viewer,result.duel.losers.length?'06-eliminacion':'06-resultado-empate');speed(14);
  await Promise.all(pages.map(p=>p.waitForURL(/\/juegos\/(?:\?|$)/, {timeout:60000})));
  let finalState=await getState();
  for(let attempt=0;attempt<30&&finalState.phase!=='ELIMINATION_FINISHED';attempt++){
   await new Promise(resolve=>setTimeout(resolve,500));
   finalState=await getState();
  }
  assert.equal(finalState.phase,'ELIMINATION_FINISHED');
  for(const a of actors)for(const name of ['INTRO_VIDEO','MONITOR_BOOT','RESULTS_REVEAL','GROUP_VOTE','DUEL_ACTIVE','DUEL_RESULT'])assert(saw(a.role,name),`${a.role} missed ${name}`);
  assert.deepEqual(errors,[]);
  notes.final={phase:'ELIMINATION_FINISHED',duel:result.duel.type,eliminated:result.duel.losers.length,browsers:pages.length};
  console.log('AUDIT_BROWSER_COMPLETE',JSON.stringify(notes.final));
 }catch(error){
  notes.failure=error.message;
  if(pages.length)await capture(pages.at(-1),'failure').catch(()=>{});
  throw error;
 }finally{
  await writeFile(output+'/trace.json',JSON.stringify({environment:'local, separate World and protocol services, accelerated game clock after the ranking screenshot',events,errors,httpFailures,notes},null,2));
  await browser?.close();await f?.close();await engine?.close();await db?.close();
 }
});
