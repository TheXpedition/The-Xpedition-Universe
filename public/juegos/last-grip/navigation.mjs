import {hasFloor,clearPoint,worldPath,stepWorld} from '../world-motion.mjs';
const rect=(id,x,y,w,h)=>({id,x,y,w,h,height:1000,solid:true,blockJump:true});
const door=(id,name,x,y,anchorX,anchorY,to,spawn)=>({id,kind:'door',name,x,y,anchor:{x:anchorX,y:anchorY},to,spawn,range:78});
const map=(id,name,spawn,floors,props,nodes)=>({id,name,spawn,width:1672,height:941,bounds:[0,0,1672,941],projection:'front',boundedFloor:true,floors,props,nodes});
export const CLINIC_POINT={x:225,y:774};
export const BOOTHS=[686,793,898,1010].map((x,i)=>({id:'booth-'+(i+1),kind:'booth',name:'Vestidor '+(i+1),x,y:605,anchor:{x,y:561},range:57,hit:[x-50,435,x+50,622]}));
export const GRIP_MAPS={
 runway:map('runway','Pista de llegada',[820,690],[
  [[120,585],[630,525],[1470,525],[1540,649],[1340,780],[990,854],[600,760],[330,675],[120,670]]
 ],[rect('cargo',250,692,290,90),rect('foreground',720,840,440,150)],
 [door('to-entrance','Entrada al recinto',1020,552,1020,500,'entrance',[670,700])]),
 entrance:map('entrance','Acceso principal',[670,700],[
  [[250,700],[535,620],[760,561],[1000,541],[1100,578],[1020,618],[1240,715],[1100,797],[590,813],[300,754]]
 ],[rect('crate-left',367,630,112,76),rect('right-post',951,635,58,118),rect('right-crates',1263,665,175,140)],
 [door('to-runway','Pista de llegada',620,756,620,785,'runway',[1020,588]),door('to-monitor','Plaza del monitor',1030,575,1030,525,'monitor',[827,804])]),
 monitor:map('monitor','Plaza del monitor',[827,804],[
  [[100,746],[258,715],[531,715],[650,721],[1035,718],[1395,735],[1530,770],[1435,848],[1190,870],[1000,824],[580,848],[300,800],[120,793]]
 ],[rect('speaker-left',406,677,165,74),rect('speaker-right',1289,684,188,78),rect('medical-counter',223,705,228,58)],
 [door('to-entrance','Acceso principal',821,823,821,853,'entrance',[1010,610]),door('to-changing','Vestidores',158,770,140,825,'changing',[890,769]),door('to-stands','Gradas',1455,794,1455,743,'stands',[868,833]),{id:'clinic',kind:'clinic',name:'Pedir cita',...CLINIC_POINT,anchor:{x:223,y:679},range:88}]),
 changing:map('changing','Vestidores',[890,769],[
  [[225,718],[561,677],[730,680],[1040,673],[1260,701],[1460,733],[1370,816],[1090,853],[510,850],[302,789]],
  [[730,688],[1040,688],[1040,619],[730,619]],
  [[515,588],[1051,588],[1051,645],[515,645]]
 ],[rect('bench-left',422,645,326,42),rect('bench-right',1369,658,301,60),rect('basin-left',266,585,380,66),rect('lockers',1430,570,310,110)],
 [...BOOTHS,door('to-monitor','Plaza del monitor',867,822,867,855,'monitor',[190,774])]),
 stands:map('stands','Gradas de espectadores',[868,833],[
  [[585,687],[733,612],[918,624],[1110,641],[1415,684],[1420,752],[1110,801],[717,801]],
  [[610,772],[1130,772],[1030,900],[742,900]],
  [[640,655],[820,655],[820,583],[715,575]]
 ],[rect('left-crate',416,731,115,115),rect('rail-right',1470,737,95,100)],
 [door('to-monitor','Plaza del monitor',871,856,871,887,'monitor',[1425,793]),door('to-platform','Plataforma de presentación',763,612,763,559,'platform',[1090,840])]),
 platform:map('platform','Plataforma de presentación',[1090,840],[
  [[362,594],[800,565],[1380,581],[1422,632],[1230,705],[659,668],[360,639]],
  [[1050,673],[1260,701],[1200,895],[900,895],[950,760]]
 ],[rect('speaker',561,534,207,71),rect('crate-top',688,542,140,53),rect('boxes-right',1410,563,213,68),rect('post-front',898,713,72,62)],
 [door('to-stands','Volver a las gradas',1090,854,1090,884,'stands',[780,642])])
};
export const navigable=(area,x,y,radius=11)=>{const m=GRIP_MAPS[area];return !!m&&Number.isFinite(x)&&Number.isFinite(y)&&hasFloor(m,x,y)&&clearPoint(m,x,y,0,radius);};
export function nearestFloor(area,x,y){const m=GRIP_MAPS[area];if(navigable(area,x,y))return {x,y};let best=null,distance=Infinity;for(let py=17;py<941;py+=34)for(let px=17;px<1672;px+=34){const d=Math.hypot(px-x,py-y);if(d<distance&&navigable(area,px,py,17)){distance=d;best={x:px,y:py};}}return best||{x:m.spawn[0],y:m.spawn[1]};}
export function placeAttendee(p,area,point=GRIP_MAPS[area].spawn){const v=nearestFloor(area,point[0],point[1]);Object.assign(p,{area,...v,z:0,vz:0,grounded:true,path:[],input:null,moving:false,navVersion:1,autoDoorLock:GRIP_MAPS[area].nodes.find(n=>n.kind==='door'&&Math.hypot(n.x-v.x,n.y-v.y)<n.range+16)?.id||null});}
export function ensureAttendee(p){if(!GRIP_MAPS[p.area])p.area='stands';if(p.navVersion!==1||!navigable(p.area,p.x,p.y)){const m=GRIP_MAPS[p.area],v=nearestFloor(p.area,Number.isFinite(p.x)?p.x:m.spawn[0],Number.isFinite(p.y)?p.y:m.spawn[1]);Object.assign(p,{...v,z:0,vz:0,grounded:true,path:[],input:null,navVersion:1});}if(p.autoDoorLock===undefined)p.autoDoorLock=GRIP_MAPS[p.area].nodes.find(n=>n.kind==='door'&&Math.hypot(n.x-p.x,n.y-p.y)<n.range+16)?.id||null;p.path||=[];}
export function nearbyNode(p,{interactiveOnly=false}={}){return GRIP_MAPS[p.area]?.nodes.filter(n=>!interactiveOnly||n.kind!=='door').map(n=>({...n,distance:Math.hypot(n.x-p.x,n.y-p.y)})).filter(n=>n.distance<=n.range).sort((a,b)=>a.distance-b.distance)[0]||null;}
export function nodeAt(area,x,y){return GRIP_MAPS[area]?.nodes.find(n=>n.hit?x>=n.hit[0]&&x<=n.hit[2]&&y>=n.hit[1]&&y<=n.hit[3]:Math.hypot(x-n.anchor.x,y-n.anchor.y)<66)||null;}
const lineClear=(area,a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));for(let i=0;i<=n;i++)if(!navigable(area,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,14))return false;return true;};
export function gripPath(area,from,target){const m=GRIP_MAPS[area],raw=worldPath(m,from,target);if(!raw.length)return Math.hypot(from.x-target.x,from.y-target.y)<25?[{x:from.x,y:from.y}]:[];const points=[],chain=[from,...raw];let i=0;while(i<chain.length-1){let j=chain.length-1;while(j>i+1&&!lineClear(area,chain[i],chain[j]))j--;points.push(chain[j]);i=j;}if(navigable(area,target.x,target.y,14)&&lineClear(area,points.at(-1),target))points.push({x:target.x,y:target.y});return points;}
export function stepAttendee(p,input,seconds){ensureAttendee(p);let dt=seconds;while(dt>0){const chunk=Math.min(.05,dt);stepWorld(p,input,chunk,GRIP_MAPS[p.area]);dt-=chunk;}}
export function walkThroughDoor(p){const doors=GRIP_MAPS[p.area].nodes.filter(n=>n.kind==='door'),locked=doors.find(n=>n.id===p.autoDoorLock);if(locked&&Math.hypot(p.x-locked.x,p.y-locked.y)>locked.range+16)p.autoDoorLock=null;const door=doors.find(n=>n.id!==p.autoDoorLock&&Math.hypot(p.x-n.x,p.y-n.y)<44);if(door){placeAttendee(p,door.to,door.spawn);return door;}return null;}
const monitorSpots=[];
for(const y of [755,790,825,857])for(let x=410;x<1440;x+=95)if(navigable('monitor',x,y,18)&&!GRIP_MAPS.monitor.nodes.some(n=>n.kind==='door'&&Math.hypot(n.x-x,n.y-y)<54))monitorSpots.push({x,y});
export function monitorSpot(index){return monitorSpots[index%monitorSpots.length];}
export function exitTowards(area,destination){const queue=[[area,[]]],seen=new Set([area]);while(queue.length){const [current,path]=queue.shift();if(current===destination)return path[0]||null;for(const n of GRIP_MAPS[current].nodes.filter(n=>n.kind==='door'))if(!seen.has(n.to)){seen.add(n.to);queue.push([n.to,[...path,n]]);}}return null;}
