import {RESOURCE_BY_ID,PROJECTS,GATHER_NODES,EVENT_BY_ID} from './world-survival-catalog.mjs';
import {ITEM_ART_RECTS,ITEM_ART_MASKS} from './world-item-art.mjs';
const images=new Map();
export function survivalImage(name){if(images.has(name))return images.get(name);if(typeof Image==='undefined')return null;const im=new Image();im.src='/juegos/survival/'+name;images.set(name,im);return im;}
export function setSurvivalImages(values){for(const[k,v]of Object.entries(values))images.set(k,v);}
const ready=im=>im&&(im.complete===undefined||im.complete)&&im.width>0;
function crop(c,im,index,cols,rows,x,y,w,h){if(!ready(im))return;const rect=cols===6&&rows===6?ITEM_ART_RECTS[index]:null;if(rect){const [sx,sy,sw,sh]=rect,scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;c.save();c.translate(x+(w-dw)/2,y+(h-dh)/2);c.scale(scale,scale);const mask=ITEM_ART_MASKS[index];if(mask){c.beginPath();mask.forEach(([mx,my],i)=>i?c.lineTo(mx-sx,my-sy):c.moveTo(mx-sx,my-sy));c.closePath();c.clip();}c.drawImage(im,sx,sy,sw,sh,0,0,sw,sh);c.restore();}else c.drawImage(im,index%cols*im.width/cols,Math.floor(index/cols)*im.height/rows,im.width/cols,im.height/rows,x,y,w,h);}
function glow(c,x,y,r,alpha='.3'){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,155,48,'+alpha+')');g.addColorStop(1,'rgba(255,130,28,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
const shelterArt=new Map();
function shelterSprite(key,w,h,draw){
 if(shelterArt.has(key))return shelterArt.get(key);
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 draw(ctx);shelterArt.set(key,canvas);return canvas;
}
function polygon(c,points,fill,stroke='#241a13',width=2){
 c.beginPath();for(const [i,[x,y]] of points.entries())if(i)c.lineTo(x,y);else c.moveTo(x,y);
 c.closePath();c.fillStyle=fill;c.fill();
 if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function seedbed(seed,stage){
 return shelterSprite('bed:'+seed+':'+stage,144,112,c=>{
  c.fillStyle='#19160f52';c.beginPath();c.ellipse(72,101,68,9,0,0,Math.PI*2);c.fill();
  polygon(c,[[5,79],[24,60],[126,60],[140,79],[132,98],[11,98]],'#5d4028');
  polygon(c,[[5,79],[140,79],[132,98],[11,98]],'#825432');
  polygon(c,[[5,79],[24,60],[126,60],[140,79],[133,83],[12,83]],'#b48650');
  polygon(c,[[17,77],[29,65],[122,65],[131,77]],'#433021',null);
  for(let i=0;i<18;i++){
   const x=24+(i*29)%99,y=68+(i*7)%9;c.fillStyle=i%3?'#6e4b2b':'#8f6440';c.fillRect(x,y,2+i%4,1);
  }
  c.fillStyle='#3e2a1d';for(const x of [15,128])c.fillRect(x,87,3,3);
  for(let i=0;i<8;i++){
   c.fillStyle=i%2?'#715135':'#9c7350';c.fillRect(21+14*i,87+i%2*4,7,1);
  }
  if(!stage)return;
  const count=stage===2?5:3;
  for(let i=0;i<count;i++){
   const x=28+i*(count===5?21:40),base=77-i%2*5;
   const length=(stage===2?30:15)+(i%3)*4,top=base-length;
   c.lineCap='round';c.strokeStyle='#41592b';c.lineWidth=3;
   c.beginPath();c.moveTo(x,base);c.quadraticCurveTo(x-4,top+8,x+1,top);c.stroke();
   if(seed==='wheat'&&stage===2){
    polygon(c,[[x-4,top+7],[x-7,top-6],[x,top-14],[x+6,top-5],[x+4,top+6]],'#d5a951','#72552a',1);
    c.strokeStyle='#f2cc77';c.lineWidth=1;c.beginPath();c.moveTo(x,top+5);c.lineTo(x,top-10);c.stroke();
   }else{
    polygon(c,[[x,top+8],[x-13,top-3],[x-7,top-4],[x+1,top+3],[x+9,top-8],[x+14,top-7],[x+6,top+6]],i%2?'#7d933e':'#628234','#354b25',1.5);
    if(stage===2)polygon(c,[[x,top+13],[x-10,top+8],[x-15,top+2],[x-3,top+6],[x+5,top+10],[x+14,top+3],[x+13,top+9],[x+5,top+14]],'#587135','#304623',1);
    if(stage===2&&seed==='carrot')polygon(c,[[x-6,base-5],[x+7,base-6],[x+4,base+2],[x-2,base+3]],'#db873c','#794521',1);
    if(stage===2&&(seed==='berries'||seed==='tomato')){
     const radius=seed==='tomato'?6:4;
     c.fillStyle=seed==='tomato'?'#d85e32':'#be5140';c.beginPath();c.arc(x-5,top+9,radius,0,Math.PI*2);c.arc(x+7,top+11,radius,0,Math.PI*2);c.fill();
    }
    if(stage===2&&seed==='potato'){c.fillStyle='#bd9254';c.beginPath();c.ellipse(x+3,base-2,7,4,-.2,0,Math.PI*2);c.fill();}
    if(stage===2&&seed==='herbs'){c.fillStyle='#c297cf';c.beginPath();c.arc(x,top-3,3,0,Math.PI*2);c.arc(x+8,top+1,3,0,Math.PI*2);c.fill();}
   }
  }
 });
}
function riverFilter(working){
 return shelterSprite('filter:'+working,180,175,c=>{
  c.fillStyle='#171b1690';c.beginPath();c.ellipse(91,163,75,10,0,0,Math.PI*2);c.fill();
  polygon(c,[[21,143],[38,132],[142,132],[160,143],[154,156],[25,156]],'#987b50');
  for(const x of [39,108])polygon(c,[[x,113],[x+11,113],[x+10,152],[x-2,152]],'#6f553a');
  const shell=c.createLinearGradient(38,0,128,0);shell.addColorStop(0,'#41413b');shell.addColorStop(.48,'#777261');shell.addColorStop(1,'#413e32');
  c.fillStyle=shell;c.strokeStyle='#201b15';c.lineWidth=3;c.beginPath();c.roundRect(34,39,91,95,13);c.fill();c.stroke();
  c.fillStyle=working?'#69845d':'#966545';c.beginPath();c.ellipse(79,42,45,12,0,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle='#241e16';c.fillRect(36,106,87,10);c.fillRect(37,56,84,6);c.fillStyle='#b39b6c';c.fillRect(44,108,72,2);
  for(let i=0;i<14;i++){c.fillStyle=i%3?'#372d254e':'#b4a17a65';c.fillRect(41+(i*17)%76,64+(i*11)%35,2+i%5,1+i%2);}
  c.strokeStyle='#29231c';c.lineWidth=11;c.beginPath();c.moveTo(117,83);c.lineTo(149,83);c.lineTo(149,105);c.stroke();
  c.strokeStyle='#c1aa76';c.lineWidth=6;c.stroke();
  c.fillStyle=working?'#a5d89e':'#e39f60';c.beginPath();c.arc(59,77,5,0,Math.PI*2);c.fill();
  if(working){
   polygon(c,[[149,112],[144,123],[147,128],[152,128],[155,123]],'#85c5d5',null);
  }else{
   c.strokeStyle='#34291e';c.lineWidth=3;c.beginPath();c.moveTo(92,47);c.lineTo(84,62);c.lineTo(96,79);c.lineTo(87,95);c.stroke();
  }
 });
}
export function survivalBounds(p){return {x:p.x,y:p.y*.62+8,w:p.w,h:p.survival.kind==='gather'?65:p.survival.kind==='garden'?p.w*.24:p.survival.id==='filter'?175:p.survival.kind==='bench'?210:p.survival.kind==='chest'||p.survival.kind==='drop'?190:125};}
export function drawSurvivalProp(c,p,time,{shared,labels=true,reducedMotion=false}={}){
 const b=survivalBounds(p),kind=p.survival.kind,id=p.survival.id;let label='';c.save();
 if(kind==='luggage'){const empty=p.survival.remaining===0,im=survivalImage(p.survival.art||'maleta-roja.png');if(!p.survival.painted&&ready(im)){const height=b.w*im.height/im.width;c.globalAlpha=empty?.65:1;c.drawImage(im,b.x-b.w/2,b.y-height,b.w,height);c.globalAlpha=1;}if(!empty&&!reducedMotion){c.fillStyle='#f2cb87';c.globalAlpha=.35+Math.sin(time*2.4)*.2;c.beginPath();c.arc(b.x,b.y-12,2,0,Math.PI*2);c.fill();c.globalAlpha=1;}if(labels)label=empty?'MALETA VACÍA':p.survival.name;else {c.restore();return true;}}
 else if(p.survival.painted&&['bench','fire','coop'].includes(kind)){c.restore();return true;}
 else if(kind==='chest'||kind==='bench'||kind==='drop'){
  const im=survivalImage(kind==='bench'?'workbench.png':'team-chest.png');
  if(ready(im)){
   const height=b.w*im.height/im.width;
   if(kind==='chest'){
    c.save();
    c.translate(b.x,0);
    c.scale(-1,1);
    c.drawImage(im,-b.w/2,b.y-height,b.w,height);
    c.restore();
   }else c.drawImage(im,b.x-b.w/2,b.y-height,b.w,height);
  }
  label=kind==='bench'?'MESA DE TRABAJO':kind==='drop'?'ENVÍO COMPARTIDO':'BAÚL DE EQUIPO';
 }
 else if(kind==='fire'){const base=survivalImage('firepit-base.png'),flames=survivalImage('fire-flipbook.png');glow(c,b.x,b.y-20,210);if(ready(base))c.drawImage(base,b.x-90,b.y-65,180,90);crop(c,flames,reducedMotion?1:Math.floor(time*9)%6,6,1,b.x-90,b.y-175,180,180);if(!reducedMotion){c.fillStyle='#ffc371';for(let i=0;i<5;i++){const rise=(time*43+i*29)%95;c.globalAlpha=1-rise/95;c.fillRect(b.x+Math.sin(i*9+time)*19,b.y-40-rise,2,3);}c.globalAlpha=1;}label='FOGATA';}
 else if(kind==='garden'){
  const crops=shared?.gardens?.[p.survival.team]||[];
  let harvestable=0;
  for(let i=0;i<3;i++){
   const growth=crops[i],mature=growth&&growth.readyAt<=time*1000,stage=mature?2:growth?1:0;
   if(mature)harvestable++;
   const bed=seedbed(growth?.seed||'',stage);
   const width=b.w/3;
   if(bed)c.drawImage(bed,b.x-b.w/2+i*width,b.y-width*.66,width-6,width*.70);
  }
  label=harvestable?'HUERTA · '+harvestable+(harvestable===1?' COSECHA LISTA':' COSECHAS LISTAS'):'HUERTA DEL REFUGIO';
 }
 else if(id==='filter'){
  const working=!!shared?.projects?.filter?.ready,filter=riverFilter(working);
  if(filter)c.drawImage(filter,b.x-90,b.y-164);
  label=working?'FILTRO · AGUA POTABLE':'FILTRO POR REPARAR';
 }
 else if(kind==='project'){const project=PROJECTS.find(v=>v.id===id);label=project?.name||'Reparación';if(labels){c.fillStyle=shared?.projects?.[id]?.ready?'#a8d775':'#ffb858';c.beginPath();c.arc(b.x,b.y-16,3,0,Math.PI*2);c.fill();}}
 else if(kind==='water'){label='RECOGER AGUA';}
 else if(kind==='gather'){const node=p.survival.loot?{...p.survival,name:p.survival.name}:GATHER_NODES.find(n=>n.id===id);if(!node){c.restore();return true;}label=node.name;if(node.container){const pulse=reducedMotion?.7:.45+Math.sin(time*2)*.25;c.globalAlpha=pulse;c.fillStyle='#e7c17c';c.fillRect(b.x-1,b.y-12,2,8);c.fillRect(b.x-4,b.y-9,8,2);c.globalAlpha=1;}else{const resource=Object.keys(node.loot)[0],item=RESOURCE_BY_ID[resource],count=1,im=survivalImage('survival-atlas.png');for(let i=0;i<count;i++)crop(c,im,item.sprite,6,6,b.x-26+(i-(count-1)/2)*16,b.y-52-i*2,52,52);}}
 else{const resource=kind==='project'?'toolkit':p.survival.resource||'scrap',r=RESOURCE_BY_ID[resource],im=survivalImage('survival-atlas.png');if(r)crop(c,im,r.sprite,6,6,b.x-(kind==='project'?28:55),b.y-(kind==='project'?56:95),kind==='project'?56:110,kind==='project'?56:110);const project=PROJECTS.find(v=>v.id===id),node=GATHER_NODES.find(v=>v.id===id),working=shared?.projects?.[id]?.ready;label=project?(working?'✓ ':'')+project.name:node?.name||'RECOGER AGUA';if(kind==='project'){c.fillStyle=working?'#a8d775':'#ffb858';c.beginPath();c.arc(b.x+22,b.y-50,4,0,Math.PI*2);c.fill();}}
 if(labels){c.font='700 13px "World Condensed",sans-serif';c.textAlign='center';const width=Math.min(270,c.measureText(label).width+22);c.fillStyle='#21150eea';c.strokeStyle='#a8753e';c.lineWidth=1;c.beginPath();c.roundRect(b.x-width/2,b.y+6,width,25,4);c.fill();c.stroke();c.fillStyle='#f0d4a3';c.fillText(label,b.x,b.y+23,width-10);}c.restore();return true;
}
export function paintSurvival(c,w,h,{shared,map,camera,players=[],time,environment,lite=false}={}){
 const event=shared?.event,definition=EVENT_BY_ID[event?.type],affected=definition?.zones.includes(map.id),toScreen=(x,y)=>({x:(x-camera.x)*camera.zoom+w/2,y:(y*.62-camera.y)*camera.zoom+h/2});
 c.save();if(event?.type==='blackout'&&affected){c.fillStyle=environment?.phase==='night'?'#09060320':'#09060360';c.fillRect(0,0,w,h);}
 if(event?.type==='flood'&&affected){const y=(map.walkBand[0]+.035)*map.height,p=toScreen(0,y);c.globalAlpha=.16;c.fillStyle='#92764a';c.fillRect(0,p.y,w,Math.max(0,h-p.y));c.globalAlpha=.3;c.strokeStyle='#e3c193';c.lineWidth=1.5;for(let i=0;i<(lite?4:10);i++){const x=(i*171+time/24)%(w+130)-100;c.beginPath();c.moveTo(x,p.y+18+i*13);c.lineTo(x+40,p.y+18+i*13);c.stroke();}c.globalAlpha=1;}
 const dark=environment?.phase==='night'||map.sky==='cave'||event?.type==='blackout';if(dark){c.globalCompositeOperation='screen';for(const p of players)if(p.flashlight){const s=toScreen(p.x,p.y),r=170*camera.zoom;glow(c,s.x+(p.facing||1)*r*.25,s.y-55*camera.zoom,r,'.28');}for(const f of shared?.fires||[])if(f.zone===map.id){const s=toScreen(f.x,f.y);glow(c,s.x,s.y-30*camera.zoom,200*camera.zoom,'.14');}}
 c.restore();
}
