import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {fileURLToPath} from 'node:url';
import {THERMAL_OUTFITS,thermalOutfit} from '../public/juegos/world-thermal-outfits.mjs';
import {createWellness,wellnessSnapshot} from '../public/juegos/world-wellness.mjs';
import {applyCharacterHealthProfile} from '../public/juegos/world-health-systems.mjs';
import {syncClothing,wearGear} from '../public/juegos/world-durability.mjs';
import {AvatarBank} from '../public/juegos/world-scene.mjs';
import {normalizeWorldPlayer,mergeWorldPlayer} from '../public/juegos/world-player-state.mjs';
import {actorWorldHeight} from '../public/juegos/world-actor-layout.mjs';
import {JSDOM} from 'jsdom';import {mountHealthPanel} from '../public/juegos/world-health-ui.mjs';
import {castPose,castSkeleton} from '../public/juegos/apocalypse-cast-rig.mjs';

test('coat sitting geometry bends thighs forward and keeps calves vertical instead of kneeling',()=>{
 for(const id of Object.keys(THERMAL_OUTFITS)){const m=castSkeleton(id,500,1000),pose=castPose(m,{seated:1,chair:true});for(const leg of pose.legs){assert(Math.abs(leg.root.y-leg.joint.y)<.01,id+' thigh is not horizontal');assert(Math.abs(leg.joint.x-leg.end.x)<.01,id+' calf is not vertical');assert(leg.end.y>leg.joint.y);}}
});

test('Maria owns her thermal look without creating a transferable coat; switching character removes that entitlement',()=>{
 const gear={items:{}},body=applyCharacterHealthProfile(createWellness({clothing:'cold'}),'maria-villegas');syncClothing(gear,body);
 assert.equal(body.clothing,'cold');assert.deepEqual(body.clothingOptions[1],{id:'cold',owned:true,condition:100,granted:true});
 wearGear(gear,body,{seconds:60,moving:true,running:true,wetness:100,outside:1});assert.equal(body.clothingCondition,100);assert.equal(gear.items.coat,undefined);assert.equal(wellnessSnapshot(body).clothingCharacter,'maria-villegas');
 applyCharacterHealthProfile(body,'bruno');syncClothing(gear,body);assert.equal(body.clothing,'heat');assert.equal(body.clothingOptions[1].owned,false);
 gear.items.coat=1;syncClothing(gear,body);body.clothing='cold';syncClothing(gear,body);assert.equal(body.clothing,'cold');assert.equal(body.clothingOptions[1].granted,undefined);
});

test('public player updates preserve equipment without changing heights, walking phase or character identity',()=>{
 const before=normalizeWorldPlayer({userId:'a',characterId:'guillermo',clothing:'heat',state:'walk',walk:3.2,x:50,y:80}),height=actorWorldHeight({avatarHeight:186},before.characterId),after=mergeWorldPlayer(before,{clothing:'cold'},10);
 assert.equal(after.clothing,'cold');assert.equal(after.walk,before.walk);assert.equal(after.characterId,before.characterId);assert.equal(actorWorldHeight({avatarHeight:186},after.characterId),height);
 assert.equal(mergeWorldPlayer(after,{clothing:'heat'},20).clothing,'heat');assert.equal(normalizeWorldPlayer({clothing:'forged'}).clothing,'heat');
 for(const id of Object.keys(THERMAL_OUTFITS)){assert(thermalOutfit(id,'cold'));assert.equal(thermalOutfit(id,'heat'),null);}assert.equal(thermalOutfit('constructor','cold'),null);
});

test('the wardrobe previews the current character and equips Maria without a craft or purchase action',async()=>{
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main'),body=applyCharacterHealthProfile(createWellness(),'maria-villegas'),gear={items:{}},calls=[];syncClothing(gear,body);
 const panel=mountHealthPanel(root,{data:{body:wellnessSnapshot(body)},onClothing:async input=>{calls.push(input);body.clothing=input.clothing;syncClothing(gear,body);return {body:wellnessSnapshot(body)};}});
 try{root.querySelector('[data-health-tab=clothing]').click();const cold=root.querySelector('[data-clothing=cold]');assert(!cold.disabled);assert.equal(cold.querySelector('img').getAttribute('src'),THERMAL_OUTFITS['maria-villegas'].image);assert.match(root.querySelector('[data-clothing=heat] img').getAttribute('src'),/maria-villegas/);assert(!root.textContent.includes('FABRICAR EN MESA DE TRABAJO'));cold.click();await new Promise(r=>setImmediate(r));assert.deepEqual(calls,[{clothing:'cold'}]);assert.equal(root.querySelector('[data-clothing=cold]').getAttribute('aria-pressed'),'true');root.querySelector('[data-clothing=heat]').click();await new Promise(r=>setImmediate(r));assert.equal(body.clothing,'heat');}finally{panel.destroy();dom.window.close();}
});

test('the avatar bank selects the equipped outfit atlas and preserves normal art as a separate cache entry',async()=>{
 const Previous=globalThis.Image,loaded=[];globalThis.Image=class{set src(v){this.url=v;loaded.push(v);}async decode(){return this;}};
 try{const bank=new AvatarBank(false);bank.get('maria-villegas','cold');await bank.pump();await new Promise(r=>setImmediate(r));assert.equal(bank.get('maria-villegas','cold').url,THERMAL_OUTFITS['maria-villegas'].atlas);bank.get('maria-villegas','heat');await bank.pump();await new Promise(r=>setImmediate(r));assert.match(bank.get('maria-villegas','heat').url,/sprites\/maria-villegas\.webp/);assert(bank.cache.has('maria-villegas~thermal'));assert(bank.cache.has('maria-villegas'));const lite=new AvatarBank(true);lite.get('bruno','cold');await lite.pump();await new Promise(r=>setImmediate(r));assert.equal(lite.get('bruno','cold').url,THERMAL_OUTFITS.bruno.lite);}finally{globalThis.Image=Previous;}
});

test('all twenty supplied thermal looks have nonempty unclipped animations, including arms and legs rather than a flat image translation',async()=>{
 assert.equal(Object.keys(THERMAL_OUTFITS).length,20);
 for(const item of Object.values(THERMAL_OUTFITS)){
  const file=fileURLToPath(new URL('../public'+item.atlas,import.meta.url)),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,1920,item.id);assert.equal(info.height,1600,item.id);
  const frame=n=>{const pixels=Buffer.alloc(240*320*4),ox=n%8*240,oy=Math.floor(n/8)*320;for(let y=0;y<320;y++)data.copy(pixels,y*240*4,((oy+y)*1920+ox)*4,((oy+y)*1920+ox+240)*4);return pixels;};
  for(let n=0;n<40;n++){const rgba=frame(n);let count=0;for(let y=0;y<320;y++)for(let x=0;x<240;x++){if(rgba[(y*240+x)*4+3]<=30)continue;count++;assert(x>1&&x<238&&y>1&&y<318,item.id+' clipped frame '+n+' at '+x+','+y);}assert(count>7000,item.id+' empty frame '+n);}
  const a=frame(2),b=frame(6);let arms=0,legs=0;for(let y=100;y<310;y++)for(let x=0;x<240;x++){const k=(y*240+x)*4;if(Math.abs(a[k+3]-b[k+3])>40){if(y>225)legs++;else if(x<85||x>150)arms++;}}assert(legs>30,item.id+' legs do not move');assert(arms>10,item.id+' arms do not move');
  const lite=await sharp(fileURLToPath(new URL('../public'+item.lite,import.meta.url))).metadata();assert.equal(lite.width,1200);assert.equal(lite.height,1000);assert.equal(lite.width/lite.height,info.width/info.height);assert(lite.hasAlpha);
 }
});
