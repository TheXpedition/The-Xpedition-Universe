import {shelterForZone} from './world-shelter-layout.mjs';
import {flockAt} from './world-shelter-care.mjs';

const directory='/assets/maps/apocalypse/refugios/';
const flockSprites=new Map();
const birds=[{x:.43,y:.695,size:85,pace:.37},{x:.58,y:.714,size:79,pace:.47},{x:.737,y:.70,size:105,pace:.31,rooster:true}];
let eggMinute=-1,eggOwner,eggs=0;

function birdImage(name){
 if(!flockSprites.has(name)){
  const image=new Image();
  image.src=directory+name+'.webp';flockSprites.set(name,image);
 }
 return flockSprites.get(name);
}

export function drawShelterFlock(c,map,time,shared,reduced=false){
 if(map.shelterRoom!=='corral')return;
 const seconds=time/1000,team=shelterForZone(map.id)?.id,data=shared?.flocks?.[team],minute=Math.floor(seconds/60);
 if(data!==eggOwner||minute!==eggMinute){eggOwner=data;eggMinute=minute;eggs=flockAt(data,time).eggs;}
 const t=seconds;
 for(const [i,bird]of birds.entries()){
  const image=birdImage(bird.rooster?'gallo':'hen');
  if(!image.complete||!image.naturalWidth)continue;
  const phase=t*bird.pace+i*2.1;
  const wander=Math.sin(phase)*.041+Math.sin(phase*.42+i)*.018;
  const x=map.width*(bird.x+wander),y=map.illustration.height*(bird.y+Math.sin(phase*.91+i)*.006);
  const walking=Math.cos(phase)*.041+Math.cos(phase*.42+i)*.00756;
  const step=reduced?0:Math.abs(Math.sin(t*(8+i))) * Math.min(1,Math.abs(walking)*30);
  const peck=!reduced&&Math.sin(t*.84+i)>.83?Math.max(0,Math.sin(t*10+i))*.16:0;
  const facing=walking<0?1:-1,h=bird.size*image.naturalHeight/image.naturalWidth;
  c.save();
  c.fillStyle='#24160e60';c.beginPath();c.ellipse(x,y+2,bird.size*.33,5,0,0,Math.PI*2);c.fill();
  c.translate(x,y-step*4);c.scale(facing,1);c.rotate(-peck);
  c.drawImage(image,-bird.size*.5,-h,bird.size,h);c.restore();
 }
 if(eggs){
  const x=map.width*.77,y=map.illustration.height*.662;
  c.save();c.fillStyle='#f2dbc3';
  for(let i=0;i<Math.min(eggs,4);i++){c.beginPath();c.ellipse(x+i*12,y-(i%2)*4,6,9,.22,0,Math.PI*2);c.fill();}
  c.restore();
 }
}

export function createCoopSound(){
 let playedAt=0,callCount=0,activeZone='';
 return (ctx,{zone,now,enabled,visible})=>{
  if(!enabled||!visible||!zone?.startsWith('corral-refugio-')||ctx?.state!=='running'){activeZone='';return;}
  if(zone!==activeZone){activeZone=zone;playedAt=now+1400;return;}
  if(now<playedAt)return;
  const crow=++callCount%5===0,start=ctx.currentTime+.02;
  for(const [i,frequency] of (crow?[330,460,575,450]:[515,445,330]).entries()){
   const note=ctx.createOscillator(),gain=ctx.createGain(),at=start+i*(crow?.13:.085);
   note.type='triangle';note.frequency.setValueAtTime(frequency,at);
   note.frequency.exponentialRampToValueAtTime(frequency*.66,at+(crow?.18:.075));
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.exponentialRampToValueAtTime(crow?.036:.024,at+.023);
   gain.gain.exponentialRampToValueAtTime(.0001,at+(crow?.21:.095));
   note.connect(gain);gain.connect(ctx.destination);note.start(at);note.stop(at+(crow?.23:.11));
   note.onended=()=>{note.disconnect();gain.disconnect();};
  }
  playedAt=now+6500+(callCount*2269)%8500;
 };
}
