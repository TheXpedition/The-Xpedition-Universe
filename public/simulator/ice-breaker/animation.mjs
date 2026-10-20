import {drawDani} from './dani-renderer.mjs';
import {clipPose,clipDuration} from './dani-clips.mjs';
const canvas=document.querySelector('#study'),ctx=canvas.getContext('2d'),image=new Image(),slider=document.querySelector('#timeline');
image.src='./art/dani.png';await image.decode();
let mode='walk',time=0,last=0,paused=false,speed=1;
function draw(){
 ctx.fillStyle='#e8d9bf';ctx.fillRect(0,0,1100,720);
 const pose=clipPose(mode,time),height=mode==='jump'?330:500,scale=height/206.04,x=mode==='jump'?380+(pose.x-160)*1.25:550,y=650;
 ctx.strokeStyle='#c3b89f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,y);ctx.lineTo(1020,y);ctx.stroke();
 ctx.fillStyle='#7b806144';ctx.beginPath();ctx.ellipse(x,y+5,70*(1-pose.z/500),12,0,0,Math.PI*2);ctx.fill();
 drawDani(ctx,image,{...pose,x,y:y-pose.z*scale,height,facing:mode==='jump'?1:-1});
 document.querySelector('#poseLabel').textContent=mode==='walk'?'CAMINAR':mode==='idle'?'REPOSO':({crouch:'ANTICIPACIÓN',jump:'DESPEGUE',fall:'DESCENSO',land:'ATERRIZAJE',idle:'REPOSO'}[pose.phase]||'SALTO');
}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;time=0;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();});
document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Reproducir':'Pausar';document.querySelector('#pause').setAttribute('aria-label',paused?'Reproducir animación':'Pausar animación');};
document.querySelector('#speed').onchange=e=>speed=Number(e.target.value);
slider.oninput=()=>{paused=true;document.querySelector('#pause').textContent='Reproducir';document.querySelector('#pause').setAttribute('aria-label','Reproducir animación');time=Number(slider.value)/1000*(clipDuration(mode)-1/120);draw();};
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!paused)time=(time+dt*speed)%clipDuration(mode);slider.value=String(time/clipDuration(mode)*1000);draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
