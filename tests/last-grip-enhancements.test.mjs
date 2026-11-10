import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEpisode,applyEpisode,tickEpisode,episodeView,precision,pulseAt,isEngaged} from '../public/juegos/last-grip/engine.mjs';
import {SWIMWEAR} from '../public/juegos/last-grip/swimwear.mjs';
function fixture(){let now=0;const s=createEpisode({id:'enhancement-test',now}),staff=a=>applyEpisode(s,a,{actor:{id:'staff'},staff:true,now,random:()=>.37}),step=ms=>{while(ms>0){const n=Math.min(ms,25);now+=n;tickEpisode(s,now);ms-=n;}};staff({type:'open'});staff({type:'fillBots'});return {s,staff,step,act:(id,a)=>applyEpisode(s,a,{actor:{id},now}),visit:p=>applyEpisode(s,{type:'visit'},{actor:p,now})};}
test('staff fills actual lobby with eighteen weak bots; visitors have original swimsuits and never consume a competitive seat',()=>{
 const f=fixture();assert.equal(f.s.roster.length,18);assert.equal(new Set(f.s.roster.map(p=>p.characterId)).size,18);assert.throws(()=>f.act('stranger',{type:'fillBots'}),/Dirección/);
 for(const [id,characterId,role]of [['staff','maria-villegas','staff'],['nurse','isabel','nurse']])f.visit({id,name:id,characterId,role,origin:{zone:'base',x:313,y:700}});
 f.staff({type:'start'});f.step(8100);f.staff({type:'guide'});assert.equal(f.s.phase,'guide');f.step(5100);assert.equal(f.s.phase,'changing');
 for(const p of f.s.visitors){Object.assign(p,{area:'changing',x:820,y:605});f.act(p.id,{type:'change'});assert.equal(p.changed,true);assert(isEngaged(f.s,p.id));assert.throws(()=>f.act(p.id,{type:'ready',ready:true}),/espectadores/);}
 for(let i=0;i<1000&&!f.s.roster.every(p=>p.changed&&p.ready);i++)f.step(100);assert(f.s.roster.every(p=>p.changed&&p.ready),'Bots must reach a real changing booth');f.staff({type:'prepare'});f.staff({type:'draw'});f.step(7000);f.staff({type:'startRound'});f.step(12000);const actions=f.s.audit.filter(a=>a.kind==='pulse');assert(actions.length<18*8,'Bots sometimes miss their pulse');assert.throws(()=>f.act('nurse',{type:'pulse'}),/gradas/);
 while(['active','ending'].includes(f.s.phase))f.step(1000);assert(f.s.audit.some(a=>a.kind==='pulse'&&a.result==='fail'),'Bots can miss during a complete round');assert.equal(f.s.round.survivors.length,2);f.staff({type:'finish',confirm:true});assert.deepEqual(f.s.returns.nurse,{zone:'base',x:313,y:700});assert.equal(Object.keys(f.s.returns).length,2);assert(!isEngaged(f.s,'nurse'));
});
test('all 23 original standing swimsuits and sound resources exist; missing Dani suit is never replaced',()=>{
 assert.equal(Object.keys(SWIMWEAR).length,23);for(const p of Object.values(SWIMWEAR))assert(fs.statSync('public'+p.image).size>10000);
 for(const file of ['helicopter.png','helicopter.mp3','fall-female.mp3','guide.png','opening.mp4'])assert(fs.statSync('public/juegos/last-grip/media/'+file).size>1000);
 const f=fixture();f.staff({type:'start'});f.step(8100);f.staff({type:'changing'});f.visit({id:'dani',characterId:'dani',name:'Dani'});Object.assign(f.s.visitors[0],{area:'changing',x:820,y:605});assert.throws(()=>f.act('dani',{type:'change'}),/No se ha recibido/);
});
test('fast pulses use a moving, shrinking target; displayed clock and authoritative perfect window agree',()=>{
 const f=fixture();f.staff({type:'start'});f.step(8100);f.staff({type:'changing'});f.step(50);for(let i=0;i<1000&&!f.s.roster.every(p=>p.changed&&p.ready);i++)f.step(100);assert(f.s.roster.every(p=>p.changed&&p.ready),'Bots must reach a real changing booth');f.staff({type:'prepare'});f.staff({type:'draw'});f.step(7000);f.staff({type:'startRound'});const a=precision(f.s),id=f.s.round.members[0];f.s.roster.find(p=>p.id===id).bot=false;
 const pulse=pulseAt(f.s);f.step(Math.round(pulse.start+a.center*pulse.duration-f.s.clock));assert.equal(f.act(id,{type:'pulse'}),'perfect');assert.throws(()=>f.act(id,{type:'pulse'}),/respondiste/);f.step(pulse.interval);assert.notEqual(precision(f.s).center,a.center);f.s.clock+=60000;assert(precision(f.s).perfect<a.perfect);assert.equal(f.s.config.pulseDuration,700);assert.equal(f.s.config.pulseInterval,1500);assert(Math.abs(pulseAt(f.s).end-pulseAt(f.s).start-700/.65)<.0001);
});
test('presentation and each chosen name follow a server timeline with pause, reconnect and no unrevealed-name leak',()=>{
 const f=fixture();f.s.media.presentation={url:'/presentation.mp4',duration:900};f.s.media.draws=Array.from({length:3},()=>Object.fromEntries(f.s.roster.map(p=>[p.characterId,{url:'/selected-'+p.characterId+'.mp4',duration:1200}])));
 f.staff({type:'start'});f.step(8000);assert.equal(episodeView(f.s).cinematic.placement,'monitor');f.step(500);f.staff({type:'pause'});const clock=f.s.clock;f.step(2000);assert.equal(f.s.clock,clock);assert.equal(episodeView(f.s).cinematic.start,f.s.phaseAt);f.staff({type:'resume'});f.step(400);assert.equal(f.s.phase,'guide');f.step(5000);for(let i=0;i<1000&&!f.s.roster.every(p=>p.changed&&p.ready);i++)f.step(100);assert(f.s.roster.every(p=>p.changed&&p.ready),'Bots must reach a real changing booth');f.staff({type:'prepare'});
 for(let round=0;round<3;round++){f.staff({type:'draw'});const v=episodeView(f.s);assert.equal(v.round.members.length,1);assert.equal(v.round.reveals.length,1);assert.equal(Object.keys(v.round.actors).length,1);assert.equal(v.cinematic.start,f.s.round.drawAt);for(let i=1;i<6;i++){f.step(1700);const next=episodeView(f.s);assert.equal(next.round.members.length,i+1);assert.equal(next.cinematic.name,f.s.roster.find(p=>p.id===f.s.round.members[i]).name);}f.step(2700);assert.equal(f.s.phase,'ready');f.staff({type:'startRound'});while(['active','ending'].includes(f.s.phase))f.step(1000);}
 assert.equal(new Set(f.s.rounds.flatMap(r=>r.members)).size,18);
});

test('filling a saved lobby replaces Peggy and Jose bots without changing the other sixteen',()=>{
 const f=fixture();
 const aliases={alice:'peggy',gabrielsab:'joseserna'};
 const retained=f.s.roster.filter(p=>!aliases[p.characterId]);
 for(const p of f.s.roster)if(aliases[p.characterId])p.characterId=aliases[p.characterId];
 f.staff({type:'fillBots'});
 assert.equal(f.s.roster.length,18);
 assert.deepEqual(f.s.roster.slice(0,16),retained);
 assert.deepEqual(f.s.roster.slice(16).map(p=>p.characterId).sort(),['alice','gabrielsab']);
});
