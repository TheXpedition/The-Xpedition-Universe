import {RIG} from './dani-rig.mjs';
import {levelConfig,worldEnd,DIFFICULTIES} from './levels.mjs';
export const WORLD_END=worldEnd(1),MAX_JUMP=285,WALK_SPEED=84;
export function makeFloes(level=1){
 const ys=[445,445,500,380,445,505,405,445,500,385,445,500,410,445,445];
 const config=levelConfig(level),last=config.count-1;
 const main=Array.from({length:config.count},(_,i)=>{const safe=i%6===0||i===last;return {id:'f'+i,x:160+i*205,y:i===0?445:ys[(i+(config.id-1)*3)%ys.length],rx:safe?121:88,ry:safe?47:35,kind:i===0?'start':i===last?'finish':i%6===0?'checkpoint':i%3===0?'fragile':'ice',coin:i>0&&i<last,spent:0,broken:false,main:true};});
 const branches=[];
 for(let i=2;i<last-1;i+=3){for(const side of (i%6===2?[-1,1]:[i%2?-1:1])){const n=branches.length;branches.push({id:'b'+i+(side<0?'u':'l'),x:160+i*205+102,y:side<0?285:565,rx:81,ry:34,kind:'ice',coin:true,rare:true,hazard:n%3===0?'seal':undefined,spent:0,broken:false,offset:n*1.7});}}
 return [...main,...branches];
}
export const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.12);
export const hazardActive=(f,time)=>!!f.hazard&&((time+(f.offset||0))%5.6)<2.5;
export const hazardWarning=(f,time)=>!!f.hazard&&((time+(f.offset||0))%5.6)>4.7;
export function newRun({level=1,difficulty='normal'}={}){const config=levelConfig(level),rules=DIFFICULTIES[difficulty]||DIFFICULTIES.normal,floes=makeFloes(config.id);return {level:config.id,difficulty:DIFFICULTIES[difficulty]?difficulty:'normal',end:worldEnd(config.id),fragileTime:rules.fragile,maxLives:rules.lives,floes,player:{x:160,y:445,z:0,facing:1,phase:'idle',phaseTime:0,floe:'f0',walk:0,walkBlend:0,jumpProgress:0,takeoffBlend:0,takeoffStride:0,land:0},status:'playing',time:0,lives:rules.lives,score:0,collected:0,total:floes.filter(f=>f.coin).length,checkpoint:'f0',furthest:160,combo:0,events:[],jump:null,walkTarget:null,deathTimer:0};}
export function reachable(run,floe){return run.status==='playing'&&!floe.broken&&floe.id!==run.player.floe&&distance(run.player,floe)<=MAX_JUMP;}
export function walkTo(run,point){const p=run.player,f=run.floes.find(f=>f.id===p.floe);if(run.jump||run.status!=='playing'||!f)return false;const nx=(point.x-f.x)/(f.rx*.72),ny=(point.y-f.y)/(f.ry*.65);if(nx*nx+ny*ny>1)return false;run.walkTarget=point;return true;}
export function jumpTo(run,id){const f=run.floes.find(f=>f.id===id),p=run.player;if(!f||run.jump||run.deathTimer||!reachable(run,f))return false;
 run.walkTarget=null;p.facing=f.x>=p.x?1:-1;p.phase='crouch';p.phaseTime=0;p.takeoffBlend=p.walkBlend;p.takeoffStride=p.walk;p.jumpProgress=0;run.jump={from:{x:p.x,y:p.y},to:f.id,t:0,duration:.58+distance(p,f)/1100};run.events.push({type:'jump'});return true;}
export function nearestFloe(run,dx=1,dy=0){return run.floes.filter(f=>reachable(run,f)&&((f.x-run.player.x)*dx+(f.y-run.player.y)*dy)>20).sort((a,b)=>directionCost(a)-directionCost(b))[0];function directionCost(f){const vx=f.x-run.player.x,vy=f.y-run.player.y,d=Math.hypot(vx,vy);return d+(1-(vx*dx+vy*dy)/(d*Math.hypot(dx,dy)))*350;}}
function loseLife(run,reason){if(run.deathTimer||run.status!=='playing')return;run.lives--;run.combo=0;run.jump=null;run.walkTarget=null;run.deathTimer=1.15;run.player.phase='hurt';run.player.phaseTime=0;run.events.push({type:'splash',reason});}
function arrive(run,f){const p=run.player;p.floe=f.id;p.x=f.x;p.y=f.y;p.z=0;p.phase='land';p.phaseTime=0;p.land=.18;
 if(f.broken||hazardActive(f,run.time)){loseLife(run,f.broken?'El hielo se rompió.':'Una criatura te alcanzó.');return;}
 run.furthest=Math.max(run.furthest,p.x);run.events.push({type:'land'});
 if(f.coin){f.coin=false;run.collected++;run.combo++;const points=(f.rare?175:100)+Math.min(4,run.combo-1)*25;run.score+=points;run.events.push({type:'coin',x:f.x,y:f.y,points});}
 if(f.kind==='checkpoint'&&run.checkpoint!==f.id){run.checkpoint=f.id;run.events.push({type:'checkpoint'});}
 if(f.kind==='finish'){run.status='won';run.score+=run.lives*200+Math.max(0,Math.round(180-run.time))*5;run.events.push({type:'win'});}
}
function phase(p,next){if(p.phase!==next){p.phase=next;p.phaseTime=0;}}
function blendWalk(p,target,dt){p.walkBlend+=(target-p.walkBlend)*(1-Math.exp(-dt*15));if(Math.abs(target-p.walkBlend)<.001)p.walkBlend=target;}
export function stepRun(run,input={},dt=1/120){
 if(run.status!=='playing')return;dt=Math.min(1/30,Math.max(0,dt));run.time+=dt;const p=run.player;p.phaseTime+=dt;
 if(run.deathTimer){run.deathTimer=Math.max(0,run.deathTimer-dt);p.z=-Math.min(65,p.phaseTime*90);if(!run.deathTimer){if(!run.lives){run.status='lost';run.events.push({type:'lose'});return;}for(const f of run.floes){f.broken=false;f.spent=0;}const f=run.floes.find(f=>f.id===run.checkpoint);Object.assign(p,{x:f.x,y:f.y,z:0,floe:f.id,phase:'idle',phaseTime:0,walkBlend:0,walk:0,jumpProgress:0,takeoffBlend:0,takeoffStride:0,land:0});run.events.push({type:'respawn'});}return;}
 if(run.jump){const j=run.jump;j.t+=dt;blendWalk(p,0,dt);
  if(j.t<.1){phase(p,'crouch');return;}const t=Math.min(1,(j.t-.1)/j.duration),f=run.floes.find(f=>f.id===j.to);p.jumpProgress=t;phase(p,t<.5?'jump':'fall');p.x=j.from.x+(f.x-j.from.x)*t;p.y=j.from.y+(f.y-j.from.y)*t;p.z=4*(94+distance(j.from,f)*.14)*t*(1-t);if(t===1){run.jump=null;arrive(run,f);}return;
 }
 const f=run.floes.find(f=>f.id===p.floe);
 if(f.kind==='fragile'){f.spent+=dt;if(f.spent>=run.fragileTime){f.broken=true;loseLife(run,'El témpano se rompió. ¡No te quedes quieta!');return;}}
 if(hazardActive(f,run.time)){loseLife(run,'La criatura volvió a salir.');return;}
 if(p.land>0){p.land=Math.max(0,p.land-dt);blendWalk(p,0,dt);phase(p,'land');return;}
 let mx=Number(input.x)||0,my=Number(input.y)||0;
 if(run.walkTarget){const dx=run.walkTarget.x-p.x,dy=run.walkTarget.y-p.y,d=Math.hypot(dx,dy);if(d<3)run.walkTarget=null;else{mx=dx/d;my=dy/d;}}
 let moved=0;
 if(mx||my){const len=Math.max(1,Math.hypot(mx,my)),nx=p.x+mx/len*WALK_SPEED*dt,ny=p.y+my/len*54*dt;if(((nx-f.x)/(f.rx*.72))**2+((ny-f.y)/(f.ry*.65))**2<1){moved=Math.hypot(nx-p.x,ny-p.y);p.walk+=moved*Math.PI*2/RIG.cycleDistance;p.x=nx;p.y=ny;}if(mx)p.facing=mx>0?1:-1;}
 blendWalk(p,moved?1:0,dt);phase(p,moved?'walk':'idle');
 if(input.jump){const next=nearestFloe(run,mx||(!my?1:0),my);if(next)jumpTo(run,next.id);}
}
