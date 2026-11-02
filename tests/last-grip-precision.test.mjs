import test from 'node:test';import assert from 'node:assert/strict';
import {createEpisode,applyEpisode,pulseAt,precision,episodeView,speedFactor} from '../public/juegos/last-grip/engine.mjs';
import {GripClock,GripMotion} from '../public/juegos/last-grip/timing.mjs';
import {GRIP_MAPS,CLINIC_POINT,placeAttendee,gripPath,stepAttendee,navigable,walkThroughDoor} from '../public/juegos/last-grip/navigation.mjs';
function round(){const s=createEpisode({id:'precision',now:0});s.phase='active';s.phaseAt=0;s.roster=[{id:'human',name:'Player',characterId:'ari-santana',role:'participant',connected:true}];placeAttendee(s.roster[0],'stands');s.round={id:'round',at:0,number:1,members:['human'],falls:[],actors:{human:{stamina:70,lastPulse:null}},timing:{at:0,index:0,speed:speedFactor(s.config.speedMultiplier)}};return s;}
test('x0 is slower, survives serialization, and each new episode returns to x0; staff changes apply between pulses',()=>{
 const s=round();assert.equal(s.config.speedMultiplier,0);assert.equal(episodeView(s).config.speedMultiplier,0);assert(pulseAt(s).duration>1000);assert(pulseAt(s).interval>2300);
 assert.throws(()=>applyEpisode(s,{type:'setSpeed',value:4},{actor:{id:'human'}}),/Dirección/);
 s.clock=500;const before=pulseAt(s);applyEpisode(s,{type:'setSpeed',value:4},{staff:true});assert.equal(pulseAt(s).start,before.start);assert.equal(pulseAt(s).duration,before.duration);
 s.clock=before.cycleStart+before.interval;assert.equal(pulseAt(s).speed,4);assert.equal(pulseAt(s).duration,175);
 s.phase='finished';applyEpisode(s,{type:'open'},{staff:true,now:10});assert.equal(s.config.speedMultiplier,0);
});
test('the displayed press is judged at its bounded presentation time, including one delayed response after a miss',()=>{
 const s=round(),p=pulseAt(s),pressed=p.start+precision(s).center*p.duration;s.clock=pressed+120;
 assert.equal(applyEpisode(s,{type:'pulse',clock:pressed,pulseId:p.id},{actor:{id:'human'}}),'perfect');assert.equal(s.round.actors.human.stamina,74);
 assert.throws(()=>applyEpisode(s,{type:'pulse',clock:pressed,pulseId:p.id},{actor:{id:'human'}}),/Ya respondiste/);
 const late=round(),a=late.round.actors.human;a.stamina=64;a.lastPulse=p.id;a.lastPulseIndex=p.index;a.lastResult={result:'miss',clock:pressed+100};late.clock=pressed+180;
 assert.equal(applyEpisode(late,{type:'pulse',clock:pressed,pulseId:p.id},{actor:{id:'human'}}),'perfect');assert.equal(a.stamina,74);
 assert.throws(()=>applyEpisode(late,{type:'pulse',clock:pressed+10000,pulseId:'fake'},{actor:{id:'human'}}),/pulso ya terminó/);
});
test('the marker stays monotonic across delayed snapshots, keeps moving beyond 250ms, and resets after reconnection or pause',()=>{
 const c=new GripClock(),s=round();c.sync(s,0);let previous=0;for(let t=16;t<=1000;t+=16){if(t%80===0)c.sync({...s,clock:t-35},t);const clock=c.read(t);assert(clock>=previous);assert(Number.isFinite(clock));previous=clock;}assert(previous>900);
 c.sync({...s,clock:1020},1020);assert(c.read(1420)>1300);assert(!c.fresh(2400));c.sync({...s,clock:3000},3000);assert.equal(c.read(3000),3000);
 c.sync({...s,clock:3100,paused:true},3100);assert.equal(c.read(3500),3100);c.pong({sent:3480,clock:3100},3500);assert.equal(c.latency,10);
});
test('the plaza has clear paths to both manual E exits and clinic, with no return sign obstructing the center',()=>{
 assert(!GRIP_MAPS.monitor.nodes.some(n=>n.to==='entrance'||n.to==='runway'));
 for(const n of GRIP_MAPS.monitor.nodes){const p={};placeAttendee(p,'monitor');p.path=gripPath('monitor',p,n);assert(p.path.length,n.id+' route');let frames=0;while(p.path.length&&frames++<1200){stepAttendee(p,{x:0,y:0,run:false},.05);assert(navigable('monitor',p.x,p.y));}assert(Math.hypot(p.x-n.x,p.y-n.y)<=n.range,n.id+' reached');assert.equal(walkThroughDoor(p),null);assert.equal(p.area,'monitor');if(n.kind==='door'){const s=createEpisode();s.phase='changing';s.roster=[{...p,id:'human'}];applyEpisode(s,{type:'interact',target:n.id},{actor:{id:'human'}});assert.equal(s.roster[0].area,n.to);}}
 assert(Math.hypot(CLINIC_POINT.x-GRIP_MAPS.monitor.nodes[0].x,CLINIC_POINT.y-GRIP_MAPS.monitor.nodes[0].y)>300);
});
test('walking is interpolated between snapshots and a change of map never slides across the previous scenery',()=>{
 const m=new GripMotion(),s=round();m.sync(s,0);const moved=structuredClone(s);moved.roster[0].x+=30;moved.roster[0].walk=1;m.sync(moved,100);
 const halfway=m.sample(moved,150).roster[0];assert.equal(halfway.x,s.roster[0].x+15);assert.equal(halfway.walk,.5);
 const changed=structuredClone(moved);placeAttendee(changed.roster[0],'monitor');m.sync(changed,200);assert.equal(m.sample(changed,210).roster[0].x,changed.roster[0].x);assert.equal(m.sample(changed,210).roster[0].area,'monitor');
});
