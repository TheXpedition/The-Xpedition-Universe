export function stopActorMotion(actor,time){
 actor.input={x:0,y:0};actor.p.path=[];actor.p.moving=false;
 actor.pendingObject=null;actor.pendingSeatSlot=undefined;actor.lastInput=time;
}
export function standActor(actor,time){
 const seat=actor.seat,resting=!!(seat||actor.atSeat||actor.sleeping||['sit','sleep'].includes(actor.state));
 const from={x:actor.p.x,y:actor.p.y},waking=actor.sleeping||actor.state==='sleep';
 stopActorMotion(actor,time);
 actor.sleeping=false;actor.atSeat=false;actor.seat=null;
 if(!resting)return false;
 if(seat?.stand)Object.assign(actor.p,seat.stand);
 Object.assign(actor.p,{z:0,vz:0,grounded:true,falling:0});
 // A bed uses a separate painted pose. Chair-transition mesh frames cannot
 // interpolate it back into an upright body without folding the feet.
 actor.state='idle';actor.action=seat&&!waking?'stand':null;actor.actionAt=time;actor.actionFrom=seat&&!waking?from:null;
 actor.reaction=null;return true;
}
