export const CROPS=Object.freeze({
 wheat:{name:'Trigo',resource:'wheat',harvest:'espigas de trigo'},
 carrot:{name:'Zanahorias',food:'carrot',harvest:'zanahorias'},
 berries:{name:'Fresas',food:'strawberries',harvest:'porciones de fresas'},
 potato:{name:'Papas',food:'potato',harvest:'papas'},
 tomato:{name:'Tomates',food:'tomato',harvest:'tomates'},
 herbs:{name:'Hierbas medicinales',food:'herbal-leaves',harvest:'porciones de hierbas medicinales'}
});

const minute=60_000;
export const COOP_MIN=2,COOP_MAX=12,COOP_DEFAULT=3;
export const COOP_BIRDS=Object.freeze([
 {id:'canela',x:.43,y:.695,size:85,pace:.37,layAfter:55},
 {id:'gallo',x:.737,y:.70,size:105,pace:.31,rooster:true},
 {id:'pepita',x:.58,y:.714,size:79,pace:.47,layAfter:65},
 ...Array.from({length:9},(_,i)=>{
  const rooster=i%2===0,index=Math.floor(i/2)+(rooster?1:2);
  return {
   id:(rooster?'gallo-':'gallina-')+(index+1),
   x:.404+(i%3)*.16+(Math.floor(i/3)%2)*.085,y:.622+Math.floor(i/3)*.027,
   size:rooster?91:72,pace:.31+(i%5)*.035,range:.45,rooster,
   ...(rooster?{}:{layAfter:55+(index%2)*10})
  };
 })
]);
const namesByTeam={
 left:['Daelly','Mel RZ','Doppel','Miss Tea','Gennie Sheet','Xavier','Zoila Menos','Eduardo Buñuelo','Mary Weed','Beto Trujillo','Peggy','Jose Serna'],
 right:['Peggy','Jose Serna','Daelly','Miss Tea','Gennie Sheet','Xavier','Zoila Menos','Eduardo Buñuelo','Mary Weed','Mel RZ','Doppel','Beto Trujillo']
};
const birdNames=Object.fromEntries(Object.entries(namesByTeam).map(([team,names])=>[
 team,Object.fromEntries(COOP_BIRDS.map(({id},index)=>[id,names[index]]))
]));
export const coopBirdName=(team,id)=>birdNames[team]?.[id];

export const COOP_WATER_PER_BOTTLE=6;
export const COOP_FEED={
 wheat:{label:'Dar trigo',kind:'resource',gain:27},
 'raw-corn':{label:'Dar maíz',kind:'food',gain:32}
};
export const COOP_TOOLS={machete:'Matar con machete',rope:'Matar con cuerda'};
const clamp=value=>Math.max(0,Math.min(100,value));

export function birdMotion(bird,index,now){
 const t=now/1000,phase=t*bird.pace+index*2.1;
 return {
  x:bird.x+(bird.range??1)*(Math.sin(phase)*.041+Math.sin(phase*.42+index)*.018),
  y:bird.y+Math.sin(phase*.91+index)*.006,
  walking:Math.cos(phase)*.041+Math.cos(phase*.42+index)*.00756
 };
}
const newBird=()=>({health:94,food:66,eggs:0,laying:0,fed:false});
export function resizeFlock(flock,count){
 const birds=Object.fromEntries(COOP_BIRDS.slice(0,count).map(({id})=>[
  id,flock.birds[id]?.health>0?flock.birds[id]:newBird()
 ]));
 return {...flock,count,birds};
}
export function startFlock(now){
 return resizeFlock({at:now,water:1,clean:96,fence:76,birds:{}},COOP_DEFAULT);
}

// Existing eggs remain collectable. Only future laying uses the new care requirements.
export function flockAt(previous,now){
 const flock=previous?.birds?{...previous,birds:Object.fromEntries(
  Object.entries(previous.birds).map(([id,bird])=>[id,{...bird}])
 )}:startFlock(now);
 if(previous&&!previous.birds){
  flock.clean=previous.clean;flock.fence=previous.fence;flock.guardedAt=previous.guardedAt;
  flock.birds.canela.eggs=Math.max(0,Math.ceil((previous.eggs||0)/2));
  flock.birds.pepita.eggs=Math.max(0,Math.floor((previous.eggs||0)/2));
 }
 const elapsed=Math.min(180,Math.max(0,Math.floor((now-flock.at)/minute)));
 const living=COOP_BIRDS.filter(b=>flock.birds[b.id]?.health>0);
 let alive=living.length;
 for(let i=0;i<elapsed;i++){
  flock.water=clamp(flock.water-alive*.25);
  flock.clean=clamp(flock.clean-alive*.09);
  flock.fence=clamp(flock.fence-.16);
  for(const bird of living){
   const state=flock.birds[bird.id];
   if(state.health<=0)continue;
   state.food=clamp(state.food-.38);
   const penalty=(state.food<50?.25:0)+(flock.water<38?.4:0)+(flock.clean<55?.2:0)+(flock.fence<45?.18:0);
   state.health=clamp(state.health+(penalty?-penalty:.5));
   if(state.health<=0){state.eggs=0;state.laying=0;alive--;continue;}
   const ready=state.fed&&state.health>=85&&state.food>=75&&flock.water>=55&&flock.clean>=72&&flock.fence>=60;
   if(bird.rooster||state.eggs>=2)continue;
   state.laying=ready?state.laying+1:Math.max(0,state.laying-2);
   if(state.laying>=bird.layAfter){state.eggs++;state.laying=0;}
  }
 }
 if(elapsed)flock.at=now-(now-flock.at)%minute;
 return flock;
}
