const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const narrow=matchMedia('(max-width:600px)');
let layout='';
const flights=new Set(),actorMotions=new WeakMap(),arrivals=new WeakMap();
export function arrange(cards,players){
 const living=players.filter(p=>p.lives>0);
 const columns=narrow.matches?4:7;
 const key=columns+'|'+living.map(p=>p.id).join('|');
 if(key===layout)return;
 layout=key;
 const field=document.getElementById('cast');
 const rows=Math.ceil(living.length/columns),lanes=[];
 let at=0;
 for(let row=0;row<rows;row++){
  const lane=document.createElement('div');lane.className='lane';
  const size=Math.ceil((living.length-at)/(rows-row));
  for(const p of living.slice(at,at+size))lane.append(cards.get(p.id).b);
  at+=size;lanes.push(lane);
 }
 field.replaceChildren(...lanes);
 document.getElementById('game').dataset.small=String(living.length<=4);
}
function hand(card){
 const rect=card.b.getBoundingClientRect(),sprite=card.sprite;
 return {x:rect.left+sprite.offsetLeft+sprite.offsetWidth*.52,y:rect.top+sprite.offsetTop+sprite.offsetHeight*.54};
}
function animateActor(card,angles){
 if(!card||reduced.matches)return;
 actorMotions.get(card)?.cancel();
 const motion=card.sprite.animate(angles.map(([angle,y])=>({transform:'translate3d(0,'+y+'px,0) rotate('+angle+'deg)'})),{duration:300,easing:'ease-out'});
 actorMotions.set(card,motion);
 motion.onfinish=()=>{if(actorMotions.get(card)===motion)actorMotions.delete(card);};
}
function launch(cards,from,to){
 const source=cards.get(from),target=cards.get(to);
 if(!source||!target||reduced.matches)return;
 const a=hand(source),b=hand(target),dx=b.x-a.x,dy=b.y-a.y;
 // Anchor to the slot, so another throw cannot move either endpoint.
 const distance=Math.hypot(dx,dy);
 const arc=Math.min(96,Math.max(34,distance*.19));
 if(flights.size>=3){const first=flights.values().next().value;flights.delete(first);first.cancel();}
 const ball=document.createElement('i');ball.className='potato-flight';ball.setAttribute('aria-hidden','true');
 ball.style.left=a.x+'px';ball.style.top=a.y+'px';document.body.append(ball);
 const sign=dx>=0?1:-1;
 animateActor(source,[[0,0],[-9*sign,-3],[16*sign,-6],[0,0]]);
 const frames=Array.from({length:9},(_,i)=>{
  const progress=i/8,x=dx*progress,y=dy*progress-4*arc*progress*(1-progress);
  return {transform:'translate(-50%,-50%) translate3d('+x+'px,'+y+'px,0) rotate('+(progress*360*sign)+'deg)'};
 });
 const motion=ball.animate(frames,{duration:distance>300?480:420,easing:'linear'});
 flights.add(motion);
 arrivals.set(target,motion);
 target.b.classList.add('receiving');
 const clear=()=>{
  ball.remove();flights.delete(motion);
  if(arrivals.get(target)===motion){
   target.b.classList.remove('receiving');
   arrivals.delete(target);
   return true;
  }
  return false;
 };
 motion.oncancel=clear;
 motion.onfinish=()=>{if(clear()&&target.b.classList.contains('holder'))animateActor(target,[[0,0],[-7*sign,-7],[3*sign,-3],[0,0]]);};
}
function burst(point){
 if(!point||reduced.matches)return;
 for(let i=0;i<14;i++){
  const spark=document.createElement('i');spark.className='ember';spark.setAttribute('aria-hidden','true');
  spark.style.left=point.x+'px';spark.style.top=point.y+'px';document.body.append(spark);
  const a=i*Math.PI/7,r=42+(i%3)*21;
  const motion=spark.animate([{transform:'scale(.6)',opacity:1},{transform:'translate('+Math.cos(a)*r+'px,'+(Math.sin(a)*r+12)+'px) scale(.1)',opacity:0}],{duration:510,easing:'ease-out'});
  motion.onfinish=()=>spark.remove();
 }
}
export function present(previous,next,cards,hitPoint){
 if(next.phase!=='playing'||next.pausedAt!=null)for(const motion of flights)motion.cancel();
 if(!previous||previous.id!==next.id||previous.revision===next.revision)return;
 if(previous.phase==='playing'&&next.phase==='playing'&&previous.holder!==next.holder)launch(cards,previous.holder,next.holder);
 if(previous.phase!==next.phase&&next.phase==='blast'){
  burst(hitPoint);animateActor(cards.get(next.lastHit.id),[[0,0],[-14,-8],[12,0],[-5,-2],[0,0]]);
 }
}
export function impactPoint(next,cards){
 const hit=next.phase==='blast'&&cards.get(next.lastHit?.id);
 return hit?.sprite?.isConnected?hand(hit):null;
}
