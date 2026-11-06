import test from 'node:test';import assert from 'node:assert/strict';
import {createEpisode,applyEpisode,tickEpisode,episodeView,precision} from '../public/juegos/last-grip/engine.mjs';
import {GRIP_MAPS,placeAttendee,monitorSpot,walkThroughDoor,nearbyNode,navigable} from '../public/juegos/last-grip/navigation.mjs';
import {GRIP_IDS} from '../public/juegos/last-grip/assets.mjs';import {MediaGate} from '../public/juegos/last-grip/media-gate.mjs';
import {eventDrain} from '../public/juegos/last-grip/events.mjs';import {EPISODE_MEDIA} from '../public/juegos/last-grip/media-config.mjs';
import {episodeMediaFor} from '../world-last-grip-service.mjs';
function fixture(){let now=0;const s=createEpisode({now}),staff=a=>applyEpisode(s,a,{staff:true,actor:{id:'staff'},now,random:()=>.5}),step=ms=>{while(ms>0){const dt=Math.min(50,ms);now+=dt;tickEpisode(s,now);ms-=dt;}};staff({type:'open'});for(const [i,characterId]of GRIP_IDS.entries()){const actor={id:'p'+i,name:characterId,characterId,role:'participant',vitals:{}};applyEpisode(s,{type:'join'},{actor,now});applyEpisode(s,{type:'ready',ready:true},{actor,now});}s.media.presentation={url:'intro.mp4',duration:100};s.media.draws=[{},{},{}];Object.assign(s.config,{baseDrain:50,arrivalDuration:50,guideDuration:50,drawInterval:25,readyDuration:50,resultDuration:500});staff({type:'start'});step(200);assert.equal(s.phase,'changing');return {s,staff,step};}
test('staff starts each round once; falls and round completion return contestants to separate monitor positions automatically',()=>{
 const f=fixture();assert(episodeView(f.s).canBeginRound);for(let round=0;round<3;round++){
  f.staff({type:'beginRound'});assert.equal(f.s.phase,'draw');assert.throws(()=>f.staff({type:'beginRound'}),/Espera/);f.step(1300);assert.equal(f.s.phase,'active');
  const victim=f.s.round.members[0];f.s.round.actors[victim].stamina=.1;f.step(50);assert(f.s.round.falls.some(q=>q.id===victim));assert.equal(f.s.roster.find(p=>p.id===victim).area,'monitor');assert.doesNotThrow(()=>applyEpisode(f.s,{type:'path',x:1100,y:790},{actor:{id:victim}}));
  while(['active','ending'].includes(f.s.phase))f.step(50);assert.equal(f.s.phase,'results');assert.equal(f.s.round.survivors.length,2);assert(!episodeView(f.s).canBeginRound);assert.throws(()=>f.staff({type:'beginRound'}),/anuncio/);
  f.step(550);assert(f.s.roster.every(p=>p.area==='monitor'));assert.equal(f.s.phase,round===2?'finalReady':'results');assert(episodeView(f.s).canBeginRound);const spots=new Set(f.s.roster.map(p=>p.x+':'+p.y));assert.equal(spots.size,18);for(const p of f.s.roster)assert(navigable(p.area,p.x,p.y));
  f.step(1000);assert.notEqual(f.s.phase,'active','The next round always waits for staff');
 }
 const summary=episodeView(f.s);assert.equal(summary.cinematic,null);assert.equal(summary.rounds.length,3);assert(summary.rounds.every(r=>r.members.length===6&&r.survivors.length===2&&r.falls.length===4));
 f.staff({type:'beginRound'});assert.equal(f.s.phase,'ready');assert.deepEqual(f.s.round.members,f.s.qualifiers);assert(f.s.round.reveals.every(r=>!r.video));f.step(50);assert.equal(f.s.phase,'active');while(['active','ending'].includes(f.s.phase))f.step(50);assert.equal(f.s.phase,'winner');assert(f.s.qualifiers.includes(f.s.winner));
});
test('bots follow exits automatically without bouncing; human exits wait for E',()=>{
 for(const [area,map]of Object.entries(GRIP_MAPS))for(const door of map.nodes.filter(n=>n.kind==='door')){const human={id:'human-door',characterId:GRIP_IDS[0]};placeAttendee(human,area,[door.x,door.y]);assert.equal(walkThroughDoor(human),null);assert.equal(human.area,area);const s=createEpisode();s.phase='changing';s.roster.push(human);applyEpisode(s,{type:'interact',target:door.id},{actor:{id:human.id}});assert.equal(human.area,door.to);const p={bot:true};placeAttendee(p,area,[door.x,door.y]);p.autoDoorLock=null;assert.equal(walkThroughDoor(p)?.to,door.to);assert.equal(p.area,door.to);const destination=p.area;for(let i=0;i<10;i++)walkThroughDoor(p);assert.equal(p.area,destination);assert(navigable(p.area,p.x,p.y));}
 const p={};placeAttendee(p,'changing',[898,605]);assert.equal(nearbyNode(p,{interactiveOnly:true}).kind,'booth');assert.equal(new Set(Array.from({length:21},(_,i)=>{const p=monitorSpot(i);return p.x+':'+p.y;})).size,21);
});
test('staff can combine, remove and reapply events; warning precedes real grip and precision effects, and no event triggers itself',()=>{
 const f=fixture();f.s.config.baseDrain=0;f.staff({type:'beginRound'});f.step(1300);const baseline=precision(f.s).good;
 f.staff({type:'event',event:'shake',enabled:true});f.staff({type:'event',event:'rain',enabled:true});assert.equal(f.s.events.length,2);assert.equal(eventDrain(f.s),1);f.step(3000);assert(eventDrain(f.s)>1.28);assert(precision(f.s).good<baseline*.86);
 f.staff({type:'event',event:'shake',enabled:false});assert.deepEqual(f.s.events.map(e=>e.kind),['rain']);f.staff({type:'event',event:'wind',enabled:true});f.staff({type:'clearEvents'});assert.equal(eventDrain(f.s),1);f.s.clock+=46000;f.step(50);assert.equal(f.s.events.length,0);f.staff({type:'event',event:'rain',enabled:true});assert.equal(f.s.events.length,1);assert.throws(()=>applyEpisode(f.s,{type:'event',event:'wind'},{actor:{id:'p0'}}),/Dirección/);
});
test('video barriers wait for every visible viewer to finish, including a stalled stream; hidden and disconnected viewers can leave',()=>{
 const gate=new MediaGate(),clip={key:'round:peggy',start:100,duration:5010},eligible=()=>true;gate.viewer('a',true,null,eligible);gate.viewer('b',true,null,eligible);gate.observe(clip,eligible);assert.equal(gate.advance(clip,5100,50),9);gate.ended('a',clip.key);assert.equal(gate.advance(clip,5109,50),0);gate.ended('b','old-clip');assert(gate.pending());gate.ended('b',clip.key);assert.equal(gate.advance(clip,5109,50),50);
 const next={...clip,key:'round:ivy',start:5600};gate.observe(next,eligible);assert(gate.pending());gate.viewer('b',false,next,eligible);gate.ended('a',next.key);assert(!gate.pending());gate.viewer('late',true,next,eligible);assert(gate.pending());gate.ended('late',next.key);assert(!gate.pending());
});
test('X Protocol media gate releases a stalled viewer after its bounded grace period',()=>{
 const gate=new MediaGate({maxWaitMs:10000}),clip={key:'intro',start:0,duration:15000},eligible=()=>true;gate.viewer('stalled',true,clip,eligible);assert.equal(gate.advance(clip,14999,100,20000),0);assert.equal(gate.advance(clip,14999,100,29999),0);assert.equal(gate.advance(clip,14999,100,30000),100);
});
test('a summoned player keeps their place in the intro gate while World navigates into the ceremony',()=>{
 const gate=new MediaGate({maxWaitMs:10000}),clip={key:'intro',start:0,duration:15000},eligible=()=>true;gate.viewer('participant',true,clip,eligible);gate.disconnect('participant',{preserveExpected:true});assert(gate.pending());assert(!gate.viewers.has('participant'));
});
test('all eighteen supplied full character videos are mapped by character in every qualifier; final has none',()=>{
 assert.equal(EPISODE_MEDIA.presentation.duration,46900);for(const draw of EPISODE_MEDIA.draws){assert.deepEqual(Object.keys(draw).sort(),[...GRIP_IDS].sort());for(const id of GRIP_IDS){assert(draw[id].duration>=5000);assert(draw[id].url.endsWith('selection-'+id+'.mp4'));}}
 const f=fixture();f.s.media=structuredClone(EPISODE_MEDIA);f.staff({type:'beginRound'});let cursor=f.s.round.drawAt;for(const reveal of f.s.round.reveals){assert.equal(reveal.start,cursor);assert.equal(reveal.end-reveal.start,reveal.video.duration+500);cursor=reveal.end;}assert.equal(f.s.round.reveals.length,6);
});
test('saved episodes receive newly supplied videos and a previously prepared round still starts with the staff button',()=>{
 const media=episodeMediaFor({opening:null,presentation:null,draws:[{},{},{}]});assert(media.presentation);assert.equal(Object.keys(media.draws[0]).length,18);assert.equal(media.opening,null);const f=fixture();f.s.phase='preparation';f.staff({type:'draw'});f.step(1200);assert.equal(f.s.phase,'ready');assert(episodeView(f.s).canBeginRound);f.staff({type:'beginRound'});assert.equal(f.s.phase,'active');
});
test('last qualifying and final falls finish visibly before results; pause freezes that completion interval',()=>{
 for(const final of [false,true]){const f=fixture();f.staff({type:'beginRound'});f.step(1300);f.s.round.final=final;for(const a of Object.values(f.s.round.actors))a.stamina=.01;f.step(50);assert.equal(f.s.phase,'ending');assert.equal(f.s.winner,null);assert.equal(f.s.qualifiers.length,0);assert.equal(f.s.round.falls.length,final?5:4);const lastFall=Math.max(...f.s.round.falls.map(f=>f.clock)),stamina=Object.values(f.s.round.actors).map(a=>a.stamina);f.step(1500);assert.equal(f.s.phase,'ending');f.staff({type:'pause'});f.step(1000);assert.equal(f.s.phase,'ending');f.staff({type:'resume'});f.step(800);assert.equal(f.s.phase,final?'winner':'results');assert(f.s.clock-lastFall>=2300);assert.deepEqual(Object.values(f.s.round.actors).map(a=>a.stamina),stamina);}
});
