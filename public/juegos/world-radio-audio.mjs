export function playRadioSignal(ctx,{enabled=true,visible=true}={}){
 if(!enabled||!visible||!ctx||ctx.state!=='running')return;
 try{for(const [i,hz]of [880,1320,990].entries()){const at=ctx.currentTime+i*.18,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(hz,at);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.025,at+.015);g.gain.exponentialRampToValueAtTime(.0001,at+.13);o.connect(g);g.connect(ctx.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+.15);}}catch{}
}
