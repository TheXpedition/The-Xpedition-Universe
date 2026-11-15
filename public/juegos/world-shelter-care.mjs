export const CROPS=Object.freeze({
 wheat:{name:'Trigo',resource:'wheat',harvest:'espigas de trigo'},
 carrot:{name:'Zanahorias',food:'carrot',harvest:'zanahorias'},
 berries:{name:'Fresas',food:'strawberries',harvest:'porciones de fresas'},
 potato:{name:'Papas',food:'potato',harvest:'papas'},
 tomato:{name:'Tomates',food:'tomato',harvest:'tomates'},
 herbs:{name:'Hierbas medicinales',food:'herbal-leaves',harvest:'porciones de hierbas medicinales'}
});

const minute=60_000;
export const EGG_INTERVAL=8;
export function startFlock(now){
 return {at:now,food:88,water:90,clean:96,health:94,fence:76,eggs:0,laying:0};
}

// Advance lazily, without a per-flock timer or a database write on each tick.
export function flockAt(previous,now){
 const flock={...(previous||startFlock(now))};
 const elapsed=Math.min(180,Math.max(0,Math.floor((now-flock.at)/minute)));
 for(let i=0;i<elapsed;i++){
  flock.food=Math.max(0,flock.food-1.4);
  flock.water=Math.max(0,flock.water-1.8);
  flock.clean=Math.max(0,flock.clean-.8);
  flock.fence=Math.max(0,flock.fence-.5);
  const comfortable=Math.min(flock.food,flock.water,flock.clean)>=38;
  const protectedFlock=flock.fence>=35;
  flock.health=Math.max(1,Math.min(100,flock.health+(comfortable&&protectedFlock?2:protectedFlock?-1:-2)));
  if(comfortable&&protectedFlock&&flock.health>=50&&flock.eggs<8){
   flock.laying++;
   if(flock.laying>=EGG_INTERVAL){flock.eggs+=2;flock.laying=0;}
  }
 }
 if(elapsed)flock.at=now-(now-flock.at)%minute;
 return flock;
}
