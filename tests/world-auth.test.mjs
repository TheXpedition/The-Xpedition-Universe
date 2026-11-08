import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {createHash,randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
const root=path.resolve(import.meta.dirname,'..'),staff='92354719-8816-4e25-9199-0dc9a99f7da1',hash=v=>createHash('sha256').update(v).digest('hex');
async function start(file,env){const child=spawn(process.execPath,[root+'/'+file],{cwd:root,env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:'0',DATABASE_URL:'',PERSISTENCE_MODE:'local',...env},stdio:['ignore','pipe','pipe']});const base=await new Promise((resolve,reject)=>{let out='',err='';const timer=setTimeout(()=>{child.kill();reject(Error(err||'Startup timed out'));},15000);child.stderr.on('data',d=>err+=d);child.stdout.on('data',d=>{out+=d;const m=out.match(/localhost:(\d+)/);if(m){clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error(err||'Startup failed'));});});return {child,base};}
async function stop(s){if(s&&!s.child.killed)await new Promise(r=>{s.child.once('exit',r);s.child.kill();});}
test('separate processes share account data through a single-use handoff; logout revokes World and a stopped World leaves the universe healthy',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'xp-world-sso-')),db=await openDatabase(data);let main,world;const room=randomUUID();
 try{
  for(const id of [staff,'other','outsider']){await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id,id,id+'@example.invalid','Dani','',Date.now());await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',hash(id),id,Date.now()+3600000);}
  await db.run('INSERT INTO world_servers(id,name,creator,enabled,settings,created,updated) VALUES(?,?,?,1,?,1,1)',room,'Auth server',staff,'{"autoBots":false}');world=await start('world-server.mjs',{DATA_DIR:data,WORLD_SERVER_HUB:'true'});main=await start('server.mjs',{DATA_DIR:data,WORLD_URL:world.base});
  const launch=await fetch(main.base+'/juegos/?server='+room,{headers:{Cookie:'xp_session='+staff},redirect:'manual'});assert.equal(launch.status,302);const location=new URL(launch.headers.get('location'));assert.equal(location.origin,world.base);assert.equal(location.pathname,'/servers/'+room+'/auth');assert(!location.search);const ticket=new URLSearchParams(location.hash.slice(1)).get('ticket');assert(ticket&&!ticket.includes(staff));
  // THE AUTH LOADING SCREEN MUST LOAD ITS MODULE DEPENDENCIES BEFORE THE
  // xp_world_session cookie exists. Blocking world-entry-session.mjs here
  // leaves Edge on 'Preparando tu próxima aventura…' forever.
  const publicPrefix=world.base+'/servers/'+room;
  for(const asset of ['/auth','/world-config.js','/juegos/auth.mjs','/juegos/world-entry-session.mjs']){
   const response=await fetch(publicPrefix+asset);
   assert.equal(response.status,200,'Unauthenticated World entry MUST deliver '+asset+' before cookie exchange');
   if(asset.endsWith('.mjs'))assert.match(response.headers.get('content-type')||'',/javascript/);
   const text=await response.text();
   if(asset.endsWith('world-entry-session.mjs'))assert.match(text,/beginWorldVisit/);
  }
  // All other game scripts and player data remain protected until exchange.
  assert.equal((await fetch(publicPrefix+'/juegos/world-ui.mjs')).status,401);
  assert.equal((await fetch(publicPrefix+'/api/world/bootstrap')).status,401);
  assert.equal(await db.one('SELECT owner FROM world_server_leases WHERE server_id=?',room),undefined,
   'Public entry scripts must never start a live server worker');
  const exchange=t=>fetch(world.base+'/servers/'+room+'/api/world/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:t})});
  const accepted=await exchange(ticket);assert.equal(accepted.status,200);const cookie=accepted.headers.get('set-cookie').split(';')[0];assert.match(cookie,/^xp_world_session=/);assert.match(accepted.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);assert.equal((await exchange(ticket)).status,401);
  if(process.env.XP_WORLD_AUTH_BROWSER_TEST==='1'){
   // Exercise the actual multi-page login handoff in Chrome/Edge. Earlier
   // tests POSTed the ticket manually and never loaded the browser module,
   // so a 401 on its import went unnoticed and displayed an endless spinner.
   const {chromium}=await import('playwright-core');
   const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
   try{
    const context=await browser.newContext({viewport:{width:1692,height:900}});
    await context.addCookies([{name:'xp_session',value:staff,url:main.base}]);
    const page=await context.newPage(),resources=[];
    page.on('response',response=>{
     const file=new URL(response.url()).pathname.split('/').at(-1);
     if(['auth.mjs','world-entry-session.mjs'].includes(file))
      resources.push({file,status:response.status(),type:response.headers()['content-type']});
    });
    await page.goto(main.base+'/juegos/?server='+room,{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(serverId=>location.pathname==='/servers/'+serverId+'/juegos/',room,{timeout:40000});
    assert.equal(await page.locator('#world-main').count(),1,'Browser must reach the real game, not the spinner page');
    for(const file of ['auth.mjs','world-entry-session.mjs']){
     assert(resources.some(item=>item.file===file&&item.status===200&&/javascript/.test(item.type||'')),
       'Browser failed to load mandatory pre-auth module '+file+': '+JSON.stringify(resources));
    }
    console.log('WORLD_HANDOFF_REAL_BROWSER_SUCCESS',JSON.stringify({url:page.url(),modules:resources}));
   }finally{await browser.close();}
  }
  const boot=await fetch(world.base+'/servers/'+room+'/api/world/bootstrap',{headers:{Cookie:cookie}});assert.equal(boot.status,200);assert.equal((await boot.json()).user.id,staff);
  assert.equal((await fetch(world.base+'/servers/'+room+'/api/world/bootstrap',{headers:{Cookie:'xp_session='+staff}})).status,401);
  assert.equal((await fetch(world.base+'/servers/'+room+'/api/x-million/rooms',{headers:{Cookie:cookie}})).status,404);
  const expired='a'.repeat(64);await db.run('INSERT INTO world_handoffs(token,parent_token,user_id,expires) VALUES(?,?,?,?)',hash(expired),hash(staff),staff,Date.now()-1);assert.equal((await exchange(expired)).status,401);
  // DM membership and messages remain in the original shared tables.
  const post=(url,body,c=cookie)=>fetch(world.base+'/servers/'+room+url,{method:'POST',headers:{Cookie:c,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const dm=await post('/api/conversations',{type:'dm',members:['other']});assert.equal(dm.status,200);const id=(await dm.json()).conversation.id;
  const payload={id:'world-private-message-123',type:'text',text:'Mensaje de prueba aislado'};assert.equal((await post('/api/conversations/'+encodeURIComponent(id)+'/messages',payload)).status,200);await post('/api/conversations/'+encodeURIComponent(id)+'/messages',payload);assert.equal((await db.one('SELECT COUNT(*) AS n FROM messages WHERE id=?',payload.id)).n,1);
  await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',hash('outsider'),hash('outsider'),'outsider',Date.now()+3600000);await db.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,1,?,?)','world',staff,Date.now());
  // Access cache starts closed; outsiders are rejected before any private data.
  assert.equal((await fetch(world.base+'/servers/'+room+'/api/conversations/'+encodeURIComponent(id)+'/messages',{headers:{Cookie:'xp_world_session=outsider'}})).status,403);
  await db.run('DELETE FROM sessions WHERE token=?',hash(staff));assert.equal((await fetch(world.base+'/servers/'+room+'/api/world/bootstrap',{headers:{Cookie:cookie}})).status,401);assert.equal((await db.one('SELECT COUNT(*) AS n FROM world_sessions WHERE user_id=?',staff)).n,0);
  await stop(world);world=null;assert.equal((await fetch(main.base+'/api/health')).status,200);assert.equal((await fetch(main.base+'/api/world/bootstrap',{headers:{Cookie:'xp_session=other'}})).status,404);
 }finally{await stop(world);await stop(main);await db.close();}
});
