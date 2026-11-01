import {boneTransforms} from './bonju-v2.mjs';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ease=v=>v*v*(3-2*v);
function blinkAt(time,period=4.8){const t=(time%period);return t<.055?ease(t/.055):t<.11?1:t<.19?1-ease((t-.11)/.08):0;}
// Two rigid bones, measured in original art coordinates. IK changes rotations
// only: the length of a thigh/calf and the shoe attachment never change.
export function solveBonjuLeg(rig,side,target,angles){const thigh='thigh'+side,calf='calf'+side,foot='foot'+side,hip=rig.bones[thigh].pivot,knee=rig.bones[calf].pivot,ankle=rig.bones[foot].pivot,parent=boneTransforms(rig.bones,angles)[rig.bones[thigh].parent],start=parent.map(hip),a=Math.hypot(knee[0]-hip[0],knee[1]-hip[1]),b=Math.hypot(ankle[0]-knee[0],ankle[1]-knee[1]),dx=target[0]-start[0],dy=target[1]-start[1],d=clamp(Math.hypot(dx,dy),Math.abs(a-b)+.01,a+b-.01),direction=Math.atan2(dy,dx),bend=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1)),theta=direction+bend,actualKnee=[start[0]+Math.cos(theta)*a,start[1]+Math.sin(theta)*a],theta2=Math.atan2(target[1]-actualKnee[1],target[0]-actualKnee[0]),rest1=Math.atan2(knee[1]-hip[1],knee[0]-hip[0]),rest2=Math.atan2(ankle[1]-knee[1],ankle[0]-knee[0]);angles[thigh]=theta-rest1-parent.angle;angles[calf]=theta2-rest2-parent.angle-angles[thigh];angles[foot]=-parent.angle-angles[thigh]-angles[calf];return {start,knee:actualKnee,lengths:[a,b]};}
export function sampleBonjuPose(rig,animation,time){const t=time/1000,breath=Math.sin(t*TAU/4.5),angles={torso:breath*.0028,head:-breath*.0018,upperL:Math.sin(t*1.4)*.009,foreL:Math.sin(t*1.4+.4)*.012,upperR:-Math.sin(t*1.4)*.009,foreR:-Math.sin(t*1.4+.4)*.012},pose={angles,bob:0,blink:0,mouth:0};
 if(animation==='neutral')return {angles:{},bob:0,blink:0,mouth:0};
 if(animation==='idle')return pose;
 if(animation==='blink'){pose.blink=blinkAt(t,1.7);return pose;}
 if(animation==='talk'){pose.blink=blinkAt(t+1.5);pose.mouth=[1,2,1,0,2,1,2,0][Math.floor(t*8)%8];angles.foreR=-.08+Math.sin(t*3.5)*.045;angles.head+=Math.sin(t*2.4)*.008;return pose;}
 if(animation==='react'){const wave=(Math.sin(t*TAU/3.8)+1)/2,blend=ease(wave);angles.upperR=-1.18*blend;angles.foreR=-1.03*blend;angles.handR=Math.sin(t*9)*.12*blend;angles.head=-.028*blend;pose.blink=blinkAt(t+1.5);return pose;}
 if(animation==='walk'){const phase=t*TAU/1.32,stride=Math.sin(phase);pose.bob=7+Math.abs(stride)*2;pose.legOrder=stride>=0?['R','L']:['L','R'];angles.torso=Math.sin(phase)*.006;angles.head=-angles.torso*.65;angles.upperL=stride*.13;angles.upperR=-stride*.13;angles.foreL=.035+Math.max(0,-stride)*.06;angles.foreR=-.035-Math.max(0,stride)*.06;
  for(const [side,offset]of [['L',0],['R',Math.PI]]){const p=phase+offset,ankle=rig.bones['foot'+side].pivot,lift=Math.max(0,Math.cos(p));solveBonjuLeg(rig,side,[ankle[0]+Math.sin(p)*65,ankle[1]-pose.bob-lift*26],angles);angles['foot'+side]+=-lift*.06;}
  angles.dress=Math.sin(phase-.32)*.012;pose.blink=blinkAt(t+1.5);return pose;
 }
 return pose;
}
