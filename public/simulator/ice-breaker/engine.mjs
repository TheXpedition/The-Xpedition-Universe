import {RIG} from './dani-rig.mjs';
import {levelConfig,worldEnd,DIFFICULTIES,CAMPAIGN_VERSION} from './levels.mjs';
export const MAX_JUMP=285,WALK_SPEED=84;
export const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.12);
const lanes={a:310,b:450,c:590},at=(coords,col,lane)=>coords.some(([c,l])=>c===col&&l===lane);
export function makeFloes(level=1){
 const config=levelConfig(level),floes=[];let previous='b';
 for(const [col,mask] of config.masks.entries()){
  const spine=[...mask].sort((a,b)=>Math.abs(lanes[a]-lanes[previous])-Math.abs(lanes[b]-lanes[previous]))[0];previous=spine;
  for(const lane of mask){const finish=config.finish||[config.columns-1,'b'],safe=col===0||col===finish[0]&&lane===finish[1],collapse=at(config.collapse,col,lane),tidal=at(config.tides,col,lane),moving=at(config.moving,col,lane);
   floes.push({id:lane===spine?'f'+col:'b'+col+lane,col,lane,x:160+col*205,y:lanes[lane],anchorX:160+col*205,anchorY:lanes[lane],rx:safe?105:78,ry:safe?43:33,kind:col===0?'start':safe?'finish':collapse?'fragile':tidal?'tide':moving?'moving':'ice',moving,tidal,beacon:at(config.beacons,col,lane),charge:0,activated:false,coin:!safe,rare:lane!==spine,spent:0,triggered:false,broken:false,visible:1,offset:col*.71+lane.charCodeAt(0)*.17,main:lane===spine});
  }
 }
 for(let col=4;col<config.columns-2;col+=5){const f=floes.find(f=>f.col===col&&f.kind==='ice'&&!f.beacon);if(f){f.kind='checkpoint';f.rx=108;f.ry=43;f.coin=false;}}
 return floes;
}
export const floeAvailable=f=>!!f&&!f.broken&&f.visible>.72;
export function newRun({level=1,difficulty='normal'}={}){
 const config=levelConfig(level),rules=DIFFICULTIES[difficulty]||DIFFICULTIES.normal,floes=makeFloes(config.id),start=floes[0];
 return {version:CAMPAIGN_VERSION,level:config.id,difficulty:DIFFICULTIES[difficulty]?difficulty:'normal',rules:{...rules},end:worldEnd(config.id),fragileTime:rules.fragile,maxLives:rules.lives,floes,player:{x:start.x,y:start.y,z:0,facing:1,phase:'idle',phaseTime:0,floe:start.id,walk:0,walkBlend:0,jumpProgress:0,takeoffBlend:0,takeoffStride:0,land:0,idle:0,slip:0,dodge:0,dodgeCooldown:0,invulnerable:1.5,stun:0},status:'playing',time:0,lives:rules.lives,score:0,collected:0,total:floes.filter(f=>f.coin).length,checkpoint:start.id,furthest:160,combo:0,events:[],jump:null,walkTarget:null,deathTimer:0,beacons:0,beaconTotal:config.beacons.length,wind:0,wave:{cycle:-1,origin:0,phase:'calm',x:0},enemies:config.seals.map(([col,lane],i)=>({id:'seal'+i,homeX:160+col*205,homeY:lanes[lane],x:160+col*205,y:lanes[lane],phase:'patrol',timer:0,cooldown:1+i*.3,dx:0,dy:0,targetX:0,targetY:0,facing:-1}))};
}
export function reachable(run,floe){return run.status==='playing'&&!run.deathTimer&&floeAvailable(floe)&&floe.id!==run.player.floe&&distance(run.player,floe)<=MAX_JUMP;}
export function walkTo(run,point){const p=run.player,f=run.floes.find(f=>f.id===p.floe);if(run.jump||run.deathTimer||run.status!=='playing'||!f)return false;if(((point.x-f.x)/(f.rx*.85))**2+((point.y-f.y)/(f.ry*.82))**2>1)return false;run.walkTarget=point;return true;}
export function jumpTo(run,id){
 const f=run.floes.find(f=>f.id===id),p=run.player;if(!f||run.jump||run.deathTimer||p.stun>0||!reachable(run,f))return false;
 run.walkTarget=null;p.facing=f.x>=p.x?1:-1;p.phase='crouch';p.phaseTime=0;p.takeoffBlend=p.walkBlend;p.takeoffStride=p.walk;p.jumpProgress=0;p.idle=0;p.slip=0;
 run.jump={from:{x:p.x,y:p.y},aim:{x:f.x,y:f.y},to:f.id,t:0,duration:.58+distance(p,f)/1100,airX:0,airY:0};run.events.push({type:'jump'});return true;
}
function phase(p,next){if(p.phase!==next){p.phase=next;p.phaseTime=0;}}
function blendWalk(p,target,dt){p.walkBlend+=(target-p.walkBlend)*(1-Math.exp(-dt*15));if(Math.abs(target-p.walkBlend)<.001)p.walkBlend=target;}
function loseLife(run,reason){if(run.deathTimer||run.status!=='playing')return;run.lives=Math.max(0,run.lives-1);run.combo=0;run.jump=null;run.walkTarget=null;run.deathTimer=1.15;phase(run.player,'hurt');run.events.push({type:'splash',reason});}
function hitPlayer(run,e,reason){const p=run.player;if(p.invulnerable>0||p.dodge>0||run.deathTimer)return;run.lives=Math.max(0,run.lives-1);run.combo=0;p.invulnerable=1.65;p.stun=.28;run.walkTarget=null;run.events.push({type:'hit',reason});if(!run.lives){run.jump=null;run.deathTimer=1.15;phase(p,'hurt');}else if(!run.jump){p.x+=Math.sign(p.x-e.x||1)*14;p.idle=0;p.slip=0;}}
function updateIce(run,dt){
 const p=run.player;
 for(const f of run.floes){const oldX=f.x,oldY=f.y;
  if(f.moving){f.x=f.anchorX+Math.sin(run.time*1.9+f.offset)*61;f.y=f.anchorY+Math.sin(run.time*1.4+f.offset)*23;}
  if(f.tidal){const cycle=(run.time+f.offset)%9.8;f.tideWarning=cycle>4.8&&cycle<6;f.visible=cycle<6?1:cycle<6.5?1-(cycle-6)*2:cycle<8.9?0:Math.min(1,(cycle-8.9)/.7);}
  if(f.broken){f.brokenAge=(f.brokenAge||0)+dt;if(f.brokenAge>7){f.broken=false;f.triggered=false;f.spent=0;f.brokenAge=0;}}
  else if(f.triggered){f.spent+=dt;if(f.spent>=run.fragileTime){f.broken=true;run.events.push({type:'crack',x:f.x,y:f.y});}}
  if(!run.jump&&!run.deathTimer&&p.floe===f.id){p.x+=f.x-oldX;p.y+=f.y-oldY;}
 }
}
function updateWeather(run){
 const config=levelConfig(run.level),p=run.player;run.wind=config.wind?Math.sin(run.time*.48)*32:0;
 if(!config.waves)return;const w=run.wave,cycle=Math.floor(run.time/run.rules.wavePeriod),elapsed=run.time%run.rules.wavePeriod;
 if(cycle!==w.cycle){w.cycle=cycle;w.origin=p.x;}
 w.phase=elapsed<2?'warning':elapsed<6.4?'sweep':'calm';w.x=w.origin-650+(elapsed-2)*350;
 if(w.phase==='sweep'&&Math.abs(p.x-w.x)<29&&p.z<45){const f=run.floes.find(f=>f.id===p.floe);if(!['start','checkpoint','finish'].includes(f?.kind))hitPlayer(run,{x:w.x-10},'La ola te alcanzó. Busca un refugio o esquiva.');}
}
function updateEnemies(run,dt){
 const p=run.player;
 for(const e of run.enemies){e.timer+=dt;e.cooldown=Math.max(0,e.cooldown-dt);
  if(e.phase==='patrol'){
   e.x=e.homeX+Math.sin(run.time*.9+e.homeY)*16;e.y=e.homeY+Math.cos(run.time*.7)*5;
   if(!e.cooldown&&!run.deathTimer&&distance(e,p)<415){e.phase='windup';e.timer=0;e.targetX=p.x;e.targetY=p.y;}
  }else if(e.phase==='windup'){
   if(e.timer<run.rules.windup-.18){e.targetX=p.x;e.targetY=p.y;}
   e.facing=e.targetX>=e.x?1:-1;
   if(e.timer>=run.rules.windup){const len=Math.max(1,Math.hypot(e.targetX-e.x,e.targetY-e.y));e.dx=(e.targetX-e.x)/len;e.dy=(e.targetY-e.y)/len;e.phase='charge';e.timer=0;}
  }else if(e.phase==='charge'){
   e.x+=e.dx*run.rules.sealSpeed*dt;e.y+=e.dy*run.rules.sealSpeed*dt;
   if(distance(e,p)<39&&p.z<43)hitPlayer(run,e,'¡La foca cargó! Cambia de sitio cuando fije la mirada.');
   if(e.timer>1.25){e.phase='recover';e.timer=0;}
  }else{
   e.x+=(e.homeX-e.x)*(1-Math.exp(-dt*2));e.y+=(e.homeY-e.y)*(1-Math.exp(-dt*2));
   if(e.timer>2){e.phase='patrol';e.timer=0;e.cooldown=.8;}
  }
 }
}
function arrive(run,f){
 const p=run.player;p.floe=f.id;p.z=0;p.phase='land';p.phaseTime=0;p.land=.18;p.idle=0;p.slip=0;
 if(!floeAvailable(f)||((p.x-f.x)/f.rx)**2+((p.y-f.y)/f.ry)**2>1){loseLife(run,'El hielo se movió o desapareció. Corrige el salto con WASD.');return;}
 if(f.kind==='fragile')f.triggered=true;run.furthest=Math.max(run.furthest,p.x);run.events.push({type:'land'});
 if(f.coin){f.coin=false;run.collected++;run.combo++;const points=(f.rare?175:100)+Math.min(4,run.combo-1)*25;run.score+=points;run.events.push({type:'coin',x:f.x,y:f.y,points});}
 if(f.kind==='checkpoint'&&run.checkpoint!==f.id){run.checkpoint=f.id;run.events.push({type:'checkpoint'});}
 if(f.kind==='finish'&&run.beacons<run.beaconTotal)run.events.push({type:'locked',missing:run.beaconTotal-run.beacons});
}
export function stepRun(run,input={},dt=1/120){
 if(run.status!=='playing')return;dt=Math.min(1/30,Math.max(0,dt));run.time+=dt;const p=run.player;p.phaseTime+=dt;
 p.invulnerable=Math.max(0,p.invulnerable-dt);p.dodge=Math.max(0,p.dodge-dt);p.dodgeCooldown=Math.max(0,p.dodgeCooldown-dt);p.stun=Math.max(0,p.stun-dt);
 updateIce(run,dt);updateWeather(run);updateEnemies(run,dt);
 if(run.deathTimer){run.deathTimer=Math.max(0,run.deathTimer-dt);p.z=-Math.min(65,p.phaseTime*90);
  if(!run.deathTimer){if(!run.lives){run.status='lost';run.events.push({type:'lose'});return;}
   for(const f of run.floes){f.broken=false;f.spent=0;f.triggered=false;f.brokenAge=0;}
   const f=run.floes.find(f=>f.id===run.checkpoint);Object.assign(p,{x:f.x,y:f.y,z:0,floe:f.id,phase:'idle',phaseTime:0,walkBlend:0,walk:0,jumpProgress:0,takeoffBlend:0,takeoffStride:0,land:0,idle:0,slip:0,invulnerable:2,stun:0});
   for(const e of run.enemies){e.phase='patrol';e.cooldown=2;e.timer=0;}run.events.push({type:'respawn'});
  }return;
 }
 if(input.dodge&&!p.dodgeCooldown&&!run.jump){p.dodge=.36;p.dodgeCooldown=2.4;p.slip=0;p.idle=0;run.events.push({type:'dodge'});}
 if(run.jump){const j=run.jump;j.t+=dt;blendWalk(p,0,dt);if(j.t<.1){phase(p,'crouch');return;}
  const t=Math.min(1,(j.t-.1)/j.duration),mx=Number(input.x)||0,my=Number(input.y)||0;
  j.airX=Math.max(-55,Math.min(55,j.airX+(mx*68+run.wind)*dt));j.airY=Math.max(-31,Math.min(31,j.airY+my*42*dt));
  p.jumpProgress=t;phase(p,t<.5?'jump':'fall');p.x=j.from.x+(j.aim.x-j.from.x)*t+j.airX;p.y=j.from.y+(j.aim.y-j.from.y)*t+j.airY;p.z=4*(94+distance(j.from,j.aim)*.14)*t*(1-t);
  if(t===1){run.jump=null;arrive(run,run.floes.find(f=>f.id===j.to));}return;
 }
 const f=run.floes.find(f=>f.id===p.floe);if(!floeAvailable(f)){loseLife(run,f?.broken?'El témpano colapsó. Las grietas no se detienen cuando te vas.':'La marea hundió el hielo. ¡Atenta a la espuma!');return;}
 if(f.kind==='fragile')f.triggered=true;
 if(f.beacon&&!f.activated){f.charge+=dt;if(f.charge>=1.05){f.activated=true;run.beacons++;run.score+=350;run.events.push({type:'beacon',count:run.beacons,total:run.beaconTotal});}}
 if(f.kind==='finish'&&run.beacons===run.beaconTotal){run.status='won';run.score+=run.lives*200+Math.max(0,Math.round(300-run.time))*5;run.events.push({type:'win'});return;}
 if(p.land>0){p.land=Math.max(0,p.land-dt);blendWalk(p,0,dt);phase(p,'land');return;}
 let mx=Number(input.x)||0,my=Number(input.y)||0;
 if(run.walkTarget){const dx=run.walkTarget.x-p.x,dy=run.walkTarget.y-p.y,d=Math.hypot(dx,dy);if(d<3)run.walkTarget=null;else{mx=dx/d;my=dy/d;}}
 const safe=['start','checkpoint','finish'].includes(f.kind);
 if(mx||my){p.idle=Math.max(0,p.idle-dt*3);p.slip=Math.max(0,p.slip-dt*2);}else if(!safe){p.idle+=dt;if(p.idle>run.rules.slip)p.slip=Math.min(1,p.slip+dt*.7);}
 const before={x:p.x,y:p.y},len=Math.max(1,Math.hypot(mx,my)),speed=p.dodge>0?1.8:1;
 if(!p.stun){p.x+=mx/len*WALK_SPEED*speed*dt;p.y+=my/len*54*speed*dt;}
 if(p.slip>0){p.x+=(24+p.slip*90)*p.slip*dt;p.y+=Math.sin(f.offset)*16*p.slip*dt;}
 const moved=distance(before,p);if(moved&&(mx||my))p.walk+=moved*Math.PI*2/RIG.cycleDistance;if(mx)p.facing=mx>0?1:-1;
 blendWalk(p,moved&&(mx||my)?1:0,dt);phase(p,p.stun?'hurt':moved&&(mx||my)?'walk':'idle');
 if(((p.x-f.x)/f.rx)**2+((p.y-f.y)/f.ry)**2>1.12)loseLife(run,p.slip?'Dani resbaló. Muévete antes de que el hielo te lleve al borde.':'Te acercaste demasiado al borde.');
}
