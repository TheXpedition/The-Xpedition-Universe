import assert from 'node:assert/strict';


import {liveFixture,STAFF_ID} from './helpers/world-live-fixture.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';
const [x,y]=WORLD_MAPS.base.spawn;
const actors=[
 {id:STAFF_ID,character:'maria-villegas'},
 ...['luciano','nacho',...SHELTER_PARTICIPANTS.slice(2)].map((character,i)=>({id:'perf-'+i,character})),
 {id:'perf-spectator',character:'dani',spectator:true}
].map((a,i)=>({...a,zone:'base',x:x+(i%4)*4,y:y+(i%3)*4}));
const f=await liveFixture('world-movement-20',actors);
let movement;
try{
 const peers=[];
 for(const a of actors)peers.push(await f.connect(a.id,{compactMovement:true}));
 const nonStaff=peers[3];f.send(nonStaff,{type:'chef-action',action:{type:'play'}});await f.until(()=>nonStaff.messages.some(m=>JSON.stringify(m).includes('Solo el staff puede abrir Bonju Chef')));
 for(const p of peers)p.messages.length=0;
 for(const p of peers)f.send(p,{type:'input',x:1,y:0});
 await f.until(()=>peers.every(p=>p.messages.some(m=>m.type==='move'&&m.players.some(p=>p.userId==='perf-0'&&p.moving))));
 await new Promise(r=>setTimeout(r,450));
 for(const p of peers)f.send(p,{type:'input',x:0,y:0});
 const frames=peers.map(p=>p.messages.filter(m=>m.type==='move'));
 movement=frames[0].filter(m=>m.players.length>=18).find(m=>frames.every(moves=>moves.some(other=>other.serverTime===m.serverTime)));
 assert(movement,'20 peers must receive a common movement frame');
 const compact=frames[0].flatMap(m=>m.players).filter(p=>p.moving&&!p.characterId);assert(compact.length>0);
 console.log('Registros compactos de movimiento:',compact.length,'bytes por registro:',JSON.stringify(compact[0]).length);
 const expected=JSON.stringify(movement);
 for(const received of frames)assert.equal(JSON.stringify(received.find(m=>m.serverTime===movement.serverTime)),expected);
 assert(peers.every(p=>p.socket.readyState===1));
 console.log(JSON.stringify({connections:peers.length,playersInSharedFrame:movement.players.length,identical:true,packetsPerPeer:frames.map(r=>r.length)}));
}finally{await f.close();}
