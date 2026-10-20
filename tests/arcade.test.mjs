import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {newRun,jumpTo,stepRun,reachable,hazardActive,walkTo,WORLD_END} from '../public/simulator/ice-breaker/engine.mjs';
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
function tick(run,seconds){for(let i=0;i<Math.ceil(seconds*120);i++)stepRun(run,{},1/120);}
test('los saltos tienen arco, aterrizan sobre el témpano y recogen un cristal una sola vez',()=>{
 const r=newRun();assert(!jumpTo(r,'f14'));assert(jumpTo(r,'f1'));assert(!jumpTo(r,'f2'));tick(r,.4);assert(r.player.z>70);assert(r.player.x>160&&r.player.x<365);tick(r,1);assert.equal(r.player.floe,'f1');assert.equal(r.player.z,0);assert.equal(r.collected,1);const score=r.score;assert(jumpTo(r,'f0'));tick(r,1.2);assert(jumpTo(r,'f1'));tick(r,1.2);assert.equal(r.collected,1);assert.equal(r.score,score);
});
test('Dani camina dentro del hielo y la ruta completa se puede terminar con los tres refugios',()=>{
 const r=newRun();assert(walkTo(r,{x:185,y:445}));tick(r,.4);assert(r.player.x>175);for(let i=0;i<240;i++)stepRun(r,{x:-1},1/120);assert(r.player.x>=160-121*.72);assert(!walkTo(r,{x:900,y:900}));
 // Reset to the center so reachability is independent of the walking test.
 r.player.x=160;const checkpoints=[];
 for(let i=1;i<LEVELS[0].count;i++){assert(reachable(r,r.floes.find(f=>f.id==='f'+i)),'Alcanzable f'+i);assert(jumpTo(r,'f'+i));tick(r,1.2);assert.equal(r.player.floe,'f'+i);assert.equal(r.lives,3);if(i%6===0)checkpoints.push(r.checkpoint);}
 assert.deepEqual(checkpoints,['f6','f12','f18']);assert.equal(r.status,'won');assert.equal(r.furthest,WORLD_END);assert.equal(r.collected,LEVELS[0].count-2);assert(r.score>2000);
});
test('el hielo frágil se rompe y reaparece en el último refugio; tres caídas terminan la partida',()=>{
 const r=newRun();Object.assign(r.player,{x:775,y:380,floe:'f3'});tick(r,3);assert.equal(r.lives,2);tick(r,1.2);assert.equal(r.player.floe,'f0');
 r.checkpoint='f6';for(let n=0;n<2;n++){const f=r.floes.find(f=>f.id==='f9');Object.assign(r.player,{x:f.x,y:f.y,floe:f.id});tick(r,4.2);if(n===0)assert.equal(r.player.floe,'f6');}assert.equal(r.lives,0);assert.equal(r.status,'lost');
});
test('los tres niveles crecen, ofrecen desvíos alcanzables y se completan en los tres ritmos',()=>{
 let previous=0;
 for(const level of LEVELS){assert(level.count>previous);previous=level.count;for(const difficulty of ['relaxed','normal','intense']){const r=newRun({level:level.id,difficulty});assert(r.floes.some(f=>f.rare));for(let i=1;i<level.count;i++){assert(jumpTo(r,'f'+i));tick(r,1.2);}assert.equal(r.status,'won');assert.equal(r.lives,r.maxLives);assert.equal(r.furthest,r.end);}}
});
test('las criaturas alternan peligro y calma y el témpano ocupado causa una caída solo si hay peligro',()=>{
 const r=newRun(),f=r.floes.find(f=>f.hazard==='seal');assert(hazardActive(f,0));assert(!hazardActive(f,3.2));r.time=3.2;Object.assign(r.player,{x:f.x,y:f.y,floe:f.id});tick(r,.3);assert.equal(r.lives,3);tick(r,2.3);assert.equal(r.lives,2);
});
