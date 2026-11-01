export function fakeAudio(){
 const ctx={state:'running',sampleRate:22050,currentTime:1,destination:{},sources:[],decoded:[],live:0};
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>{ctx.live++;let closed=false;return {connect(){},disconnect(){if(!closed){closed=true;ctx.live--;}}};};
 ctx.createBuffer=(channels,length,rate)=>({duration:length/rate,getChannelData:()=>new Float32Array(length)});
 ctx.decodeAudioData=async b=>{const name=new TextDecoder().decode(b),buffer={duration:name.includes('loop')?8:.35,name};ctx.decoded.push(buffer);return buffer;};
 ctx.createBufferSource=()=>{const source={...node(),playbackRate:param(),start(){this.started=true;},stop(){this.onended?.();}};ctx.sources.push(source);return source;};
 ctx.createOscillator=()=>({...node(),frequency:param(),start(){},stop(){this.onended?.();}});ctx.createBiquadFilter=()=>({...node(),frequency:param(),Q:param()});ctx.createGain=()=>({...node(),gain:param()});return ctx;
}
export const fetchAudio=async url=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer});
export const settleAudio=()=>new Promise(r=>setImmediate(r));
