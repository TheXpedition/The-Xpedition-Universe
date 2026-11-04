import {stepWorld,jumpWorld} from './world-motion.mjs';
const copy=p=>({...p,path:[],vz:Number(p.vz)||0,falling:Number(p.falling)||0});
// Presentation prediction only. The server remains authoritative for collisions,
// interactions and persistence. No new coordinates are sent by the client.
export class WorldLocalMotion {
 constructor(){this.reset();}
 reset(){this.pose=null;this.source=null;this.sourceAt=null;this.stamp=null;this.intent=null;this.offset={x:0,y:0};this.pendingJump=-Infinity;}
 setInput(input){this.intent={x:Math.sign(input.x||0),y:Math.sign(input.y||0),run:input.run===true};}
 jump(worldTime){if(!this.pose||this.intent===null)return false;const ok=jumpWorld(this.pose,worldTime,{quick:true});if(ok)this.pendingJump=worldTime;return ok;}
 sample(p,stamp,worldTime,zone){
  if(p.characterId!=='maria-villegas'||this.intent===null||p.seatId||p.clinicPose||p.swimming||['sit','sleep','dead','fainted'].includes(p.state)||p.life?.status==='dead'||p.life?.status==='fainted'){this.pose=null;this.source=null;this.stamp=stamp;return p;}
  const dt=this.stamp===null?0:Math.min(.05,Math.max(0,(stamp-this.stamp)/1000));this.stamp=stamp;
  if(this.source!==p||this.sourceAt!==p.previous?.at){
   const previous=this.pose,shown=previous?{x:previous.x+this.offset.x,y:previous.y+this.offset.y}:p;
   const next=copy(p);
   // A jump requested this frame must not be erased by a packet sent before it.
   if(previous&&(this.pendingJump>Number(p.jumpAt||0)&&worldTime-this.pendingJump<250||this.pendingJump===p.jumpAt&&worldTime-this.pendingJump<650))for(const key of ['z','vz','grounded','jumpAt','jumpGravity'])next[key]=previous[key];
   if(previous&&Math.hypot(previous.x-p.x,previous.y-p.y)<80)next.walk=previous.walk;
   this.pose=next;this.source=p;this.sourceAt=p.previous?.at;this.offset={x:shown.x-next.x,y:shown.y-next.y};
   if(Math.hypot(this.offset.x,this.offset.y)>80)this.offset={x:0,y:0};
  }
  stepWorld(this.pose,{...this.intent,run:this.intent.run&&p.canRun!==false,speedFactor:p.speedFactor||1,now:worldTime},dt,zone);
  // Bound reconciliation speed so a delayed packet cannot pull a walking actor
  // backwards between two rendered frames. Idle legs never keep cycling.
  if(this.pose.moving||!this.pose.grounded||!p.moving){const decay=1-Math.exp(-dt*18),limit=(this.pose.moving?205*(p.speedFactor||1)*.35:25)*dt;for(const key of ['x','y'])this.offset[key]-=Math.max(-limit,Math.min(limit,this.offset[key]*decay));}
  return {...p,...this.pose,x:this.pose.x+this.offset.x,y:this.pose.y+this.offset.y};
 }
}
