import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';import {fileURLToPath} from 'node:url';import {JSDOM} from 'jsdom';
import {CharacterMotion,MotionDemo} from '../public/juegos/character-motion.mjs';
import {MariaMotion} from '../public/juegos/maria-motion.mjs';
import {WorldLocalMotion} from '../public/juegos/world-local-motion.mjs';
import {AvatarBank} from '../public/juegos/world-scene.mjs';
import {createWorldPlayer,stepWorld,jumpWorld} from '../public/juegos/world-motion.mjs';
import {createWellness} from '../public/juegos/world-wellness.mjs';import {createVitals} from '../public/juegos/world-vitals.mjs';import {applyCharacterHealthProfile,advanceHealthSystems} from '../public/juegos/world-health-systems.mjs';
import {clothingOptions,syncClothing,wearGear} from '../public/juegos/world-durability.mjs';import {bedMenuMarkup} from '../public/juegos/world-intimacy-ui.mjs';import {sleepSourceBounds} from '../public/juegos/world-sleep-art.mjs';
const map={id:'test',width:2400,height:1200,bounds:[0,0,2400,1200],floors:[[[0,0],[2400,0],[2400,1200],[0,1200]]],props:[]};
const actor=()=>({...createWorldPlayer('base',{x:800,y:800}),userId:'maria',characterId:'maria-villegas',clothing:'pajamas',state:'idle'});
test('eight walking poses follow traveled phase; releasing the key locks the legs immediately and reversing changes facing',()=>{
 const p=actor(),motion=new CharacterMotion(),seen=new Set();for(let i=0;i<60;i++){stepWorld(p,{x:1,y:0},1/60,map);const pose=motion.sample(p,i/60);seen.add(pose.frame);assert.equal(pose.state,'walk');assert.equal(pose.facing,1);}assert.equal(seen.size,8);
 stepWorld(p,{x:0,y:0},1/60,map);const stopped=p.x;for(let i=0;i<100;i++){const pose=motion.sample(p,1+i/60);assert.equal(pose.state,'idle');assert.equal(pose.frame,8);assert.equal(pose.feetLocked,true);assert.equal(p.x,stopped);}
 stepWorld(p,{x:-1,y:0},1/60,map);assert.equal(motion.sample(p,3).facing,-1);assert(p.x<stopped);
});
test('quick jump has three principal poses, lasts about half a second across frame rates and keeps horizontal control',()=>{
 const heights=[];for(const dt of [1/120,1/60,1/20]){const p=actor(),motion=new CharacterMotion(),seen=new Set();assert(jumpWorld(p,1000,{quick:true}));assert(!jumpWorld(p,1001,{quick:true}));seen.add(motion.sample(p,1).stage);let elapsed=0,peak=0;while(!p.grounded&&elapsed<1){stepWorld(p,{x:1,y:0,now:1000+(elapsed+dt)*1000},dt,map);elapsed+=dt;peak=Math.max(peak,p.z);const pose=motion.sample(p,1+elapsed);if(pose.stage)seen.add(pose.stage);}assert(elapsed>=.53&&elapsed<=.60,String(elapsed));assert(peak>55&&peak<59);heights.push(peak);assert(p.x>900);assert.deepEqual([...seen],['takeoff','air','landing']);assert.equal(motion.sample(p,1+elapsed+.12).state,'walk');p.moving=false;assert.equal(motion.sample(p,1+elapsed+.15).state,'idle');}assert(Math.max(...heights)-Math.min(...heights)<1);
});
test('local controls stop without waiting for a packet, preserve phase across stale packets and obey walls, health speed and seats',()=>{
 const p=actor(),local=new WorldLocalMotion();local.setInput({x:1,y:0});local.sample(p,0,1000,map);let shown=local.sample(p,20,1020,map);assert(shown.x>p.x);const phase=shown.walk;shown=local.sample({...p,walk:0},40,1040,map);assert(shown.walk>phase);
 local.setInput({x:0,y:0});shown=local.sample(p,60,1060,map);assert.equal(shown.moving,false);
 const seated={...p,state:'sit',seatId:'chair'};assert.equal(local.sample(seated,80,1080,map),seated);
 const wallMap={...map,props:[{x:820,y:800,w:20,h:300,solid:true,height:400}]},blocked=new WorldLocalMotion();blocked.setInput({x:1,y:0});blocked.sample(p,0,1000,wallMap);assert.equal(blocked.sample(p,50,1050,wallMap).moving,false);
 const slow=new WorldLocalMotion();slow.setInput({x:1,y:0,run:true});const low={...p,speedFactor:.35,canRun:false};slow.sample(low,0,1000,map);assert(slow.sample(low,50,1050,map).x-p.x<4);
 const other={...p,characterId:'bruno'};local.setInput({x:1,y:0});local.sample(other,90,1090,map);assert(local.sample(other,110,1110,map).x>other.x);
});
test('click-to-walk interpolates the player and walking phase between server snapshots',()=>{
 const local=new WorldLocalMotion(),p={...actor(),x:820,y:812,walk:2,moving:true,
  previous:{x:800,y:800,z:0,walk:1,at:100}};
 assert.equal(local.sample(p,100,1000,map).x,800);
 const halfway=local.sample(p,150,1050,map);
 assert.equal(halfway.x,810);assert.equal(halfway.y,806);assert.equal(halfway.walk,1.5);
 assert.equal(local.sample(p,200,1100,map).x,820);
 assert.equal(p.x,820);
});

test('prediction consumes snapshots mutated into the same player object, as the live UI does',()=>{
 const p=actor(),local=new WorldLocalMotion();local.setInput({x:1,y:0});local.sample(p,0,1000,map);local.sample(p,16,1016,map);
 Object.assign(p,{z:30,vz:250,grounded:false,jumpAt:1020,jumpGravity:1600,previous:{at:32}});
 const shown=local.sample(p,32,1032,map);assert(shown.z>30);assert.equal(shown.grounded,false);assert.equal(shown.jumpAt,1020);
 Object.assign(p,{x:1200,z:0,vz:0,grounded:true,previous:{at:48}});assert(local.sample(p,48,1048,map).x>=1200);
});
test('delayed 10 Hz snapshots do not reverse walking, restart stopped legs or replay a jump',()=>{
 const authoritative=actor(),p=actor(),local=new WorldLocalMotion(),motion=new CharacterMotion(),packets=[],commands=[];let x=1,lastX=p.x,landings=0,previousStage=null,maxError=0;
 local.setInput({x:1,y:0});
 for(let i=0;i<210;i++){
  const ms=i*1000/60,world=1000+ms;if(i===60||i===138){x=0;local.setInput({x:0,y:0});}if(i===84){x=-1;local.setInput({x:-1,y:0});}
  commands.push({at:ms+100,x,jump:i===94});while(commands[0]?.at<=ms){const cmd=commands.shift();authoritative.inputX=cmd.x;if(cmd.jump)jumpWorld(authoritative,1000+cmd.at,{quick:true});}
  stepWorld(authoritative,{x:authoritative.inputX||0,y:0,now:world},1/60,map);
  if(i%6===0)packets.push({at:ms+100,value:{...authoritative}});while(packets[0]?.at<=ms){const packet=packets.shift();Object.assign(p,packet.value,{previous:{at:ms}});}
  if(i===94)local.jump(world);
  const shown=local.sample(p,ms,world,map),pose=motion.sample(shown,world/1000);maxError=Math.max(maxError,Math.abs(shown.x-authoritative.x));
  if(i>2&&i<60)assert(shown.x>=lastX-.01,'rightward motion must not be pulled backwards');
  if(i>85&&i<138)assert(shown.x<=lastX+.01,'leftward motion must not be pulled forwards');
  if(x===0&&pose.stage!=='landing'&&shown.grounded)assert.equal(pose.state,'idle');
  if(pose.stage==='landing'&&previousStage!=='landing')landings++;previousStage=pose.stage;lastX=shown.x;
 }
 assert.equal(landings,1);assert(maxError<75,'prediction must stay near the authoritative position: '+maxError);
});
test('demonstration repeats right, stop, left, stop, one physical jump and can be disabled without retaining input',()=>{
 const demo=new MotionDemo();assert.equal(demo.step(.02),null);demo.setActive(true);let right=0,left=0,still=0,jumps=0;for(let n=0;n<680;n++){const value=demo.step(.02);if(value.x>0)right++;else if(value.x<0)left++;else still++;if(value.jump)jumps++;}assert(right>100&&left>100&&still>100);assert.equal(jumps,2);demo.setActive(false);assert.equal(demo.step(.05),null);
});
test('all Maria outfits draw the state-selected frame at a fixed ground and mirror the correct source basis',()=>{
 const r=new MariaMotion(),p=actor(),calls=[],context=new Proxy({}, {get:(_,name)=>(...args)=>calls.push([name,...args])});r.getArt=()=>({width:1280,height:1680});for(const clothing of ['pajamas','heat','cold']){p.clothing=clothing;p.moving=false;p.grounded=true;p.facing=1;assert(r.draw(context,p,181,10));const draw=calls.filter(v=>v[0]==='drawImage').at(-1);assert.equal(draw[2],0);assert.equal(draw[3],840);const before=calls.length;p.facing=-1;r.draw(context,p,181,10.1);assert.notEqual(calls.slice(before).find(v=>v[0]==='scale')[1],calls.filter(v=>v[0]==='scale').at(-2)[1]);}assert.equal(r.draw(context,{...p,characterId:'bruno'},181,11),false);
});
test('Maria owns pajamas permanently, outfit state survives normalization and pajamas restore sleep five times faster',()=>{
 const body=applyCharacterHealthProfile(createWellness({clothing:'pajamas'}),'maria-villegas'),gear={items:{}};syncClothing(gear,body);assert.equal(body.clothing,'pajamas');assert.equal(clothingOptions(gear,body).find(v=>v.id==='pajamas').granted,true);wearGear(gear,body,{seconds:60,moving:true,running:true,wetness:100,outside:1});assert.equal(body.clothingCondition,100);assert.equal(gear.items.coat,undefined);assert.equal(createWellness(body).clothing,'pajamas');
 const results=[];for(const clothing of ['heat','pajamas']){const b=createWellness({clothing}),v=createVitals({health:100,energy:80,sleep:30,stress:30,hunger:80});advanceHealthSystems(b,v,{seconds:5,sleeping:true,bedCleanliness:100,zone:'refugio-1',now:1000,environment:{weather:'clear',temperature:24}});results.push(v.sleep-30);}assert(Math.abs(results[1]/results[0]-5)<.01);applyCharacterHealthProfile(body,'bruno');syncClothing(gear,body);assert.equal(body.clothing,'heat');
});
test('all reserved wardrobes are free and keep available garments usable without creating inventory items',()=>{
 for(const id of ['maria-villegas','isabel','dua-lingo','bonju']){const body=createWellness({clothing:'cold'});body.clinical={...body.clinical,castCharacter:id};body.baseClothingCondition=0;const gear={items:{}};syncClothing(gear,body);for(const item of body.clothingOptions)assert(item.owned&&item.condition===100,id+' '+item.id);wearGear(gear,body,{seconds:60,moving:true,running:true,wetness:100,outside:1});assert.equal(body.clothingCondition,100);assert.equal(gear.items.coat,undefined);}
});
test('sitting in pajamas retains the pajama atlas instead of substituting the habitual seated illustration',()=>{
 const bank=new AvatarBank(),calls=[],context=new Proxy({}, {get:(_,name)=>(...args)=>calls.push([name,...args]),set:()=>true});bank.get=()=>({width:1920,height:1600});bank.getSeated=()=>{throw Error('Wrong outfit: habitual seated art');};const p={...actor(),state:'sit',moving:false};assert(bank.draw(context,p,180,10));assert(calls.some(c=>c[0]==='drawImage'));
});
test('thermal coat disables only sleep and nap with a hover explanation; normal clothes and pajamas retain bed actions',()=>{
 for(const clothing of ['heat','cold','pajamas']){const d=new JSDOM(bedMenuMarkup({id:'bed',cleanliness:100},true,'main',{clothing})),q=s=>d.window.document.querySelector('[data-action='+s+']');assert.equal(q('bed-sleep').disabled,clothing==='cold');assert.equal(q('bed-nap').disabled,clothing==='cold');assert.equal(q('bed-clean').disabled,false);if(clothing==='cold')assert.equal(q('bed-sleep').title,'No puedes dormir con esta ropa');d.window.close();}
 const im={width:1380,height:800,worldSleepBounds:{x:0,y:0,width:1380,height:800}};assert.deepEqual(sleepSourceBounds('maria-villegas',im),im.worldSleepBounds);
});
test('all 39 animation frames are transparent, nonempty, uncropped and registered to the same ground',async()=>{
 for(const file of ['atlas.webp','habitual-atlas.webp','thermal-atlas.webp']){const {data,info}=await sharp(fileURLToPath(new URL('../public/juegos/outfits/maria-motion-v1/'+file,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1280);assert.equal(info.height,1680);for(let f=0;f<13;f++){let pixels=0,left=320,right=0,top=420,bottom=0;const ox=f%4*320,oy=Math.floor(f/4)*420;for(let y=0;y<420;y++)for(let x=0;x<320;x++)if(data[((y+oy)*1280+x+ox)*4+3]>32){pixels++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}assert(pixels>5000,file+' empty frame '+f);assert(left>3&&right<316&&top>3&&bottom<415,file+' clipped frame '+f+' '+[left,top,right,bottom]);if(f===11)assert(bottom<385,file+' airborne feet must be drawn up');else assert(Math.abs(bottom-399)<3,file+' floor '+f+' '+bottom);}}
});
