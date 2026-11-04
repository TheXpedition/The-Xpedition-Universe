import test from 'node:test';import assert from 'node:assert/strict';
import {GRIP_MAPS,BOOTHS,gripPath,navigable,placeAttendee,stepAttendee} from '../public/juegos/last-grip/navigation.mjs';
import {createEpisode,applyEpisode} from '../public/juegos/last-grip/engine.mjs';import {GRIP_IDS} from '../public/juegos/last-grip/assets.mjs';
test('each painted exit and booth is reachable by ordinary World walking and every step stays on clear floor',()=>{
 for(const m of Object.values(GRIP_MAPS))for(const n of m.nodes){assert(navigable(m.id,n.x,n.y),m.id+':'+n.id+' approach');const p={};placeAttendee(p,m.id);p.path=gripPath(m.id,p,n);assert(p.path.length,m.id+':'+n.id+' route');let i=0;while(p.path.length&&i++<1600){stepAttendee(p,{x:0,y:0,run:true},.05);assert(navigable(m.id,p.x,p.y),m.id+':'+n.id+' stays grounded');}assert(Math.hypot(p.x-n.x,p.y-n.y)<=n.range,m.id+':'+n.id+' reached');if(n.kind==='door'){if(!['runway','entrance'].includes(m.id))assert(GRIP_MAPS[n.to].nodes.some(q=>q.to===m.id),'Reciprocal link: '+m.id+' to '+n.to);assert(navigable(n.to,...n.spawn),'Return spawn is on the path');}}
});
test('wardrobe benches and deck edges block the feet instead of allowing arbitrary movement through the painting',()=>{
 const p={};placeAttendee(p,'changing',[500,740]);for(let i=0;i<300;i++)stepAttendee(p,{x:0,y:-1,run:true},.05);assert(p.y>=676,'Cannot cross the left bench');assert(p.y<740,'Can approach the bench');placeAttendee(p,'platform');for(let i=0;i<500;i++)stepAttendee(p,{x:1,y:-1,run:true},.05);assert(navigable('platform',p.x,p.y));assert(p.x<1490&&p.y>550,'Cannot walk into the pit or behind the rail');
});
test('every individual booth changes clothes on E for staff and nursing; remote changes are rejected',()=>{
 const s=createEpisode();s.phase='changing';for(const [i,characterId]of ['maria-villegas','isabel'].entries()){const p={id:'visitor-'+i,name:characterId,characterId,origin:{zone:'base',x:100,y:600}};placeAttendee(p,'changing');s.visitors.push(p);assert.throws(()=>applyEpisode(s,{type:'change'},{actor:p}),/cortina/);for(const b of BOOTHS){placeAttendee(p,'changing',[b.x,b.y]);applyEpisode(s,{type:'interact',target:b.id},{actor:p});assert.equal(p.changed,true);assert.equal(p.lastBooth,b.id);applyEpisode(s,{type:'interact',target:b.id},{actor:p});assert.equal(p.changed,false);}}
});
test('the final immediately uses exactly the six qualifiers in qualification order, without another draw or selection video',()=>{
 const s=createEpisode();s.phase='results';s.roster=GRIP_IDS.map((characterId,i)=>({id:'p'+i,characterId}));s.rounds=[0,1,2].map(i=>({members:s.roster.slice(i*6,i*6+6).map(p=>p.id)}));s.qualifiers=['p4','p1','p10','p8','p15','p17'];s.media.draws=[{},{},{}];applyEpisode(s,{type:'final'},{staff:true,actor:{id:'staff'}});assert.equal(s.phase,'ready');assert.deepEqual(s.round.members,s.qualifiers);assert.equal(s.round.final,true);assert(s.round.reveals.every(v=>!v.video));assert.equal(s.round.members.length,6);
});
