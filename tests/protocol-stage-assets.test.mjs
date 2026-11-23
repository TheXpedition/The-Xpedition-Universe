import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {PROTOCOL_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';
import {protocolPortrait} from '../public/juegos/x-protocol/portrait-url.mjs';

const publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const arenaRoot=resolve(publicRoot,'juegos/x-protocol');

test('every stage background, duel prop, cast pose and ranking portrait can be loaded from the deployed public tree',async()=>{
 const manifest=JSON.parse(await readFile(resolve(arenaRoot,'assets.json'),'utf8'));
 const paths=new Set();
 for(const scene of Object.values(manifest.scenes))paths.add(resolve(arenaRoot,scene.url));
 for(const name of Object.values(manifest.props))paths.add(resolve(arenaRoot,name));
 for(const poses of Object.values(manifest.poses))for(const item of poses)paths.add(resolve(arenaRoot,item.url));
 for(const id of PROTOCOL_PARTICIPANTS){
  paths.add(resolve(publicRoot,protocolPortrait(id).slice(1)));
  paths.add(resolve(publicRoot,'juegos/cast-apocalypse/'+id+'-original.png'));
 }
 paths.add(resolve(arenaRoot,'media/intro-daa3534cac20-smooth.mp4'));
 const missing=[];
 for(const p of paths){try{const data=await stat(p);if(!data.isFile()||data.size===0)missing.push(p);}catch{missing.push(p);}}
 assert.deepEqual(missing,[],'broken media references would show blank or frozen scenes in Render');
 assert.equal(PROTOCOL_PARTICIPANTS.length,18);
 assert(PROTOCOL_PARTICIPANTS.includes('luciano')&&PROTOCOL_PARTICIPANTS.includes('nacho'));
 assert(!PROTOCOL_PARTICIPANTS.includes('bayron')&&!PROTOCOL_PARTICIPANTS.includes('eduard'));
 assert.equal(new Set(PROTOCOL_PARTICIPANTS).size,18);
 assert(Object.keys(manifest.scenes).length>=10,'all planned stages must have backgrounds');
 assert(paths.size>=150,'the complete cast and duel asset bundle must be checked');
});
