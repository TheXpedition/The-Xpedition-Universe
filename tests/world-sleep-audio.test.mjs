import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {WorldSleepAudio} from '../public/juegos/world-sleep-audio.mjs';
import {WorldAmbience} from '../public/juegos/world-ambience.mjs';
import {APOCALYPSE_CAST} from '../public/juegos/world-characters.mjs';
import {fakeAudio,fetchAudio,settleAudio} from './helpers/world-audio-fixture.mjs';
const options={selfId:'self',zone:'refugio-1'},listener={userId:'self',characterId:'maria-villegas',zone:'refugio-1',state:'idle',x:100,y:500},sleep=(id,characterId,extra={})=>({...listener,userId:id,characterId,state:'sleep',sleeping:true,...extra});
test('all 22 characters receive their own gender-appropriate sleeping audio, including Dani and Dua',async()=>{
 const ctx=fakeAudio(),audio=new WorldSleepAudio({fetcher:fetchAudio});
 for(const c of APOCALYPSE_CAST){const actor=sleep('self',c.id);audio.update(ctx,[actor],options);await settleAudio();audio.update(ctx,[actor],options);assert.equal(audio.voices.size,1,c.id);assert.match([...audio.voices.values()][0].source.buffer.name,c.gender==='male'?/snore-male/:/breath-female/);}
 audio.reset();assert.equal(audio.bank.voices.size,0);assert.equal(ctx.live,0);
});
test('waking, private activities, fainting and leaving a zone stop snores immediately',async()=>{
 const ctx=fakeAudio(),audio=new WorldSleepAudio({fetcher:fetchAudio});
 const asleep=sleep('neighbor','bruno');audio.update(ctx,[listener,asleep],options);await settleAudio();audio.update(ctx,[listener,asleep],options);assert.equal(audio.voices.size,1);
 for(const actor of [{...asleep,sleeping:false,state:'idle'},{...asleep,activity:'private-rest'},{...asleep,life:{status:'dead'}},{...asleep,life:{status:'fainted'}},{...asleep,zone:'dormitorio-2'}]){audio.update(ctx,[listener,actor],options);assert.equal(audio.voices.size,0);audio.update(ctx,[listener,asleep],options);}
 audio.reset();assert.equal(ctx.live,0);
});
test('the nearest three sleepers are mixed without duplicates; mute, hidden tabs and disconnect release them',async()=>{
 const ctx=fakeAudio(),audio=new WorldSleepAudio({fetcher:fetchAudio}),players=[listener,...Array.from({length:9},(_,i)=>sleep('p'+i,i%2?'dani':'bruno',{x:150+i*100}))];
 audio.update(ctx,players,options);await settleAudio();audio.update(ctx,players,options);assert.equal(audio.voices.size,3);for(let n=0;n<30;n++)audio.update(ctx,players,options);assert.equal(ctx.sources.length,3);
 for(const restriction of [{enabled:false},{visible:false},{connected:false},{playing:false}]){audio.update(ctx,players,{...options,...restriction});assert.equal(audio.voices.size,0);assert.equal(ctx.live,0);audio.update(ctx,players,options);}
 audio.update(ctx,[],options);assert.equal(ctx.live,0);
});
test('decoding cannot start a late snore after the sleeper has stood up',async()=>{
 const ctx=fakeAudio(),audio=new WorldSleepAudio({fetcher:fetchAudio});audio.update(ctx,[sleep('self','bruno')],options);audio.update(ctx,[listener],options);await settleAudio();assert.equal(ctx.sources.length,0);audio.update(ctx,[listener],options);assert.equal(audio.voices.size,0);
});
test('tunnels and all cave chambers play recorded dripping, stop on departure and do not use electronic drip oscillators',async()=>{
 const ctx=fakeAudio(),ambience=new WorldAmbience({fetcher:fetchAudio}),environment={phase:'night',weather:'clear'};let oscillators=0;const oscillator=ctx.createOscillator;ctx.createOscillator=()=>{oscillators++;return oscillator();};
 for(const zone of ['tunel','cueva','cueva-galeria','cueva-profunda']){ambience.update(ctx,{zone,environment,now:0});await settleAudio();ambience.update(ctx,{zone,environment,now:10000});assert.match(ambience.waterVoice.source.buffer.name,/tunnel-drips-loop/);assert(ambience.waterVoice.source.loop);assert.equal(ambience.waterBank.voices.size,1);}
 assert.equal(oscillators,0);ambience.update(ctx,{zone:'base',environment,now:0});assert.equal(ambience.waterBank.voices.size,0);ambience.stop();assert.equal(ctx.live,0);
});
test('recorded rest and tunnel assets are valid bounded PCM loops, with documented public-domain provenance',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../public/juegos/audio/REST-TUNNEL-SOURCES.json',import.meta.url)));
 assert.equal(sources.length,3);
 for(const source of sources){assert.equal(source.license,'CC0-1.0');const b=fs.readFileSync(new URL('../public/juegos/audio/'+source.file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt32LE(24),22050);assert(source.seconds>20&&source.seconds<90);assert(source.peak<=.851);let energy=0;for(let p=44;p<b.length;p+=2){const v=b.readInt16LE(p)/32768;assert(Math.abs(v)<.9);energy+=v*v;}assert(energy/(b.length-44)*2>.0001);}
});
