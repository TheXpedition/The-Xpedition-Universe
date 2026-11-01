import {WorldSoundBank} from './world-sound-bank.mjs';
const splashes=[0,1,2].map(i=>'water-splash_'+i+'.wav'),cloth=[1,2,3,4].map(i=>'cloth'+i+'.ogg');
export class WorldWaterAudio{
 constructor(options){this.bank=new WorldSoundBank(options);this.reset();}
 reset(){this.key='';this.wasSwimming=false;this.cleaning=false;this.nextStroke=0;this.nextClean=0;this.variant=0;this.bank.stop();}
 update(ctx,player,{enabled=false,visible=true,connected=true,now=0}={}){
  if(!enabled||!visible||!connected||!ctx||ctx.state!=='running'||!player){this.reset();return;}
  const key=(player.userId||player.id)+':'+player.zone;if(this.key!==key){this.reset();this.key=key;void this.bank.preload(ctx,[...splashes,...cloth]);}
  const swimming=player.swimming===true||player.state==='swim',cleaning=player.activity==='clean-bed';
  if(swimming){if(!this.wasSwimming){this.bank.play(ctx,splashes[this.variant++%3],{gain:.52});this.nextStroke=now+700;}else if(player.moving&&now>=this.nextStroke){this.bank.play(ctx,splashes[this.variant++%3],{gain:.43,rate:this.variant%2?1:.94});this.nextStroke=now+800;}this.wasSwimming=true;}
  else if(this.wasSwimming){this.bank.stop();this.bank.play(ctx,splashes[this.variant++%3],{gain:.27});this.wasSwimming=false;}
  if(cleaning){if(now>=this.nextClean){this.bank.play(ctx,cloth[this.variant++%4],{gain:.65});this.nextClean=now+780;}}
  else{this.nextClean=0;if(this.cleaning)this.bank.stop();}this.cleaning=cleaning;
 }
}
