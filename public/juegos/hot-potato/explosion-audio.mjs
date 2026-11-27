import {worldIcon} from '../world-icons.mjs';
const button=document.getElementById('sound');
const AudioEngine=window.AudioContext||window.webkitAudioContext;
let context,noise;
let enabled=true;
try{enabled=localStorage.getItem('hot-potato-muted')!=='1';}catch{}
function label(){
 button.setAttribute('aria-pressed',String(enabled));
 const name=enabled?'Silenciar sonido':'Activar sonido';
 button.setAttribute('aria-label',name);button.title=name;button.innerHTML=worldIcon(enabled?'volume':'muted');
}
function unlock(){
 if(!enabled||!AudioEngine)return;
 if(!context)context=new AudioEngine();
 if(context.state!=='running')void context.resume().catch(()=>{});
}
button.hidden=!AudioEngine;
button.onclick=()=>{
 enabled=!enabled;
 try{localStorage.setItem('hot-potato-muted',enabled?'0':'1');}catch{}
 if(enabled)unlock();
 label();
};
// Let a pass button send its WebSocket action before initializing audio.
document.addEventListener('click',event=>{
 if(context?.state==='running')return;
 if(event.target.closest('#cast'))setTimeout(unlock,0);
 else unlock();
});
label();

export function playExplosion(){
 if(!enabled||context?.state!=='running')return;
 const t=context.currentTime;
 if(!noise){
  noise=context.createBuffer(1,Math.ceil(context.sampleRate*.65),context.sampleRate);
  const samples=noise.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
 }
 const crack=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
 crack.buffer=noise;filter.type='lowpass';
 filter.frequency.setValueAtTime(3400,t);filter.frequency.exponentialRampToValueAtTime(130,t+.57);
 envelope.gain.setValueAtTime(.42,t);envelope.gain.exponentialRampToValueAtTime(.001,t+.6);
 crack.connect(filter).connect(envelope).connect(context.destination);
 crack.start(t);crack.onended=()=>{crack.disconnect();filter.disconnect();envelope.disconnect();};
 const bass=context.createOscillator(),level=context.createGain();
 bass.frequency.setValueAtTime(125,t);bass.frequency.exponentialRampToValueAtTime(37,t+.45);
 level.gain.setValueAtTime(.28,t);level.gain.exponentialRampToValueAtTime(.001,t+.5);
 bass.connect(level).connect(context.destination);bass.start(t);bass.stop(t+.51);
 bass.onended=()=>{bass.disconnect();level.disconnect();};
}
