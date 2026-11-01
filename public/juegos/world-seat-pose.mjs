import {MODELS,sampleCharacterPose} from '../juegos/shared/ice-breaker/character-rig.mjs';
import {sampleDaniPose,solveLimb} from '../juegos/shared/ice-breaker/dani-rig.mjs';
const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
const DANI={center:260,hipY:550,ground:980,top:0,hips:[{x:226,y:549},{x:285,y:550}],knees:[{x:226,y:751},{x:285,y:752}],ankles:[{x:220,y:960},{x:310,y:965}],shoulders:[{x:196,y:345},{x:319,y:346}],elbows:[{x:196,y:461},{x:319,y:462}],wrists:[{x:196,y:580},{x:319,y:581}]};
// Authored three-quarter seat: thighs lead in the same facing direction, shins
// descend to the floor and hands settle on the lap. Bone lengths never scale.
export function worldSeatPose(id,amount=1,time=0){
 const m=id==='dani'?DANI:MODELS[id];if(!m)throw Error('Unknown World seated model');const t0=Math.max(0,Math.min(1,amount)),t=t0*t0*(3-2*t0),rest=id==='dani'?sampleDaniPose({phase:'idle',time:0}):sampleCharacterPose(id,{phase:'idle',time:0}),lower=length(m.knees[1],m.ankles[1]),upper=length(m.hips[1],m.knees[1]),drop=m.ankles[1].y-lower*.98-m.hipY;
 const bodyY=mix(rest.bodyY,drop,t)+Math.sin(time*1.8)*.7*t,bodyX=mix(rest.bodyX,-upper*.04,t),tilt=-.018*t-.065*Math.sin(t0*Math.PI),anchor=p=>({x:m.center+bodyX+(p.x-m.center)*Math.cos(tilt)-(p.y-m.hipY)*Math.sin(tilt),y:m.hipY+bodyY+(p.x-m.center)*Math.sin(tilt)+(p.y-m.hipY)*Math.cos(tilt)}),pose={bodyX,bodyY,tilt};
 for(let side=0;side<2;side++){const name=side?'near':'far',a=length(m.hips[side],m.knees[side]),b=length(m.knees[side],m.ankles[side]),hip=anchor(m.hips[side]),foot=point(rest[name+'Leg'].end,{x:m.hips[side].x-a*.94+bodyX+(side?9:-8),y:m.ankles[side].y},t);pose[name+'Leg']=solveLimb(hip,foot,a,b,1);
  const shoulder=anchor(m.shoulders[side]),handTarget={x:hip.x-a*.55+(side?12:-12),y:hip.y+a*.13},wrist=point(rest[name+'Arm'].end,handTarget,t),arm=solveLimb(shoulder,wrist,length(m.shoulders[side],m.elbows[side]),length(m.elbows[side],m.wrists[side]),side?-1:1);arm.angle=Math.atan2(arm.end.x-arm.joint.x,arm.end.y-arm.joint.y);pose[name+'Arm']=arm;
  if(m.holdArm===side||m.holdArms?.includes(side)){const old=rest[name+'Arm'];pose[name+'Arm']={root:shoulder,joint:{x:old.joint.x+bodyX,y:old.joint.y+bodyY},end:{x:old.end.x+bodyX,y:old.end.y+bodyY},angle:old.angle};}
 }return pose;
}
