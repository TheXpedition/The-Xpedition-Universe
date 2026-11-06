import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocol,applyProtocol,tickProtocol} from '../public/juegos/x-protocol/engine.mjs';
import {SHELTER_PARTICIPANTS} from '../public/juegos/world-shelters.mjs';

const randomSeed=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

function completeCeremony(seed,physicalSkulls){
 const rng=randomSeed(seed),config={voteMs:6000,nominationMs:6000,skullMs:6000,betMs:6000,guideMs:2000,countdownMs:1000,interviewMs:5000,giftMs:5000,duelMs:60000,disconnectMs:20000,physicalSkulls,revealMs:1000,allowManualTie:true};
 const s=createProtocol({id:'e2e-'+seed,now:0,config});
 s.media.intro={url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',duration:15070};
 s.allowedCharacters=[...SHELTER_PARTICIPANTS];
 s.roster=SHELTER_PARTICIPANTS.map((characterId,i)=>({id:'bot-'+i,characterId,name:'Contestante '+(i+1),bot:true,connected:true,assetsReady:false,lastSeen:0,seat:i,vitals:{health:100,hunger:100,energy:100,sleep:100,stress:0}}));
 applyProtocol(s,{type:'open'},{actorId:'staff',staff:true,random:rng});
 applyProtocol(s,{type:'start'},{actorId:'staff',staff:true,random:rng});
 const history=[s.phase];
 for(let i=1;i<2500;i++){
  tickProtocol(s,i*1000,{random:rng});
  if(s.phase==='RESULTS_SELECTION'){
   const source={id:'test-result',name:'Reto de prueba',episode:1,ranking:s.roster.map((p,j)=>({id:p.id,characterId:p.characterId,name:p.name,place:j+1}))};
   applyProtocol(s,{type:'results',source},{actorId:'staff',staff:true,random:rng});
  }
  if(s.phase==='THIRD_NOMINEE_CONFIRMATION'){
   assert(s.vote.tied.length,'The director must see an available nomination choice');
   applyProtocol(s,{type:'confirmThird',target:s.vote.tied[0],resolveTie:true},{actorId:'staff',staff:true,random:rng});
  }
  if(history.at(-1)!==s.phase)history.push(s.phase);
  assert.equal(s.paused,false,'The ceremony must not pause unexpectedly in '+s.phase+'; trace: '+history.join(' > '));
  if(s.phase==='ELIMINATION_FINISHED')return {state:s,history};
 }
 throw Error('A 2500-second ceremony timed out at '+s.phase+'; trace: '+history.join(' > '));
}
test('The X Protocol runs from STAFF start through video, rankings, voting, skulls, duel and final return',()=>{
 for(const [seed,physicalSkulls] of [[31,false],[104,true],[2026,true]]){
  const {state,history}=completeCeremony(seed,physicalSkulls);
  for(const phase of ['ELIMINATION_LOADING','INTRO_VIDEO','CEREMONY_STAGE_VISIBLE','MONITOR_BOOT','MARIA_INTRO','RESULTS_REVEAL','FIRST_NOMINEE','WINNER_NOMINATION','GROUP_VOTE','THREE_NOMINEES_READY','LUCKY_SKULLS_PICKING','LUCKY_SKULLS_REVEAL','SAFE_PLAYER_REVEAL','DUEL_TYPE_REVEAL','BETTING_PHASE','DUEL_ACTIVE','DUEL_RESULT','RETURN_TO_WORLD','ELIMINATION_FINISHED'])assert(history.includes(phase),'missing phase '+phase+' for '+seed+'; trace '+history.join(' > '));
  assert.equal(state.roster.length,18);
  assert.equal(state.phase,'ELIMINATION_FINISHED');
  assert.equal(state.nominees.length>=2,true);
 }
});
