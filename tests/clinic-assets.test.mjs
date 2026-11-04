import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {CLINIC_POSES,clinicReadings} from '../public/juegos/clinic-procedures.mjs';
import {CLINICAL_CAST} from '../public/juegos/clinic-identities.mjs';
import {clinicalActorSource,clinicActorAsset} from '../public/juegos/clinic-motion.mjs';
const root=new URL('../public/juegos/clinic/art/',import.meta.url);
const patients=['sallua','carmine','bruno','daelly','bayron','arisantana','marianito','leandro','vitany','kareli','vita','eduard','joseserna','guillermo','peggy','andromeda','ivy','roger','maria-villegas'];
test('consultations resolve an existing original illustration for every character without a dedicated nursing pose',async()=>{
 const publicRoot=new URL('../public/',import.meta.url);
 for(const character of CLINICAL_CAST){const dedicated=clinicActorAsset(character.id,{kind:'psychology'}),source=dedicated||clinicalActorSource(character.id);await assert.doesNotReject(fs.access(new URL('.'+source,publicRoot)),character.name+' has no consultation illustration');}
 for(const id of ['dani','dua-lingo'])assert(!clinicalActorSource(id).includes('-ready-v1.webp'));
});
test('all 63 character poses have transparent margins, opaque interiors and complete registered silhouettes',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('manifest-v1.json',root),'utf8'));
 const keys=[...patients.flatMap(id=>['ready','drink','relieved'].map(p=>id+'-'+p)),...CLINIC_POSES.map(p=>'isabel-'+p)];assert.equal(Object.keys(manifest).length,keys.length);
 for(const name of keys){const entry=manifest[name],file=new URL(name+'-v1.webp',root),{data,info}=await sharp(await fs.readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,entry.width,name);assert.equal(info.height,768,name);let solid=0,visible=0,l=info.width,r=0,t=info.height,b=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a>40){visible++;if(a>240)solid++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
  assert(l>7&&r<info.width-8,name+' clips horizontally');assert(t>=30&&b<=745,name+' clips vertically');assert(visible>10000&&solid/visible>.94,name+' contains an opaque backdrop or washed out interior');assert(b>=740,name+' has inconsistent floor registration');
  for(const y of [0,info.height-1])for(let x=0;x<info.width;x++)assert.equal(data[(y*info.width+x)*4+3],0,name+' top/bottom edge');
  for(const x of [0,info.width-1])for(let y=0;y<info.height;y++)assert.equal(data[(y*info.width+x)*4+3],0,name+' side edge');
 }
 const chair=await sharp(await fs.readFile(new URL('patient-chair-v1.webp',root))).metadata();assert.equal(chair.hasAlpha,true);const room=await sharp(await fs.readFile(new URL('consultation-room-v1.webp',root))).metadata();assert.equal(room.width/room.height,1.6);
});
test('fictional control readings respond to actual stress and exhaustion without inventing real clinical measurements',()=>{
 assert.deepEqual(clinicReadings({vitals:{stress:12,energy:90,sleep:90}}),{pressure:'Estable',pulse:'Tranquilo',reserves:'Conservadas',needsFollowUp:false});
 assert.deepEqual(clinicReadings({vitals:{stress:88,energy:18,sleep:20}}),{pressure:'Alterada',pulse:'Agitado',reserves:'Bajas',needsFollowUp:true});
});
