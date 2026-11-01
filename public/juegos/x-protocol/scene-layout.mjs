import {CAST_HEIGHTS} from '../world-cast-proportions.mjs';
export const DESIGN_WIDTH=1672;
export const castScale=id=>(CAST_HEIGHTS[id]||195)/195;
const benches=[[[.045,.366],[.116,.382],[.187,.399]],[[.052,.474],[.132,.492],[.212,.510]],[[.061,.588],[.151,.607],[.241,.626]]];
export function seatLayout(index){const side=index>=9?1:0,i=index%9,row=Math.floor(i/3),col=i%3,[x,y]=benches[row][col];return {x:side?1-x:x,y,row,col,flip:!!side,height:.278+row*.017};}
export const arenaMode=s=>{if((s.advantage?.eliminationCancelled||s.advantages?.eliminationCancelled)&&['ADVANTAGE_WINDOW','EPISODE_END_CARD'].includes(s.phase))return 'ceremony';if(s.phase==='ADVANTAGE_WINDOW')s={...s,phase:s.advantage?.window?.next||'CEREMONY_STAGE_VISIBLE'};return s.phase==='BETTING_PHASE'?'betting':['LUCKY_SKULLS_ORDER','LUCKY_SKULLS_PICKING','LUCKY_SKULLS_REVEAL','SAFE_PLAYER_REVEAL'].includes(s.phase)?'skulls':s.phase==='DUEL_RESULT'&&s.clock-s.phaseAt>=1800?'result':['ELIMINATED_INTERVIEW','INVENTORY_GIFT','ELIMINATION_VIDEO','EPISODE_END_CARD'].includes(s.phase)?'interview':!!s.duel&&['DUEL_TYPE_REVEAL','DUEL_GUIDE','DUEL_COUNTDOWN','DUEL_ACTIVE','DUEL_RESULT'].includes(s.phase)?s.duel.type:'ceremony';};
export function spriteGrip(meta,{x,y,height,flip=false}){const width=height*meta.width/meta.height,g=meta.grip||{x:.9,y:.45};return {x:x+(flip?-1:1)*(g.x-.5)*width,y:y-height+g.y*height};}

export function seatedActors(roster){return roster.map((p,i)=>({p,i,a:seatLayout(Number.isInteger(p.seat)?p.seat:i)})).sort((u,v)=>u.a.y-v.a.y||u.a.x-v.a.x);}
