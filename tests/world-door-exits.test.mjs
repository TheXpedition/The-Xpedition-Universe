import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';import {WebSocket} from 'ws';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {createWorldPlayer,stepWorld,nearestPortal,hasFloor} from '../public/juegos/world-motion.mjs';import {openDatabase} from '../database.mjs';
import {claimFixtureCharacter} from './helpers/world-character-fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..'),staff='92354719-8816-4e25-9199-0dc9a99f7da1',interiors=['refugio-1','dormitorio-2','cocina','hospital-interior','iglesia-interior','confesionario','cueva-galeria','cueva-profunda','tunel'];
const leftExit=map=>map.props.filter(p=>p.portal&&WORLD_MAPS[p.portal.zone]).sort((a,b)=>a.portal.x-b.portal.x)[0];
test('all interior exits remain usable after ordinary left walking at the back, default and front street depths',()=>{
 for(const id of interiors)for(const depth of [.795,.865,.93]){const map=WORLD_MAPS[id],exit=leftExit(map),actor=createWorldPlayer(id,{x:map.spawn[0],y:map.height*depth});assert(exit,id+' has a left exit');for(let i=0;i<500;i++)stepWorld(actor,{x:-1,y:0},.05,map);assert(actor.x<=map.bounds[0]+40,id+' reaches the left wall');assert.equal(actor.y,map.height*depth,id+' walks horizontally without hunting for a vertical hotspot');assert(hasFloor(map,actor.x,actor.y));assert.equal(nearestPortal(actor,id)?.zone,exit.portal.zone,id+' offers its actual left exit at depth '+depth);}
});
let child,socket,base;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xp-door-exits-')),messages=[];
after(async()=>{socket?.close();if(child&&!child.killed)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});});
async function until(fn,label,ms=9000){const deadline=Date.now()+ms;while(Date.now()<deadline){const value=fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,35));}throw Error('Door regression: '+label);}
const latest=()=>messages.flatMap(m=>m.players||[]).filter(p=>p.userId===staff).at(-1),send=m=>socket.send(JSON.stringify(m));
test('a real session leaves both refuges and the hospital by holding A at the normal depth and pressing the door action',async()=>{
 const db=await openDatabase(dir),digest=value=>createHash('sha256').update(value).digest('hex'),map=WORLD_MAPS['refugio-1'],expires=Date.now()+3600000;
 await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',staff,'Door review','door review','door-review@example.invalid','Dani','Isolated regression fixture.',Date.now());
 await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',digest(staff),staff,expires);await db.run('INSERT INTO world_sessions(token,parent_token,user_id,expires) VALUES(?,?,?,?)',digest(staff),digest(staff),staff,expires);
 await db.run('INSERT INTO world_preferences(user_id,character_id,favorites,visited,last_zone,x,y,diary,updated) VALUES(?,?,?,?,?,?,?,?,?)',staff,'dani','[]','[]',map.id,...map.spawn,'',Date.now());await db.close();
 child=spawn(process.execPath,[root+'/world-server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',PERSISTENCE_MODE:'local',DATA_DIR:dir,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Door fixture did not start')),15000);child.stderr.on('data',d=>errors+=d);child.stdout.on('data',d=>{output+=d;const port=output.match(/localhost:(\d+)/)?.[1];if(port){base='http://127.0.0.1:'+port;clearTimeout(timer);resolve();}});child.once('error',reject);});
 await claimFixtureCharacter(base,staff,'maria-villegas');socket=new WebSocket(base.replace('http:','ws:')+'/api/world/live?zone=refugio-1',{headers:{Origin:base,Cookie:'xp_world_session='+staff}});socket.on('message',raw=>messages.push(JSON.parse(raw)));await until(()=>messages.some(m=>m.type==='welcome'),'welcome');
 for(const id of ['refugio-1','dormitorio-2','hospital-interior']){
  const scene=WORLD_MAPS[id],exit=leftExit(scene);if(latest()?.zone!==id){const mark=messages.length;send({type:'teleport',target:staff,zone:id});await until(()=>messages.slice(mark).some(m=>m.type==='zone'&&m.zone===id),id+' initial scene');}
  const initial=latest(),depth=initial.y;assert(Math.abs(depth-scene.spawn[1])<2,id+' starts at its normal spawn depth');
  const press=()=>send({type:'input',x:-1,y:0});press();const held=setInterval(press,100);
  try{await until(()=>{const p=latest();return p?.zone===id&&p.x<=scene.bounds[0]+40;},id+' left wall');}finally{clearInterval(held);send({type:'input',x:0,y:0});}
  const atWall=latest();assert(Math.abs(atWall.y-depth)<2,id+' never needed an exact Y target');assert.equal(nearestPortal(atWall,id)?.zone,exit.portal.zone,id+' door action is available at the wall');
  const mark=messages.length;send({type:'enter',zone:exit.portal.zone});await until(()=>messages.slice(mark).some(m=>m.type==='zone'&&m.zone===exit.portal.zone),id+' exit accepted');
  const returned=latest(),target=WORLD_MAPS[exit.portal.zone].spawns[exit.portal.toSpawn];assert(target,id+' has a named return point');assert(Math.hypot(returned.x-target.x,returned.y-target.y)<2,id+' returns to its exterior doorway');assert(hasFloor(WORLD_MAPS[exit.portal.zone],returned.x,returned.y));assert(!messages.slice(mark).some(m=>m.type==='error'),id+' does not reject the exit action');
 }
});
