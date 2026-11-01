export const SKULL_WALK_SPEED=.14;
export class ActorMotion{
 constructor(){this.positions=new Map();}
 clear(){this.positions.clear();}
 point(id,target,time){let p=this.positions.get(id);if(!p){p={x:target.x,y:target.y,at:time};this.positions.set(id,p);return p;}const dt=Math.max(0,Math.min(120,time-p.at)),blend=1-Math.exp(-dt/75);p.x+=(target.x-p.x)*blend;p.y+=(target.y-p.y)*blend;p.at=time;return p;}
}
