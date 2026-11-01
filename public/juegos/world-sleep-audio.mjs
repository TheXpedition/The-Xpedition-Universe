import {WorldSoundBank} from './world-sound-bank.mjs';
import {worldCharacter} from './world-characters.mjs';

// Only the three nearest sleepers are audible. Private rest and unconsciousness
// are different activities; neither should accidentally produce sleeping Foley.
export class WorldSleepAudio{
 constructor(options){this.bank=new WorldSoundBank(options);this.voices=new Map();this.context=null;}
 reset(){this.bank.stop();this.voices.clear();this.context=null;}
 update(ctx,players,{selfId,zone,enabled=true,visible=true,connected=true,playing=true}={}){
  if(!enabled||!visible||!connected||!playing||!ctx||ctx.state!=='running'){this.reset();return;}
  if(this.context&&this.context!==ctx)this.reset();this.context=ctx;
  const listener=players.find(p=>p.userId===selfId);
  if(!listener){this.reset();return;}
  const nearest=players.filter(p=>(!p.zone||p.zone===zone)&&
   (p.sleeping||['sleep','sleeping'].includes(p.state))&&p.activity!=='private-rest'&&
   !['dead','fainted'].includes(p.life?.status)&&!['dead','fainted'].includes(p.state))
   .map(p=>({p,d:Math.hypot((p.x||0)-(listener.x||0),((p.y||0)-(listener.y||0))*.62)}))
   .filter(({d})=>d<1000).sort((a,b)=>a.d-b.d).slice(0,3);
  const active=new Set();
  for(const {p,d}of nearest){
   const gender=worldCharacter(p.characterId)?.gender;
   if(!['male','female'].includes(gender))continue;
   const file=gender==='male'?'sleep-snore-male-loop.wav':'sleep-breath-female-loop.wav';
   const key=p.userId+':'+p.characterId+':'+zone;active.add(key);
   const gain=(p.userId===selfId?.30:.20)*Math.max(0,1-d/1000)/Math.sqrt(nearest.length);
   const current=this.voices.get(key);
   if(current){if(Math.abs(current.lastGain-gain)>.015){current.level.gain.linearRampToValueAtTime(gain,ctx.currentTime+.2);current.lastGain=gain;}continue;}
   const voice=this.bank.play(ctx,file,{loop:true,gain,fade:.65});
   if(voice){voice.lastGain=gain;this.voices.set(key,voice);}
  }
  for(const [key,voice]of this.voices)if(!active.has(key)){voice.stop();this.voices.delete(key);}
 }
}
