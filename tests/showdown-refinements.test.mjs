import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShowdown,joinShowdown,selectShowdownCharacter,beginShowdown,tickShowdown,showdownAction,showdownPublicView} from '../showdown-engine.mjs';
const characters=Array.from({length:32},(_,i)=>({id:'c'+i,name:'Personaje '+i,image:'/personajes/dani.png'}));
function game(){const s=createShowdown({id:'qa',host:'u1',mode:'multi',seed:91,now:10000});for(let i=1;i<=2;i++){joinShowdown(s,{id:'u'+i,name:'Real '+i},10000);selectShowdownCharacter(s,'u'+i,'c'+i,characters);}beginShowdown(s,characters,10000,{fillBots:true});return s;}
test('cuando todos los humanos quedan fuera se detiene la temporada y no se inventa un ganador bot',()=>{const s=game();s.phase='lipResult';s.semiEpisode=1;for(const p of s.players.filter(p=>!p.bot))p.active=false;tickShowdown(s,s.deadline);assert.equal(s.status,'finished');assert.equal(s.endedReason,'no-humans');assert.equal(s.winner,null);const snapshot=JSON.stringify(s);tickShowdown(s,s.deadline+10000000);assert.equal(JSON.stringify(s),snapshot);const view=showdownPublicView(s,'u1',s.finished,characters);assert.equal(view.endedReason,'no-humans');assert(view.track);});
