import {createEpisode,applyEpisode,tickEpisode,pulseAt,precision} from './engine.mjs';
import {BOOTHS,placeAttendee} from './navigation.mjs';

// Local snapshots are built from the real rules; no missing image export or
// server-side episode is required to open the staff review.
export function createReviewScenes(){
 let now=0,seed=19;const random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646,s=createEpisode({id:'staff-local-review',now}),scenes=[];
 Object.assign(s.config,{baseDrain:12,drawInterval:100,resultDuration:500});
 const act=a=>applyEpisode(s,a,{staff:true,actor:{id:'staff-review'},now,random}),step=ms=>{while(ms>0){const dt=Math.min(50,ms);now+=dt;tickEpisode(s,now);ms-=dt;}},until=phase=>{for(let i=0;i<12000&&s.phase!==phase;i++)step(50);if(s.phase!==phase)throw Error('No se pudo preparar la escena '+phase);},save=area=>scenes.push({state:structuredClone(s),area,selfId:s.round?.members[0]||s.roster[0].id});
 act({type:'open'});act({type:'fillBots'});act({type:'start'});until('intro');save('monitor');act({type:'changing'});save('changing');
 for(const [i,p]of s.roster.entries()){const booth=BOOTHS[i%BOOTHS.length];placeAttendee(p,'changing',[booth.x,booth.y]);applyEpisode(s,{type:'change',target:booth.id},{actor:{id:p.id},now,random});}
 act({type:'prepare'});act({type:'draw'});until('ready');act({type:'startRound'});step(200);save('stands');
 const pulse=pulseAt(s),target=pulse.start+precision(s).center*pulse.duration;step(Math.max(0,target-s.clock));save('stands');act({type:'event',event:'rain',enabled:true});step(3100);save('stands');until('results');step(650);save('monitor');
 for(let i=0;i<2;i++){act({type:'draw'});until('ready');act({type:'startRound'});until('results');step(650);}
 act({type:'final'});until('ready');act({type:'startRound'});step(200);save('stands');until('winner');save('stands');
 return scenes;
}
