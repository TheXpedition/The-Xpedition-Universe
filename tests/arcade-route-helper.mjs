import {newRun,stepRun,jumpTo,distance,MAX_JUMP} from '../public/simulator/ice-breaker/engine.mjs';
export function pathTo(run,target){
 const start=run.floes.find(f=>f.id===run.player.floe),queue=[[start.id]],seen=new Set([start.id]);
 while(queue.length){const path=queue.shift(),f=run.floes.find(f=>f.id===path.at(-1));if(f.id===target.id)return path.slice(1);
  for(const next of run.floes){if(seen.has(next.id))continue;const a={x:f.anchorX,y:f.anchorY},b={x:next.anchorX,y:next.anchorY};if(distance(a,b)<=MAX_JUMP){seen.add(next.id);queue.push([...path,next.id]);}}
 }return null;
}
export function solveRun(level=1,difficulty='normal'){
 let run=newRun({level,difficulty});const commands=[];
 const tick=(r,input={x:0,y:0,dodge:false},out=commands)=>{stepRun(r,input,1/120);const last=out.at(-1);if(last?.op==='step'&&last.ticks<300&&JSON.stringify(last.input)===JSON.stringify(input))last.ticks++;else out.push({op:'step',ticks:1,input});r.events.length=0;};
 const objectives=[...run.floes.filter(f=>f.beacon).sort((a,b)=>a.col-b.col),run.floes.find(f=>f.kind==='finish')].map(f=>f.id);
 for(const id of objectives){let guard=0;
  while(run.player.floe!==id){if(++guard>100)throw Error('Route stalled '+level+' '+difficulty+' '+id);const objective=run.floes.find(f=>f.id===id),route=pathTo(run,objective);if(!route?.length)throw Error('No route '+level+' '+id);const next=route[0];let candidate;
   for(let wait=0;wait<=900;wait+=18){const test=structuredClone(run),ops=[];for(let n=0;n<wait;n++)tick(test,{x:0,y:0,dodge:!test.player.dodgeCooldown},ops);if(test.lives<1||test.deathTimer||!jumpTo(test,next))continue;ops.push({op:'jump',id:next});
    let count=0;while(test.jump&&++count<200){const f=test.floes.find(f=>f.id===next),j=test.jump,dx=f.x-j.aim.x-j.airX,dy=f.y-j.aim.y-j.airY;tick(test,{x:Math.abs(dx)>3?Math.sign(dx):0,y:Math.abs(dy)>2?Math.sign(dy):0,dodge:false},ops);}
    if(!test.deathTimer&&test.lives>0&&test.player.floe===next){candidate={test,ops};break;}
   }
   if(!candidate)throw Error('No safe jump '+level+' '+difficulty+' '+run.player.floe+' -> '+next+' t='+run.time);
   run=candidate.test;commands.push(...candidate.ops);
  }
  const f=run.floes.find(f=>f.id===id);let guardTicks=0;
  while(run.status==='playing'&&(f.beacon&&!f.activated||f.kind==='finish')){
   if(++guardTicks>180)throw Error('Objective stalled '+level+' '+id);const threat=run.enemies.some(e=>e.phase==='charge'&&distance(e,run.player)<145)||run.wave.phase==='sweep'&&Math.abs(run.wave.x-run.player.x)<100;
   tick(run,{x:0,y:0,dodge:threat&&!run.player.dodgeCooldown});if(run.deathTimer)throw Error('Objective death '+level+' '+difficulty+' '+id);
  }
 }
 if(run.status!=='won')throw Error('Not won');return {run,commands};
}
