import {birdPoint,sceneFlock} from './world-shelter-flock-art.mjs';
import {COOP_FEED,COOP_TOOLS,COOP_WATER_PER_BOTTLE} from './world-shelter-care.mjs';

export function createCoopBubbles({canvas,scene,state,clock,act,toast}){
 const root=document.createElement('div');
 root.className='world-coop-bubbles';
 root.setAttribute('role','group');
 root.hidden=true;
 document.body.append(root);
 let target=null,page='main',pending=false,signature='',width=0,height=0,lastMinute=-1,lastData;
 const close=()=>{target=null;signature='';root.hidden=true;};
 const bubble=(id,label,disabled=false)=>'<button type="button" data-coop="'+id+'"'+(disabled||pending?' disabled':'')+'>'+label+'</button>';
 const options=()=>{
  const map=target.map,flock=sceneFlock(map,clock(),state.survival?.shared);
  const items=state.survival?.personal?.items||{};
  const food=state.survival?.food||[];
  if(target.kind==='coop-water'){
   const water=Math.floor(flock.water);
   return {name:'Depósito del corral',value:water,label:'Agua',actions:bubble('water','Llenar agua · +'+Math.min(COOP_WATER_PER_BOTTLE,100-water)+' %',!items['clean-water']||water>=100)};
  }
  if(target.kind==='fire-spot'){
   if(state.survival?.shared?.fires?.some(fire=>fire.zone===map.id))return null;
   return {name:'Fogata del patio',hint:'3 leñas · 2 piedras · cerillas o pedernal',actions:bubble('fire','Poner fogata',(items.wood||0)<3||(items.stone||0)<2||(!items.matches&&!items.flint))};
  }
  const animal=flock.birds[target.bird.id];
  if(!animal||animal.health<=0)return null;
  let actions;
  const back=bubble('back','<span aria-hidden="true">↶</span><span class="coop-back-label">Volver</span>');
  if(page==='feed'){
   actions=back+Object.entries(COOP_FEED).map(([id,feed])=>bubble(id,feed.label,
    animal.food>=95||!(feed.kind==='resource'?items[id]:food.some(item=>item.foodId===id&&item.quantity>0)))).join('');
  }else if(page==='kill'){
   actions=back+Object.entries(COOP_TOOLS).map(([id,label])=>bubble(id,label,!items[id])).join('');
  }else{
   actions=bubble('feed','Alimentar')+bubble('kill','Matar')+
    (!target.bird.rooster&&animal.eggs?bubble('eggs','Recoger huevo · '+animal.eggs):'');
  }
  return {name:target.bird.name,label:'Salud',value:Math.ceil(animal.health),actions};
 };
 function refresh(){
  if(!target)return;
  const view=options();
  if(!view){close();return;}
  const next=JSON.stringify(view);
  if(next===signature)return;
  signature=next;
  root.setAttribute('aria-label',view.name);
  root.innerHTML='<div class="coop-bubble-actions">'+view.actions+'</div><div class="coop-bubble-card"><strong>'+view.name+'</strong>'+
   (view.label?'<div class="coop-bubble-meter">'+view.label+' <progress aria-label="'+view.label+'" value="'+view.value+'" max="100"></progress><b>'+view.value+' %</b></div>':'')+
   (view.hint?'<small>'+view.hint+'</small>':'')+'</div>';
  root.hidden=false;
  width=root.offsetWidth;height=root.offsetHeight;
 }
 function position(time){
  if(!target)return;
  if(scene.zone!==target.map.id||state.view!=='play'||document.querySelector('#modal')?.open){close();return;}
  const minute=Math.floor(time/60000);
  if(minute!==lastMinute||lastData!==state.survival){lastMinute=minute;lastData=state.survival;refresh();}
  if(!target)return;
  const anchor=target.bird?birdPoint(target.map,target.bird.id,time):target.anchor;
  const point=scene.camera.project(anchor.x,anchor.y,target.bird?target.bird.size*.88:0,scene.width,scene.height);
  const rect=canvas.getBoundingClientRect();
  const x=rect.left+point.x/scene.width*rect.width,y=rect.top+point.y/scene.height*rect.height;
  const left=Math.max(8,Math.min(innerWidth-width-8,x-width/2));
  const top=Math.max(8,Math.min(innerHeight-height-8,y-height-7));
  root.style.transform='translate3d('+Math.round(left)+'px,'+Math.round(top)+'px,0)';
 }
 async function click(event){
  const key=event.target.closest('[data-coop]')?.dataset.coop;
  if(!key||pending||!target)return;
  if(key==='back'||key==='feed'||key==='kill'){
   page=key==='back'?'main':key;refresh();return;
  }
  const current=target;
  const input=key==='fire'?{action:'fire'}:current.kind==='coop-water'?{action:'flock',id:'water'}:
   {action:'flock',id:key==='eggs'?'eggs':page,bird:current.bird.id,item:key};
  pending=true;refresh();
  try{
   const result=await act(input);
   if(result?.message)toast(result.message);
   if(target===current&&key==='fire')close();
  }catch(error){toast(error.message);}
  finally{pending=false;refresh();}
 }
 const outside=event=>{if(target&&!root.contains(event.target))close();};
 const keydown=event=>{if(target&&event.key==='Escape'){event.stopImmediatePropagation();close();}};
 root.addEventListener('click',click);
 document.addEventListener('pointerdown',outside,true);
 document.addEventListener('keydown',keydown,true);
 return {
  open(value){target=value;page='main';signature='';refresh();position(clock());},
  position,close,
  get openNow(){return !!target;},
  destroy(){document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keydown,true);root.remove();}
 };
}
