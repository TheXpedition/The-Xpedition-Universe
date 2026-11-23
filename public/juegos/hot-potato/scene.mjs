const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const narrow=matchMedia('(max-width:600px)');
let layout='', flight=null;
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
 const rect=card.img.getBoundingClientRect();
 return {x:rect.left+rect.width*.52,y:rect.top+rect.height*.54};
}
function animateActor(card,angles){
 if(!card||reduced.matches)return;
 return card.img.animate(angles.map(([angle,y])=>({transform:'translateY('+y+'px) rotate('+angle+'deg)'})),{duration:290,easing:'ease-out'});
}
function launch(cards,from,to){
 const source=cards.get(from),target=cards.get(to);
 if(!source||!target||reduced.matches)return;
 const a=hand(source),b=hand(target),dx=b.x-a.x,dy=b.y-a.y;
 flight?.remove();const ball=document.createElement('i');flight=ball;ball.className='potato-flight';ball.setAttribute('aria-hidden','true');
 ball.style.left=a.x+'px';ball.style.top=a.y+'px';document.body.append(ball);
 const sign=dx>=0?1:-1;
 animateActor(source,[[0,0],[-8*sign,-2],[15*sign,-5],[0,0]]);
 const translate=(x,y,angle)=>'translate(-50%,-50%) translate('+x+'px,'+y+'px) rotate('+angle+'deg)';
 const motion=ball.animate([
  {transform:translate(0,0,0)},
  {transform:translate(dx*.5,dy*.5-Math.min(85,Math.max(28,Math.abs(dx)*.18)),sign*150)},
  {transform:translate(dx,dy,sign*300)}
 ],{duration:210,easing:'linear'});
 motion.onfinish=()=>{ball.remove();if(flight!==ball)return;flight=null;animateActor(target,[[0,0],[8*sign,-8],[-3*sign,0],[0,0]]);};
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
 if(!previous||previous.id!==next.id||previous.revision===next.revision)return;
 if(previous.phase==='playing'&&next.phase==='playing'&&previous.holder!==next.holder)launch(cards,previous.holder,next.holder);
 if(previous.phase!==next.phase&&next.phase==='blast'){
  burst(hitPoint);animateActor(cards.get(next.lastHit.id),[[0,0],[-14,-8],[12,0],[-5,-2],[0,0]]);
 }
}
export function impactPoint(next,cards){
 const hit=next.phase==='blast'&&cards.get(next.lastHit?.id);
 return hit?.img?.isConnected?hand(hit):null;
}
