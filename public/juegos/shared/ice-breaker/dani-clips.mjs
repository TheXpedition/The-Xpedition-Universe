import {newRun,jumpTo,stepRun,WALK_SPEED} from './engine.mjs';
import {RIG} from './dani-rig.mjs';
export const WALK_DURATION=RIG.cycleDistance/WALK_SPEED;
const jump=newRun();jumpTo(jump,'f1');
export const jumpFrames=[];
for(let i=0;i<160;i++){jumpFrames.push({...jump.player});stepRun(jump,{},1/120);}
export function clipPose(mode,time){
 if(mode==='walk')return {phase:'walk',time,stride:time/WALK_DURATION*Math.PI*2,walkBlend:1,z:0,x:160};
 if(mode==='jump'){const frame=jumpFrames[Math.min(jumpFrames.length-1,Math.floor(time*120))];return {...frame,stride:frame.walk,time};}
 return {phase:'idle',time,stride:0,walkBlend:0,z:0,x:160};
}
export function clipDuration(mode){return mode==='walk'?WALK_DURATION:mode==='jump'?jumpFrames.length/120:3;}
