import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import {APOCALYPSE_CAST,WORLD_CHARACTERS} from '../public/juegos/world-characters.mjs';
import {characterPolicy} from '../public/juegos/world-character-policy.mjs';
import {SHOP_CHARACTERS,SHOP_PAJAMAS} from '../public/juegos/world-shop-catalog.mjs';
import {PAJAMA_OUTFITS} from '../public/juegos/world-pajamas.mjs';
import {THERMAL_OUTFITS} from '../public/juegos/world-thermal-outfits.mjs';
import {SWIMWEAR} from '../public/juegos/last-grip/swimwear.mjs';
import {SEATED_ART} from '../public/juegos/world-seated-art.mjs';
import {deliverSharedWorldPacket} from '../world-live-delivery.mjs';

const asset=url=>fs.readFile(new URL('../public'+url,import.meta.url));
const manifest=JSON.parse(await asset('/juegos/x-protocol/assets.json'));
for(const id of ['luciano','nacho']){
 test(id+' has one selectable World identity and every published pose decodes',async()=>{
  assert.equal(WORLD_CHARACTERS.filter(c=>c.id===id).length,1);
  assert(APOCALYPSE_CAST.some(c=>c.id===id));
  assert.equal(characterPolicy(id,{participant:false,owned:[id]}).locked,false);
  assert(SHOP_CHARACTERS.some(c=>c.id===id&&c.current));
  assert(SHOP_PAJAMAS.some(c=>c.id===id));
  const pj=PAJAMA_OUTFITS[id],coat=THERMAL_OUTFITS[id];
  for(const url of [pj.image,pj.sleep,coat.image,SWIMWEAR[id].image,SEATED_ART[id].image,'/juegos/cast-apocalypse/'+id+'-sleep.png']){
   const {info}=await sharp(await asset(url)).raw().toBuffer({resolveWithObject:true});
   assert.equal(info.channels,4,url);assert(info.width>100&&info.height>100,url);
  }
  for(const [url,width,height] of [['/juegos/sprites/'+id+'.webp',2560,2000],['/juegos/sprites/'+id+'-lite.webp',1280,1000],[pj.atlas,1920,1600],[pj.lite,1200,1000],[coat.atlas,1920,1600],[coat.lite,1200,1000],['/juegos/last-grip/media/walk/'+id+'.webp',1440,200]]){
   const {info}=await sharp(await asset(url)).raw().toBuffer({resolveWithObject:true});
   assert.deepEqual([info.width,info.height],[width,height],url);
  }
  assert.equal(manifest.poses[id].length,7);
  for(const pose of manifest.poses[id]){
   const {info}=await sharp(await asset('/juegos/x-protocol/'+pose.url)).raw().toBuffer({resolveWithObject:true});
   assert.deepEqual([info.width,info.height],[pose.width,pose.height]);
  }
 });
}
test('shared movement encodes once while preserving per-socket backpressure',()=>{
 let calls=0;const sent=[];
 const peer=bufferedAmount=>({ws:{readyState:1,bufferedAmount,send:value=>sent.push(value)}});
 const move={type:'move',players:[{characterId:'nacho'}]};
 const encode=packet=>{calls++;return JSON.stringify(packet);};
 deliverSharedWorldPacket([peer(70000)],move,encode);assert.equal(calls,0);
 deliverSharedWorldPacket([peer(0),peer(70000),peer(0)],move,encode);
 assert.equal(calls,1);assert.deepEqual(sent,[JSON.stringify(move),JSON.stringify(move)]);
});
