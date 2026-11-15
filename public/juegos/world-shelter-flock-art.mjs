import {shelterForZone} from './world-shelter-layout.mjs';
import {flockAt,COOP_BIRDS,birdMotion,coopBirdName} from './world-shelter-care.mjs';

const directory='/assets/maps/apocalypse/refugios/';
const flockSprites=new Map();
const cachedFlocks=new Map();

export function sceneFlock(map,time,shared){
 const team=shelterForZone(map?.id)?.id;
 if(!team||map.shelterRoom!=='corral')return null;
 const data=shared?.flocks?.[team],minute=Math.floor(time/60000);
 let cached=cachedFlocks.get(team);
 if(cached?.data!==data||cached?.minute!==minute){
  cached={data,minute,value:flockAt(data,time)};
  cachedFlocks.set(team,cached);
 }
 return cached.value;
}

export function birdPoint(map,id,time){
 const index=COOP_BIRDS.findIndex(bird=>bird.id===id),bird=COOP_BIRDS[index];
 if(!bird)return null;
 const pos=birdMotion(bird,index,time);
 return {x:pos.x*map.width,y:pos.y*map.height};
}

export function pickShelterBird(map,point,time,shared){
 const flock=sceneFlock(map,time,shared);
 if(!flock)return null;
 let pick=null,distance=Infinity;
 for(const bird of COOP_BIRDS){
  if(!(flock.birds[bird.id]?.health>0))continue;
  const pos=birdPoint(map,bird.id,time),dx=point.x-pos.x,dy=(point.y-pos.y)*.62+bird.size*.32;
  const score=Math.hypot(dx,dy);
  if(Math.abs(dx)<bird.size*.63&&Math.abs(dy)<bird.size*.6&&score<distance){
   pick=bird;distance=score;
  }
 }
 return pick&&{...pick,name:coopBirdName(shelterForZone(map.id).id,pick.id)};
}

function birdImage(name){
 if(!flockSprites.has(name)){
  const image=new Image();
  image.src=directory+name+'.webp';flockSprites.set(name,image);
 }
 return flockSprites.get(name);
}

export function drawShelterFlock(c,map,time,shared,reduced=false){
 const flock=sceneFlock(map,time,shared);
 if(!flock)return;
 const t=time/1000;
 for(const [i,bird] of COOP_BIRDS.entries()){
  const state=flock.birds[bird.id];
  if(!(state?.health>0))continue;
  const image=birdImage(bird.rooster?'gallo':'hen');
  if(!image.complete||!image.naturalWidth)continue;
  const pos=birdMotion(bird,i,time),walking=pos.walking;
  const x=map.width*pos.x,y=map.illustration.height*pos.y;
  const step=reduced?0:Math.abs(Math.sin(t*(8+i))) * Math.min(1,Math.abs(walking)*30);
  const peck=!reduced&&Math.sin(t*.84+i)>.83?Math.max(0,Math.sin(t*10+i))*.16:0;
  const facing=walking<0?1:-1,h=bird.size*image.naturalHeight/image.naturalWidth;
  c.save();
  c.fillStyle='#24160e60';c.beginPath();c.ellipse(x,y+2,bird.size*.33,5,0,0,Math.PI*2);c.fill();
  c.translate(x,y-step*4);c.scale(facing,1);c.rotate(-peck);
  c.drawImage(image,-bird.size*.5,-h,bird.size,h);c.restore();
  if(state?.eggs){
   c.save();c.fillStyle='#f2dbc3';
   for(let i=0;i<Math.min(state.eggs,2);i++){
    c.beginPath();c.ellipse(x+bird.size*.44+i*12,y-(i%2)*4,6,9,.22,0,Math.PI*2);c.fill();
   }
   c.restore();
  }
 }
}

export function createCoopSound(){
 let playedAt=0,callCount=0,activeZone='';
 return (ctx,{zone,now,enabled,visible,flock})=>{
  if(!enabled||!visible||!zone?.startsWith('corral-refugio-')||ctx?.state!=='running'){activeZone='';return;}
  if(zone!==activeZone){activeZone=zone;playedAt=now+1400;return;}
  if(now<playedAt||!flock||!Object.values(flock.birds).some(bird=>bird.health>0))return;
  const living=COOP_BIRDS.filter(bird=>flock.birds[bird.id]?.health>0);
  const hens=living.filter(bird=>!bird.rooster),roosters=living.filter(bird=>bird.rooster);
  callCount++;
  const calls=roosters.length&&(!hens.length||callCount%5===0)?roosters:hens;
  const voice=calls[Math.floor(Math.random()*calls.length)];
  const crow=voice.rooster,start=ctx.currentTime+.02;
  for(const [i,frequency] of (crow?[355,505,430,380]:[545,434,364]).entries()){
   const note=ctx.createOscillator(),gain=ctx.createGain(),at=start+i*(crow?.13:.085);
   const pitch=frequency*(.85+voice.pace*.4);
   note.type='triangle';note.frequency.setValueAtTime(pitch,at);
   note.frequency.exponentialRampToValueAtTime(pitch*(crow?.84:.66),at+(crow?.18:.075));
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(crow?.036:.024,at+.023);
   gain.gain.exponentialRampToValueAtTime(.0001,at+(crow?.21:.095));
   note.connect(gain);gain.connect(ctx.destination);note.start(at);note.stop(at+(crow?.23:.11));
   note.onended=()=>{note.disconnect();gain.disconnect();};
  }
  playedAt=now+6500+(callCount*2269)%8500;
 };
}
