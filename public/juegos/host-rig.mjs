import {WORLD_HOSTS} from './host-catalog.mjs';
export {WORLD_HOSTS};
const hostIds=new Set(WORLD_HOSTS.map(h=>h.id));
// Withdrawn after visual review. A replacement must first match the reference
// in the static comparison. Never reuse this assembly for another character.
export const HOST_RIG_ENABLED=false;
export function hostPose(id,time,{animation='neutral',walking=false}={}){
 const t=time/1000,walk=walking?Math.sin(t*7):0,talk=['talk','laugh','point'].includes(animation),breath=Math.sin(t*2.1),gesture=talk?Math.sin(t*3.7)*.08:0;
 return {id:hostIds.has(id)?id:'bonju',bob:walking?-Math.abs(walk)*3:animation==='laugh'?Math.sin(t*13)*2:breath*.7,body:walking?walk*.01:breath*.002,head:animation==='sad'?.08:animation==='angry'?.07:animation==='laugh'?-.05:Math.sin(t*1.7)*.012,hair:Math.sin(t*1.3)*.014+walk*.02,ear:Math.sin(t*3.2)*.055,skirt:walk*.025+Math.sin(t*1.8)*.004,upperL:walking?walk*.25:animation==='surprise'?.8:animation==='angry'?.28:.1,foreL:animation==='surprise'?1.8:animation==='angry'?.8:.04,upperR:walking?-walk*.25:animation==='point'?-.9:animation==='farewell'?-1.8:animation==='surprise'?-.8:talk?-.45+gesture:-.1,foreR:animation==='point'?-.55:animation==='farewell'?-.8+Math.sin(t*7)*.15:animation==='surprise'?-1.8:talk?-.85+gesture:-.04,walk,mouth:animation==='surprise'?.9:talk?.25+Math.abs(Math.sin(t*14))*.65:0,blink:(t%4.7)<.14,animation};
}
// One decoded atlas at a time. Participants render the host; only server-authorized
// directors can change who the host is or send a line/gesture.
export class WorldHostRig{
 constructor(){this.id=null;this.sheet=null;this.manifest=null;this.epoch=0;}
 async select(id){if(!hostIds.has(id))id='bonju';if(this.id===id)return;this.id=id;this.sheet=null;this.manifest=null;const epoch=++this.epoch;try{const r=await fetch('/juegos/hosts/'+id+'.json',{cache:'no-cache'});if(!r.ok)return;const data=await r.json();if(epoch!==this.epoch)return;const img=new Image();img.src='/juegos/hosts/'+id+'.webp';if(img.decode)await img.decode();else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});if(epoch===this.epoch){this.sheet=img;this.manifest=data;}}catch{if(epoch===this.epoch)this.id=null;}}
 draw(c,{id='bonju',x,y,height=220,time=0,animation='neutral',facing='front',walking=false}={}){if(!HOST_RIG_ENABLED)return false;void this.select(id);if(!this.sheet||!this.manifest)return false;drawHost(c,this.sheet,this.manifest,{x,y,height,time,animation,facing,walking});return true;}
}
export function drawHost(c,sheet,manifest,{x=0,y=0,height=220,time=0,animation='neutral',facing='front',walking=false}={}){
 const seated=animation==='sit';
 const pose=hostPose(manifest.id,time,{animation,walking}),maria=manifest.id==='maria-villegas',parts=manifest.views[facing]||manifest.views.front,back=facing==='back',side=facing==='side',quarter=facing==='quarter',skin=maria?'#f3bc80':'#813517';
 const image=(name,x,y,w,h,angle=0,px=.5,py=0)=>{const p=parts[name]||manifest.views.front[name];if(!p)return;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(sheet,p.x,p.y,p.w,p.h,-w*px,-h*py,w,h);c.restore();};
 const segment=(name,a,b,w)=>{image(name,a[0],a[1],w,Math.hypot(b[0]-a[0],b[1]-a[1])+7,Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);};
 const arm=(which,shoulder,upper,fore)=>{const elbow=[shoulder[0]-Math.sin(upper)*155,shoulder[1]+Math.cos(upper)*155],angle=upper+fore,wrist=[elbow[0]-Math.sin(angle)*137,elbow[1]+Math.cos(angle)*137];c.fillStyle=skin;for(const [jx,jy]of [shoulder,elbow,wrist]){c.beginPath();c.ellipse(jx,jy,12,13,0,0,Math.PI*2);c.fill();}segment('upper'+which,shoulder,elbow,which==='L'?41:42);segment('fore'+which,elbow,wrist,32);image('hand'+which,wrist[0],wrist[1]-3,43,75,angle);image('brace'+which,wrist[0],wrist[1]-6,39,12,angle,.5,.5);};
 c.save();c.translate(x,y);c.scale(height/1000,height/1000);c.translate(0,pose.bob);c.rotate(pose.body);
 // Leg chains and shoes remain independent behind the skirt, including walking.
 for(const [i,which]of ['L','R'].entries()){const sign=i?1:-1,stride=pose.walk*sign,hip=[sign*31,seated?-410:-545],knee=[sign*30+stride*18+(seated?25:0),(seated?-245:-293)-Math.max(0,stride)*8],ankle=[sign*31+stride*35+(seated?40:0),-60-Math.max(0,stride)*22];c.fillStyle=skin;for(const [jx,jy]of [hip,knee,ankle]){c.beginPath();c.ellipse(jx,jy,which==='L'?18:19,15,0,0,Math.PI*2);c.fill();}segment('thigh'+which,hip,knee,57);segment('calf'+which,knee,ankle,47);image('foot'+which,ankle[0]+(side?14:0),ankle[1]-6,side?90:72,70,walking?stride*.05:0);}
 if(seated)c.translate(0,135);
 arm('L',[-78,-750],pose.upperL,pose.foreL);
 if(facing==='front'&&parts.dress){const p=parts.dress,h=(maria?358:510)-(seated?(maria?95:135):0),w=maria?174:202;for(let i=0;i<24;i++){const u=i/24,curve=Math.sin(u*Math.PI),dx=walking?Math.sin(time/180-u)*curve*4:seated?curve*14:0,wide=w*(1+(seated?curve*.08:0));c.save();c.beginPath();c.rect(-wide/2+dx-1,-572+h*u,wide+2,h/24+1);c.clip();c.drawImage(sheet,p.x,p.y,p.w,p.h,-wide/2+dx,-572,wide,h);c.restore();}}else{image('skirtUpper',0,-572,side?133:174,maria?178:245,pose.skirt);image('skirtLower',0,maria?-425:-411,side?126:174,maria?232:355,pose.skirt*.65);}
 // Back hair belongs behind the neck and torso; its roots do not slide on the head.
 image('hairBack',side?-38:0,-1000,side?310:355,325,pose.hair);
 image('torso',0,-767,side?140:174,205);
 if(maria)image('belt',0,-571,side?112:118,24);
 arm('R',[side?40:78,-750],pose.upperR,pose.foreR);
 c.save();c.translate(0,-756);c.rotate(pose.head);
 image('head',side?55:0,-164,side?138:151,170,0,.5,0);
 if(!back){image('earL',side?-29:-71,-85,maria?18:24,maria?40:82,pose.ear);if(!side)image('earR',73,-85,maria?18:24,maria?40:82,-pose.ear);}
 if(!back&&pose.mouth){const mx=side?54:quarter?27:7,my=maria?-68:-56;c.save();c.translate(mx,my);c.fillStyle=maria?'#681c25':'#511b1e';c.strokeStyle='#20130f';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,animation==='surprise'?7:13,3+pose.mouth*7,0,0,Math.PI*2);c.fill();c.stroke();if(animation!=='surprise'){c.fillStyle='#fff2d5';c.fillRect(-8,-3,16,3);}c.restore();}
 if(!back&&pose.blink){c.strokeStyle=skin;c.lineWidth=9;c.lineCap='round';for(const eye of side?[[34,-87,62,-83]]:[[-45,-87,-13,-82],[14,-82,48,-87]]){c.beginPath();c.moveTo(eye[0],eye[1]);c.lineTo(eye[2],eye[3]);c.stroke();}c.strokeStyle='#1b1716';c.lineWidth=2.5;for(const eye of side?[[34,-85,62,-84]]:[[-45,-85,-13,-83],[14,-83,48,-85]]){c.beginPath();c.moveTo(eye[0],eye[1]);c.lineTo(eye[2],eye[3]);c.stroke();}}
 image('hairFront',side?-38:0,-245,side?260:355,330,pose.hair*.55);
 c.restore();c.restore();
}
