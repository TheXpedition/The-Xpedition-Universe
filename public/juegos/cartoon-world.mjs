import {drawSurvivalProp,survivalBounds} from './world-survival-art.mjs';
// Flat, editable scenery inspired by the user's animation background references.
// Physics and interaction coordinates are shared with the unchanged Canvas engine.
const Y=.62,TAU=Math.PI*2,images=new Map();
const C={ink:'#263342',snow:'#eef7ef',ice:'#a6dfe4',shadow:'#c2cce7',deep:'#5e83b0',wood:'#ad805e',woodDark:'#765647',gold:'#f6d58d'};
const closed=(c,p)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
function polygon(c,p,fill,stroke,width=2){closed(c,p);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,p,color,width=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function oval(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();}
const raster=new Set(['cabinHero','pineHero','benchSideHero','skyHero']);
function sceneImage(id,url){let im=images.get(id);if(!im){im=new Image();im.src=url||'/juegos/illustrated/'+id+'.webp?v=4';images.set(id,im);}return im.complete&&im.naturalWidth?im:null;}
function image(id){let im=images.get(id);if(!im){im=new Image();im.src='/juegos/cartoon/'+id+(raster.has(id)?'.webp':'.svg')+'?v=cartoon-valley-2';images.set(id,im);}return im.complete&&im.naturalWidth?im:null;}
export function cartoonPropAsset(p){if(['bunkhouse','cabin'].includes(p.art)||p.type==='cabin'&&!p.art)return 'cabinHero';if(p.type==='pine')return 'pineHero';return p.art||((p.id==='stage'||p.type==='council')?'councilHall':p.type==='flag'?'banner':p.type==='challenge'?'arenaGate':p.type==='booth'?'booth':p.type==='trail'?'rock':p.type==='sofa'&&p.vertical?'chair':p.type);}
function cloud(c,x,y,w){c.save();c.translate(x,y);c.scale(w/260,w/260);c.beginPath();c.moveTo(-110,5);c.bezierCurveTo(-95,-25,-74,-18,-62,-5);c.bezierCurveTo(-60,-52,-10,-58,5,-19);c.bezierCurveTo(30,-37,57,-18,55,1);c.bezierCurveTo(86,-12,105,-3,123,13);c.bezierCurveTo(57,26,-43,27,-110,5);c.fillStyle='#f7f4d8';c.fill();c.strokeStyle='#dcebdc';c.lineWidth=2;c.stroke();c.restore();}
function mountains(c,w,h,offset=0,night=false){
 const horizon=h*.6;
 const peaks=[[-.12,.35],[.07,.13],[.2,.4],[.36,.04],[.51,.33],[.65,.11],[.8,.38],[.93,.04],[1.12,.37]];
 polygon(c,[[0,horizon],...peaks.map(([x,y])=>[x*w+offset,y*h]),[w,horizon]],night?'#415b8a':'#9aaddb');
 for(let i=1;i<peaks.length-1;i+=2){const [x,y]=peaks[i],px=x*w+offset,py=y*h,bw=w*.19;polygon(c,[[px-bw, horizon],[px,py],[px+bw,horizon]],night?'#6774a7':'#c5d9ec');polygon(c,[[px,py],[px+bw,horizon],[px+bw*.12,horizon],[px-bw*.12,py+h*.16]],night?'#3f5986':'#6d9cc8');polygon(c,[[px,py],[px+bw*.38,py+h*.16],[px+bw*.05,py+h*.11],[px-bw*.06,py+h*.2],[px-bw*.22,py+h*.15]],night?'#a4b4d7':'#f0f6e8');}
 polygon(c,[[0,h*.61],[w*.14,h*.44],[w*.3,h*.56],[w*.46,h*.43],[w*.67,h*.54],[w*.85,h*.46],[w,h*.59],[w,h*.72],[0,h*.72]],night?'#304b70':'#718daa');
 for(let i=-2;i<38;i++){const x=i*w/34+offset*.2,hh=22+(i*17%29);polygon(c,[[x-8,h*.63],[x,h*.63-hh],[x+8,h*.63]],night?'#233c5b':'#466c80');}
}
function smoothPath(c,points){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length-1;i++){const a=points[i],b=points[i+1];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}if(points.length>1)c.lineTo(...points.at(-1));}
function water(c,map,time){
 const north=Math.min(...map.floors.flatMap(f=>f.map(p=>p[1])))-70;c.save();c.beginPath();c.rect(-1000,north,map.width+2000,map.height+1800);c.clip();c.fillStyle=map.sky==='cave'?'#345d84':'#337eaa';c.fillRect(-1000,north,map.width+2000,map.height+1800);
 for(let i=0;i<40;i++){const x=(i*719%(map.width+1300))-600,y=(i*353%(map.height+1200))-300,ww=100+(i*73%260);polygon(c,[[x,y],[x+ww,y-8],[x+ww+90,y+13],[x+25,y+23]],i%2?'#428eaf':'#2b749e');}
 c.strokeStyle='#a0d9dd';c.lineWidth=2;c.globalAlpha=.45;for(let i=0;i<30;i++){const x=(i*463%(map.width+900))-450,y=(i*257%(map.height+800))-150+Math.sin(time*.5+i)*3;line(c,[[x,y],[x+32,y],[x+42,y-3]],'#91ccd3',2);}c.restore();
}
function snowFloor(c,map,time){
 for(const [i,f]of map.floors.entries()){
  const wood=map.floorStyles?.[i]==='wood'||map.ground==='wood'||map.ground==='redwood'||map.id==='muelle';
  if(wood){polygon(c,f.map(([x,y])=>[x,y+32]),C.woodDark,C.ink,3);polygon(c,f,C.wood,C.ink,2);continue;}
  const drop=map.sky==='mountain'?220:130;
  polygon(c,f.map(([x,y])=>[x,y+drop]),'#6a9fc2');
  for(let k=0;k<f.length;k++){const a=f[k],b=f[(k+1)%f.length];if(b[0]>=a[0])continue;polygon(c,[a,b,[b[0],b[1]+drop],[a[0],a[1]+drop]],k%2?'#689cc4':'#82b4d4');const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];polygon(c,[a,mid,[mid[0]+16,mid[1]+drop*.9],[a[0]+30,a[1]+drop]],'#a4cfe1');}
  polygon(c,f,map.ground==='ice'?'#a1dfe2':C.snow);
  c.save();closed(c,f);c.clip();
  const patches=map.id==='base'?[[800,980,680,170],[2940,720,820,110],[4900,1070,710,150],[1020,2810,770,135],[5730,3550,870,150],[3000,3800,760,100]]:[[map.width*.25,map.height*.4,map.width*.3,70],[map.width*.7,map.height*.72,map.width*.28,65]];
  for(const [x,y,rx,ry]of patches){c.beginPath();c.moveTo(x-rx,y);c.bezierCurveTo(x-rx*.4,y-ry,x+rx*.1,y-ry,x+rx,y);c.bezierCurveTo(x+rx*.3,y+ry*.1,x-rx*.4,y+ry*.6,x-rx,y);c.fillStyle='#d3e6e5';c.fill();}
  c.restore();
  // A soft broken rim replaces the old wireframe-like platform outline.
  c.save();closed(c,f);c.strokeStyle='#fbfff3';c.lineWidth=9;c.stroke();c.restore();
 }
}
function trails(c,map){if(!map.paths?.length)return;c.save();c.beginPath();for(const f of map.floors){f.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}c.clip();c.lineJoin='round';c.lineCap='round';for(const p of map.paths){smoothPath(c,p);c.strokeStyle='#b8d1d67d';c.lineWidth=105;c.stroke();smoothPath(c,p);c.strokeStyle='#dbe7df';c.lineWidth=73;c.stroke();}c.restore();}
function courtyard(c){const x=3390,y=2670;c.save();c.translate(x,y);oval(c,0,0,475,330,'#d9dfd2');oval(c,0,0,382,267,'#c9cec4');oval(c,0,0,325,229,'#dedfcf');for(let i=0;i<24;i++){const a=i*TAU/24,b=a+TAU/24*.86,r=350,outer=383;polygon(c,[[Math.cos(a)*r,Math.sin(a)*r*.7],[Math.cos(b)*r,Math.sin(b)*r*.7],[Math.cos(b)*outer,Math.sin(b)*outer*.7],[Math.cos(a)*outer,Math.sin(a)*outer*.7]],i%3?'#9aaab0':'#8399a8','#aebbc0',2);}c.restore();}
function woodFloor(c,map){
 const f=map.floors[0],xs=f.map(p=>p[0]),ys=f.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 polygon(c,f,'#aa846d',C.ink,4);c.save();closed(c,f);c.clip();
 for(let y=top;y<bottom;y+=72){c.fillStyle=(Math.floor(y/72)%3)?'#ac866f':'#b18b71';c.fillRect(left,y,right-left,72);line(c,[[left,y],[right,y]],'#806556',2);const shift=Math.floor(y/72)%2*170;for(let x=left+shift;x<right;x+=340)line(c,[[x,y],[x,y+72]],'#94735f',2);}
 c.restore();
}
function window(c,x,y,w,h,night){c.fillStyle='#4b3e48';c.fillRect(x-9,y-9,w+18,h+18);c.fillStyle=night?'#455b85':'#9ccfe0';c.fillRect(x,y,w,h);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();polygon(c,[[x-40,y+h],[x+w*.34,y+h*.2],[x+w*.65,y+h],[x+w*.88,y+h*.3],[x+w+30,y+h]],night?'#8496bd':'#dcefeb');polygon(c,[[x+w*.34,y+h*.2],[x+w*.65,y+h],[x+w*.4,y+h]],'#6d9bbc');c.restore();line(c,[[x+w*.5,y],[x+w*.5,y+h]],'#624b48',7);line(c,[[x,y+h*.54],[x+w,y+h*.54]],'#624b48',7);c.strokeStyle='#9b7657';c.lineWidth=5;c.strokeRect(x,y,w,h);}
function walls(c,map){
 const edge=Math.min(...map.floors[0].map(p=>p[1]))*Y,wh=350,left=65,right=map.width-65;
 polygon(c,[[left,edge-wh],[right,edge-wh],[right,edge],[left,edge]],map.sky==='studio'?'#52516f':'#8c6554',C.ink,4);
 for(let y=edge-wh+52;y<edge;y+=52)line(c,[[left,y],[right,y]],map.sky==='studio'?'#43415d':'#694d47',2);
 if(map.sky==='studio'){for(let x=left;x<right;x+=120)polygon(c,[[x,edge-wh],[x+80,edge-wh],[x+60,edge],[x+10,edge]],'#605875');}
 else {const positions=map.id==='refugio-2'?[.23,.5,.77]:[.23,.75];for(const t of positions){const ww=Math.min(230,map.width*.17);window(c,map.width*t-ww/2,edge-245,ww,165,false);}}
 for(const xx of [left+9,right-9]){polygon(c,[[xx-18,edge-wh],[xx+18,edge-wh],[xx+18,edge+10],[xx-18,edge+10]],'#57434a',C.ink,3);line(c,[[xx-8,edge-wh],[xx-8,edge]],'#a27a59',5);}
 line(c,[[left,edge-wh+10],[map.width*.5,edge-wh+38],[right,edge-wh+10]],'#493d47',25);line(c,[[left,edge],[right,edge]],'#4a3c43',12);
 for(const x of [map.width*.4,map.width*.6]){line(c,[[x,edge-wh+20],[x,edge-wh+90]],C.ink,4);polygon(c,[[x-26,edge-wh+90],[x+26,edge-wh+90],[x+39,edge-wh+128],[x-39,edge-wh+128]],'#d5a961',C.ink,3);oval(c,x,edge-wh+127,16,6,'#ffe7a0');}
}
export class CartoonWorldArt{
 backdrop(c,w,h,time,map,cameraX=0,night=false){
  if(map.illustration){c.fillStyle=map.sky==='apocalypse'?'#1a140f':'#090d16';c.fillRect(0,0,w,h);return;}
  if(['interior','studio'].includes(map.sky)){c.fillStyle='#302f43';c.fillRect(0,0,w,h);return;}
  if(map.sky==='cave'){c.fillStyle='#253c62';c.fillRect(0,0,w,h);for(let i=0;i<12;i++){const x=i*w/10;polygon(c,[[x-80,0],[x+80,0],[x+25,180+i%3*60]],i%2?'#325780':'#41668c');}return;}
  night=night||map.sky==='aurora'||map.id==='eliminacion';
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,night?'#263a69':'#6fabe2');g.addColorStop(.65,night?'#667ba5':'#c2e9e6');g.addColorStop(1,night?'#5a769b':'#d5ede7');c.fillStyle=g;c.fillRect(0,0,w,h);
  const panorama=image('skyHero');if(panorama&&!night){c.drawImage(panorama,-cameraX*.004-10,0,w+35,h*.36);c.fillStyle='#4386a7';c.fillRect(0,h*.36,w,h*.64);return;}
  oval(c,w*.82,h*.18,38,38,night?'#e6e8db':'#fff0b9');if(!night){cloud(c,w*.17-cameraX*.004,h*.15,160);cloud(c,w*.64-cameraX*.003,h*.1,200);cloud(c,w*.94-cameraX*.005,h*.3,130);}else{c.fillStyle='#f2efd2';for(let i=0;i<55;i++)c.fillRect((i*173)%w,(i*41)%(h*.5),i%7?1:2,1);}
  mountains(c,w,h,-cameraX*.008,night);c.fillStyle=night?'#34587b':'#478ba7';c.fillRect(0,h*.68,w,h*.32);
 }
 ground(c,map,time){
  if(map.illustration){const im=sceneImage(map.illustration.id,map.illustration.url?map.illustration.url+'?v='+map.illustration.revision:undefined);if(im)c.drawImage(im,0,0,map.illustration.width,map.illustration.height);return;}
  c.save();c.scale(1,Y);
  if(['interior','studio'].includes(map.sky))woodFloor(c,map);else{water(c,map,time);snowFloor(c,map,time);trails(c,map);if(map.id==='base')courtyard(c);}
  c.restore();if(['interior','studio'].includes(map.sky))walls(c,map);
 }
 bounds(p,im){if(p.survival)return survivalBounds(p);if(p.sleepBed){const w=p.artWidth||460;return {x:p.x,y:p.y*Y,w,h:w/3};}if(p.seats){const ys=p.seats.map(s=>s.y*Y),xs=p.seats.map(s=>s.x);return {x:(Math.max(...xs)+Math.min(...xs))/2,y:Math.max(...ys)+10,w:Math.max(...xs)-Math.min(...xs)+150,h:Math.max(...ys)-Math.min(...ys)+170};}if(p.painted)return {x:p.x,y:p.y*Y+p.h*.5*Y,w:p.w,h:p.h*Y+70};const id=cartoonPropAsset(p);im||=image(id);if(!im)return null;let w=p.artWidth||p.w;if(p.type==='pine')w=p.height*.63;else if(['pole','torch','flag','lamp','tower','camera','telescope'].includes(p.type)&&!p.artWidth)w=p.height*im.width/im.height;else if(p.type==='cabin'&&!p.artWidth)w=p.w*1.5;else if(p.id==='stage'&&!p.artWidth)w=720;else if(p.type==='sign')w=100;const h=w*im.height/im.width;return{x:p.x,y:p.y*Y+p.h*Y*.25,w,h};}
 draw(c,p,time,{labels=true,shared,reducedMotion=false}={}){if(p.survival)return drawSurvivalProp(c,p,time,{labels,shared,reducedMotion});
  if(p.painted){
   if(p.lightPoint){const x=p.lightPoint.x,y=p.lightPoint.y*Y;c.save();if(p.unlit){c.fillStyle='#382a1b';c.beginPath();c.ellipse(x,y,11,17,0,0,TAU);c.fill();}else{const glow=c.createRadialGradient(x,y,3,x,y,85);glow.addColorStop(0,'#ffbd5445');glow.addColorStop(1,'#ffbd5400');c.fillStyle=glow;c.fillRect(x-85,y-85,170,170);}c.restore();}
   if(p.label&&labels&&!p.portal?.auto){const [x,worldY]=p.labelPoint||[p.x,p.y],y=worldY*Y;c.save();c.font='700 19px "World Condensed",sans-serif';c.textAlign='center';const w=c.measureText(p.label).width+32;c.fillStyle='#261a10ee';c.strokeStyle='#bb874b';c.lineWidth=2;c.beginPath();c.roundRect(x-w/2,y-30,w,38,7);c.fill();c.stroke();c.fillStyle='#f8ebcf';c.fillText(p.label,x,y-4);c.restore();}return true;
  }
  if(p.type==='bigx')return true;
  if(p.type==='door'){c.save();c.strokeStyle='#d5c59a';c.lineWidth=3;c.fillStyle='#5a4b4690';c.beginPath();c.roundRect(p.x-70,p.y*Y-12,140,25,3);c.fill();c.stroke();c.fillStyle='#fff0c4';c.font='700 15px "World Condensed",sans-serif';c.textAlign='center';c.fillText(p.label||'SALIR',p.x,p.y*Y+5);c.restore();return true;}
  const id=cartoonPropAsset(p),im=p.imageUrl?sceneImage(p.imageUrl,p.imageUrl):id==='councilChair'?sceneImage(id):image(id);if(!im)return true;const b=this.bounds(p,im);c.save();
  if(!['pine','flag','rug'].includes(p.type))oval(c,p.x+10,p.y*Y+6,b.w*.34,Math.max(7,p.h*.18),'#345a7425');
  c.translate(b.x,b.y);if(p.flipX)c.scale(-1,1);if(p.unlit)c.filter='brightness(.45) saturate(.55)';c.drawImage(im,-b.w/2,-b.h,b.w,b.h);c.filter='none';
  if(!p.unlit&&['pole','lamp','torch','firepit','fireplace'].includes(p.type)){const x=0,y=-b.h*(['pole','lamp'].includes(p.type)?.5:.3),r=p.type==='firepit'?b.w*.62:70;const g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,'#ffdb961d');g.addColorStop(1,'#ffdb9600');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  c.restore();if(p.label&&labels){c.save();c.font='700 15px "World Condensed",sans-serif';c.textAlign='center';const width=Math.max(80,c.measureText(p.label).width+26),y=b.y-b.h-12;c.fillStyle='#293b52';c.strokeStyle='#d1dddf';c.lineWidth=1.5;c.beginPath();c.roundRect(p.x-width/2,y-22,width,29,4);c.fill();c.stroke();c.fillStyle='#f6edcd';c.fillText(p.label,p.x,y-2);c.restore();}return true;
 }
 get(){return null;}
}

export async function preloadWorldArt(map){const resources=[[map.illustration.id,map.illustration.url+'?v='+map.illustration.revision],...map.props.filter(p=>p.imageUrl).map(p=>[p.imageUrl,p.imageUrl])];await Promise.all(resources.map(async([id,url])=>{sceneImage(id,url);const im=images.get(id);if(im?.decode)await im.decode();}));}
