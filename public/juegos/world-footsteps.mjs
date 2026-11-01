import {WorldSoundBank} from './world-sound-bank.mjs';
// Two grounded contacts per authored walking cycle. AudioContext is supplied by
// the existing user-activated sound control; this module never starts audio.
const TAU=Math.PI*2,HALF_CYCLE=Math.PI;
const materials=new Set(['wood','grass','snow','concrete','carpet']);
export function footstepSurface(zone,weather){if(weather==='snow'&&!/interior|dormitorio|confesionario|caseta|vagon|cocina/.test(zone))return 'snow';if(/refugio-1|dormitorio|vagon|caseta|puerto|muelle|confesionario/.test(zone))return 'wood';if(/bosque|sendero|cascada|cueva|montana|cementerio/.test(zone))return 'grass';return 'concrete';}
export class WorldFootsteps{
 constructor(options){this.bank=new WorldSoundBank(options);this.reset();}
 reset(){this.previous=null;this.lastStep=-Infinity;this.alternate=0;}
 buffer(ctx,material){return this.bank.buffer(ctx,`footstep_${material}_${String(this.alternate%3).padStart(3,'0')}.ogg`);}
 prepare(ctx,material){const key=material;if(this.preparedContext===ctx&&this.preparedMaterial===key)return;this.preparedContext=ctx;this.preparedMaterial=key;void this.bank.preload(ctx,[0,1,2].map(i=>`footstep_${material}_${String(i).padStart(3,'0')}.ogg`));}
 update(ctx,player,{enabled=false,visible=true,connected=true,material='concrete',now=0}={}){
  const eligible=enabled&&visible&&connected&&ctx&&ctx.state==='running'&&player?.moving&&player.grounded===true&&(player.z||0)<2&&player.state!=='sit'&&player.state!=='swim'&&!player.swimming&&!player.seatId&&!player.falling&&Number.isFinite(player.walk);
  if(!eligible){this.reset();this.bank.stop();return false;}
  material=materials.has(material)?material:'concrete';this.prepare(ctx,material);
  const current={phase:player.walk,now,x:player.x,y:player.y,key:(player.userId||player.id||'self')+':'+(player.zone||'')},previous=this.previous;this.previous=current;
  if(!previous||previous.key!==current.key)return false;
  const delta=current.phase-previous.phase,elapsed=now-previous.now,distance=Math.hypot((current.x||0)-(previous.x||0),(current.y||0)-(previous.y||0));
  // A reconnect, tab restoration or teleport must not replay missed contacts.
  if(delta<0||delta>HALF_CYCLE*1.5||elapsed<0||elapsed>350||distance>160)return false;
  if(Math.floor(current.phase/HALF_CYCLE)<=Math.floor(previous.phase/HALF_CYCLE)||now-this.lastStep<110)return false;
  this.lastStep=now;const name=`footstep_${material}_${String(this.alternate++%3).padStart(3,'0')}.ogg`;
  return !!this.bank.play(ctx,name,{gain:material==='snow'?.40:material==='wood'?.28:.34,rate:this.alternate%2?1:.96});
 }
}
