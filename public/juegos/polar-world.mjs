// All World zones share one illustrated material and prop library.
// Artwork is decorative: authoritative walkable polygons and colliders stay in world-maps.
import {POLAR_ART_REVISION} from './polar-revision.mjs';
const Y=.62,TAU=Math.PI*2,images=new Map(),patterns=new WeakMap();
export function polarPropAsset(p){if(p.art)return {id:p.art,legacy:false};return {id:p.type==='bigx'?null:p.id==='stage'||p.type==='council'?'stage':p.type==='sofa'&&p.vertical?'chair':p.type==='flag'?'banner':p.type==='booth'?'cabin':p.type==='trail'?'rock':p.type==='door'?'sign':p.type,legacy:['torch','flag','cabin','booth','bench'].includes(p.type)||p.id==='stage'||p.type==='council'};}
function asset(id,legacy=false){const key=(legacy?'set/':'polar/')+id;let im=images.get(key);if(!im){im=new Image();im.src='/juegos/'+key+'.webp?v='+POLAR_ART_REVISION;images.set(key,im);}return im.complete&&im.naturalWidth?im:null;}
function shape(c,points,fill,stroke,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function surface(c,id){const im=asset(id);if(!im)return null;let cache=patterns.get(c);if(!cache){cache=new Map();patterns.set(c,cache);}if(cache.has(id))return cache.get(id);const p=c.createPattern(im,'repeat');p.setTransform(new DOMMatrix().scale(id==='wood'?.65:1.05));cache.set(id,p);return p;}
function badge(c,text,x,y){c.save();c.font='700 16px "World Condensed",sans-serif';c.textAlign='center';const w=Math.max(65,c.measureText(text).width+28);c.fillStyle='#102a40ed';c.strokeStyle='#91b7c9';c.lineWidth=1.5;c.beginPath();c.roundRect(x-w/2,y-24,w,30,5);c.fill();c.stroke();c.fillStyle='#f4e6c2';c.fillText(text,x,y-3);c.restore();}

// Painted architectural landmarks are ground-level scenery, never fake collision objects.
// They use the exact same world coordinates as server-authoritative movement.
function drawCampPlaza(c){
 c.save();c.translate(2580,2090);c.fillStyle='#16426430';c.beginPath();c.ellipse(0,35,425,230,0,0,TAU);c.fill();
 const deck=[[-330,-170],[330,-170],[410,-90],[410,135],[310,210],[-310,210],[-410,135],[-410,-90]];
 shape(c,deck,'#79533b','#493827',8);c.save();shape(c,deck);c.clip();const wood=surface(c,'wood');c.fillStyle=wood||'#a8784c';c.fillRect(-420,-180,840,400);c.restore();
 c.strokeStyle='#dfc5a0';c.lineWidth=3;c.beginPath();deck.forEach(([x,y],i)=>i?c.lineTo(x*.96,y*.96):c.moveTo(x*.96,y*.96));c.closePath();c.stroke();c.restore();
}
function drawBridgeArtwork(c,x,y,w,h,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);
 const half=w/2;shape(c,[[-half,-h/2],[half,-h/2],[half+10,h/2],[-half-10,h/2]],'#805231','#443328',9);
 c.save();c.beginPath();c.rect(-half,-h/2,w,h);c.clip();
 for(let xx=-half;xx<half;xx+=32){c.fillStyle=xx%3===0?'#c28b58':'#ab7247';c.fillRect(xx,-h/2,28,h);c.strokeStyle='#613d2c';c.lineWidth=2;c.strokeRect(xx,-h/2,28,h);}
 c.restore();for(const sy of [-1,1]){c.strokeStyle='#493123';c.lineWidth=7;c.beginPath();c.moveTo(-half-18,sy*(h/2+10));c.lineTo(half+18,sy*(h/2+10));c.stroke();for(let i=0;i<7;i++){const px=-half+i*w/6;c.strokeStyle='#885631';c.lineWidth=9;c.beginPath();c.moveTo(px,sy*(h/2+4));c.lineTo(px,sy*(h/2+40));c.stroke();c.fillStyle='#c8b7a1';c.fillRect(px-6,sy*(h/2+39),12,7);}}
 c.restore();
}
function drawGlacierCrevasses(c,map){
 c.save();
 const faces=map.id==='base'?[{x:3600,y:1590,w:510},{x:1510,y:2730,w:340},{x:3290,y:2550,w:450}]:[];
 for(const f of faces){c.translate(f.x,f.y);shape(c,[[-f.w*.5,0],[-f.w*.16,-50],[f.w*.2,-26],[f.w*.5,13],[f.w*.12,39],[-f.w*.2,33]],'#1c78b670','#d5faff88',6);shape(c,[[-f.w*.15,5],[f.w*.08,-25],[f.w*.2,12],[-f.w*.09,32]],'#7de5ff88');c.translate(-f.x,-f.y);}
 c.restore();
}
function frostRim(c,map){
 if(['wood','redwood','water'].includes(map.ground))return;
 c.save();c.strokeStyle='#f6fdff80';c.lineWidth=11;c.lineJoin='round';
 for(const [i,f] of map.floors.entries()){if(map.floorStyles?.[i]==='wood')continue;c.beginPath();f.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();}
 c.restore();
}
function drawTrailDetails(c,map){
 if(!['base','bosque','montana'].includes(map.id))return;
 c.save();c.beginPath();for(const [i,f] of map.floors.entries()){if(map.floorStyles?.[i]==='wood')continue;f.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}c.clip();
 for(const path of map.paths){
  c.lineCap='round';c.lineJoin='round';c.beginPath();path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle='#6a99b31c';c.lineWidth=91;c.stroke();
  c.strokeStyle='#f9fdff35';c.lineWidth=62;c.stroke();
  c.strokeStyle='#a5cde325';c.lineWidth=2;c.setLineDash([5,23]);c.stroke();c.setLineDash([]);
 }
 c.restore();
}

export class PolarWorldArt{
 backdrop(c,w,h,time,map,cameraX=0,night=false){
  if(['interior','studio'].includes(map.sky)){c.fillStyle='#2a2022';c.fillRect(0,0,w,h);return;}
  night=night||map.id==='eliminacion'||map.sky==='aurora';const im=asset(map.sky==='cave'?'cavern':night?'night':'panorama');c.fillStyle='#6ab2df';c.fillRect(0,0,w,h);if(im){const sourceH=map.sky==='mountain'?im.height*.66:im.height,scale=Math.max(w/im.width,h/sourceH),iw=im.width*scale*1.1,ih=sourceH*scale*1.1;c.drawImage(im,0,0,im.width,sourceH,(w-iw)/2-Math.sin(cameraX/3000)*35,(h-ih)/2,iw,ih);}
  if(map.sky==='cave'){c.fillStyle='#051d4520';c.fillRect(0,0,w,h);}
  else if(['interior','studio'].includes(map.sky)){c.fillStyle='#2a2022';c.fillRect(0,0,w,h);}
  else if(night){c.fillStyle='#071d5715';c.fillRect(0,0,w,h);}
 }
 ground(c,map,time,night){
  c.save();c.scale(1,Y);const water=map.ground==='water'?surface(c,'water'):null;
  if(map.ground==='water'){c.fillStyle=water||'#237caa';c.fillRect(-900,260,map.width+1800,map.height+850);c.save();c.globalAlpha=.12;c.translate(Math.sin(time*.35)*12,Math.cos(time*.22)*8);c.fillStyle=water||'#70c7de';c.fillRect(-900,260,map.width+1800,map.height+850);c.restore();}
  for(const [i,floor]of map.floors.entries()){
   const wood=map.ground==='wood'||map.ground==='redwood'||map.id==='muelle'||map.floorStyles?.[i]==='wood',ice=map.ground==='ice',id=wood?'wood':ice?'ice':'snow';
   const drop=wood?36:map.sky==='mountain'?280:110;shape(c,floor.map(([x,y])=>[x,y+drop]),wood?'#593e30':surface(c,'ice')||'#2867a3','#234b70',3);
   if(!wood)for(let k=0;k<floor.length;k++){const a=floor[k],b=floor[(k+1)%floor.length];if(b[0]<a[0]){shape(c,[a,b,[b[0],b[1]+drop],[a[0],a[1]+drop]],surface(c,'ice')||'#3a74b8','#457cac',1);c.save();c.globalAlpha=.3;shape(c,[a,b,[b[0],b[1]+drop],[a[0],a[1]+drop]],'#153e88');c.restore();}}
   // An opaque ground plane remains underneath tiled materials at every atlas zoom.
   shape(c,floor,({wood:'#916542',snow:'#e1effb',ice:'#91d5f1'}[id]));
   shape(c,floor,surface(c,id),wood?'#553822':'#d9f5ff',wood?4:7);
   if(!wood){c.save();c.beginPath();floor.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();const g=c.createLinearGradient(0,240,0,map.height);g.addColorStop(0,'#b4d7f33b');g.addColorStop(.5,'#f1f7ff33');g.addColorStop(1,'#7fa9db33');c.fillStyle=g;c.fillRect(0,0,map.width,map.height);c.restore();}
  }
  // Architectural dressing follows the physics footprint, preserving access paths.
  if(map.id==='base'){
   drawGlacierCrevasses(c,map);
   drawCampPlaza(c);
   for(const [x,y,w,h,a] of [[1980,1685,290,160,0],[2380,1360,500,180,Math.PI/2],[3680,2255,540,150,0],[1685,2405,330,150,0]])drawBridgeArtwork(c,x,y,w,h,a);
  }
  frostRim(c,map);
  drawTrailDetails(c,map);
  // Packed paths follow existing server navigation paths, softly recessed in snow.
  if(map.ground==='snow'&&map.id!=='eliminacion'){c.save();c.beginPath();map.floors.forEach((f,i)=>{if(map.floorStyles?.[i]==='wood')return;f.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.closePath();});c.clip();for(const p of map.paths){c.lineCap='round';c.lineJoin='round';c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#809fca14';c.lineWidth=25;c.stroke();c.strokeStyle='#eff6ff30';c.lineWidth=17;c.stroke();}c.restore();}
  if(map.id==='eliminacion'){for(const f of map.floors)shape(c,f,'#082f7040');const glow=c.createRadialGradient(900,520,5,900,520,420);glow.addColorStop(0,'#ffb45a23');glow.addColorStop(1,'#ffb45a00');c.fillStyle=glow;c.fillRect(480,100,840,840);}
  c.restore();
  if(['interior','studio'].includes(map.sky)){
   const wall=asset(map.wall||'lodge'),edge=Math.min(...map.floors[0].map(p=>p[1]))*Y+4;
   if(wall){const wh=(map.width-130)*wall.height/wall.width;c.drawImage(wall,65,edge-wh,map.width-130,wh);}
   if(!map.wall){c.save();
   // Illustrated beams, two glimpses of Antarctica and warm cabin light are behind the walkable plane.
   for(const [i,xx]of [map.width*.23,map.width*.77].entries()){
    const ww=Math.min(210,map.width*.20),hh=220,top=edge-355;
    c.fillStyle='#51341f';c.fillRect(xx-ww/2-15,top-17,ww+30,hh+34);
    const im=asset('panorama');if(im)c.drawImage(im,Math.round(im.width*(i?.45:.12)),40,Math.round(im.width*.30),Math.round(im.height*.65),xx-ww/2,top,ww,hh);
    else{const g=c.createLinearGradient(0,top,0,top+hh);g.addColorStop(0,'#163e71');g.addColorStop(1,'#a1dafa');c.fillStyle=g;c.fillRect(xx-ww/2,top,ww,hh);}
    c.strokeStyle='#9d7042';c.lineWidth=13;c.strokeRect(xx-ww/2,top,ww,hh);
    c.strokeStyle='#633c22';c.lineWidth=7;c.beginPath();c.moveTo(xx,top);c.lineTo(xx,top+hh);c.moveTo(xx-ww/2,top+hh*.55);c.lineTo(xx+ww/2,top+hh*.55);c.stroke();
    const warm=c.createRadialGradient(xx,edge-145,6,xx,edge-145,160);warm.addColorStop(0,'#ffc97c39');warm.addColorStop(1,'#ffb84c00');c.fillStyle=warm;c.fillRect(xx-180,edge-325,360,320);
   }
   for(const xx of [65,map.width*.48,map.width-65]){c.fillStyle='#593b2b';c.fillRect(xx-20,edge-575,40,590);c.fillStyle='#b57a46';c.fillRect(xx-13,edge-572,8,578);}
   c.strokeStyle='#442b1f';c.lineWidth=20;c.beginPath();c.moveTo(65,edge-550);c.lineTo(map.width-65,edge-550);c.stroke();
   c.strokeStyle='#b98952';c.lineWidth=6;c.beginPath();c.moveTo(65,edge-538);c.lineTo(map.width-65,edge-538);c.stroke();
   c.strokeStyle='#322016';c.lineWidth=14;c.beginPath();c.moveTo(65,edge);c.lineTo(map.width-65,edge);c.stroke();
   c.restore();}
  }
  if(map.sky==='cave'){const rock=asset('rock');if(rock)for(let i=0;i<8;i++){const x=160+i*280,y=240+Math.sin(i)*45;c.drawImage(rock,x-150,y*Y-250,330,250);}}
 }
 bounds(p,im){const {id}=polarPropAsset(p);im||=asset(id,polarPropAsset(p).legacy);if(!im)return null;  let w=p.w;if(['pine'].includes(id))w=p.height*.72;else if(id==='stage')w=p.id==='stage'?650:350;else if(id==='tower')w=p.height*.85;else if(id==='telescope')w=p.height*.82;else if(id==='torch')w=p.height*.65;else if(id==='banner')w=p.height*.66;else if(id==='cabin')w=p.w*1.4;else if(['sign','pole','lamp'].includes(id))w=id==='sign'?100:p.height*.64;else if(id==='rug')w=p.w;else if(id==='rock')w=p.w*1.26;else if(id==='camera')w=p.height*.6;else if(id==='crystal')w=p.w*1.2;else if(id==='tent')w=p.w*1.15;else if(id==='fireplace')w=p.w*1.4;
  if(p.artWidth)w=p.artWidth;const h=w*im.height/im.width,x=p.x,y=p.y*Y+(id==='stage'?90:id==='rug'?p.h*Y*.5:p.h*Y*.33);
return {w,h,x,y};}
 draw(c,p,time=0,{labels=true}={}){
  if(p.type==='bigx')return true;
  if(p.type==='door'){const x=p.x,y=p.y*Y;c.save();c.strokeStyle='#f2d18b';c.lineWidth=3;c.fillStyle='#2c251d80';c.beginPath();c.roundRect(x-68,y-13,136,26,5);c.fill();c.stroke();c.fillStyle='#ffe4a2';c.font='700 15px "World Condensed",sans-serif';c.textAlign='center';c.fillText(p.label||'SALIR',x,y+5);c.restore();return true;}
  const {id,legacy}=polarPropAsset(p);
  const im=asset(id,legacy);if(!im)return true;
  const {w,h,x,y}=this.bounds(p,im);
  c.save();if(!['rug','sign','banner','pine','stage'].includes(id)){c.fillStyle='#132c4930';c.beginPath();c.ellipse(x+6,p.y*Y+9,w*.42,Math.max(7,p.h*.22),0,0,TAU);c.fill();}c.translate(x,y);if(id==='banner')c.transform(1,0,Math.sin(time*1.2+x)*.007,1,0,0);if(p.unlit)c.filter='brightness(.35) saturate(.6)';c.drawImage(im,-w/2,-h,w,h);c.filter='none';if(!p.unlit&&['lamp','pole'].includes(id))this.glow(c,0,-h*.7,65,time);
  if(id==='torch')this.glow(c,0,-h+18,60,time);
  if(id==='fireplace')this.glow(c,0,-h*.28,w*.32,time);
  if(id==='firepit')this.glow(c,0,-h*.45,w*.7,time);
  if(id==='hotspring'){c.save();c.globalAlpha=.13;c.fillStyle='#d3f3ff';for(let i=0;i<4;i++){const py=-h*.6-((time*12+i*27)%90),px=Math.sin(time*.3+i)*w*.18;c.beginPath();c.ellipse(px,py,w*.12,12,0,0,TAU);c.fill();}c.restore();}
  c.restore();if(p.label&&labels)badge(c,p.label,x,y-h-13);return true;
 }
 glow(c,x,y,r,time){const g=c.createRadialGradient(x,y,0,x,y,r*(1+Math.sin(time*5)*.04));g.addColorStop(0,'#ffd87840');g.addColorStop(1,'#ff9b3000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 get(id){return asset(id,true);}
 lectern(c){const im=asset('stage',true);if(!im)return;const w=650,h=w*im.height/im.width,x=900-w/2,y=420*Y+90-h;c.drawImage(im,im.width*.348,im.height*.464,im.width*.298,im.height*.275,x+w*.348,y+h*.464,w*.298,h*.275);}
}
