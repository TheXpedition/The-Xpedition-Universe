export function bindWorldTouch({joystick,run,jump,change,onJump}){
 const knob=joystick.firstElementChild;
 let stick=null,runner=null,hold=0,locked=false,x=0,y=0,running=false;
 const publish=()=>change({x,y,run:running});
 function setRun(value){
  run.setAttribute('aria-pressed',String(value));
  if(running===value)return;
  running=value;
  publish();
 }
 function point(e){
  const dx=e.clientX-stick.x,dy=e.clientY-stick.y;
  const distance=Math.hypot(dx,dy);
  const scale=distance>stick.radius?stick.radius/distance:1;
  knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';
  const active=distance>stick.radius*.25;
  const nextX=active&&Math.abs(dx)>distance*.38?Math.sign(dx):0;
  const nextY=active&&Math.abs(dy)>distance*.38?Math.sign(dy):0;
  if(x===nextX&&y===nextY)return;
  x=nextX;y=nextY;publish();
 }
 function releaseStick(e){
  if(e.pointerId!==stick?.id)return;
  stick=null;
  knob.style.transform='';
  if(!x&&!y)return;
  x=0;y=0;publish();
 }
 joystick.addEventListener('pointerdown',e=>{
  if(stick||e.button!==0)return;
  e.preventDefault();
  const rect=joystick.getBoundingClientRect();
  stick={id:e.pointerId,x:rect.left+rect.width/2,y:rect.top+rect.height/2,radius:rect.width*.27};
  joystick.setPointerCapture(e.pointerId);
  point(e);
 });
 joystick.addEventListener('pointermove',e=>{if(e.pointerId===stick?.id)point(e);});
 function releaseRun(e){
  if(e.pointerId!==runner)return;
  runner=null;
  clearTimeout(hold);
  if(e.type==='pointercancel')locked=false;
  setRun(locked);
 }
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  joystick.addEventListener(type,releaseStick);
  run.addEventListener(type,releaseRun);
 }
 run.addEventListener('pointerdown',e=>{
  if(runner!==null||e.button!==0)return;
  e.preventDefault();
  runner=e.pointerId;
  run.setPointerCapture(runner);
  if(locked){locked=false;setRun(false);return;}
  setRun(true);
  hold=setTimeout(()=>{locked=true;},420);
 });
 run.addEventListener('click',e=>{if(e.detail===0){locked=!locked;setRun(locked);}});
 jump.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();
  onJump();
 });
 jump.addEventListener('click',e=>{if(e.detail===0)onJump();});
 for(const control of [joystick,run,jump])control.addEventListener('contextmenu',e=>e.preventDefault());
 return ()=>{
  stick=null;runner=null;locked=false;x=0;y=0;running=false;
  clearTimeout(hold);
  knob.style.transform='';
  run.setAttribute('aria-pressed','false');
 };
}
