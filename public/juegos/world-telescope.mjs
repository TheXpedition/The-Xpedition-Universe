import {paintEnvironment} from './world-environment-art.mjs';

const bound=x=>Math.max(0,Math.min(1,Number(x)||0));
export function telescopeGeometry(w,h,pan=.5,imageWidth=2400,imageHeight=1000){
 const r=Math.min(w*.27,h*.40),cy=h*.48,offset=r*.70;
 const scale=Math.max((r*2)/imageHeight,(r*3.4)/imageWidth)*1.30;
 const width=imageWidth*scale,height=imageHeight*scale,left=w/2-offset-r,right=w/2+offset+r;
 return {r,cy,centers:[w/2-offset,w/2+offset],x:left-(width-(right-left))*bound(pan),y:cy-height*.53,width,height};
}
// The same Canvas compositor used by the world paints time and weather inside the lenses.
export function drawTelescope(c,w,h,img,{pan=.5,environment,time=0,reducedMotion=false}={}){
 c.fillStyle='#020203';c.fillRect(0,0,w,h);const g=telescopeGeometry(w,h,pan,img.width,img.height);
 c.save();c.beginPath();for(const x of g.centers)c.arc(x,g.cy,g.r,0,Math.PI*2);c.clip();
 c.drawImage(img,g.x,g.y,g.width,g.height);
 paintEnvironment(c,w,h,{environment,map:{id:'montana-cima',width:w,height:h},camera:{zoom:1,project:(x,y)=>({x,y})},time,reducedMotion});
 const shade=c.createRadialGradient(w/2,g.cy,g.r*.5,w/2,g.cy,g.r*1.8);shade.addColorStop(0,'#0000');shade.addColorStop(1,'#000b');c.fillStyle=shade;c.fillRect(0,0,w,h);c.restore();
 c.strokeStyle='#9b866842';c.lineWidth=2;for(const x of g.centers){c.beginPath();c.arc(x,g.cy,g.r,0,Math.PI*2);c.stroke();}
 return g;
}
export function mountTelescope(root,{image,environment,onClose=()=>{},ImageClass=globalThis.Image}={}){
 const doc=root.ownerDocument,win=doc.defaultView;let current=.5,target=.5,frame=0,destroyed=false,loaded=false,drag=null,env=environment;
 root.innerHTML='<section class="telescope-view"><header><span>OBSERVATORIO · CIMA</span><h2>Más allá del campamento</h2><button type="button" data-scope-close aria-label="Dejar de observar">Cerrar <kbd>Esc</kbd></button></header><canvas tabindex="0" aria-label="Vista binocular. Arrastra o usa las flechas para observar"></canvas><p class="scope-loading" role="status">Ajustando los lentes…</p><footer><button type="button" data-scope-left aria-label="Mirar a la izquierda">◀</button><label>Recorrer el horizonte<input type="range" min="0" max="1000" value="500" aria-label="Posición del panorama"></label><button type="button" data-scope-right aria-label="Mirar a la derecha">▶</button><small>Arrastra para observar · ← → · A / D</small></footer></section>';
 const canvas=root.querySelector('canvas'),c=canvas.getContext('2d'),slider=root.querySelector('input'),status=root.querySelector('.scope-loading'),img=new ImageClass(),reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,win.devicePixelRatio||1);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));}
 function render(time){if(destroyed)return;current=reduced?target:current+(target-current)*.13;if(loaded){c.setTransform(1,0,0,1,0,0);drawTelescope(c,canvas.width,canvas.height,img,{pan:current,environment:env,time:Date.now(),reducedMotion:reduced});}frame=win.requestAnimationFrame(render);}
 function set(x){target=bound(x);slider.value=String(Math.round(target*1000));}
 function key(e){if(!['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)||e.target===slider)return;e.preventDefault();e.stopPropagation();set(target+(['ArrowLeft','a','A'].includes(e.key)?-.045:.045));}
 function down(e){if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,pan:target};canvas.setPointerCapture?.(e.pointerId);canvas.focus();}
 function move(e){if(drag?.id===e.pointerId)set(drag.pan+(drag.x-e.clientX)/Math.max(200,canvas.clientWidth)*.8);}
 function up(e){if(drag?.id!==e.pointerId)return;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);drag=null;}
 slider.oninput=()=>set(slider.value/1000);root.querySelector('[data-scope-left]').onclick=()=>set(target-.10);root.querySelector('[data-scope-right]').onclick=()=>set(target+.10);root.querySelector('[data-scope-close]').onclick=onClose;
 root.addEventListener('keydown',key);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',()=>drag=null);win.addEventListener('resize',resize);
 img.onload=()=>{if(destroyed)return;loaded=true;status.hidden=true;resize();};img.onerror=()=>{if(!destroyed){status.textContent='No se pudo cargar el panorama. Cierra y vuelve a observar.';}};img.src=image;resize();frame=win.requestAnimationFrame(render);canvas.focus();
 return {update(value){env=value;},destroy(){destroyed=true;win.cancelAnimationFrame(frame);win.removeEventListener('resize',resize);root.removeEventListener('keydown',key);if(drag&&canvas.hasPointerCapture?.(drag.id))canvas.releasePointerCapture(drag.id);img.onload=img.onerror=null;root.replaceChildren();}};
}
