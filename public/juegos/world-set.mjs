// Illustrated prop textures are individual entities. Floors/colliders, avatars,
// flames, shadows, camera and speech remain independent engine objects.
const TAU=Math.PI*2;
export class WorldPropArt{
 constructor(){this.images=new Map();}
 get(id){let im=this.images.get(id);if(!im){im=new Image();im.src='/juegos/set/'+id+'.webp';this.images.set(id,im);}return im.complete&&im.naturalWidth?im:null;}
 draw(c,p,time){
  const id=p.type==='bench'?'bench':['cabin','booth'].includes(p.type)?'cabin':p.type==='torch'?'torch':p.type==='flag'?'banner':p.type==='rock'&&!p.platform?'ice':p.id==='stage'||p.type==='council'?'stage':null;if(!id)return false;
  const im=this.get(id);if(!im)return false;const x=p.x,y=p.y*.62,w=id==='stage'?(p.id==='stage'?650:350):id==='bench'?p.w*1.06:id==='cabin'?p.w*1.4:id==='ice'?p.w*1.6:id==='torch'?p.height*.65:120,h=w*im.naturalHeight/im.naturalWidth;
  c.save();c.translate(x,y+(id==='stage'?90:id==='bench'?p.h*.25:id==='cabin'?p.h*.55:8));
  if(id==='banner')c.transform(1,0,Math.sin(time*1.4+x)*.012,1,0,0);
  c.drawImage(im,-w/2,-h,w,h);
  if(id==='torch')this.flame(c,0,-h+12,time+x*.01,Math.min(1.4,p.height/140));
  c.restore();return true;
 }
 lectern(c){const im=this.get('stage');if(!im)return;const w=650,h=w*im.naturalHeight/im.naturalWidth,x=900-w/2,y=420*.62+90-h;const sx=im.naturalWidth*.348,sy=im.naturalHeight*.464,sw=im.naturalWidth*.298,sh=im.naturalHeight*.275;c.drawImage(im,sx,sy,sw,sh,x+w*.348,y+h*.464,w*.298,h*.275);}
 flame(c,x,y,t,s=1){c.save();c.translate(x,y);c.scale(s,s);const glow=c.createRadialGradient(0,-20,2,0,-20,95);glow.addColorStop(0,'#ffc65a65');glow.addColorStop(.6,'#ff831923');glow.addColorStop(1,'#ff771000');c.fillStyle=glow;c.fillRect(-95,-115,190,190);const f=Math.sin(t*7)*5;c.beginPath();c.moveTo(-19,0);c.bezierCurveTo(-35,-24,-10,-44,-13,-68);c.bezierCurveTo(4,-53,3,-42,8,-41);c.bezierCurveTo(15,-61,13,-77,20+f,-86);c.bezierCurveTo(13,-46,44,-27,23,0);c.closePath();c.fillStyle='#ed7528';c.fill();c.beginPath();c.moveTo(-11,0);c.quadraticCurveTo(-20,-21,3+f,-46);c.quadraticCurveTo(1,-23,13,-17);c.quadraticCurveTo(21,-4,8,3);c.fillStyle='#ffcf50';c.fill();c.fillStyle='#ffeaa1';c.beginPath();c.ellipse(0,-5,6,13,0,0,TAU);c.fill();c.restore();}
}
export function polarAtmosphere(c,w,h,time,night,cameraX=0){
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,night?'#07172f':'#225d89');sky.addColorStop(.55,night?'#173d63':'#79c8e0');sky.addColorStop(1,night?'#356481':'#cceff4');c.fillStyle=sky;c.fillRect(0,0,w,h);
 if(night){
  c.save();c.globalAlpha=.12;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-80,h*.08+i*24);for(let x=-80;x<w+90;x+=45)c.lineTo(x,h*.15+i*24+Math.sin(x/180+time*.02+i)*40);for(let x=w+90;x>-80;x-=45)c.lineTo(x,h*.36+i*12+Math.sin(x/200+time*.02+i)*35);c.closePath();c.fillStyle=i%2?'#3aaabb':'#58b9a5';c.fill();}c.restore();
  c.fillStyle='#e2eaf1';for(let i=0;i<90;i++){const x=(i*137.31)%w,y=(i*79.17)%(h*.44);c.globalAlpha=.2+(i%7)/10;c.fillRect(x,y,i%9?1:2,i%9?1:2);}c.globalAlpha=1;c.fillStyle='#fff0b6';c.beginPath();c.ellipse(w*.8,h*.18,27,27,0,0,TAU);c.fill();
 }
 // Different parallax speeds and several faceted surfaces per mountain.
 for(let layer=0;layer<3;layer++){const base=h*(.50+layer*.085),shift=cameraX*(.025+layer*.02);for(let i=-1;i<7;i++){const x=i*270-shift%270,peak=base-160-(i%3)*36;
  c.beginPath();c.moveTo(x-200,base+65);c.lineTo(x-68,peak+75);c.lineTo(x+10,peak);c.lineTo(x+112,peak+120);c.lineTo(x+167,peak+73);c.lineTo(x+315,base+65);c.closePath();c.fillStyle=['#345878','#3e7698','#5795b1'][layer];c.fill();
  for(const [points,color]of [[[[x+10,peak],[x+38,peak+130],[x-80,base+65],[x-68,peak+75]],['#81bad1','#a9d4e2','#c5e7ed'][layer]],[[[x+10,peak],[x+112,peak+120],[x+100,base+65],[x+38,peak+130]],['#446985','#5287a2','#85b8cc'][layer]],[[[x+167,peak+73],[x+210,base+65],[x+128,base+65]],'#add5df']]){c.beginPath();points.forEach(([px,py],j)=>j?c.lineTo(px,py):c.moveTo(px,py));c.closePath();c.fillStyle=color;c.fill();}
 }}
}
export function drawWorldMinimap(canvas,map,players,selfId){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=10,s=Math.min((w-pad*2)/map.width,(h-pad*2)/map.height);c.clearRect(0,0,w,h);c.fillStyle='#0b2236e8';c.fillRect(0,0,w,h);c.save();c.translate((w-map.width*s)/2,(h-map.height*s)/2);c.scale(s,s);for(const floor of map.floors){c.beginPath();floor.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=map.ground==='wood'?'#8e7060':'#79a9bd';c.fill();c.strokeStyle='#b3d9e5';c.lineWidth=6;c.stroke();}for(const p of map.props){c.fillStyle=p.portal?'#ffd577':p.type==='bench'?'#aa7955':'#365976';c.fillRect(p.x-p.w/2,p.y-p.h/2,p.w,p.h);}for(const p of players){c.fillStyle=p.userId===selfId?'#ffde78':'#96eeed';c.beginPath();c.arc(p.x,p.y,p.userId===selfId?31:22,0,TAU);c.fill();c.strokeStyle='#0b2236';c.lineWidth=8;c.stroke();}c.restore();}
