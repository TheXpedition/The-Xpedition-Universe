import {drawBonjuStatic,BonjuAnimator} from './bonju-v2.mjs';
import {sampleBonjuPose} from './bonju-motion.mjs';

const canvas=document.querySelector('#rig'),ctx=canvas.getContext('2d');
const status=document.querySelector('#status'),pivots=document.querySelector('#pivots');
let reference,atlas,rig,animator,showPivots=false,animation='neutral',paused=false,speed=1,time=0,last=0,frame=0,lastDraw=0;
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('No se pudo cargar la ilustración de Bonju.'));img.src=src;});}
function draw(){
 if(!rig)return;
 const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
 const w=box.width,h=box.height;ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#eeeae3';ctx.fillRect(0,0,w,h);
 const height=Math.min(h-100,(w/2-70)*rig.reference.height/rig.reference.width),baseline=h-28;
 ctx.strokeStyle='#c5beb2';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,18);ctx.lineTo(w/2,h-16);ctx.stroke();
 ctx.strokeStyle='#d5cec1';ctx.beginPath();ctx.moveTo(24,baseline);ctx.lineTo(w-24,baseline);ctx.stroke();
 ctx.fillStyle='#173344';ctx.textAlign='center';ctx.font='700 17px system-ui';
 ctx.fillText('ILUSTRACIÓN ORIGINAL',w*.25,31);ctx.fillText('MONTAJE POR PIEZAS',w*.75,31);
 ctx.fillStyle='#6c7375';ctx.font='12px system-ui';
 ctx.fillText('Nueva versión · rostro en tres cuartos',w*.25,52);
 ctx.fillText(showPivots?'Jerarquía y articulaciones':animation==='neutral'?'Misma escala y pose':({idle:'Respiración',blink:'Parpadeo',talk:'Habla',walk:'Marcha · en revisión',react:'Reacción · en revisión'}[animation]),w*.75,52);
 const scale=height/rig.reference.height;
 ctx.save();ctx.translate(w*.25,baseline);ctx.scale(scale,scale);ctx.translate(-rig.reference.width/2,-rig.reference.height);ctx.drawImage(reference,0,0);ctx.restore();
 if(animation==='neutral')drawBonjuStatic(ctx,atlas,rig,{x:w*.75,y:baseline,height,pivots:showPivots});else animator.draw(ctx,{x:w*.75,y:baseline,height,pose:sampleBonjuPose(rig,animation,time),pivots:showPivots});
}
function tick(stamp){const dt=last?Math.min(80,stamp-last):0;last=stamp;if(!paused)time+=dt*speed;if(animation!=='neutral'&&stamp-lastDraw>1000/40){draw();lastDraw=stamp;}if(!document.hidden)frame=requestAnimationFrame(tick);}
document.querySelectorAll('[data-animation]').forEach(button=>button.addEventListener('click',()=>{animation=button.dataset.animation;time=0;document.querySelectorAll('[data-animation]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));draw();}));
document.querySelector('#pause').addEventListener('click',event=>{paused=!paused;event.currentTarget.textContent=paused?'Continuar':'Pausar';event.currentTarget.setAttribute('aria-pressed',String(paused));});
document.querySelector('#speed').addEventListener('change',event=>speed=Number(event.target.value));
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(tick);});
pivots.addEventListener('click',()=>{showPivots=!showPivots;pivots.setAttribute('aria-pressed',String(showPivots));pivots.textContent=showPivots?'Ocultar articulaciones':'Mostrar articulaciones';draw();});
window.addEventListener('resize',draw);
try{
 const access=await fetch('/api/world/rig-access',{cache:'no-store',credentials:'same-origin'}),permission=await access.json();
 if(!access.ok)throw Error(permission.error||'Esta revisión requiere acceso de STAFF.');
 const response=await fetch('/juegos/hosts/bonju-v2/rig.json',{cache:'no-cache'});
 if(!response.ok)throw Error('No se pudo cargar el montaje corregido.');
 rig=await response.json();
 [reference,atlas]=await Promise.all([loadImage('/juegos/hosts/bonju-v2/reference.webp?v='+rig.referenceRevision),loadImage('/juegos/hosts/bonju-v2/parts.webp?v='+rig.atlasRevision)]);
 animator=new BonjuAnimator(atlas,rig);
 status.textContent='Nueva Bonju · respiración, parpadeo y habla disponibles';
 pivots.disabled=false;document.querySelector('#part-count').textContent=rig.validation.visibleParts+' piezas visibles';
 document.querySelectorAll('[data-animation="neutral"],[data-animation="idle"],[data-animation="blink"],[data-animation="talk"]').forEach(button=>button.disabled=false);draw();frame=requestAnimationFrame(tick);
}catch(error){status.textContent=error.message;document.querySelector('#review-state').textContent='No se pudo abrir la revisión';}
