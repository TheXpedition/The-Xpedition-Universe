import {WorldPets} from '../world-pets.mjs';
import {activeGripEvents} from './events.mjs';
import {GRIP_MAPS} from './navigation.mjs';
import {paintSpeechBubble} from '../world-speech-bubbles.mjs';
import {ITEM_ART_RECTS} from '../world-item-art.mjs';
import {GRIP_POSES} from './assets.mjs';
import {castHeightRatio} from '../world-cast-proportions.mjs';
import {worldCharacter} from '../world-characters.mjs';
import {SWIMWEAR} from './swimwear.mjs';
import {LOCATIONS,PHASE_LABELS,pulseAt,precision} from './engine.mjs';
export const ART='/juegos/last-grip/art/';
const fill=(c,x,y,w,h,color,r=7)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
const text=(c,line,x,y,size=24,color='#ffe6c4',align='center')=>{c.font=`700 ${size}px "World Condensed",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(String(line),x,y);};
export class GripRenderer{
 constructor(canvas,{loadImage,bank}={}){this.canvas=canvas;this.pets=new WorldPets();this.bubbles=new Map();this.anchors=new Map();this.images=new Map();this.pending=new Map();this.loadImage=loadImage||((src)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;}));this.bank=bank;this.failed=new Set();}
 image(src){if(this.images.has(src))return this.images.get(src);if(!this.pending.has(src)&&!this.failed.has(src)){this.pending.set(src,this.loadImage(src).then(im=>{this.images.set(src,im);return im;}).catch(()=>this.failed.add(src)).finally(()=>this.pending.delete(src)));}return null;}
 async preload(ids=[]){this.image('/juegos/survival/survival-atlas.png');this.image('/juegos/last-grip/media/helicopter.png');for(const name of ['arena','pit','runway','monitor','changing','stands','platform','entrance'])this.image(ART+name+'.webp');for(const id of ids){if(SWIMWEAR[id])this.image(SWIMWEAR[id].image);if(GRIP_POSES[id])this.image(GRIP_POSES[id].image);this.image('/juegos/cast-apocalypse/'+id+'-portrait.webp');this.image('/juegos/cast-apocalypse/'+id+'-original.png');}this.image('/juegos/cast-apocalypse/maria-villegas-original.png');await Promise.all([...this.pending.values()]);}
 render(s,{selfId=s.selfId,time=Date.now(),area,review=false,overlay=false,cssScale=1,hud=true,arenaView}={}){
 this.anchors.clear();const c=this.canvas.getContext('2d'),W=this.canvas.width,H=this.canvas.height;c.setTransform(W/1672,0,0,H/941,0,0);c.clearRect(0,0,1672,941);if(activeGripEvents(s).some(e=>e.kind==='shake'))c.translate(Math.sin(time/46)*2,Math.cos(time/39)*1.5);
 const self=[...s.roster,...(s.visitors||[])].find(p=>p.id===selfId),arena=(arenaView??(!self||!['changing','runway','entrance','monitor'].includes(area||self.area)))&&['draw','ready','active','ending','results','finalReady','winner'].includes(s.phase),place=area||self?.area||'stands',scene=arena?'arena':s.phase==='arrival'?'runway':s.phase==='intro'?'monitor':['lobby','closed','finished'].includes(s.phase)?'entrance':place;
 const bg=this.image(ART+scene+'.webp');if(bg)c.drawImage(bg,0,0,1672,941);else fill(c,0,0,1672,941,'#24160f',0);
 this.environment(c,s,time,scene);
 if(scene==='monitor')this.clinic(c);
 const shade=c.createLinearGradient(0,0,0,941);shade.addColorStop(0,'#0e09081f');shade.addColorStop(.65,'#0e090800');shade.addColorStop(1,'#0e0908a0');c.fillStyle=shade;c.fillRect(0,0,1672,941);
 // Ember light belongs to the scenery and does not obscure actors or UI.
 for(const [i,x]of [180,520,1430,1580].entries()){const y=110+(i%2)*200;c.globalAlpha=.08+Math.sin(time/460+i)*.025;const g=c.createRadialGradient(x,y,5,x,y,140);g.addColorStop(0,'#ffac41');g.addColorStop(1,'#ff9d3000');c.fillStyle=g;c.fillRect(x-140,y-140,280,280);}c.globalAlpha=1;
 if(arena&&s.round){
  const members=s.round.members,n=members.length,span=1280,start=196;
  for(const [i,id]of members.entries()){
   const p=s.roster.find(p=>p.id===id),pose=p&&GRIP_POSES[p.characterId];if(!pose)continue;const im=this.image(pose.image);if(!im)continue;
   const x=n===1?836:start+i*span/Math.max(1,n-1),height=480*castHeightRatio(p.characterId),scale=height/pose.height,w=pose.width*scale,y=172-pose.gripY*scale;
   const a=s.round.actors[id]||{stamina:100},fall=s.round.falls.find(f=>f.id===id),fallT=fall?Math.max(0,(s.clock-fall.clock)/1000):0;
   // Keep contact fixed while hanging; a fall moves the complete illustration,
   // so no hands or wrists are left behind on the beam.
   if(!fall)c.drawImage(im,0,0,pose.width,pose.gripY, x-w/2,y,w,pose.gripY*scale);
   if(!fall||fallT<1.7){c.save();const fatigue=(100-a.stamina)/100,angle=fall?Math.min(.28,fallT*.2):Math.sin(time/650+i)*(.006+fatigue*.009);c.translate(x,172+(fall?fallT*fallT*310:Math.sin(time/530+i)*fatigue*2));c.rotate(angle);c.globalAlpha=fall?Math.max(0,1-fallT/1.7):1;if(fall)c.drawImage(im,-w/2,-pose.gripY*scale,w,height);else c.drawImage(im,0,pose.gripY,pose.width,pose.height-pose.gripY,-w/2,0,w,(pose.height-pose.gripY)*scale);c.restore();}
   if(!fall)this.anchors.set(id,{x,y:225});
   const by=713,labelWidth=Math.min(230,Math.max(172,52/cssScale)),name=cssScale<.55&&p.name.length>9?p.name.slice(0,8)+'…':p.name;fill(c,x-labelWidth/2,by,labelWidth,31,'#1c100df0');text(c,name,x,by+23,Math.max(21,11/cssScale),'#ffe5c0');fill(c,x-78,by+40,156,9,'#1b0f0b');if(!fall)fill(c,x-78,by+40,156*a.stamina/100,9,a.stamina<25?'#e74930':'#ecb257',4);const resultLabel=s.phase==='winner'&&s.winner===id?'GANADOR':s.phase==='results'&&s.round.survivors?.includes(id)?'CLASIFICADO':Math.ceil(a.stamina)+'% · AGARRE';text(c,fall?'EN EL MONITOR':resultLabel,x,by+70,16,fall?'#d59377':'#ffe5c0');
  }

 }else if(!['closed','lobby','finished','intro','opening','guide'].includes(s.phase)){
  const all=[...s.roster,...(s.visitors||[])],people=(s.phase==='arrival'?all:all.filter(p=>p.area===place&&!(['active','ending'].includes(s.phase)&&s.round?.members.includes(p.id)&&!s.round.falls.some(f=>f.id===p.id)))).sort((a,b)=>(a.y||0)-(b.y||0));
  if(s.phase==='arrival'){const im=this.image('/juegos/last-grip/media/helicopter.png'),t=s.clock-s.phaseAt,land=Math.min(1,t/4300);if(im){const w=Math.min(1050,520*im.width/im.height),h=w*im.height/im.width,y=620-h-(1-land)*730;c.drawImage(im,(1672-w)/2,y,w,h);c.save();c.globalAlpha=.25;c.fillStyle='#c1c3b7';c.beginPath();c.ellipse(836,y+24,430,7+Math.sin(time/40)*3,0,0,Math.PI*2);c.fill();c.restore();}}for(const [i,p]of people.entries()){
   if(s.phase==='arrival'&&s.clock-s.phaseAt<4500+i*110)continue;
   const exit=s.phase==='arrival'?Math.min(1,Math.max(0,(s.clock-s.phaseAt-4500-i*110)/850)):1,floor=LOCATIONS[place]?.floor||815,x=s.phase==='arrival'?836+(110+(i%10)*160-836)*exit:p.x,y=s.phase==='arrival'?620+(85+Math.floor(i/10)*88)*exit:(p.y??floor),h=(s.phase==='arrival'?145:Math.max(155,Math.min(245,170+((p.y??floor)-590)*.25)))*castHeightRatio(p.characterId),swim=p.changed&&SWIMWEAR[p.characterId];
   this.pets.draw(c,{...p,x,y:y/.62},h,time/1000,{zone:place});if(swim){const im=this.image(swim.image);if(im){const bob=p.moving?Math.sin(p.walk||time/120)*2:0;c.drawImage(im,x-h*swim.width/swim.height/2,y-h+bob,h*swim.width/swim.height,h);}}else if(!this.bank?.draw(c,{...p,userId:p.id,x,y:y/.62,z:0,state:'idle',grounded:true,moving:s.phase==='arrival'&&exit<1||p.moving,walk:s.phase==='arrival'?exit*12:p.walk},h,time/1000)){const im=this.image('/juegos/cast-apocalypse/'+p.characterId+'-original.png');if(im)c.drawImage(im,x-h*im.width/im.height/2,y-h,h*im.width/im.height,h);}
   this.anchors.set(p.id,{x,y:y-h-38});c.save();c.globalAlpha=.25;c.fillStyle='#100b08';c.beginPath();c.ellipse(x,y+2,h*.13,h*.035,0,0,Math.PI*2);c.fill();c.restore();
   fill(c,x-74,y-h-33,148,26,'#20130deb');text(c,p.name,x,y-h-13,17);
  }
 }
 if(s.phase==='intro'){
  // Clip the host feed inside the supplied black monitor, never over its frame.
  c.save();c.beginPath();c.moveTo(389,213);c.lineTo(1145,213);c.lineTo(1145,503);c.lineTo(389,503);c.closePath();c.clip();fill(c,375,205,800,310,'#130e0c',0);
  text(c,'THE LAST GRIP',767,324,42,'#f5b663');text(c,s.cinematic?'PRESENTACIÓN DEL EPISODIO':'VIDEO DE PRESENTACIÓN PENDIENTE',767,380,22);c.restore();

 }
 if(['ready','draw'].includes(s.phase)){fill(c,530,808,612,62,'#1c100df2');text(c,s.phase==='draw'?'SORTEO EN VIVO · '+s.round.members.length+' REVELADOS':s.round.autoStart?'PREPÁRATE · '+Math.max(1,Math.ceil((3000-(s.clock-s.phaseAt))/1000)):'POSICIONES CONFIRMADAS',836,847,24);}
 if(['results','winner'].includes(s.phase)&&(arena||scene==='monitor')){c.save();if(!arena){c.translate(444,213);c.scale(.90625,.90625);c.translate(-480,-245);}
  const final=s.phase==='winner',ids=final?[s.winner]:s.round.survivors||[],title=final?'ONLY ONE REMAINS':'CLASIFICADOS A LA FINAL';fill(c,480,245,712,320,'#120c09f5',16);c.strokeStyle='#d9923d';c.lineWidth=2;c.strokeRect(492,257,688,296);text(c,title,836,300,33,'#ffbd67');
  for(const [i,id]of ids.entries()){const p=s.roster.find(p=>p.id===id),x=ids.length===1?836:690+i*292,im=this.image('/juegos/cast-apocalypse/'+p.characterId+'-portrait.webp');if(im)c.drawImage(im,x-57,323,114,114);text(c,p.name,x,477,30);}
  text(c,Math.floor(s.round.duration/60)+':'+String(Math.floor(s.round.duration%60)).padStart(2,'0')+' DE RESISTENCIA',836,528,20,'#bda78a');c.restore();
 }
 if(!arena&&!['arrival','opening','intro','guide','closed','lobby','finished'].includes(s.phase))this.signs(c,place);
 if(s.paused){fill(c,675,405,322,72,'#150d0df0');text(c,'PAUSA DE DIRECCIÓN',836,451,28,'#ffd595');}
 if(hud&&s.phase==='active'&&s.round)this.hud(c,s,selfId);
 if(overlay){fill(c,0,0,1672,77,'#160e0bf5',0);c.fillStyle='#ad632d';c.fillRect(0,76,1672,2);text(c,'THE XPEDITION',30,37,25,'#fff1d5','left');text(c,'APOCALYPSE II',30,59,13,'#cf9a62','left');text(c,'THE LAST GRIP / ONLY ONE REMAINS',836,29,16,'#f0ad69');text(c,PHASE_LABELS[s.phase],836,58,27);c.fillStyle='#bfd38b';c.beginPath();c.arc(1537,39,4,0,Math.PI*2);c.fill();text(c,'EN VIVO',1630,45,18,'#bfd38b','right');}
 if(review){fill(c,32,883,365,34,'#130d0dee');text(c,'REVISIÓN CON BOTS · MOTOR REAL',50,906,18,'#e8c79b','left');}
 this.speech(c,{time,width:1672,height:941,cssScale});
 return {scene,place,arena};
 }
 environment(c,s,time,scene){const e=s.environment,events=activeGripEvents(s),rain=['rain','storm'].includes(e?.weather)||events.some(e=>e.kind==='rain'),snow=e?.weather==='snow';c.save();if(e?.phase==='night'){c.fillStyle='#08162c55';c.fillRect(0,0,1672,941);}else if(e?.phase==='afternoon'){c.fillStyle='#c46d2110';c.fillRect(0,0,1672,941);}if(scene!=='changing'&&(rain||snow)){c.strokeStyle='#d5e5ef88';c.fillStyle='#e3eef0aa';c.lineWidth=snow?3:1.7;for(let i=0;i<(snow?70:150);i++){const x=(i*137+time*(snow?.018:.1))%1740-34,y=(i*71+time*(snow?.045:.6))%941;c.beginPath();c.moveTo(x,y);c.lineTo(x-(snow?1:8),y+(snow?2:22));c.stroke();}}if(events.some(e=>e.kind==='wind')){c.strokeStyle='#e4c69a55';c.lineWidth=2;for(let i=0;i<18;i++){const x=(time*.7+i*127)%1860-180,y=185+i*39+Math.sin(time/300+i)*13;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+60,y-13,x+135,y-3);c.stroke();}}if(events.some(e=>e.kind==='pressure')){const g=c.createRadialGradient(836,470,240,836,470,920);g.addColorStop(0,'#4b130000');g.addColorStop(1,'#891b1640');c.fillStyle=g;c.fillRect(0,0,1672,941);}c.restore();}
 speak(message){if(message?.userId&&message.text)this.bubbles.set(message.userId,{text:String(message.text).slice(0,280),until:Date.now()+Math.min(12000,5000+String(message.text).length*35)});}
 speech(c,{time,width,height,cssScale}){for(const [id,b]of this.bubbles){if(Date.now()>b.until){this.bubbles.delete(id);continue;}const a=this.anchors.get(id);if(a)paintSpeechBubble(c,b.text,{...a,width,height,cssScale});}}
 signs(c,area){for(const n of GRIP_MAPS[area]?.nodes||[]){if(n.kind==='door'){const x=n.anchor.x,y=n.anchor.y;fill(c,x-89,y-19,178,28,'#2c1b11dc',3);text(c,n.name,x,y+1,15,'#e5bf84');}else if(n.kind==='booth'){fill(c,n.anchor.x-14,434,28,24,'#362015e8',3);text(c,n.id.slice(-1),n.anchor.x,452,16,'#e5bf84');}}}
 clinic(c){
  const polygon=(points,color)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#281c15';c.lineWidth=4;c.stroke();};
  c.save();c.lineJoin='round';c.shadowColor='#10090499';c.shadowBlur=13;c.shadowOffsetY=8;
  fill(c,110,527,13,212,'#5d4230',2);fill(c,324,527,12,212,'#5d4230',2);
  polygon([[92,552],[114,506],[307,505],[350,550],[327,570],[113,570]],'#65543b');polygon([[114,506],[221,492],[307,505],[350,550],[92,552]],'#8b7653');
  c.shadowBlur=0;c.shadowOffsetY=0;for(let x=119;x<332;x+=25){c.strokeStyle='#392a1d66';c.lineWidth=2;c.beginPath();c.moveTo(x,532);c.lineTo(x-4,552);c.stroke();}
  fill(c,128,570,182,35,'#302216',3);text(c,'ENFERMERÍA',219,594,21,'#e1c997');
  fill(c,123,674,196,57,'#61432c',2);polygon([[111,672],[312,667],[335,685],[126,693]],'#9c7446');
  c.strokeStyle='#352417';c.lineWidth=2;for(const y of [698,713,727]){c.beginPath();c.moveTo(130,y);c.lineTo(316,y-4);c.stroke();}
  fill(c,166,695,102,42,'#ab9c76',2);fill(c,207,700,19,32,'#813e2f',1);fill(c,197,710,39,12,'#813e2f',1);
  const im=this.image('/juegos/survival/survival-atlas.png');if(im)for(const [i,index]of [24,25].entries()){const [x,y,w,h]=ITEM_ART_RECTS[index];c.drawImage(im,x,y,w,h,153+i*85,631,45*w/h,45);}
  c.restore();
 }

 hud(c,s,selfId){const r=s.round,p=pulseAt(s),bands=precision(s),a=r.actors[selfId],x=576,y=785,w=520,bx=x+18,bw=w-36;fill(c,x,y,w,104,'#1d100df5',8);c.strokeStyle='#bd7b3c';c.lineWidth=1;c.strokeRect(x+3,y+3,w-6,98);text(c,r.final?'GRAN FINAL':'CLASIFICATORIA '+r.number,x+18,y+23,17,'#e7bd87','left');text(c,(r.members.length-r.falls.length)+' EN COMPETENCIA',x+w-18,y+23,17,'#e7bd87','right');fill(c,bx,y+36,bw,15,'#100a08',3);fill(c,bx+bw*(bands.center-bands.good),y+36,bw*bands.good*2,15,'#9b672d',0);fill(c,bx+bw*(bands.center-bands.perfect),y+36,bw*bands.perfect*2,15,'#f3d89b',0);if(p.progress>=0&&p.progress<=1)fill(c,bx+bw*p.progress,y+32,3,23,'#fff4db',0);const result=a?.lastResult,label=result&&s.clock-result.clock<750?{perfect:'¡PERFECTO! +4',good:'BIEN +2',fail:'FALLO −6',miss:'SIN RESPUESTA −6'}[result.result]:'ESPACIO · AFERRARSE';text(c,label,836,y+80,19,'#ffb060');text(c,a?Math.ceil(a.stamina)+'%':'GRADAS',x+w-18,y+80,17,'#efcf9e','right');}

 caption(c,line){fill(c,265,783,1142,92,'#140d0dec');c.font='600 27px "World Condensed",sans-serif';const words=line.split(' ');let lines=[''];for(const word of words){const next=(lines.at(-1)+' '+word).trim();if(c.measureText(next).width>1070)lines.push(word);else lines[lines.length-1]=next;}for(const [i,line]of lines.entries())text(c,line,836,819+i*31,27);}
}
