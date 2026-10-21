import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {newRun,jumpTo,stepRun,reachable,floeAvailable,walkTo,distance,MAX_JUMP} from '../public/simulator/ice-breaker/engine.mjs';
import {LEVELS} from '../public/simulator/ice-breaker/levels.mjs';
const root=path.resolve(import.meta.dirname,'..'),data=fs.mkdtempSync(path.join(process.env.ARCADE_TEST_ROOT||os.tmpdir(),'xp-arcade-'));
const staff='92354719-8816-4e25-9199-0dc9a99f7da1',ordinary='arcade-ordinary';
let child,base;
const db=await openDatabase(data);
for(const [id,token] of [[staff,'staff-test-token'],[ordinary,'ordinary-test-token']]){await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,id===staff?'Staff QA':'D I O S',id,id+'@example.invalid','Dani','',Date.now());await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',createHash('sha256').update(token).digest('hex'),id,Date.now()+3600000);}
await db.close();
async function start(){child=spawn(process.execPath,[path.join(root,'server.mjs')],{env:{...process.env,DATABASE_URL:'',PERSISTENCE_MODE:'local',NODE_ENV:'test',DATA_DIR:data,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error('El servidor no inició: '+errors)),20000);child.stderr.on('data',c=>errors+=c);child.stdout.on('data',c=>{output+=c;const m=output.match(/localhost:(\d+)/);if(m){base='http://127.0.0.1:'+m[1];clearTimeout(timer);resolve();}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);if(!base)reject(Error('Servidor terminó: '+code+' '+errors));});});}
async function stop(){if(child&&!child.killed){const old=child;await new Promise(resolve=>{old.once('exit',resolve);old.kill();});}}
after(stop);
async function req(url,{token,method='GET',body}={}){return fetch(base+url,{method,redirect:'manual',headers:{'Content-Type':'application/json',...(token?{cookie:'xp_session='+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
test('nuevo juego cerrado, controles solo para staff, archivos y enlaces directos protegidos; abrir/cerrar persiste y se audita',async()=>{
 await start();const metadata=await (await req('/api/arcade/games')).json();assert.equal(metadata.games[0].publicEnabled,false);assert.equal(metadata.games[0].canPlay,false);
 for(const url of ['/simulator/ice-breaker','/simulator/ice-breaker/','/simulator/ice-breaker/index.html','/simulator/ice-breaker/game.mjs','/simulator/ice-breaker/engine.mjs','/simulator/ice-breaker/dani-renderer.mjs','/simulator/ice-breaker/dani-rig.mjs','/simulator/ice-breaker/animation.html','/simulator/ice-breaker/animation.mjs','/simulator/ice-breaker/art/dani.png','/simulator/ice-breaker/audio/fall-concha.wav']){
  for(const token of [undefined,'ordinary-test-token']){const r=await req(url,{token});assert.equal(r.status,403,url);assert.match(r.headers.get('cache-control'),/no-store/);}
  const allowed=await req(url,{token:'staff-test-token'});assert.equal(allowed.status,200,url);assert.match(allowed.headers.get('cache-control'),/private, no-store/);assert.match(allowed.headers.get('vary'),/Cookie/);
 }
 for(const p of ['/simulator%5cice-breaker%5cgame.mjs','/SIMULATOR/ICE-BREAKER/game.mjs'])assert.notEqual((await req(p)).status,200);
 assert.equal((await req('/simulator/ice-breaker/game.mjs',{method:'HEAD'})).status,403);
 assert.equal((await req('/api/arcade/ice-breaker/progress')).status,403);
 assert.equal((await req('/api/arcade/ice-breaker/runs',{token:'ordinary-test-token',method:'POST',body:{level:1,difficulty:'normal'}})).status,403);
 assert.deepEqual((await (await req('/api/arcade/ice-breaker/progress',{token:'staff-test-token'})).json()).completed,[]);
 assert.equal((await req('/api/moderation/games')).status,401);
 assert.equal((await req('/api/moderation/games',{token:'ordinary-test-token'})).status,403);
 assert.equal((await req('/api/moderation/games/ice-breaker',{token:'ordinary-test-token',method:'PUT',body:{publicEnabled:true,staff:true}})).status,403);
 for(const v of ['true',1,null,{}])assert.equal((await req('/api/moderation/games/ice-breaker',{token:'staff-test-token',method:'PUT',body:{publicEnabled:v}})).status,400);
 assert.equal((await req('/api/moderation/games/unknown',{token:'staff-test-token',method:'PUT',body:{publicEnabled:true}})).status,404);
 assert.equal((await req('/api/moderation/games/ice-breaker',{token:'staff-test-token',method:'PUT',body:{publicEnabled:true}})).status,200);
 assert.equal((await req('/simulator/ice-breaker/')).status,200);assert.equal((await req('/simulator/ice-breaker/engine.mjs')).status,200);
 await stop();base=null;await start();assert.equal((await (await req('/api/arcade/games/ice-breaker')).json()).game.publicEnabled,true);
 for(let i=0;i<2;i++)assert.equal((await req('/api/moderation/games/ice-breaker',{token:'staff-test-token',method:'PUT',body:{publicEnabled:false}})).status,200);
 assert.equal((await req('/simulator/ice-breaker/')).status,403);assert.equal((await req('/simulator/ice-breaker/art/dani.png')).status,403);
 const actions=(await (await req('/api/moderation/history',{token:'staff-test-token'})).json()).actions.filter(a=>a.subject==='ice-breaker');assert.equal(actions.length,2);assert.deepEqual(new Set(actions.map(a=>a.action)),new Set(['open-game','close-game']));
});

function tick(run,seconds,input={}){for(let i=0;i<Math.ceil(seconds*120);i++)stepRun(run,input,1/120);}
test('pointer jumps have an arc and collect each crystal once; the old automatic jump does nothing',()=>{
 const r=newRun();tick(r,2,{jump:true});assert.equal(r.player.x,160);assert.equal(r.jump,null);assert(!jumpTo(r,'f24'));assert(jumpTo(r,'f1'));tick(r,.4);assert(r.player.z>70);tick(r,.7);assert.equal(r.player.floe,'f1');assert.equal(r.collected,1);const score=r.score;assert(jumpTo(r,'f0'));tick(r,1);assert(jumpTo(r,'f1'));tick(r,1);assert.equal(r.score,score);
});
test('all nine maps have connected branching routes to every beacon and their base',()=>{
 assert.equal(LEVELS.length,9);for(const level of LEVELS){const r=newRun({level:level.id}),seen=new Set(['f0']),queue=[r.floes[0]];
  while(queue.length){const f=queue.shift();for(const n of r.floes)if(!seen.has(n.id)&&distance({x:f.anchorX,y:f.anchorY},{x:n.anchorX,y:n.anchorY})<=MAX_JUMP){seen.add(n.id);queue.push(n);}}
  for(const f of r.floes.filter(f=>f.beacon||f.kind==='finish'))assert(seen.has(f.id),level.name+' '+f.id);assert(r.floes.some(f=>!f.main));assert.equal(r.beaconTotal,level.beacons.length);
 }
 assert(LEVELS[8].columns>LEVELS[0].columns);assert(LEVELS[3].finish[0]<LEVELS[3].columns-1);
});
test('the base stays locked without the required beacons',()=>{const r=newRun(),f=r.floes.find(f=>f.kind==='finish');Object.assign(r.player,{x:f.x,y:f.y,floe:f.id});tick(r,.2);assert.equal(r.status,'playing');assert.equal(r.beacons,0);});
test('collapse keeps counting after leaving, reforms later and tidal ice really disappears',()=>{
 const r=newRun(),f=r.floes.find(f=>f.kind==='fragile');f.triggered=true;tick(r,r.fragileTime+.1);assert(f.broken);tick(r,7.1);assert(!f.broken);assert(!f.triggered);
 const t=newRun(),ice=t.floes.find(f=>f.tidal);t.time=(6.2-ice.offset%9.8+9.8)%9.8;Object.assign(t.player,{x:ice.x,y:ice.y,floe:ice.id});tick(t,.1);assert(!floeAvailable(ice));assert.equal(t.lives,t.maxLives-1);
});
test('lingering causes an actual slide and fall; walking off the edge is no longer clamped',()=>{
 const r=newRun(),f=r.floes.find(f=>f.id==='f1');Object.assign(r.player,{x:f.x,y:f.y,floe:f.id});tick(r,7);assert.equal(r.lives,r.maxLives-1);assert(r.events.some(e=>e.type==='splash'&&/resbaló/.test(e.reason)));
 const w=newRun();tick(w,1.6,{x:1});assert.equal(w.lives,w.maxLives-1);
});
test('moving platforms carry grounded feet but jumps use the takeoff aim and can miss',()=>{
 const r=newRun({level:3}),f=r.floes.find(f=>f.moving);tick(r,.01);Object.assign(r.player,{x:f.x,y:f.y,floe:f.id});const dx=r.player.x-f.x;tick(r,.2);assert(Math.abs(r.player.x-f.x-dx)<.001);
 const s=newRun();assert(jumpTo(s,'f1'));const target=s.floes.find(f=>f.id==='f1');target.anchorX=target.x+160;target.moving=true;tick(s,1);assert.equal(s.lives,s.maxLives-1);
});
test('seals lock a real charge vector and dodge has a cooldown; enemies can hit once, not every frame',()=>{
 const r=newRun(),p=r.player,e=r.enemies[0];e.homeX=p.x+180;e.homeY=p.y;e.cooldown=0;p.invulnerable=0;tick(r,.6);assert.equal(e.phase,'windup');tick(r,.3);const aim=e.targetY;p.y+=20;tick(r,.1);assert.equal(e.phase,'charge');assert.equal(e.targetY,aim);const dx=e.dx,dy=e.dy;p.x-=40;tick(r,.1);assert.equal(e.dx,dx);assert.equal(e.dy,dy);
 const d=newRun();stepRun(d,{dodge:true});assert(d.player.dodge>0);const cooldown=d.player.dodgeCooldown;stepRun(d,{dodge:true});assert(d.player.dodgeCooldown<cooldown);assert(d.player.dodgeCooldown>2);
 const h=newRun();h.player.invulnerable=0;const seal=h.enemies[0];Object.assign(seal,{x:h.player.x,y:h.player.y,phase:'charge',dx:0,dy:0,timer:0});tick(h,.2);assert.equal(h.lives,h.maxLives-1);
});
test('expert input routes complete every campaign stage in all three difficulties',async()=>{const {solveRun}=await import('./arcade-route-helper.mjs');for(const l of LEVELS)for(const d of ['relaxed','normal','intense']){const {run}=solveRun(l.id,d);assert.equal(run.status,'won',l.id+' '+d);assert.equal(run.beacons,run.beaconTotal);assert(run.lives>0);}});
test('waves warn before crossing and anchored shelters protect Dani',()=>{
 const r=newRun({level:4});tick(r,.1);assert.equal(r.wave.phase,'warning');tick(r,4);assert.equal(r.lives,r.maxLives);
 const danger=newRun({level:4}),f=danger.floes.find(f=>f.id==='f1');Object.assign(danger.player,{x:f.x,y:f.y,floe:f.id,invulnerable:0});tick(danger,4.1);assert.equal(danger.lives,danger.maxLives-1);
});
