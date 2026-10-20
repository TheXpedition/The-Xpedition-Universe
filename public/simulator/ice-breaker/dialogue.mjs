import {FALL_LINES,AMBIENT_LINES,shuffleBag} from './dani-lines.mjs';
export class DaniDialogue{
 constructor({caption,line,audioContext}){Object.assign(this,{caption,line,audioContext});this.fall=shuffleBag(FALL_LINES);this.ambient=shuffleBag(AMBIENT_LINES);this.next=9+Math.random()*7;this.enabled=true;this.muted=false;this.active=null;this.audio=null;this.paused=false;this.mouth=0;this.clock=0;this.until=0;this.analyser=null;this.samples=new Uint8Array(128);}
 say(kind='ambient'){
  if(kind!=='fall'&&this.active)return;
  this.stop();const item=(kind==='fall'?this.fall:this.ambient)();this.active=item;this.line.textContent=item.text;this.caption.hidden=false;this.until=this.clock+Math.max(4,item.spoken.length/12);this.next=this.until+20+Math.random()*19;
  if(!this.enabled||this.muted)return;
  const voice=new Audio('./audio/'+item.id+'.wav');this.audio=voice;voice.volume=.95;
  voice.onplay=()=>this.caption.dataset.voice='playing';voice.onpause=()=>this.caption.dataset.voice='paused';
  try{const context=this.audioContext();if(context){const source=context.createMediaElementSource(voice);this.analyser=context.createAnalyser();this.analyser.fftSize=256;source.connect(this.analyser);this.analyser.connect(context.destination);}}catch{}
  voice.onloadedmetadata=()=>this.until=this.clock+voice.duration+.8;
  voice.onended=()=>{this.caption.dataset.voice='ended';this.mouth=0;this.until=this.clock+.8;};
  voice.onerror=()=>{this.caption.dataset.voice='error';this.mouth=0;};
  void voice.play().catch(()=>this.caption.dataset.voice='blocked');
 }
 stop(){if(this.audio){this.audio.pause();this.audio.onended=null;this.audio=null;}this.analyser=null;this.active=null;this.mouth=0;this.caption.hidden=true;}
 update({dt,player,camera,width,height,playing,paused,muted}){
  if(!paused&&(playing||this.active))this.clock+=dt;this.muted=muted;
  const suspend=paused||(!playing&&!this.active);
  if(suspend!==this.paused){this.paused=suspend;if(suspend)this.audio?.pause();else if(this.audio&&!this.audio.ended&&!muted&&this.enabled)void this.audio.play().catch(()=>{});}
  if(this.audio)this.audio.muted=muted||!this.enabled;
  if(playing&&!suspend&&!this.active&&this.clock>=this.next&&player.phase!=='hurt')this.say();
  if(this.active&&this.clock>this.until)this.stop();
  this.mouth=0;
  if(this.analyser&&this.audio&&!this.audio.paused&&!this.audio.ended&&!muted&&this.enabled){this.analyser.getByteTimeDomainData(this.samples);let power=0;for(const value of this.samples)power+=(value-128)**2;this.mouth=Math.min(1,Math.sqrt(power/this.samples.length)/15);}
  if(!this.active)return;
  // Plain character subtitles: no panel, toast, bubble or screen-fixed message.
  const boxWidth=this.caption.offsetWidth||280,screenX=(player.x-camera)/width*this.caption.parentElement.clientWidth;
  const px=Math.max(boxWidth/2+10,Math.min(this.caption.parentElement.clientWidth-boxWidth/2-10,screenX));
  const headY=(player.y-player.z-216)/height*100;
  this.caption.style.left=px+'px';this.caption.style.top=Math.max(12,headY)+'%';
 }
 reset(){this.stop();this.next=9+Math.random()*7;this.clock=0;}
}
