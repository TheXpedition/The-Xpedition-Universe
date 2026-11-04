// Visual state follows physics, never the length of a video or an animation clip.
export const MOTION_STATES=Object.freeze({IDLE:'idle',WALK:'walk',JUMP:'jump',LAND:'land'});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class CharacterMotion {
 constructor(){this.reset();}
 reset(){this.state='idle';this.grounded=true;this.changedAt=0;this.landedAt=-Infinity;this.lastAt=null;this.lean=0;this.facing=1;}
 sample(p,time){
  if(this.lastAt!==null&&(time<this.lastAt||time-this.lastAt>1))this.reset();
  const dt=this.lastAt===null?0:clamp(time-this.lastAt,0,.1);this.lastAt=time;
  const grounded=p.grounded!==false,airborne=!grounded;
  if(grounded&&!this.grounded)this.landedAt=time;
  this.grounded=grounded;
  const next=airborne?'jump':time-this.landedAt<.10?'land':p.moving?'walk':'idle';
  if(next!==this.state){this.state=next;this.changedAt=time;}
  this.facing=p.facing===-1?-1:1;
  const target=next==='walk'?this.facing*.012:0;this.lean+= (target-this.lean)*(1-Math.exp(-dt*32));
  let frame=8,stage=null;
  if(next==='walk')frame=((Math.floor((Number(p.walk)||0)/(Math.PI*2)*8)%8)+8)%8;
  else if(next==='jump'){stage=Number.isFinite(p.jumpAt)&&time-p.jumpAt/1000>=0&&time-p.jumpAt/1000<.065?'takeoff':'air';frame=stage==='takeoff'?10:11;}
  else if(next==='land'){stage='landing';frame=12;}
  const breath=next==='idle'?Math.sin((time-this.changedAt)*1.7)*.0017:0;
  return {state:next,stage,frame,facing:this.facing,lean:this.lean,breath,feetLocked:next==='idle'||next==='land'};
 }
}
// The same input/physics path drives manual controls and the optional demonstration.
export class MotionDemo {
 constructor(){this.active=false;this.elapsed=0;this.cycle=-1;this.jumped=false;}
 setActive(value){this.active=!!value;this.elapsed=0;this.cycle=-1;this.jumped=false;}
 step(seconds){
  if(!this.active)return null;this.elapsed+=clamp(seconds,0,.05);
  const cycle=Math.floor(this.elapsed/6.8),t=this.elapsed%6.8;
  if(cycle!==this.cycle){this.cycle=cycle;this.jumped=false;}
  const x=t<1.6?1:t>=2.5&&t<4.1?-1:0;
  const jump=t>=5&&t<5.7&&!this.jumped;if(jump)this.jumped=true;
  return {x,y:0,run:false,jump};
 }
}
