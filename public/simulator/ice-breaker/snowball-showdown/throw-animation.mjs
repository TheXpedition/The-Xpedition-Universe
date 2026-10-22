// Snowball Showdown: animaciones de lanzamiento y reacción, para los 24 rigs
// originales de Ice Breaker. No modifica ni duplica sus modelos o imágenes.
import {sampleDaniPose} from '../dani-rig.mjs';
import {MODELS,sampleCharacterPose} from '../character-rig.mjs';

export const THROW_DURATION=0.62;
export const THROW_RELEASE=.52;
export const HIT_DURATION=.46;
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const clamp=(x,min=0,max=1)=>Math.min(max,Math.max(min,x));

/**
 * Construye poses a partir del rig REAL de Ice Breaker.
 * Preparación: flexionar piernas; impulso: hombros y codos suben y
 * extienden el brazo; recuperación: se vuelve a la posición de descanso.
 * El golpe aprovecha la pose de aterrizaje y una breve reacción.
 */
export function characterMotion(p,time,height=139){
 const walking=p.walking>.1,base={character:p.id,x:p.x,y:p.y,time,height,
   stride:p.stride,facing:p.face,phase:walking?'walk':'idle',walkBlend:walking?1:0,
   mouthOpen:0};
 const t=p.throwTime||0;
 if(t>0){
  const progress=clamp(t/THROW_DURATION);
  if(progress<.25){
   base.phase='crouch';base.phaseTime=ease(progress/.25)*.13;
   base.takeoffBlend=walking?1:0;base.takeoffStride=p.stride;
  }else{
   base.phase='jump';
   // En 0.52 el brazo alcanza su extensión: fotograma de disparo.
   const jump=progress<THROW_RELEASE
     ? .04+.46*ease((progress-.25)/(THROW_RELEASE-.25))
     : .5+.5*ease((progress-THROW_RELEASE)/(1-THROW_RELEASE));
   base.jumpProgress=jump;
   base.takeoffBlend=walking?1:0;
   base.takeoffStride=p.stride;
  }
  base.walkBlend=0;
  base.mouthOpen=.45+Math.sin(progress*Math.PI)*.4;
 }else if(p.hitTime>0){
  const progress=clamp(p.hitTime/HIT_DURATION);
  base.phase='land';base.phaseTime=progress*.18;
  base.mouthOpen=.8*(1-progress);
  base.walkBlend=0;
 }else if(walking){base.mouthOpen=.04;}
 return base;
}

// Ubicación REAL de la muñeca del personaje. La bola se mantiene en la mano
// durante la preparación y sale de ella justo en el fotograma de liberación.
export function handPosition(p,options){
 const dani=p.id==='dani';
 const model=dani?null:MODELS[p.id];
 const pose=dani?sampleDaniPose(options):sampleCharacterPose(p.id,options);
 if(!pose?.nearArm?.end)return {x:p.x+p.face*20,y:p.y-80};
 const wrist=pose.nearArm.end;
 const originX=dani?260:model.center;
 const ground=dani?1000:model.ground;
 const factor=(options.height||139)/(dani?980:(model.ground-model.top));
 return {x:p.x-(wrist.x-originX)*p.face*factor,
         y:p.y+(wrist.y-ground)*factor};
}

export function throwProgress(p){return (p.throwTime||0)/THROW_DURATION;}
export function getThrowLean(p){
 const t=throwProgress(p);if(!p.throwTime)return 0;
 // Impulso principal al arrojar, recuperación progresiva.
 return Math.sin(t*Math.PI)*.085*p.face;
}
export function getHitLean(p){
 if(!p.hitTime)return 0;
 return -p.hitDirection*Math.sin(clamp(p.hitTime/HIT_DURATION)*Math.PI)*.19;
}
