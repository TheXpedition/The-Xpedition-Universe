import {CROPS,GARDEN_PHASES,gardenPhase,gardenTimeLabel} from './world-shelter-care.mjs';

const PLAN_WIDTH=360,PLAN_HEIGHT=146;
const plantLayers=new Map();
const stemColors={tomato:'#658b38',carrot:'#87a043',potato:'#698e48',herbs:'#629271',wheat:'#a5a254',berries:'#829842'};
const ready=im=>im?.complete&&im.naturalWidth>0;
const earlyRoots=[[95,-99],[179,-104],[265,-96],[60,-64],[138,-65],[223,-65],[296,-65]];
const tall={tomato:145,wheat:126,carrot:89,berries:89,potato:110,herbs:108};

function leaf(c,x,y,angle,length,width,color){
 c.save();c.translate(x,y);c.rotate(angle);
 c.beginPath();c.moveTo(0,0);c.bezierCurveTo(length*.2,-width,length*.79,-width*.76,length,0);
 c.bezierCurveTo(length*.69,width*.8,length*.3,width,0,0);
 c.fillStyle=color;c.fill();c.strokeStyle='#2b411e';c.lineWidth=1.65;c.stroke();
 c.beginPath();c.moveTo(1,0);c.lineTo(length*.81,-1);c.strokeStyle='#c0cd753d';c.lineWidth=1.3;c.stroke();c.restore();
}

function youngPlants(seed,stage){
 const key=seed+':'+stage;
 if(plantLayers.has(key))return plantLayers.get(key);
 const canvas=document.createElement('canvas');canvas.width=PLAN_WIDTH;canvas.height=216;
 const c=canvas.getContext('2d');c.translate(0,canvas.height);
 const branchColor=stemColors[seed]||'#7b993c',grown=stage==='growing';
 for(const [i,[x,y]] of earlyRoots.entries()){
  if(stage==='sown'){
   c.fillStyle='#b0925c';c.beginPath();c.ellipse(x,y,3.8,2.2,-.45,0,Math.PI*2);c.fill();
   continue;
  }
  if(!grown&&i%2===1)continue;
  const height=(grown?(tall[seed]||105)*.47:16)+(i%3)*6;
  c.fillStyle='#17141155';c.beginPath();c.ellipse(x,y+2,grown?14:8,3,0,0,Math.PI*2);c.fill();
  if(grown&&seed==='tomato'&&i<3){
   c.strokeStyle='#5b3b25';c.lineWidth=5;c.beginPath();c.moveTo(x+12,y);c.lineTo(x+14,y-height-11);c.stroke();
   c.strokeStyle='#ba8050';c.lineWidth=2;c.stroke();
  }
  c.strokeStyle='#435b27';c.lineWidth=grown?3.9:2.7;c.lineCap='round';
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-5,y-height*.54,x+2,y-height);c.stroke();
  const branches=grown?3:1;
  for(let level=0;level<branches;level++){
   const nodeY=y-height*(.56+level*.16),length=(grown?22:11)+(level===0&&grown?6:0)+(i%3)*2;
   const narrow=seed==='wheat'||seed==='carrot',thickness=length*(narrow?.22:.38);
   leaf(c,x,nodeY,-2.63,length,thickness,branchColor);
   leaf(c,x,nodeY+2,-.55,length*.93,thickness,'#92af54');
  }
 }
 plantLayers.set(key,canvas);
 return canvas;
}

function drawContainer(c,wood){
 c.fillStyle='#2b170a69';c.beginPath();c.ellipse(180,-1,168,12,0,0,Math.PI*2);c.fill();
 if(ready(wood)){c.drawImage(wood,0,-PLAN_HEIGHT,PLAN_WIDTH,PLAN_HEIGHT);return;}
 c.fillStyle='#5f3824';c.strokeStyle='#342316';c.lineWidth=4;c.beginPath();
 c.moveTo(40,-138);c.lineTo(322,-138);c.lineTo(358,-52);c.lineTo(349,-5);c.lineTo(12,-5);c.lineTo(2,-52);c.closePath();c.fill();c.stroke();
 c.fillStyle='#3e2a1c';c.beginPath();c.moveTo(48,-128);c.lineTo(314,-128);c.lineTo(337,-60);c.lineTo(24,-60);c.closePath();c.fill();
 c.strokeStyle='#ad7347';c.lineWidth=7;c.beginPath();c.moveTo(6,-53);c.lineTo(354,-53);c.stroke();
}

function drawRipe(c,seed,mature){
 if(!ready(mature)){c.drawImage(youngPlants(seed,'growing'),0,-216);return;}
 const height=tall[seed]||105;
 for(const [x,y,scale] of [[103,-100,.81],[224,-101,.94],[151,-66,1],[266,-65,.80]]){
  const h=height*scale,w=h*mature.naturalWidth/mature.naturalHeight;
  c.fillStyle='#1d170f66';c.beginPath();c.ellipse(x,y,Math.min(w*.32,37),6,0,0,Math.PI*2);c.fill();
  c.drawImage(mature,x-w/2,y-h,w,h);
 }
}

function drawMarker(c,seed){
 c.fillStyle='#593621';c.fillRect(307,-160,7,53);
 c.fillStyle='#ddb27c';c.strokeStyle='#664229';c.lineWidth=4;c.beginPath();c.roundRect(283,-173,55,33,5);c.fill();c.stroke();
 const color=stemColors[seed]||'#74a149';
 if(seed==='tomato'||seed==='berries'||seed==='potato'){
  c.fillStyle=seed==='potato'?'#b17a42':'#b74424';c.beginPath();c.ellipse(310,-155,10,7,-.35,0,Math.PI*2);c.fill();
 }else if(seed==='carrot'){
  c.fillStyle='#c7652b';c.beginPath();c.moveTo(303,-155);c.lineTo(317,-158);c.lineTo(312,-147);c.closePath();c.fill();
 }
 leaf(c,310,-157,-2,12,4,color);
 leaf(c,311,-156,-.74,12,4,'#759344');
}

function plotCard(c,seed,{stage,progress,minutes}){
 const ripe=stage==='ripe';
 c.fillStyle='#241710f7';c.strokeStyle=ripe?'#c09348':'#936646';c.lineWidth=2.5;c.beginPath();c.roundRect(15,8,330,65,10);c.fill();c.stroke();
 c.textAlign='left';c.fillStyle='#ffe1a9';c.font='700 27px "World Condensed",sans-serif';
 c.fillText(seed?CROPS[seed].name:'Tierra preparada',31,35,294);
 c.fillStyle=ripe?'#c2dc78':'#e4c69a';c.font='700 20px "World Condensed",sans-serif';
 c.fillText(GARDEN_PHASES[stage],31,58,218);
 if(!seed||ripe)return;
 c.textAlign='right';c.fillText(gardenTimeLabel(minutes),330,58,93);
 c.fillStyle='#62412a';c.fillRect(31,64,299,3);
 c.fillStyle='#a6b762';c.fillRect(31,64,299*progress,3);
}

export function drawShelterGarden(c,b,crops=[],now,{labels,image}){
 const slotWidth=b.w/3,scale=slotWidth/(PLAN_WIDTH+16),wood=image('garden-planter-v1.webp');
 for(let i=0;i<3;i++){
  const crop=crops[i],phase=gardenPhase(crop,now),seed=phase.stage==='empty'?null:crop.seed;
  c.save();c.translate(b.x-b.w/2+i*slotWidth+8*scale,b.y);c.scale(scale,scale);
  drawContainer(c,wood);
  if(seed){
   if(phase.stage==='ripe')drawRipe(c,seed,image('garden-'+seed+'-v1.webp'));
   else c.drawImage(youngPlants(seed,phase.stage),0,-216);
   drawMarker(c,seed);
  }
  if(labels){c.translate(0,-34);plotCard(c,seed,phase);}
  c.restore();
 }
 if(!labels)return;
 const titleHeight=39,top=b.y-((crops.some(crop=>crop)?260:185)*scale);
 c.fillStyle='#56341f';c.strokeStyle='#b17b47';c.lineWidth=3;c.beginPath();c.roundRect(b.x-124,top,248,titleHeight,12);c.fill();c.stroke();
 c.fillStyle='#ffe1a8';c.font='700 25px "World Condensed",sans-serif';c.textAlign='center';c.fillText('HUERTA DEL REFUGIO',b.x,top+28,224);
}
