import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CHARACTERS,characterConfig} from '../public/simulator/ice-breaker/characters.mjs';
import {MODELS,sampleCharacterPose} from '../public/simulator/ice-breaker/character-rig.mjs';
import {newRun,jumpTo,stepRun} from '../public/simulator/ice-breaker/engine.mjs';
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('thirty-two selectable characters preserve their own lines and complete recorded audio',()=>{
 assert.deepEqual(CHARACTERS.map(c=>c.name),['Dani','Bayron','Felix','Andromeda','Isabel','Peggy','Eris','Ximena','Vita','Iñaella Rose','Daelly','Coronel','Julián','Alexandro','Catalina','Luciano','Ignacio Ricci','Lalamila','Lucas Mendez','Cocomong','Bryan Montalvo','Beto','Greg','Sal Lua','Ivy','Eduard','Kim Camila','Carlos Harrington','Nahuee','Pier','Esteban','Marcos']);assert.equal(characterConfig('unknown').id,'dani');assert.deepEqual(CHARACTERS.map(c=>c.fall.length),[8,3,3,4,4,4,5,5,5,6,5,6,5,7,7,8,5,5,7,6,6,5,6,6,6,6,5,5,6,5,4,6]);
 const ids=new Set();for(const c of CHARACTERS.slice(1)){assert.equal(c.ambient.length,0);assert(fs.existsSync(new URL('../public/simulator/ice-breaker/'+c.image,import.meta.url)));for(const line of c.fall){assert(!ids.has(line.id),'Unique audio identity');ids.add(line.id);const a=fs.readFileSync(new URL('../public/simulator/ice-breaker/audio/'+line.id+'.wav',import.meta.url));assert.equal(a.toString('ascii',0,4),'RIFF');assert(a.length>16000);assert(!/cagué|andromierda|genshit|mierda|mamada|pinche|perra|ximierdota|joder|coño|gilipollas|hijueputa|\bporno\b|erótica|gonorrea|mamaguevo/i.test(line.text));assert(!/[*]/.test(line.spoken));}}
});
test('new models keep their measured limb lengths through every walk and jump pose',()=>{
 for(const id of Object.keys(MODELS)){const m=MODELS[id],run=newRun();jumpTo(run,'f1');
  const inputs=[...Array.from({length:720},(_,i)=>({phase:'walk',walkBlend:1,stride:i/720*Math.PI*2})),...Array.from({length:155},()=>{const p={...run.player,stride:run.player.walk};stepRun(run,{},1/120);return p;})];
  for(const input of inputs){const pose=sampleCharacterPose(id,input);for(let side=0;side<2;side++){const prefix=side?'near':'far';for(const [name,source] of [['Leg',[m.hips,m.knees,m.ankles]],['Arm',[m.shoulders,m.elbows,m.wrists]]]){const bone=pose[prefix+name];assert(Math.abs(length(bone.root,bone.joint)-length(source[0][side],source[1][side]))<1e-6,id+' upper '+name);assert(Math.abs(length(bone.joint,bone.end)-length(source[1][side],source[2][side]))<1e-6,id+' lower '+name);}}}
 }
});
test('latest eight take visible steps and fold their knees during a jump',()=>{
 for(const character of CHARACTERS.slice(-8)){
  const model=MODELS[character.id],cycle=Array.from({length:120},(_,i)=>sampleCharacterPose(character.id,{phase:'walk',stride:i/120*Math.PI*2,walkBlend:1}));
  for(const key of ['farLeg','nearLeg']){
   const xs=cycle.map(pose=>pose[key].end.x),range=Math.max(...xs)-Math.min(...xs);
   assert(range>(model.ground-model.top)*.05,character.id+' needs a full walking step, not a static sprite sway');
  }
  const air=sampleCharacterPose(character.id,{phase:'jump',jumpProgress:.5});
  for(const key of ['farLeg','nearLeg']){const limb=air[key],straight=length(limb.root,limb.joint)+length(limb.joint,limb.end);assert(length(limb.root,limb.end)<straight*.95,character.id+' bends its knee in the air');}
 }
});
