export const BOOT_WEIGHTS=Object.freeze({art:12,logo:8,account:20,fonts:5,module:15,scene:17,character:13,interface:10});
export class BootProgress{
 constructor(onChange=()=>{}){this.done=new Set();this.onChange=onChange;}
 get value(){return [...this.done].reduce((n,id)=>n+BOOT_WEIGHTS[id],0);}
 complete(id){if(!(id in BOOT_WEIGHTS))throw Error('Unknown boot resource');this.done.add(id);this.onChange(this.value,id);return this.value;}
 async track(id,work){const result=await work;this.complete(id);return result;}
}
export function loadBootImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=async()=>{try{if(image.decode)await image.decode();resolve(image);}catch(e){reject(e);}};image.onerror=()=>reject(Error('No se pudo cargar un recurso visual.'));image.src=url;});}
export function clearBootWallpaper(root){root.classList.remove('boot-art-ready');root.querySelector('.boot-art')?.removeAttribute('src');const bleed=root.querySelector('.boot-bleed');if(bleed)bleed.style.backgroundImage='none';}
export async function showBootWallpaper(root,url,{isCurrent=()=>true,load=loadBootImage}={}){const image=await load(url);if(!isCurrent())return image;root.querySelector('.boot-art').src=image.src;root.querySelector('.boot-bleed').style.backgroundImage='url("'+image.src+'")';root.classList.add('boot-art-ready');return image;}
export function createBootDisplay(root){
 const bar=root.querySelector('[role=progressbar]'),percent=root.querySelector('#boot-percent'),message=root.querySelector('#boot-message');let target=0,shown=0,raf,alive=true;
 root.hidden=false;root.classList.remove('boot-leaving','boot-error');root.querySelector('#boot-actions').hidden=true;
 const draw=()=>{if(!alive)return;shown+=Math.min(target-shown,Math.max(.3,(target-shown)*.12));const n=Math.min(target,Math.floor(shown));bar.style.setProperty('--boot-progress',n+'%');bar.setAttribute('aria-valuenow',n);percent.textContent=n+'%';raf=requestAnimationFrame(draw);};draw();
 const labels={art:'Preparando la bienvenida…',logo:'Encendiendo Apocalypse…',account:'Cuenta conectada.',fonts:'Preparando la interfaz…',module:'Abriendo el campamento…',scene:'Escenario preparado.',character:'Tu participante está listo.',interface:'Todo listo. Entrando…'};
 return {update(value,id){if(!alive)return;target=value;message.textContent=labels[id]||'Cargando el mundo…';},error(text){alive=false;cancelAnimationFrame(raf);root.classList.add('boot-error');message.textContent=text;root.querySelector('#boot-actions').hidden=false;},async finish(){target=100;while(shown<99.6)await new Promise(r=>requestAnimationFrame(r));alive=false;cancelAnimationFrame(raf);percent.textContent='100%';bar.style.setProperty('--boot-progress','100%');bar.setAttribute('aria-valuenow','100');message.textContent='Bienvenido a Apocalypse.';await new Promise(r=>setTimeout(r,180));root.classList.add('boot-leaving');await new Promise(r=>setTimeout(r,430));root.hidden=true;document.body.classList.remove('is-booting');}};
}
