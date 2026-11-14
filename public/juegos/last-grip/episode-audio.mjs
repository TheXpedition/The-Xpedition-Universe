export class EpisodeAudio {
 constructor(){
  this.helicopter=document.createElement('audio');
  this.helicopter.preload='none';
  this.helicopter.src='/juegos/last-grip/media/helicopter.mp3';
  this.helicopter.loop=true;
  this.helicopterBlocked=false;
  this.enabled=false;
  this.voices=new Set();
  this.falls=new Set();
 }
 enable(){
  this.enabled=true;
  this.helicopterBlocked=false;
  if(this.state)this.sync(this.state);
 }
 sound(url,{rate=1,volume=.5}={}){
  if(!this.enabled||document.hidden||this.voices.size>=5)return;
  const audio=document.createElement('audio');
  audio.src=url;
  audio.volume=volume*this.duck;
  audio.playbackRate=rate;
  this.voices.add(audio);
  const done=()=>this.voices.delete(audio);
  audio.onended=done;
  audio.onerror=done;
  void audio.play().catch(done);
 }
 sync(state){
  this.state=state;
  this.duck=state.announcementSpeaking?.22:1;
  if(state.paused||document.hidden){this.stop();return;}
  const elapsed=state.clock-state.phaseAt;
  if(state.phase==='arrival'&&elapsed<7200&&this.enabled){
   this.helicopter.volume=Math.max(.06,.5-elapsed/17000)*this.duck;
   if(this.helicopter.paused&&!this.helicopterBlocked)void this.helicopter.play().catch(()=>{this.helicopterBlocked=true;});
  }else this.helicopter.pause();
  for(const fall of state.round?.falls||[]){
   const age=state.clock-fall.clock,id=state.round.id+':'+fall.id;
   if(!this.falls.has(id+':voice')){
    this.falls.add(id+':voice');
    const character=state.roster.find(p=>p.id===fall.id);
    if(age>=0&&age<1200)this.sound('/juegos/last-grip/media/fall-female.mp3',{rate:character?.gender==='male'?.78:1,volume:.5});
   }
   if(age>=650&&!this.falls.has(id+':water')){
    this.falls.add(id+':water');
    if(age<1700)this.sound('/juegos/audio/water-splash_1.wav',{volume:.65});
   }
  }
 }
 stop(){
  this.helicopter.pause();
  for(const audio of this.voices)audio.pause();
  this.voices.clear();
 }
 destroy(){this.stop();}
}
