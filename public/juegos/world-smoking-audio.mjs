// Lighter strike and a quiet breath. Called only after the server accepts use.
export function playSmokingSound(ctx,{enabled=true,visible=true}={}){
 if(!enabled||!visible||ctx?.state!=='running')return false;
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.55),ctx.sampleRate),data=buffer.getChannelData(0);let seed=117;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const t=i/ctx.sampleRate;data[i]=(seed/2147483648-1)*(t<.025?.7*Math.exp(-t*100):.04*Math.sin(Math.PI*Math.min(1,(t-.025)/.525)));}
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2600;gain.gain.value=.16;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();return true;
}
