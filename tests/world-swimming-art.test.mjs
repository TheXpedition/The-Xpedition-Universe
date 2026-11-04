import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {createRequire} from 'node:module';import sharp from 'sharp';
import {AvatarBank,WorldScene} from '../public/juegos/world-scene.mjs';
import {CURRENT_CAST_IDS} from '../public/juegos/world-character-policy.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {actorWorldHeight,actorVisibleBounds} from '../public/juegos/world-actor-layout.mjs';
import {castHeightRatio} from '../public/juegos/world-cast-proportions.mjs';
import {swimmingPose} from '../public/juegos/world-swimming-art.mjs';
const req=createRequire('C:/Users/lopez/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'),{createCanvas,loadImage}=req('@napi-rs/canvas');
const actor=id=>({characterId:id,x:240,y:210/.62,z:0,facing:-1,grounded:true,state:'swim',swimming:true,moving:true,walk:0});

test('all 20 swimmers keep their original height, hide their lower body, and never use a walking frame',async()=>{
 for(const id of CURRENT_CAST_IDS){
  const im=await loadImage(fs.readFileSync(new URL('../public/juegos/sprites/'+id+'.webp',import.meta.url))),bank=new AvatarBank();bank.cache.set(id,im);bank.sleepCache.set(id,im);bank.reducedMotion=false;
  const p=actor(id),height=actorWorldHeight(WORLD_MAPS['poza-cascada'],id),canvas=createCanvas(480,300),c=canvas.getContext('2d'),draws=[],draw=c.drawImage.bind(c);
  c.drawImage=(...args)=>{draws.push(args);return draw(...args);};bank.draw(c,p,height,1.2);
  assert.equal(draws.length,2);for(const call of draws){assert.equal(call[1],0);assert.equal(call[2],im.height/5);assert(Math.abs(call.at(-2)/call.at(-1)-(im.width/8)/(im.height/5))<1e-12);}
  const pixels=c.getImageData(0,0,480,300).data;let above=0,below=0;
  for(let y=0;y<300;y++)for(let x=0;x<480;x++){if(!pixels[(y*480+x)*4+3])continue;if(y<210)above++;if(y>210+height*.07)below++;}
  assert(above>600,id+' has an actual visible head and shoulders');assert.equal(below,0,id+' has no feet, walking legs or land shadow below the water');
  const still=createCanvas(480,300);bank.draw(still.getContext('2d'),{...p,walk:Math.PI*1.4},height,1.2);assert.deepEqual(still.getContext('2d').getImageData(0,0,480,300).data,pixels,'walking phase cannot change the swimming illustration');
 }
});

test('swimming has a distinct animated bob and wake, respects reduced motion, and faces the direction of travel',async()=>{
 const p=actor('bruno'),height=200,a=swimmingPose(p,height,.2),b=swimmingPose(p,height,.9);assert.notEqual(a.bob,b.bob);assert.notEqual(a.roll,b.roll);
 assert.deepEqual(swimmingPose(p,height,1,true),swimmingPose(p,height,9,true));
 const bank=new AvatarBank(),im=await loadImage('public/juegos/sprites/bruno.webp');bank.cache.set('bruno',im);bank.sleepCache.set('bruno',im);const image=time=>{const canvas=createCanvas(480,300);bank.draw(canvas.getContext('2d'),p,height,time);return canvas.toBuffer('image/png');};assert.notDeepEqual(image(.2),image(.9));
 const left=swimmingPose(p,height,0),right=swimmingPose({...p,facing:1},height,0);assert(left.roll<0&&right.roll>0);assert.equal(left.visibleHeight,right.visibleHeight);
});

test('character picking and name/bubble geometry use the visible swimmer instead of invisible submerged legs',()=>{
 const map=WORLD_MAPS['poza-cascada'],p=actor('maria-villegas'),height=actorWorldHeight(map,p.characterId),bounds=actorVisibleBounds(p,height);
 const scene=Object.create(WorldScene.prototype);Object.assign(scene,{zone:map.id,players:[p],width:480,height:300,camera:{unproject:(x,y)=>({x,y:y/.62})}});
 assert.equal(scene.pick(p.x,bounds.top+20),p);assert.equal(scene.pick(p.x,210+height*.2),undefined);
 for(const m of Object.values(WORLD_MAPS))for(const id of CURRENT_CAST_IDS)assert(Math.abs(actorWorldHeight(m,id)/actorWorldHeight(m,'bruno')-castHeightRatio(id))<1e-12);
 assert(actorWorldHeight(map,'guillermo')>actorWorldHeight(map,'maria-villegas'));assert(bounds.top>210-height*.5);
});

test('medical and fish crops retain their complete artwork and exclude adjacent objects',async()=>{
 const {itemAtlasArt,ITEM_ART_RECTS}=await import('../public/juegos/world-item-art.mjs');
 const original=fs.readFileSync('public/juegos/survival/survival-atlas.png'),source=await sharp(original).ensureAlpha().raw().toBuffer(),w=1254;
 for(const index of [25,30,31,32,33,34]){
  const [left,top,width,height]=ITEM_ART_RECTS[index],svg=itemAtlasArt(index).replace(/href="[^"]+"/,`href="data:image/png;base64,${original.toString('base64')}"`),out=await sharp(Buffer.from(svg)).resize(width,height).ensureAlpha().raw().toBuffer();
  // Follow the centre component of each source object, rather than its rectangle.
  const cx=index===33?680:index===34?930:left+Math.floor(width/2),cy=index===33?1145:index===34?1140:top+Math.floor(height/2),seen=new Set(),queue=[cy*w+cx];
  while(queue.length){const v=queue.pop();if(seen.has(v)||source[v*4+3]<150)continue;const x=v%w,y=Math.floor(v/w);if(x<left||x>=left+width||y<top||y>=top+height)continue;seen.add(v);for(const d of [-1,1,-w,w])queue.push(v+d);}
  assert(seen.size>2000,'source object '+index+' was found');let clipped=0;for(const v of seen){const x=v%w-left,y=Math.floor(v/w)-top;if(out[(y*width+x)*4+3]<100)clipped++;}assert(clipped/seen.size<.001,'no cropped-off fish head, tail or capsule edges for '+index);
  if(index===33)assert.equal(out[((1168-top)*width+824-left)*4+3],0,'the piece of neighbouring steak is gone');
  if(index===34)assert.equal(out[((1104-top)*width+822-left)*4+3],0,'raw meat does not include the neighbouring fish tail');
 }
});
