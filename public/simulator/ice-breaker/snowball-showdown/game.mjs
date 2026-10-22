import {drawCharacter,prepareReference} from '../character-renderer.mjs';
import {CHARACTERS} from '../characters.mjs';
import {MODELS} from '../character-rig.mjs';
import {THROW_DURATION,THROW_RELEASE,HIT_DURATION,characterMotion,handPosition,getThrowLean,getHitLean,throwProgress} from './throw-animation.mjs';

// Un prototipo local e independiente: sin API de premios ni escritura de partidas.
const WIDTH=1280,HEIGHT=720,DURATION=75,TAU=Math.PI*2;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rand=(min,max)=>min+Math.random()*(max-min);
const $=selector=>document.querySelector(selector);
const canvas=$('#arena'),ctx=canvas.getContext('2d');
const overlay=$('#overlay'),panelTitle=$('#panelTitle'),panelText=$('#panelText');
// Cada modelo animable ya existe en Ice Breaker. No duplicamos arte ni rigging.
const roster=CHARACTERS.filter(character=>character.id==='dani'||Boolean(MODELS[character.id]));
const rosterIds=roster.map(character=>character.id);
const portraits=Object.fromEntries(roster.map(character=>[character.id,character.portrait||new URL('../'+character.image.replace(/^\.\//,''),import.meta.url).href]));
const color={dani:'#bfead3',bayron:'#ffccbf',felix:'#e9e4fc',andromeda:'#f8deac'};
const images=new Map(),sprites=new Map(),sourceLoads=new Map(),spriteLoads=new Map();
const keys=new Set(),balls=[],stars=[],particles=[],callouts=[];
const MAX_AMMO=3;
const barriers=[{x:418,y:348,r:53},{x:826,y:385,r:55},{x:622,y:543,r:47}];
const snowbanks=[
 {x:110,y:332,r:62,label:'Borde norte-oeste'},
 {x:1170,y:328,r:62,label:'Borde norte-este'},
 {x:153,y:600,r:72,label:'Borde sur-oeste'},
 {x:1125,y:604,r:72,label:'Borde sur-este'}
];
let scene='setup',selected='dani',players=[],current=null,timer=DURATION,last=0,clock=0,notice='',noticeUntil=0,spawnAt=0,muted=false,audio=null,aim=null,frameId=0;
let best=0;try{best=Number(localStorage.getItem('xpedition-snowball-best'))||0;}catch{}
$('#bestScore').textContent=String(best).padStart(3,'0');

function sound(name){
 if(muted)return;
 try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();
  const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
  const notes={throw:[240,90,.11],hit:[150,480,.17],star:[610,1140,.20],start:[360,680,.32],end:[700,320,.40]};
  const [a,b,d]=notes[name]||notes.throw;o.type=name==='hit'?'square':'sine';o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,b),t+d);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+d);
 }catch{}
}
function choiceMarkup(){
 $('#choices').innerHTML=roster.map(p=>`<button type="button" class="choice" data-character="${p.id}" aria-pressed="${p.id===selected}"><img data-portrait="${p.id}" src="${portraits[p.id]}" alt=""><span>${p.name}</span></button>`).join('');
 $('#choices').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.character;choiceMarkup();void ensureSprite(selected);sound('star');});
}
choiceMarkup();
function showOverlay(mode,title,text,action,showPicker=false){
 scene=mode;overlay.hidden=false;panelTitle.innerHTML=title;panelText.textContent=text;
 $('#panelTag').textContent=mode==='result'?'LA ARENA TIENE GANADOR':mode==='paused'?'BATALLA INTERRUMPIDA':'ANTARCTICA · NUEVO DESAFÍO';
 $('#mainButton').firstChild.textContent=action+' ';$('#picker').hidden=!showPicker;$('#panelHint').hidden=mode!=='setup';
 $('#mainButton').onclick=()=>mode==='paused'?resume():begin();
 $('.mode-line').hidden=mode==='paused';
 $('.game-frame').classList.remove('is-playing');$('#pauseButton').disabled=mode!=='paused';
}
function hideOverlay(){overlay.hidden=true;$('.game-frame').classList.add('is-playing');$('#pauseButton').disabled=false;canvas.focus({preventScroll:true});}
function startPositions(){return [[240,466],[985,465],[920,290],[358,293]];}
function createPlayers(){
 // El usuario elige entre 24 personajes; tres rivales diferentes se sortean por ronda.
 const opponents=rosterIds.filter(id=>id!==selected);
 for(let i=opponents.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opponents[i],opponents[j]]=[opponents[j],opponents[i]];}
 const ids=[selected,...opponents.slice(0,3)];
 players=ids.map((id,i)=>({id,name:roster.find(c=>c.id===id)?.name||id,x:startPositions()[i][0],y:startPositions()[i][1],vx:0,vy:0,hp:3,score:0,invul:1,cooldown:i===0?0.1:rand(.4,1.3),out:0,face:i===0?1:-1,stride:0,walking:0,aiTime:0,aimX:0,aimY:0,throws:0,throwTime:0,throwReleased:false,throwTarget:null,hitTime:0,hitDirection:0,knockX:0,knockY:0,stunTime:0,ammo:2,gather:0}));
 current=players[0];
}
function begin(){
 createPlayers();balls.length=0;stars.length=0;particles.length=0;callouts.length=0;
 timer=DURATION;clock=0;spawnAt=2;aim=null;keys.clear();scene='playing';
 for(let i=0;i<3;i++)addStar();
 hideOverlay();updateScoreboard();players.forEach(player=>void ensureSprite(player.id));sound('start');announce('¡QUE EMPIECE LA BATALLA!',1.7);
}
function pause(){if(scene!=='playing')return;keys.clear();showOverlay('paused','Un descanso<br><em>helado.</em>','Tu puntuación está a salvo. Puedes continuar cuando quieras.','CONTINUAR');$('#gameState').textContent='Partida en pausa';}
function resume(){if(scene!=='paused')return;scene='playing';last=performance.now();hideOverlay();}
function finish(){
 if(scene!=='playing')return;
 sound('end');keys.clear();
 const order=[...players].sort((a,b)=>b.score-a.score),winner=order[0],yourScore=current.score;
 if(yourScore>best){best=yourScore;try{localStorage.setItem('xpedition-snowball-best',String(best));}catch{}$('#bestScore').textContent=String(best).padStart(3,'0');}
 const text=`${winner.id===current.id?'¡Ganaste la ronda!':`${winner.name} ganó la ronda.`} Tu puntuación: ${yourScore}. Clasificación: ${order.map((p,i)=>`${i+1}. ${p.name} (${p.score})`).join(' · ')}.`;
 showOverlay('result',winner.id===current.id?'¡Eres una<br><em>leyenda del hielo!</em>':'La nieve tiene<br><em>nuevo dueño.</em>',text,'VOLVER A JUGAR');
 $('#gameState').textContent='Ronda finalizada · '+yourScore+' puntos';
}
function announce(message,seconds=1.2){notice=message;noticeUntil=clock+seconds;$('#announce').textContent=message;}
function addStar(){
 for(let tries=0;tries<30;tries++){
  const x=rand(125,1140),y=rand(290,595);
  if(barriers.every(b=>Math.hypot(x-b.x,y-b.y)>b.r+75)&&snowbanks.every(b=>Math.hypot(x-b.x,y-b.y)>b.r+60)&&players.every(p=>Math.hypot(x-p.x,y-p.y)>60)){
   stars.push({x,y,spin:rand(0,TAU),life:10});return;
  }
 }
}
function nearest(source){return players.filter(p=>p!==source&&p.out<=0).sort((a,b)=>Math.hypot(a.x-source.x,a.y-source.y)-Math.hypot(b.x-source.x,b.y-source.y))[0];}
function nearestBank(source){
 return snowbanks.slice().sort((a,b)=>Math.hypot(a.x-source.x,a.y-source.y)-Math.hypot(b.x-source.x,b.y-source.y))[0];
}
function gatherSnow(p,dt){
 const bank=snowbanks.find(b=>Math.hypot(p.x-b.x,p.y-b.y)<b.r+26);
 if(!bank||p.ammo>=MAX_AMMO){p.gather=0;return false;}
 p.gather+=dt;
 if(p.gather>=.28){
  p.gather=0;
  p.ammo=Math.min(MAX_AMMO,p.ammo+1);
  burst(p.x+p.face*10,p.y-36,'#fbffff',8);
  if(p===current)$('#gameState').textContent='Recogiendo nieve del borde · munición '+p.ammo+'/'+MAX_AMMO;
  return true;
 }
 return false;
}

// Inicia la animación; NO crea una bola hasta que el brazo llegue al punto de salida.
function throwBall(source,target=null){
 if(scene!=='playing'||source.out>0||source.cooldown>0||source.throwTime>0||source.stunTime>0)return;
 if((source.ammo||0)<=0){if(source===current)announce('Recoge nieve en los montículos del borde',1.1);return;}
 const victim=target||nearest(source);if(!victim)return;
 source.throwTarget=target&&!('hp' in target)
   ?{x:target.x,y:target.y}:target||victim;
 source.face=source.throwTarget.x>=source.x?1:-1;
 source.throwTime=.00001;
 source.throwReleased=false;
 source.cooldown=source===current?.8:rand(1.55,2.35);
 source.throws++;
}
function releaseSnowball(source){
 if(source.throwReleased||source.out>0)return;
 source.throwReleased=true;
 const target=source.throwTarget||nearest(source);
 if(!target)return;
 const pose=characterMotion(source,clock,139);
 const wrist=handPosition(source,pose);
 let dx=target.x-wrist.x,dy=('hp' in target?target.y-69:target.y)-wrist.y;
 let length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
 const speed=source===current?740:555;
 source.ammo=Math.max(0,(source.ammo||0)-1);
 balls.push({owner:source,x:wrist.x+dx*9,y:wrist.y+dy*9,vx:dx*speed,vy:dy*speed,age:0,tail:[]});
 const fx=wrist.x+dx*12,fy=wrist.y+dy*12;
 burst(fx,fy,'#effdff',12);burst(fx,fy,'#a4eaf6',6);
 callouts.push({x:fx,y:fy-20,word:'FWOOSH!',color:'#e4f9fa',life:.38,max:.38});
 sound('throw');
}
function tickAnimations(p,dt){
 if(p.hitTime>0)p.hitTime=Math.max(0,p.hitTime-dt);
 if(p.stunTime>0)p.stunTime=Math.max(0,p.stunTime-dt);
 if(p.throwTime>0){
  const previous=p.throwTime/THROW_DURATION;
  p.throwTime=Math.min(THROW_DURATION,p.throwTime+dt);
  const progress=p.throwTime/THROW_DURATION;
  if(!p.throwReleased&&previous<THROW_RELEASE&&progress>=THROW_RELEASE){
   releaseSnowball(p);
  }
  if(progress>=1){p.throwTime=0;p.throwReleased=false;p.throwTarget=null;}
 }
}

function move(p,dx,dy,dt,speed){
 const length=Math.hypot(dx,dy);if(length>.001){dx/=length;dy/=length;}
 const nextX=clamp(p.x+dx*speed*dt,83,1197),nextY=clamp(p.y+dy*speed*dt,268,626);
 p.x=nextX;p.y=nextY;
 for(const b of barriers){
  const ox=p.x-b.x,oy=p.y-(b.y+18),d=Math.hypot(ox,oy),limit=b.r+25;
  if(d<limit){const a=d?{x:ox/d,y:oy/d}:{x:1,y:0};p.x=clamp(b.x+a.x*limit,83,1197);p.y=clamp(b.y+18+a.y*limit,268,626);}
 }
 p.walking=length>.1?1:0;if(p.walking){p.stride+=speed*dt*.037;if(Math.abs(dx)>.13&&!p.throwTime)p.face=dx>0?1:-1;}
}
function controls(dt){
 let x=0,y=0;
 if(keys.has('ArrowLeft')||keys.has('KeyA'))x--;
 if(keys.has('ArrowRight')||keys.has('KeyD'))x++;
 if(keys.has('ArrowUp')||keys.has('KeyW'))y--;
 if(keys.has('ArrowDown')||keys.has('KeyS'))y++;
 move(current,x,y,dt,240);
 if(keys.has('Space')||keys.has('Enter'))throwBall(current,aim);
}
function updateAI(p,dt){
 if(p.aiTime<=0){
  const target=nearest(p),a=rand(-.6,.6),dist=target?Math.hypot(target.x-p.x,target.y-p.y):0;
  p.aimX=target?(target.x-p.x)/(dist||1)*Math.cos(a)-Math.sin(a)*Math.sin(2*a):rand(-1,1);
  p.aimY=target?(target.y-p.y)/(dist||1)*Math.cos(a)+Math.cos(a)*Math.sin(2*a):rand(-1,1);
  if(dist<230){p.aimX*=-.6;p.aimY*=-.6;}
  p.aiTime=rand(.48,1.4);
 }
 p.aiTime-=dt;
 const bank=nearestBank(p);
 if((p.ammo||0)<=0&&bank){
  p.aimX=bank.x-p.x; p.aimY=bank.y-p.y;
 }
 move(p,p.aimX,p.aimY,dt,rand(145,155));
 const target=nearest(p);if(target&&p.cooldown<=0&&(p.ammo||0)>0&&Math.hypot(target.x-p.x,target.y-p.y)<720)throwBall(p,target);
}
function burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=rand(0,TAU),speed=rand(50,240);particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:rand(.35,.9),max:.9,color,r:rand(2,5)});}}
function hit(p,ball){
 if(p.invul>0||p.out>0)return false;
 p.hp--;p.invul=.9;ball.owner.score+=5;
 p.hitTime=.00001;p.hitDirection=ball.vx>0?1:-1;p.stunTime=.42;
 p.throwTime=0;p.throwTarget=null;p.throwReleased=false;
 p.knockX=ball.vx>0?1:-1;
 p.x=clamp(p.x+p.knockX*17,83,1197);
 burst(p.x,p.y-72,'#fff',27);burst(p.x,p.y-85,color[p.id]||'#d9f7ef',12);
 callouts.push({x:p.x,y:p.y-124,word:'¡PUM!  +5',color:'#ffe7a4',life:.75,max:.75});
 sound('hit');
 if(p.hp<=0){p.out=2.7;p.hp=0;announce(p.name.toUpperCase()+' ¡FUERA POR UN MOMENTO!',1.0);}
 updateScoreboard();return true;
}

function physics(dt){
 clock+=dt;timer-=dt;if(timer<=0){timer=0;finish();return;}
 spawnAt-=dt;if(spawnAt<=0){if(stars.length<4)addStar();spawnAt=rand(4.5,6.5);}
 for(const p of players){
  p.cooldown=Math.max(0,p.cooldown-dt);p.invul=Math.max(0,p.invul-dt);
  if(p.out>0){p.out-=dt;if(p.out<=0){p.hp=3;p.x=startPositions()[players.indexOf(p)][0];p.y=startPositions()[players.indexOf(p)][1];p.invul=1.5;p.out=0;p.hitTime=0;p.stunTime=0;p.ammo=2;p.gather=0;updateScoreboard();}continue;}
  if(p.stunTime<=0){if(p===current)controls(dt);else updateAI(p,dt);}else{p.walking=0;}
  gatherSnow(p,dt);
  tickAnimations(p,dt);
 }
 for(let i=balls.length-1;i>=0;i--){
  const b=balls[i];b.tail.push({x:b.x,y:b.y});if(b.tail.length>5)b.tail.shift();b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
  if(b.age>1.7||b.x<60||b.x>1220||b.y<190||b.y>643){balls.splice(i,1);continue;}
  if(barriers.some(o=>Math.hypot(b.x-o.x,b.y-(o.y-50))<o.r*.8)){burst(b.x,b.y,'#eefcfc',9);balls.splice(i,1);continue;}
  const target=players.find(p=>p!==b.owner&&p.out<=0&&Math.hypot(b.x-p.x,b.y-(p.y-69))<29);
  if(target){hit(target,b);balls.splice(i,1);}
 }
 for(let i=stars.length-1;i>=0;i--){
  const star=stars[i];star.life-=dt;star.spin+=dt*2;
  if(star.life<=0){stars.splice(i,1);continue;}
  const p=players.find(p=>p.out<=0&&Math.hypot(p.x-star.x,p.y-star.y)<38);
  if(p){p.score+=4;burst(star.x,star.y-20,'#ffe3a1',18);stars.splice(i,1);sound('star');updateScoreboard();}
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy+=100*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
 for(let i=callouts.length-1;i>=0;i--){const c=callouts[i];c.y-=27*dt;c.life-=dt;if(c.life<=0)callouts.splice(i,1);}
 if(clock>noticeUntil)$('#announce').textContent='';
 $('#gameState').textContent=`RONDA 01 · ${String(Math.floor(timer/60)).padStart(2,'0')}:${String(Math.ceil(timer%60)).padStart(2,'0')} restantes · ${current.score} puntos`;
}
function updateScoreboard(){
 $('#scorebar').innerHTML=players.map(p=>`<div class="score-person ${p===current?'active':''}"><img data-portrait="${p.id}" src="${portraits[p.id]}" alt=""><span class="score-details"><b>${p.name.toUpperCase()}</b><small>${'♥ '.repeat(p.hp)||'REAPARECE'}</small></span><strong>${String(p.score).padStart(2,'0')}</strong></div>`).join('');
}
const poly=(points,fill,stroke='#2d6884',width=4)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.stroke();}};
const circle=(x,y,r,fill,stroke=null,width=3)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
const oval=(x,y,w,h,fill)=>{ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,TAU);ctx.fillStyle=fill;ctx.fill();};

function backdrop(t){
 const sky=ctx.createLinearGradient(0,0,0,520);sky.addColorStop(0,'#8dc3d8');sky.addColorStop(.52,'#cdeef0');sky.addColorStop(1,'#edf9f9');ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
 circle(1086,96,58,'#fff5cf');
 poly([[0,218],[95,118],[196,181],[318,78],[448,206],[594,128],[744,231],[914,98],[1030,181],[1178,92],[1280,167],[1280,355],[0,355]],'#95cddd','#4c8ca7',6);
 poly([[0,272],[130,190],[238,242],[374,153],[530,266],[658,188],[808,276],[972,168],[1104,246],[1227,190],[1280,232],[1280,382],[0,382]],'#d0f0ef','#68a7bc',5);
 // Paredes de nieve y ventisqueros alrededor de la arena.
 for(const bank of snowbanks){
  oval(bank.x+8,bank.y+22,bank.r*1.08,18,'#7ca9b944');
  circle(bank.x,bank.y,bank.r,'#eefcf8','#78a8bb',5);
  circle(bank.x-18,bank.y-10,bank.r*.45,'#ffffffcc',null);
 }
 // Pequeña zona de campamento helado al fondo.
 poly([[510,203],[590,181],[707,184],[770,212],[754,240],[522,240]],'#648da5','#31566f',4);
 for(let i=0;i<4;i++){
  const x=544+i*60;ctx.strokeStyle='#385a70';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,237);ctx.lineTo(x,167);ctx.stroke();
  poly([[x,170],[x+35,177],[x+9,209]],'#335f8a','#163f66',4);
 }
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<45;i++){
  const x=(i*131+Math.sin(i)*47+t*24)%1280,y=(i*97+t*35)%720;
  circle(x,y,1.2+(i%3)*.6,'#ffffffa8');
 }
}
function arenaGround(){
 // Arena con senderos de nieve compacta y borde más elevado para recoger nieve.
 poly([[56,260],[1225,260],[1258,613],[1190,690],[94,688],[22,625]],'#c7e6ee','#346c86',7);
 poly([[73,274],[1208,274],[1237,596],[1172,667],[109,668],[43,607]],'#f6fcf7','#86bccb',4);
 poly([[132,320],[1146,320],[1162,360],[1138,610],[155,610],[118,558]],'#e1f4f2',null);
 poly([[199,355],[1075,355],[1090,389],[1067,570],[214,570],[185,531]],'#d0eaec',null);
 ctx.setLineDash([12,16]);ctx.strokeStyle='#9ec6cfcc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(640,289);ctx.lineTo(640,647);ctx.stroke();ctx.beginPath();ctx.ellipse(640,465,170,138,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
 for(let x=115;x<1170;x+=95){oval(x,668,24,4,'#b1d5de88');}
 ctx.fillStyle='#0e364b';ctx.font='800 14px Manrope,system-ui';ctx.fillText('MONTÍCULOS DE NIEVE',58,246);ctx.fillText('MONTÍCULOS DE NIEVE',986,246);
}

function drawSnowbank(bank){
 const x=bank.x,y=bank.y,r=bank.r;
 oval(x+9,y+23,r*1.1,17,'#4e80984a');
 circle(x,y,r,'#eefdfe','#77a8bc',4);
 circle(x-r*.18,y-r*.12,r*.36,'#ffffffd9',null);
 circle(x+r*.21,y+r*.03,r*.25,'#f5ffffd9',null);
 ctx.fillStyle='#2a5e74';ctx.font='800 11px Manrope,system-ui';ctx.textAlign='center';ctx.fillText('NIEVE',x,y+r+17);ctx.textAlign='start';
}
function drawBarrier(o){
 const x=o.x,y=o.y,r=o.r;
 oval(x+9,y+22,r*1.14,18,'#6697af4a');
 poly([[x-r,y+12],[x-r*.83,y-r*.23],[x-r*.25,y-r*.9],[x+r*.54,y-r*.75],[x+r,y-r*.08],[x+r*.68,y+21],[x-r*.18,y+30]],'#76b6c7','#2e6e85',5);
 poly([[x-r*.81,y-r*.24],[x-r*.25,y-r*.9],[x+r*.54,y-r*.75],[x+r,y-r*.08],[x+r*.28,y+r*.04],[x-r*.55,y+1]],'#edfbf5','#5b99ae',4);
 poly([[x-r*.25,y-r*.9],[x-r*.08,y-r*.44],[x+r*.28,y+.04*r]],'#9dcfd5',null);
 ctx.strokeStyle='#9fcddb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-13,y-35);ctx.lineTo(x+4,y-17);ctx.lineTo(x-7,y-2);ctx.stroke();
}
function drawStar(star){
 const x=star.x,y=star.y-26+Math.sin(clock*4+star.spin)*5;
 oval(star.x,star.y+1,25,6,'#4f93ad4a');
 ctx.save();ctx.translate(x,y);ctx.rotate(star.spin*.2);poly([[0,-25],[10,-9],[23,0],[10,9],[0,25],[-10,9],[-23,0],[-10,-9]],'#ffe8a3','#a77a4a',4);poly([[0,-18],[6,-6],[16,0],[0,9]],'#fff9d6',null);ctx.restore();
}
function drawPerson(p,t){
 if(p.out>0)return;
 const highlight=p===current;
 oval(p.x+3,p.y+6,26,8,'#39788d55');
 if(highlight){ctx.strokeStyle='#fef1bd';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y+5,30,12,0,0,TAU);ctx.stroke();}
 if(p.invul>0&&Math.sin(t*15)<0)ctx.globalAlpha=.55;
 const sprite=sprites.get(p.id);
 // Cada fotograma actualiza el rig de verdad: brazo, codo, mano, torso y piernas.
 const pose=characterMotion(p,t,139);
 ctx.save();ctx.translate(p.x,p.y);
 const lean=getThrowLean(p)+getHitLean(p);
 if(lean)ctx.rotate(lean);
 if(p.hitTime>0){const impact=p.hitTime/HIT_DURATION,wide=1+Math.sin(impact*Math.PI)*.075;ctx.scale(wide,2-wide);}
 ctx.translate(-p.x,-p.y);
 if(sprite){drawCharacter(ctx,sprite,pose);}
 else{
  // Retrato de respaldo únicamente si el sprite original no se ha cargado.
  ctx.fillStyle=color[p.id]||'#bfe5e4';ctx.strokeStyle='#173e58';ctx.lineWidth=4;
  ctx.beginPath();ctx.roundRect(p.x-26,p.y-81,52,66,15);ctx.fill();ctx.stroke();
  const img=images.get(p.id);if(img?.complete&&img.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y-102,37,0,TAU);ctx.clip();ctx.drawImage(img,p.x-37,p.y-139,74,74);ctx.restore();circle(p.x,p.y-102,37,'#ffffff00','#15334c',4);}
  else circle(p.x,p.y-102,31,color[p.id]||'#bcece4','#133e52',4);
 }
 ctx.restore();ctx.globalAlpha=1;
 // Proyectil pegado a la mano durante la anticipación. Sin brazos falsos.
 if(p.throwTime>0&&!p.throwReleased){
  const hand=handPosition(p,pose);
  oval(hand.x+1,hand.y+3,12,4,'#205b7399');
  circle(hand.x,hand.y,12,'#fbfffc','#36778f',3);
  circle(hand.x-3,hand.y-4,4,'#fff',null);
 }
 if(p.hitTime>0){
  const pulse=Math.sin(Math.PI*p.hitTime/HIT_DURATION);
  ctx.strokeStyle=`rgba(231,251,255,${Math.max(0,pulse)*.9})`;ctx.lineWidth=5;
  ctx.beginPath();ctx.ellipse(p.x,p.y-75,38+pulse*18,48+pulse*24,0,0,TAU);ctx.stroke();
 }
 const barY=p.y-151;
 ctx.fillStyle='#123d56';ctx.fillRect(p.x-31,barY,62,11);ctx.fillStyle=p===current?'#d7f2b7':'#ffccac';ctx.fillRect(p.x-29,barY+2,58*p.hp/3,7);
 ctx.lineWidth=3;ctx.strokeStyle='#174256';ctx.strokeRect(p.x-31,barY,62,11);
 ctx.font='800 15px Manrope,system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#174256';ctx.strokeText(p.name,p.x,barY-6);ctx.fillStyle='#fff';ctx.fillText(p.name,p.x,barY-6);ctx.textAlign='start';
}

function drawBall(b){
 for(let i=0;i<(b.tail?.length||0);i++){const step=b.tail[i];circle(step.x,step.y,2+i*1.4,'#c8f5f6aa');}
 oval(b.x+3,b.y+7,11,4,'#477d9f55');circle(b.x,b.y,13,'#f9fdf4','#3a7b91',3);
 circle(b.x-4,b.y-4,4,'#fff',null);ctx.strokeStyle='#aadce9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+3,b.y+3);ctx.lineTo(b.x+9,b.y+5);ctx.stroke();
}
function drawHud(){
 const mm=String(Math.floor(timer/60)).padStart(2,'0'),ss=String(Math.ceil(timer%60)).padStart(2,'0');
 ctx.fillStyle='#10364cd9';ctx.strokeStyle='#5aa0b3';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(535,26,210,66,9);ctx.fill();ctx.stroke();
 ctx.fillStyle='#b2e9e0';ctx.textAlign='center';ctx.font='800 11px Manrope,system-ui';ctx.fillText('TIEMPO RESTANTE',640,47);
 ctx.fillStyle=timer<15?'#fce0a9':'#fff';ctx.font='900 38px Barlow Condensed,Impact,sans-serif';ctx.fillText(mm+':'+ss,640,83);
 ctx.textAlign='start';
 ctx.fillStyle='#10364cd9';ctx.strokeStyle='#5aa0b3';ctx.beginPath();ctx.roundRect(54,24,198,62,9);ctx.fill();ctx.stroke();
 ctx.fillStyle='#b2e9e0';ctx.font='800 11px Manrope,system-ui';ctx.fillText('NIEVE DISPONIBLE',72,45);
 const ammo=current?.ammo||0;
 for(let i=0;i<MAX_AMMO;i++){circle(90+i*32,66,11,i<ammo?'#f7fff8':'#7cb3c055','#5aa0b3',2); if(i<ammo){circle(86+i*32,62,3,'#fff',null);}}
 ctx.fillStyle='#e8fbfb';ctx.font='700 11px Manrope,system-ui';ctx.fillText('toma nieve de los montículos',72,82);
 ctx.font='800 11px Manrope,system-ui';ctx.fillStyle='#113f5b';ctx.textAlign='center';ctx.fillText('5 PUNTOS POR ACIERTO   ·   4 POR ESTRELLA   ·   REPÓN NIEVE EN LOS BORDES',640,709);ctx.textAlign='start';
}
function draw(){
 ctx.clearRect(0,0,WIDTH,HEIGHT);backdrop(clock);arenaGround();
 for(const bank of snowbanks)drawSnowbank(bank);
 for(const b of barriers)drawBarrier(b);
 for(const star of stars)drawStar(star);
 for(const p of [...players].sort((a,b)=>a.y-b.y))drawPerson(p,clock);
 for(const b of balls)drawBall(b);
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,.0,1);circle(p.x,p.y,p.r,p.color);ctx.globalAlpha=1;}
 for(const c of callouts){ctx.save();ctx.globalAlpha=clamp(c.life/c.max);ctx.font='900 24px Barlow Condensed,Impact,sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#1d526b';ctx.textAlign='center';ctx.strokeText(c.word,c.x,c.y);ctx.fillStyle=c.color;ctx.fillText(c.word,c.x,c.y);ctx.restore();}
 drawHud();
}
function frame(now){
 const dt=clamp((now-last)/1000||0,0,.035);last=now;
 if(scene==='playing')physics(dt);
 draw();frameId=requestAnimationFrame(frame);
}
function reset(){keys.clear();scene='setup';createPlayers();players.forEach(player=>void ensureSprite(player.id));timer=DURATION;balls.length=0;stars.length=0;particles.length=0;callouts.length=0;updateScoreboard();$('#gameState').textContent='Selecciona a tu personaje';showOverlay('setup','Que empiece<br><em>la nevada.</em>','Atrapa las estrellas, recoge nieve de los montículos del borde y etiqueta a tus rivales con bolas de nieve. El personaje con más puntos gana al terminar la ronda.','EMPEZAR LA BATALLA',true);}
function pointerToGame(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
canvas.addEventListener('pointerdown',e=>{if(scene!=='playing')return;e.preventDefault();aim=pointerToGame(e);throwBall(current,aim);});
canvas.addEventListener('pointermove',e=>{if(scene==='playing'&&e.pointerType==='mouse')aim=pointerToGame(e);});
window.addEventListener('keydown',e=>{
 if(['Escape','KeyP'].includes(e.code)){if(scene==='playing')pause();else if(scene==='paused')resume();return;}
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','Space','Enter'].includes(e.code))return;
 if(scene==='playing'){e.preventDefault();keys.add(e.code);if((e.code==='Space'||e.code==='Enter')&&!e.repeat)throwBall(current,aim);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(scene==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&scene==='playing')pause();});
document.querySelectorAll('[data-move]').forEach(button=>{
 const key=button.dataset.move;
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(scene!=='playing')return;button.setPointerCapture(e.pointerId);keys.add(key);button.classList.add('is-down');});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>{keys.delete(key);button.classList.remove('is-down');});
});
$('#throwButton').addEventListener('pointerdown',e=>{e.preventDefault();throwBall(current);});
$('#restartButton').onclick=reset;
$('#pauseButton').onclick=()=>scene==='paused'?resume():pause();
$('#soundButton').onclick=()=>{muted=!muted;$('#soundButton').textContent=muted?'♪ Silenciado':'♪ Sonido';$('#soundButton').setAttribute('aria-pressed',String(!muted));if(!muted)sound('star');};
$('#fullButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.game-frame').requestFullscreen();}catch{}};

// Conserva los modelos y rigging de Ice Breaker. Las imágenes base de los 24
// están en la carpeta original art/; las animaciones se preparan bajo demanda.
function sourceImage(character){
 if(sourceLoads.has(character.id))return sourceLoads.get(character.id);
 const task=(async()=>{
  const img=new Image();img.src=new URL('../'+character.image.replace(/^\.\//,''),import.meta.url).href;
  await img.decode();return img;
 })();
 sourceLoads.set(character.id,task);return task;
}
function portraitFromModel(image,character){
 const model=MODELS[character.id],frame=model?.portrait||model?.head;
 if(!frame)return null;
 const [, ,w,h]=frame,fit=116/Math.max(w,h),cw=w*fit,ch=h*fit;
 const tile=document.createElement('canvas');tile.width=128;tile.height=128;
 const c=tile.getContext('2d');c.fillStyle='#eaddc8';c.fillRect(0,0,128,128);
 c.drawImage(image,...frame,(128-cw)/2,(128-ch)/2,cw,ch);
 return tile.toDataURL('image/png');
}
function refreshPortrait(id){
 document.querySelectorAll('[data-portrait]').forEach(img=>{
  if(img.dataset.portrait===id)img.src=portraits[id];
 });
}
async function ensureSprite(id){
 if(sprites.has(id))return sprites.get(id);
 if(spriteLoads.has(id))return spriteLoads.get(id);
 const character=roster.find(c=>c.id===id);if(!character)return null;
 const task=(async()=>{
  try{
   const source=await sourceImage(character);
   const sprite=id==='dani'?source:prepareReference(source);
   sprites.set(id,sprite);return sprite;
  }catch{return null;}
 })();
 spriteLoads.set(id,task);return task;
}
async function loadCharacters(){
 // Precarga retratos progresivamente. No es necesario preparar 24 sprites
 // simultáneamente para jugar con solo cuatro participantes en pantalla.
 await Promise.all(roster.map(async character=>{
  try{
   const original=await sourceImage(character);
   const thumb=portraitFromModel(original,character);
   if(thumb){portraits[character.id]=thumb;refreshPortrait(character.id);}
   images.set(character.id,original);
  }catch{
   // Una imagen ausente no impide iniciar la ronda.
  }
 }));
}
reset();void loadCharacters();last=performance.now();frameId=requestAnimationFrame(frame);
