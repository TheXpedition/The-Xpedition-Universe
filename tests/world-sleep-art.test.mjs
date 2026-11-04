import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {APOCALYPSE_CAST} from '../public/juegos/world-characters.mjs';
import {AvatarBank} from '../public/juegos/world-scene.mjs';
import {sleepPoseBounds,sleepSourceBounds} from '../public/juegos/world-sleep-art.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('../design/apocalypse-cast-sleep-inputs.json',import.meta.url)));
test('all 22 supplied sleep drawings retain real alpha and original pixels; detail crops have a uniform transparent viewport',async()=>{
 assert.equal(inputs.length,22);
 for(const c of APOCALYPSE_CAST){
  const bytes=fs.readFileSync(new URL('../public/juegos/cast-apocalypse/'+c.id+'-sleep.png',import.meta.url)),meta=await sharp(bytes).metadata(),stats=await sharp(bytes).stats();
  assert(meta.hasAlpha);assert.equal(stats.channels.at(-1).min,0);assert.equal(createHash('sha256').update(bytes).digest('hex'),inputs.find(i=>i.id===c.id).sha256);
  const image={width:meta.width,height:meta.height},bed={x:500,y:800,artWidth:450},b=sleepPoseBounds({characterId:c.id,x:500,y:700},400,image,bed);
  assert(b.x>bed.x-bed.artWidth/2);assert(b.x+b.width<bed.x+bed.artWidth/2);assert.equal(b.bottom,bed.y*.62-bed.artWidth*.145);assert(Math.abs(b.width/b.height-b.rotated.width/b.rotated.height)<.00001);
  const preview=fs.readFileSync(new URL('../public/juegos/cast-apocalypse/'+c.id+'-preview.png',import.meta.url)),p=await sharp(preview).metadata(),ps=await sharp(preview).stats();assert.equal(p.width,540);assert.equal(p.height,720);assert(p.hasAlpha);assert.equal(ps.channels.at(-1).min,0);
 }
});
test('the live avatar renderer draws the sleep illustration without rotating a standing atlas',()=>{
 const bank=new AvatarBank(),sleep={width:371,height:171},id='maria-villegas';bank.sleepCache.set(id,sleep);
 const calls=[],ctx=new Proxy({drawImage:(...args)=>calls.push(args),rotate:()=>assert.fail('sleep art must not be rotated')},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const p={characterId:id,state:'sleep',sleeping:true,x:500,y:700,facing:1},bed={x:500,y:800,artWidth:450};
 assert.equal(bank.draw(ctx,p,400,1,bed),true);assert.equal(calls.length,1);assert.equal(calls[0][0],sleep);assert.equal(calls[0].length,9,'crop empty alpha margins while preserving every visible part of the pose');
});
