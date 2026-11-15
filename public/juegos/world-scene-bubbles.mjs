export function placeSceneBubbles(root,{canvas,scene,anchor},size){
 const point=scene.camera.project(anchor.x,anchor.y,anchor.z||0,scene.width,scene.height);
 const rect=canvas.getBoundingClientRect();
 const x=rect.left+point.x/scene.width*rect.width,y=rect.top+point.y/scene.height*rect.height;
 if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return false;
 const left=Math.max(8,Math.min(innerWidth-size.width-8,x-size.width/2));
 const top=Math.max(8,Math.min(innerHeight-size.height-8,y-size.height-7));
 root.style.transform='translate3d('+Math.round(left)+'px,'+Math.round(top)+'px,0)';
 root.style.setProperty('--bubble-tip-x',Math.round(x-left)+'px');
 return true;
}

export function createSceneContext({canvas,scene,canShow}){
 const root=document.createElement('section');
 root.className='world-coop-bubbles world-scene-context';
 root.setAttribute('role','group');
 root.hidden=true;
 document.body.append(root);
 let active=null,key,dirty=true,width,height,pageWidth,pageHeight;
 const resize=new ResizeObserver(()=>{if(active){width=root.offsetWidth;height=root.offsetHeight;}});
 resize.observe(root);
 function close(){active=null;root.hidden=true;root.replaceChildren();}
 function position(){
  if(!active)return;
  if(!canShow()||active.zone!==scene.zone){close();return;}
  const anchor=active.anchor();
  if(!anchor){close();return;}
  const next=active.key?.();
  if(dirty||next!==key||pageWidth!==innerWidth||pageHeight!==innerHeight){
   if(dirty||next!==key)root.innerHTML=active.markup(next);
   root.hidden=false;
   key=next;dirty=false;
   width=root.offsetWidth;height=root.offsetHeight;pageWidth=innerWidth;pageHeight=innerHeight;
  }
  if(!placeSceneBubbles(root,{canvas,scene,anchor},{width,height}))close();
 }
 const outside=event=>{if(active&&!root.contains(event.target))close();};
 const escape=event=>{if(active&&event.key==='Escape'){event.stopImmediatePropagation();close();}};
 document.addEventListener('pointerdown',outside,true);
 document.addEventListener('keydown',escape,true);
 return {
  open(value){active=value;dirty=true;root.setAttribute('aria-label',value.name);position();},
  close,position,get openNow(){return !!active;},
  destroy(){resize.disconnect();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);root.remove();}
 };
}
