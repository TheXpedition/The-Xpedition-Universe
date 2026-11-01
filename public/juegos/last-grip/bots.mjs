import {GRIP_MAPS,BOOTHS,nearestFloor,gripPath,exitTowards,monitorSpot} from './navigation.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function botSpot(area,index,variant=0){const columns=area==='changing'?[480,640,800,960,1120,1280]:[670,800,930,1060,1190,1320],row=Math.floor(index/6)%3,x=columns[index%6]+(variant?((index%2)*2-1)*27:0),y=(area==='changing'?715:675)+row*48+(variant?12:0);return nearestFloor(area,x,y);}
function route(p,target,key){if(p.botGoal===key&&p.path?.length)return;p.path=gripPath(p.area,p,target);p.pathRun=false;p.input=null;p.botGoal=key;}
function travel(p,to,apply){if(p.area===to)return true;const door=exitTowards(p.area,to);if(!door)return false;if(distance(p,door)<door.range-12){apply(p,{type:'interact',target:door.id});p.botGoal=null;}else route(p,door,p.area+':'+door.id);return false;}
export function driveBots(s,{apply,hash}){
 if(['closed','lobby','opening','arrival','intro','guide','finished'].includes(s.phase))return;
 const bots=s.roster.filter(p=>p.bot),queues=BOOTHS.map((_,i)=>bots.filter(p=>!p.changed&&s.roster.indexOf(p)%BOOTHS.length===i));
 for(const p of bots){const index=s.roster.indexOf(p),hanging=['active','ending'].includes(s.phase)&&s.round?.members.includes(p.id)&&!s.round.falls.some(f=>f.id===p.id);if(hanging)continue;
  if(s.phase==='changing'&&!p.changed){if(!travel(p,'changing',apply))continue;const boothIndex=index%BOOTHS.length,booth=BOOTHS[boothIndex],first=queues[boothIndex][0];
   if(first!==p){p.botActivity='waiting';const spot=botSpot('changing',index);if(distance(p,spot)>18)route(p,spot,'queue:'+index);continue;}
   if(distance(p,booth)>24){p.botActivity='approaching';route(p,booth,'dress:'+booth.id);continue;}
   p.path=[];p.input=null;p.botActivity='changing';p.botDressUntil??=s.clock+900+hash(p.id+':wardrobe')*700;
   if(s.clock>=p.botDressUntil){apply(p,{type:'interact',target:booth.id});p.botDressUntil=null;p.botActivity='leaving';p.botGoal=null;}continue;
  }
  // Dressed competitors leave the booths, take separate positions, and keep
  // moving between nearby viewing spots while waiting for their own round.
  const to=['results','winner','finalReady'].includes(s.phase)?'monitor':'stands';if(s.clock<(p.botHoldUntil||0))continue;if(!travel(p,to,apply))continue;
  const variant=Math.floor((s.clock+(hash(p.id)*5000))/6500)%2,spot=to==='monitor'?monitorSpot(index):botSpot('stands',index,variant);p.botActivity='watching';
  if(distance(p,spot)>18)route(p,spot,'watch:'+index+':'+variant);else{p.path=[];p.input=null;p.botGoal=null;}
 }
}
