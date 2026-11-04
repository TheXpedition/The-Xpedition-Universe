import {WorldScene} from './world-scene.mjs';
import {WORLD_MAPS} from './world-maps.mjs';
import {createWorldPlayer,stepWorld,jumpWorld,clearPoint,hasFloor} from './world-motion.mjs';
import {movementKey,movementVector,MOVEMENT_KEYS} from './world-input.mjs';
import {MotionDemo,CharacterMotion} from './character-motion.mjs';
const $=s=>document.querySelector(s),canvas=$('#scene'),demo=new MotionDemo(),status=new CharacterMotion(),keys=new Set(),pointers=new Map(),map=WORLD_MAPS.base;
// Find actual walkable space in the existing camp rather than bypassing its walls.
function findFloor(){for(let y=map.spawn[1];y<map.bounds[3]-35;y+=34)for(let x=map.bounds[0]+210;x<map.bounds[2]-450;x+=34){let clear=true;for(let dx=-80;dx<=410;dx+=17)if(!hasFloor(map,x+dx,y)||!clearPoint(map,x+dx,y,0)){clear=false;break;}if(clear)return {x,y};}return {x:map.spawn[0],y:map.spawn[1]};}
const spawn=findFloor(),player={...createWorldPlayer('base',spawn),userId:'maria-motion-preview',characterId:'maria-villegas',name:'María Villegas',state:'idle',clothing:'pajamas',status:'staff',staff:true},quality={lite:false,renderHeight:900,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
const scene=new WorldScene(canvas,{quality});scene.setZone('base');scene.bank.mariaMotion.getArt(false);
let last=0,frame=0,started=performance.now(),destroyed=false;
const toggle=active=>{demo.setActive(active);keys.clear();pointers.clear();player.moving=false;player.path=[];$('#demo').setAttribute('aria-pressed',String(active));$('#demo').textContent=active?'Detener demo':'Demostración';};
function manual(){if(demo.active)toggle(false);}
function jump(){jumpWorld(player,performance.now(),{quick:true});}
function key(e,down){if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const code=movementKey(e);if(!MOVEMENT_KEYS[code]&&code!=='Space'&&!code?.startsWith('Shift'))return;e.preventDefault();manual();if(down)keys.add(code);else keys.delete(code);if(down&&code==='Space'&&!e.repeat)jump();}
const keydown=e=>key(e,true),keyup=e=>key(e,false);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
$('#demo').onclick=()=>{toggle(!demo.active);canvas.focus({preventScroll:true});};$('#outfit').onchange=()=>{player.clothing=$('#outfit').value;};
for(const b of document.querySelectorAll('[data-direction]')){b.onpointerdown=e=>{e.preventDefault();manual();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.direction);};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>pointers.delete(e.pointerId));}
$('#jump').onpointerdown=e=>{e.preventDefault();manual();jump();};
function stop(){keys.clear();pointers.clear();toggle(false);last=0;}
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function tick(stamp){if(destroyed)return;frame=requestAnimationFrame(tick);if(document.hidden){last=0;return;}const dt=last?Math.min(.05,(stamp-last)/1000):0;last=stamp;let input=demo.step(dt);if(!input){const touch={x:0,y:0};for(const direction of pointers.values()){const pair={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[direction];touch.x+=pair[0];touch.y+=pair[1];}input=movementVector(keys,touch);}if(input.jump)jump();stepWorld(player,{...input,now:stamp},dt,map);player.state=player.moving?'walk':'idle';scene.players=[player];scene.focus={x:player.x+70,y:player.y*.62-125,zoom:1.8};scene.draw(stamp,dt,{selfId:player.userId});const pose=status.sample(player,stamp/1000);$('#state').textContent=({idle:'QUIETA',walk:'CAMINANDO',jump:pose.stage==='takeoff'?'IMPULSO':'EN EL AIRE',land:'ATERRIZAJE'})[pose.state];$('#direction').textContent=player.facing===1?'→':'←';if(scene.bank.mariaMotion.images.get('/juegos/outfits/maria-motion-v1/atlas.webp'))$('#loading').hidden=true;if(stamp-started>12000&&!$('#loading').hidden)$('#loading').textContent='Los recursos están tardando en cargar. Recarga la prueba para intentarlo de nuevo.';}
new ResizeObserver(()=>scene.setSize()).observe(canvas);toggle(new URLSearchParams(location.search).get('demo')==='1');frame=requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{destroyed=true;cancelAnimationFrame(frame);keys.clear();pointers.clear();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);},{once:true});
