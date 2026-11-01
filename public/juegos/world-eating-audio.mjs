const buffers=new WeakMap();
// Short, quiet crunch/chewing contacts; played only after an accepted meal.
export function playEatingSound(ctx,{enabled=true,visible=true}={}){
 if(!enabled||!visible||!ctx||ctx.state!=='running')return false;
 let buffer=buffers.get(ctx);if(!buffer){const rate=ctx.sampleRate||44100;buffer=ctx.createBuffer(1,Math.ceil(rate*.12),rate);const samples=buffer.getChannelData(0);let seed=319,low=0;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1,t=i/rate;low+=(noise-low)*.16;samples[i]=(noise*.25+low*.75)*Math.min(1,t/.003)*Math.exp(-t*38);}buffers.set(ctx,buffer);}
 for(let i=0;i<3;i++){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=ctx.currentTime+i*.19;source.buffer=buffer;source.playbackRate.value=1-i*.09;filter.type='lowpass';filter.frequency.value=1900;gain.gain.value=.10-i*.015;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(at);}
 return true;
}
