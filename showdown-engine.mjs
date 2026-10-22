import {initializeShowdownSocial,simulateShowdownBots,socialAction,socialView,challengePerformance,prepareAssignments,fillAssignments} from './showdown-social.mjs';
import {SHOWDOWN_FORMATS,SHOWDOWN_TIMES,SHOWDOWN_CHALLENGES,SHOWDOWN_STATS,SHOWDOWN_STAT_BUDGET,LIP_BEAT} from './public/showdown/config.mjs';

export function sdFail(message,status=409){throw Object.assign(new Error(message),{status});}
export function sdRandom(s){s.random=(Math.imul(s.random,1664525)+1013904223)>>>0;return s.random/4294967296;}
const pick=(s,list)=>list[Math.floor(sdRandom(s)*list.length)];
const shuffled=(s,list)=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(sdRandom(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const person=(s,id)=>s.players.find(p=>p.id===id);
const active=s=>s.players.filter(p=>p.active).map(p=>p.id);
const phaseKey=s=>s.id+':'+s.phaseNumber;
function event(s,type,data,at){s.events.push({id:s.events.length+1,type,...data,at});}
function setPhase(s,phase,at,ms=SHOWDOWN_TIMES[phase]){s.phase=phase;s.phaseNumber++;s.phaseAt=at;s.deadline=at+ms;s.revision++;}
function addStars(s,id,count,reason,at){person(s,id).stars+=count;event(s,'star',{player:id,count,reason},at);}
function track(s,id,key,status){s.track[id][key]=status;}
const bracketColumn=(s,g)=>'b'+g+'e'+s.bracketEpisode;
function groupsFor(format){return format===3?[['pink','Rosa','#ff3e98'],['gold','Dorado','#f8c75a'],['red','Rojo','#f44b56']]:format===2?[['orange','Naranja','#ff9240'],['pink','Rosa','#ff3e98'],['purple','Morado','#a55eff']]:[['red','Rojo','#f44b56'],['pink','Rosa','#ff3e98'],['purple','Morado','#a55eff']];}
export function createShowdown({id,host,mode='solo',format=3,seed=1,now=Date.now()}){
 if(!['solo','multi'].includes(mode)||!SHOWDOWN_FORMATS[format])sdFail('Elige un modo y un formato válidos.',400);
 if(mode==='multi'&&format!==3)sdFail('Las salas con amigos usan el formato The Original.',400);
 return {version:1,id,host,mode,format,status:'lobby',random:seed>>>0,phase:'lobby',phaseNumber:0,phaseAt:now,deadline:0,revision:0,created:now,players:[],groups:[],rounds:{},bracketEpisode:1,semiEpisode:0,qualifiers:[],wildcards:[],events:[],track:{},episodes:[],duels:[],finalPool:[],finalWinners:[],finalMatches:[],winner:null,paused:false,pausedAt:0};
}
export function joinShowdown(s,user,now){
 const old=s.players.find(p=>p.userId===user.id);if(old){old.present=true;old.lastSeen=now;s.revision++;return old;}
 if(s.status!=='lobby')sdFail('La temporada ya empezó. Solo sus participantes pueden volver.');
 if(s.mode==='solo'&&s.players.length||s.players.length>=18)sdFail('Esta sala ya está completa.');
 const p={id:user.id,userId:user.id,username:user.name,charId:null,lastSeen:now,present:true,joined:now,stars:0,active:true,bracket:null,bot:false,strategy:0.8,lipWins:0};s.players.push(p);s.revision++;return p;
}
export function selectShowdownCharacter(s,userId,charId,characters,slotId=null){
 if(s.status!=='lobby')sdFail('El elenco ya está confirmado.');
 const p=slotId?person(s,slotId):s.players.find(p=>p.userId===userId);if(!p||slotId&&(s.mode!=='solo'||userId!==s.host||!p.bot))sdFail('Esa casilla pertenece a otra persona.',403);
 if(!characters.some(c=>c.id===charId))sdFail('Elige un personaje del universo.',400);
 const other=s.players.find(other=>other.id!==p.id&&other.charId===charId);if(other){if(s.mode==='solo'&&other.bot&&!slotId&&p.charId)other.charId=p.charId;else sdFail('Ese personaje ya tiene participante. Elige otro.');}p.charId=charId;s.revision++;
}
export function fillShowdownBots(s,characters){
 if(s.status!=='lobby')sdFail('La temporada ya empezó.');
 const used=new Set(s.players.map(p=>p.charId));const available=shuffled(s,characters.filter(c=>!used.has(c.id)));
 let n=1;for(const p of s.players.filter(p=>p.bot))n=Math.max(n,Number(p.id.slice(3))+1);
 while(s.players.length<18){const c=available.pop();if(!c)sdFail('No hay suficientes personajes únicos.',400);s.players.push({id:'bot'+n,userId:null,username:'Bot '+n,charId:c.id,stars:0,active:true,bot:true,present:true,bracket:null,lipWins:0,strategy:sdRandom(s)<.8?.8:0,lastSeen:0});n++;}s.revision++;
}
export function beginShowdown(s,characters,now,{fillBots=false}={}){
 if(s.status!=='lobby')sdFail('La temporada ya está en marcha.');
 const humans=s.players.filter(p=>!p.bot);if(humans.length<(s.mode==='multi'?2:1))sdFail('Necesitas al menos dos personas para empezar con amigos.');
 if(humans.some(p=>!p.charId))sdFail('Cada participante debe elegir su personaje.');
 if(s.players.length<18){if(!fillBots)sdFail('Confirma que quieres rellenar el elenco con bots.');fillShowdownBots(s,characters);}
 if(s.players.length!==18||new Set(s.players.map(p=>p.charId)).size!==18)sdFail('El elenco necesita 18 personajes diferentes.');
 const order=shuffled(s,s.players);s.groups=groupsFor(s.format).map(([id,name,color],i)=>({id,name,color,players:order.slice(i*6,i*6+6).map(p=>{p.bracket=id;return p.id;})}));
 for(const p of s.players)s.track[p.id]={};s.status='running';s.started=now;initializeShowdownSocial(s);if(s.mode==='multi'){s.experienceVersion=2;setPhase(s,'presentation',now);}else prepareChallenge(s,now);
}
function controlling(s,p,at){return !p.bot&&p.present&&at-p.lastSeen<25000;}
function botGift(s,voter,pool){
 const eligible=pool.filter(id=>id!==voter.id);if(!eligible.length)return null;if(sdRandom(s)>voter.strategy)return pick(s,eligible);
 // Most bots protect an ally or someone below the leaders, instead of feeding the strongest rival.
 const sorted=eligible.sort((a,b)=>person(s,a).stars-person(s,b).stars);return pick(s,sorted.slice(0,Math.max(2,Math.ceil(sorted.length/2))));
}
function makeRound(s,pool,key){const used=new Set(s.episodes.filter(e=>e.group===key).map(e=>e.challenge));let choices=shuffled(s,SHOWDOWN_CHALLENGES.filter(c=>!used.has(c.id))).slice(0,6);if(choices.length<6)choices=shuffled(s,SHOWDOWN_CHALLENGES).slice(0,6);return {pool:[...pool],choices:choices.map(c=>c.id),votes:{},challenge:null,top:[],gifts:{},revealed:[],revealCursor:0,ranking:{},rankingConfirmed:[],performance:{},judging:[],duel:null};}
function prepareChallenge(s,at){
 s.rounds={};if(s.semiEpisode){s.rounds.united=makeRound(s,active(s),'united');}else for(const group of s.groups)s.rounds[group.id]=makeRound(s,group.players,group.id);
 setPhase(s,'challenge',at);
}
function allRounds(s){return Object.entries(s.rounds);}
function voters(s,r,gift=false){return r.pool.filter(id=>{const p=person(s,id);return p.active&&p.present&&!p.bot&&(!gift||!r.top.includes(id));});}
function closeCompletedVote(s,now){
 if(s.mode!=='multi'||!['ranking','rival','stats'].includes(s.phase)||now-s.phaseAt<12000)return;
 if(s.phase==='stats'){if(s.players.filter(p=>!p.bot).every(p=>p.statsReady)){const next=Math.min(s.deadline,now+2500);if(next!==s.deadline){s.deadline=next;s.revision++;}}return;}
 const done=allRounds(s).every(([,r])=>s.phase==='rival'?!!r.rival:voters(s,r,s.phase==='xvote').every(id=>s.phase==='challenge'?!!r.votes[id]:s.phase==='xvote'?!!r.gifts[id]:r.rankingConfirmed.includes(id)));
 if(done&&s.deadline>now){const next=Math.max(s.phaseAt+14000,Math.min(s.deadline,now+2500));if(next!==s.deadline){s.deadline=next;s.revision++;}}
}
function chooseChallenges(s){for(const [,r]of allRounds(s)){const counts={};for(const id of r.pool){if(!r.votes[id])r.votes[id]=pick(s,r.choices);if(r.votes[id])counts[r.votes[id]]=(counts[r.votes[id]]||0)+1;}const max=Math.max(0,...Object.values(counts));r.challenge=max?pick(s,Object.keys(counts).filter(k=>counts[k]===max)):pick(s,r.choices);}}
function startLip(s,r,ids,at){
 const method=s.mode==='multi'&&s.duels.length%2===1?'gauge':'target';
 const duel={method,target:1000,finishedAt:{},id:phaseKey(s)+':'+ids.join(','),ids:[...ids],start:at+SHOWDOWN_TIMES.countdown,end:at+SHOWDOWN_TIMES.countdown+(method==='gauge'?14000:SHOWDOWN_TIMES.lipsync),scores:{},hits:{},lastHit:{},botHits:{},proxy:[],tieOrder:shuffled(s,ids)};
 for(const id of ids){duel.scores[id]=0;duel.hits[id]=[];duel.lastHit[id]=Number.MAX_SAFE_INTEGER;const p=person(s,id);if(!controlling(s,p,at)){duel.proxy.push(id);duel.botHits[id]=[];p.lipSkill??=.25+sdRandom(s)*.62;const form=Math.max(.1,Math.min(.94,p.lipSkill+(sdRandom(s)-.5)*.22));if(method==='gauge'){const count=Math.floor(27+form*48);for(let hit=0;hit<count;hit++)duel.botHits[id].push({beat:hit,at:duel.start+400+hit*((duel.end-duel.start-700)/count)});}else for(let beat=0;beat<25;beat++)if(sdRandom(s)<form)duel.botHits[id].push({beat,at:duel.start+beat*LIP_BEAT+70+Math.floor(sdRandom(s)*180)});}}
 r.duel=duel;
}
export function showdownLipScores(duel,at){const scores={...duel.scores},lastHit={...duel.lastHit};for(const [id,hits]of Object.entries(duel.botHits)){const done=hits.filter(h=>h.at<=Math.min(at,duel.end));scores[id]=Math.min(duel.method==='gauge'?1000:Infinity,done.length*(duel.method==='gauge'?18:10));lastHit[id]=(duel.method==='gauge'&&scores[id]>=1000?done[55]?.at:done.at(-1)?.at)??Number.MAX_SAFE_INTEGER;}return {scores,lastHit};}
function resolveLip(s,duel,at){const {scores,lastHit}=showdownLipScores(duel,duel.end);duel.scores=scores;const order=[...duel.ids].sort((a,b)=>scores[b]-scores[a]||lastHit[a]-lastHit[b]||duel.tieOrder.indexOf(a)-duel.tieOrder.indexOf(b));duel.order=order;duel.winner=order[0];duel.tie=scores[order[0]]===scores[order[1]];person(s,order[0]).lipWins++;s.duels.push({id:duel.id,ids:duel.ids,scores,winner:duel.winner,tie:duel.tie,kind:s.finalKind?'final':s.semiEpisode?'elimination':'bracket',at});return order;}
function bracketTop(s,at){for(const [group,r]of allRounds(s)){const scores=Object.fromEntries(r.pool.map(id=>[id,challengePerformance(s,person(s,id),r.challenge)*.65+sdRandom(s)*.35]));r.top=shuffled(s,r.pool).sort((a,b)=>scores[b]-scores[a]).slice(0,2);for(const id of r.pool)track(s,id,bracketColumn(s,group),r.top.includes(id)?'TOP2':'BTM4');for(const id of r.top)addStars(s,id,2,'Top 2',at);}}
function recordEpisode(s,group,r){s.episodes.push({key:s.semiEpisode?'s'+s.semiEpisode:bracketColumn(s,group),group,challenge:r.challenge,top:r.top,safe:r.safe||[],high:r.high||[],low:r.low||null,bottom:r.bottom||[],winner:r.winner||r.duel?.winner||null,eliminated:r.eliminated||null,votes:r.revealed,rankingPoints:r.points||{}});}
function prepareGiftReveal(s,at){
 for(const [,r]of allRounds(s)){for(const id of r.pool.filter(id=>!r.top.includes(id)))if(!r.gifts[id])r.gifts[id]=botGift(s,person(s,id),r.pool);r.revealOrder=shuffled(s,Object.keys(r.gifts));r.revealCursor=0;r.revealed=[];}
 setPhase(s,'voteReveal',at,Math.max(2800,...allRounds(s).map(([,r])=>3000+r.revealOrder.length*3000)));
}
function revealGifts(s,at){for(const [,r]of allRounds(s)){const count=Math.min(r.revealOrder.length,Math.max(0,Math.floor((at-s.phaseAt-1800)/3000)+1));while(r.revealCursor<count){const voter=r.revealOrder[r.revealCursor++],target=r.gifts[voter];r.revealed.push({voter,target});addStars(s,target,1,s.bracketEpisode===3?'El Espejo':'The X Vote',s.phaseAt+1800+(r.revealCursor-1)*3000);}}}
function qualify(s,at){s.qualifiers=[];for(const group of s.groups){const tieOrder=shuffled(s,group.players);group.standings=[...group.players].sort((a,b)=>person(s,b).stars-person(s,a).stars||person(s,b).lipWins-person(s,a).lipWins||tieOrder.indexOf(a)-tieOrder.indexOf(b));group.qualified=group.standings.slice(0,s.format);s.qualifiers.push(...group.qualified);group.tied=person(s,group.standings[s.format-1]).stars===person(s,group.standings[s.format]).stars;for(const id of group.players)person(s,id).active=group.qualified.includes(id);}event(s,'qualified',{players:s.qualifiers},at);}
function prepareSemiJudging(s){
 const r=s.rounds.united,n=r.pool.length;r.points=Object.fromEntries(r.pool.map(id=>[id,0]));
 const rankedBy=r.pool;
 for(const voter of rankedBy){const remaining=r.pool.filter(id=>id!==voter),given=r.ranking[voter]||[];const rank=[...given,...shuffled(s,remaining.filter(id=>!given.includes(id)))];if(person(s,voter).bot)rank.sort((a,b)=>(s.relationships?.[voter]?.[b]||0)-(s.relationships?.[voter]?.[a]||0));r.ranking[voter]=rank;for(let i=0;i<rank.length;i++)r.points[rank[i]]+=rank.length-i;}
 for(const id of r.pool)r.performance[id]=(r.points[id]/Math.max(1,rankedBy.length*(n-1)))*.55+challengePerformance(s,person(s,id),r.challenge)*.3+sdRandom(s)*.15;
 const order=shuffled(s,r.pool).sort((a,b)=>r.performance[b]-r.performance[a]);r.order=order;
 if(s.format===4){r.top=order.slice(0,2);r.high=[];r.bottom=order.slice(-3);r.safe=order.slice(2,-3);r.judging=[{kind:'safe',ids:r.safe,at:1500},{kind:'top',ids:r.top,at:7000},{kind:'bottom',ids:r.bottom,at:13000}];}
 else{r.winner=order[0];r.high=order.slice(1,3);r.bottom=order.slice(-3);r.low=r.bottom[0];r.safe=order.slice(3,-3);r.judging=[{kind:'safe',ids:r.safe,at:1500},{kind:'high',ids:[r.high[0]],at:7500},{kind:'high',ids:[r.high[1]],at:12500},{kind:'win',ids:[r.winner],at:18500},{kind:'bottom',ids:r.bottom,at:24500},{kind:'low',ids:[r.low],at:30500},{kind:'bottom2',ids:r.bottom.slice(1),at:36500}];}
 for(const id of r.pool)track(s,id,'s'+s.semiEpisode,r.safe.includes(id)?'SAFE':r.high.includes(id)?'HIGH':r.top.includes(id)?'TOP2':id===r.winner?'WIN':id===r.low?'LOW':'BTM'+(s.format===4?3:2));
}
function eliminate(s,id,at){person(s,id).active=false;person(s,id).eliminatedAt=at;track(s,id,'s'+s.semiEpisode,'ELIM');event(s,'eliminated',{player:id},at);}
function prepareRival(s,at){
 const r=s.rounds.united;const remaining=s.finalPool.filter(id=>!s.finalMatches.some(m=>m.ids.includes(id)));r.pool=remaining;r.picker=pick(s,remaining);r.rival=null;
 if(remaining.length===2)r.rival=remaining.find(id=>id!==r.picker);
 setPhase(s,'rival',at,remaining.length===2?5000:SHOWDOWN_TIMES.rival);
}
function advanceFinal(s,at){
 if(s.finalMatches.length<s.finalPool.length/2){prepareRival(s,at);return;}
 s.finalRounds.push({players:[...s.finalPool],matches:[...s.finalMatches]});
 const winners=s.finalMatches.map(m=>m.winner);s.finalMatches=[];s.finalPool=winners;
 if(winners.length<=3){s.finalKind='crown';s.rounds.united=makeRound(s,winners,'united');startLip(s,s.rounds.united,winners,at);setPhase(s,'countdown',at);}
 else{s.finalKind='duel';prepareRival(s,at);}
}
function finishCrown(s,at){const r=s.rounds.united,order=resolveLip(s,r.duel,at);s.winner=order[0];s.podium=order;s.finished=at;for(const [i,id]of order.entries()){track(s,id,'crown',i===0?'WINNER':i===1?'RUNNERUP':'FINALIST');person(s,id).active=i===0;}setPhase(s,'coronation',at);event(s,'champion',{player:s.winner},at);}
export function tickShowdown(s,now){
 if(s.status!=='running'||s.paused)return false;const before=s.revision;let guard=0;
 simulateShowdownBots(s,now);closeCompletedVote(s,now);
 while(s.status==='running'&&now>=s.deadline&&guard++<250){const at=s.deadline;
  if(s.mode==='multi'&&['cut','lipResult'].includes(s.phase)&&!s.players.some(p=>!p.bot&&p.active&&p.present)){
   // Let the elimination verdict finish, then stop instead of playing a bot-only season.
   if(s.phase==='cut'||s.semiEpisode||s.finalKind){s.status='finished';s.endedReason='no-humans';s.finished=at;setPhase(s,'finished',at,0);break;}
  }
  if(s.phase==='presentation')setPhase(s,'stats',at);
  else if(s.phase==='stats'){for(const p of s.players)p.statsReady=true;prepareChallenge(s,at);}
  else if(s.phase==='status'){if(s.pendingNext==='bracket')s.bracketEpisode++;else if(s.pendingNext==='semi')s.semiEpisode++;prepareChallenge(s,at);s.pendingNext=null;}
  else if(s.phase==='challenge'){chooseChallenges(s);setPhase(s,'intro',at);}
  else if(s.phase==='intro'){for(const [,r]of allRounds(s))prepareAssignments(s,r);if(allRounds(s).some(([,r])=>r.slots))setPhase(s,'assign',at);else if(s.semiEpisode)setPhase(s,'ranking',at);else{bracketTop(s,at);setPhase(s,'critiques',at);}}
  else if(s.phase==='assign'){for(const [,r]of allRounds(s))fillAssignments(s,r,at,true);if(s.semiEpisode)setPhase(s,'ranking',at);else{bracketTop(s,at);setPhase(s,'critiques',at);}}
  else if(s.phase==='critiques'){for(const [,r]of allRounds(s))startLip(s,r,r.top,at);setPhase(s,'countdown',at);}
  else if(s.phase==='ranking'){prepareSemiJudging(s);setPhase(s,'judging',at);}
  else if(s.phase==='judging'){const r=s.rounds.united;startLip(s,r,s.format===4?r.top:r.bottom.slice(1),at);setPhase(s,'countdown',at);}
  else if(s.phase==='countdown')setPhase(s,'lipsync',at,Math.max(...allRounds(s).map(([,r])=>r.duel.end-at)));
  else if(s.phase==='lipsync'){
   if(s.finalKind==='crown'){finishCrown(s,at);}
   else if(s.finalKind){const r=s.rounds.united,order=resolveLip(s,r.duel,at);s.finalMatches.push({ids:[...r.duel.ids],winner:order[0],scores:r.duel.scores});for(const id of order)track(s,id,'f'+s.finalRounds.length,id===order[0]?(s.finalPool.length===6?'TOP3':'WIN'):'ELIM');for(const id of order.slice(1)){person(s,id).active=false;person(s,id).finalOut=true;}setPhase(s,'lipResult',at);}
   else if(s.semiEpisode){const r=s.rounds.united,order=resolveLip(s,r.duel,at);if(s.format===4){r.winner=order[0];track(s,r.winner,'s'+s.semiEpisode,'WIN');setPhase(s,'eliminate',at);}else{r.eliminated=order.at(-1);eliminate(s,r.eliminated,at);recordEpisode(s,'united',r);setPhase(s,'lipResult',at);}}
   else{for(const [group,r]of allRounds(s)){resolveLip(s,r.duel,at);addStars(s,r.duel.winner,1,'Lipsync',at);track(s,r.duel.winner,bracketColumn(s,group),'WIN');}setPhase(s,'lipResult',at);}
  }
  else if(s.phase==='eliminate'){const r=s.rounds.united;if(!r.eliminated)r.eliminated=[...r.bottom].sort((a,b)=>person(s,b).lipWins-person(s,a).lipWins||r.points[b]-r.points[a])[0];eliminate(s,r.eliminated,at);recordEpisode(s,'united',r);setPhase(s,'lipResult',at);}
  else if(s.phase==='lipResult'){
   if(s.finalKind)advanceFinal(s,at);
   else if(s.semiEpisode){if(active(s).length<=SHOWDOWN_FORMATS[s.format].finalists){s.finalKind='duel';s.finalPool=active(s);s.finalRounds=[];s.finalMatches=[];setPhase(s,'finalWelcome',at);}else{if(s.mode==='multi'){s.pendingNext='semi';setPhase(s,'status',at);}else{s.semiEpisode++;prepareChallenge(s,at);}}}
   else setPhase(s,'xvote',at);
  }
  else if(s.phase==='xvote')prepareGiftReveal(s,at);
  else if(s.phase==='voteReveal'){revealGifts(s,at);for(const [group,r]of allRounds(s))recordEpisode(s,group,r);if(s.bracketEpisode<3){if(s.mode==='multi'){s.pendingNext='bracket';setPhase(s,'status',at);}else{s.bracketEpisode++;prepareChallenge(s,at);}}else{qualify(s,at);setPhase(s,'cut',at);}}
  else if(s.phase==='cut')setPhase(s,'semifinalists',at);
  else if(s.phase==='semifinalists'){s.wildcards=shuffled(s,s.players.filter(p=>!p.active).map(p=>p.id)).slice(0,SHOWDOWN_FORMATS[s.format].wildcards);setPhase(s,'wildcard',at,8000+s.wildcards.length*4000);}
  else if(s.phase==='wildcard'){for(const id of s.wildcards){person(s,id).active=true;event(s,'return',{player:id},at);}s.semiEpisode=1;if(s.mode==='multi'){s.pendingNext='semi-first';setPhase(s,'status',at);}else prepareChallenge(s,at);}
  else if(s.phase==='finalWelcome')prepareRival(s,at);
  else if(s.phase==='rival'){const r=s.rounds.united;if(!r.rival)r.rival=pick(s,r.pool.filter(id=>id!==r.picker));startLip(s,r,[r.picker,r.rival],at);setPhase(s,'countdown',at);}
  else if(s.phase==='coronation'){s.status='finished';setPhase(s,'finished',at,0);}
  else sdFail('La fase de la temporada no es válida.',500);
 }
 if(guard>=250)sdFail('La temporada excedió su límite de transiciones.',500);
 if(s.phase==='voteReveal')revealGifts(s,now);
 closeCompletedVote(s,now);
 if(s.events.at(-1)?.at>s.phaseAt||s.revision!==before){s.revision++;return true;}return false;
}
export function showdownAction(s,userId,input,now){
 if(s.status!=='running')sdFail('La temporada no está en juego.');if(s.paused&&!['resume','pause'].includes(input.type))sdFail('La partida está en pausa.');
 const p=s.players.find(p=>p.userId===userId);if(!p)sdFail('No eres participante de esta sala.',403);
 if(input.type==='pause'||input.type==='resume'){
  if(s.mode!=='solo'||userId!==s.host)sdFail('Las salas con amigos no se pueden pausar.',403);
  if(input.type==='pause'){if(s.paused)return;s.paused=true;s.pausedAt=now;}else if(s.paused){const delta=now-s.pausedAt;s.phaseAt+=delta;s.deadline+=delta;for(const [,r]of allRounds(s))if(r.duel&&!r.duel.winner){r.duel.start+=delta;r.duel.end+=delta;for(const id of r.duel.ids)if(r.duel.lastHit[id]<Number.MAX_SAFE_INTEGER)r.duel.lastHit[id]+=delta;for(const hits of Object.values(r.duel.botHits))for(const hit of hits)hit.at+=delta;}s.paused=false;s.pausedAt=0;}s.revision++;return;
 }
 if(input.phase!==s.phaseNumber)sdFail('La pantalla avanzó. Ya tienes la fase actual.',409);
 if(input.type==='stats'){if(s.phase!=='stats'||p.statsReady)sdFail('Tus estadísticas ya están cerradas.');const stats=input.stats;if(!stats||Object.keys(stats).length!==SHOWDOWN_STATS.length||SHOWDOWN_STATS.some(k=>!Number.isInteger(stats[k])||stats[k]<1||stats[k]>5)||Object.values(stats).reduce((a,b)=>a+b,0)>SHOWDOWN_STAT_BUDGET)sdFail('Reparte hasta 30 estrellas, de 1 a 5 por habilidad.',400);p.stats={...stats};if(input.confirm)p.statsReady=true;s.revision++;return;}
 if(input.type==='social'){if(s.phase!=='status'||!p.active)sdFail('Espera a la pantalla Status.');if(now-(p.lastSocial||0)<4000)sdFail('Espera unos segundos antes de volver a reaccionar.');if(p.socialPhase!==s.phaseNumber){p.socialPhase=s.phaseNumber;p.socialCount=0;}if(p.socialCount>=3)sdFail('Ya usaste tus tres reacciones de este descanso.');socialAction(s,p,input.target,input.action,now);p.lastSocial=now;p.socialCount++;return;}
 const group=s.semiEpisode||s.finalKind?'united':p.bracket,r=s.rounds[group];if(!r)sdFail('Espera a la siguiente fase.');
 if(input.type==='challenge'){
  if(s.phase!=='challenge'||!p.active||!r.pool.includes(p.id)||!r.choices.includes(input.choice))sdFail('No puedes votar ese reto en esta fase.');r.votes[p.id]=input.choice;
 }else if(input.type==='gift'){
  if(s.phase!=='xvote'||!r.pool.includes(p.id)||r.top.includes(p.id)||input.choice===p.id||!r.pool.includes(input.choice))sdFail('Elige a otra persona de tu bracket para darle la estrella.');r.gifts[p.id]=input.choice;
 }else if(input.type==='ranking'){
  if(s.phase!=='ranking'||!p.active||r.rankingConfirmed.includes(p.id))sdFail('Tu ranking ya está cerrado.');const rank=input.order;
  if(!Array.isArray(rank)||new Set(rank).size!==rank.length||rank.some(id=>id===p.id||!r.pool.includes(id))||rank.length>r.pool.length-1)sdFail('El ranking contiene participantes repetidos o inválidos.',400);
  if(input.confirm&&rank.length!==r.pool.length-1)sdFail('Ordena a todos tus rivales antes de confirmar.',400);r.ranking[p.id]=[...rank];if(input.confirm)r.rankingConfirmed.push(p.id);
 }else if(input.type==='assignment'){if(s.phase!=='assign'||!p.active||!r.pool.includes(p.id)||!r.slots?.some(slot=>slot.id===input.choice))sdFail('Ese lugar no está disponible.');if(Object.entries(r.assignments).some(([id,slot])=>id!==p.id&&slot===input.choice))sdFail('Ese lugar ya fue elegido.');r.assignments[p.id]=input.choice;
 }else if(input.type==='tap'){
  const d=r.duel;if(s.phase!=='lipsync'||!d?.ids.includes(p.id)||d.proxy.includes(p.id)||now<d.start||now>=d.end)sdFail('Este lipsync no está disponible para ti.');
  if(d.method==='gauge'){if(d.scores[p.id]>=1000)return;if(now-(d.lastTap?.[p.id]||0)<105)sdFail('Sigue el pulso.');d.lastTap??={};d.lastTap[p.id]=now;d.scores[p.id]=Math.min(1000,d.scores[p.id]+18);d.lastHit[p.id]=now;if(d.scores[p.id]>=1000)d.finishedAt[p.id]=now;s.revision++;return;}
  const beat=Number(input.beat),current=Math.floor((now-d.start)/LIP_BEAT);
  if(!Number.isInteger(beat)||beat<0||beat>24||beat>current||beat<current-1)sdFail('Este objetivo ya cambió.');
  if(!d.hits[p.id].includes(beat)){d.hits[p.id].push(beat);d.scores[p.id]+=10;d.lastHit[p.id]=now;}
 }else if(input.type==='rival'){
  if(s.phase!=='rival'||r.picker!==p.id||r.rival||input.choice===p.id||!r.pool.includes(input.choice))sdFail('No puedes elegir ese rival.');r.rival=input.choice;
 }else if(input.type==='eliminate'){
  if(s.phase!=='eliminate'||r.winner!==p.id||r.eliminated||!r.bottom.includes(input.choice))sdFail('Elige a alguien del bottom 3.');r.eliminated=input.choice;
 }else if(input.type==='continue'){
  if(s.mode!=='solo'||!['intro','critiques','lipResult','cut','semifinalists','wildcard','judging','coronation'].includes(s.phase))sdFail('Esta fase no se puede adelantar.');
  // Keep every reveal and the complete 10-second lipsync; only trim presentation after it is visible.
  const minimum={intro:3000,critiques:6500,lipResult:3000,cut:6500,semifinalists:8500,wildcard:s.format===2?14000:10000,judging:42000,coronation:6500}[s.phase];if(now-s.phaseAt<minimum)sdFail('Deja que Bonju termine la revelación.');s.deadline=now;
 }else sdFail('Acción no válida.',400);
 s.revision++;
}
export function showdownPublicView(s,userId,now,characters){
 const p=s.players.find(p=>p.userId===userId);if(!p)sdFail('No eres participante de esta sala.',403);
 const catalog=new Map(characters.map(c=>[c.id,c]));const groupsOpen=s.status==='lobby'||['presentation','stats','status','semifinalists','wildcard'].includes(s.phase)||s.semiEpisode>0||s.status==='finished';
 const visiblePlayers=groupsOpen?s.players:s.players.filter(other=>other.bracket===p.bracket||other.id===p.id);
 const mapPlayer=other=>({id:other.id,userId:other.userId,username:other.username,character:catalog.get(other.charId)||null,bot:other.bot,stars:other.stars,active:other.active,present:other.present,online:other.bot||now-other.lastSeen<25000,bracket:other.bracket,lipWins:other.lipWins,stats:other.id===p.id?other.stats:undefined,statsReady:other.statsReady});
 const group=s.semiEpisode||s.finalKind?'united':p.bracket,r=s.rounds[group];let current=null;
 if(r){const d=r.duel,lipVisible=['countdown','lipsync','lipResult','eliminate','coronation','finished'].includes(s.phase);const resultVisible=['lipResult','eliminate','coronation','finished'].includes(s.phase);current={pool:r.pool,choices:r.choices,challenge:r.challenge,myChallenge:r.votes[p.id]||null,votes:s.phase==='challenge'?r.votes:{},gifts:s.phase==='xvote'?r.gifts:{},assignments:r.assignments||{},slots:r.slots||[],votedCount:Object.keys(r.votes).length,voterCount:r.pool.length,top:!s.semiEpisode||s.phase==='judging'&&now-s.phaseAt>=7000?r.top:[],myGift:r.gifts[p.id]||null,revealed:r.revealed,eligibleGift:s.phase==='xvote'&&r.pool.includes(p.id)&&!r.top.includes(p.id),myRanking:r.ranking[p.id]||[],rankingConfirmed:r.rankingConfirmed.includes(p.id),rankingCount:r.rankingConfirmed.length,judging:s.phase==='judging'?r.judging.filter(x=>now-s.phaseAt>=x.at):[],picker:s.phase==='rival'?r.picker:null,rival:s.phase==='rival'?r.rival:null,bottom:s.phase==='eliminate'?r.bottom:[],eliminated:s.phase==='lipResult'?r.eliminated:null,duel:lipVisible&&d?{id:d.id,method:d.method||'target',target:d.target||1000,ids:d.ids,start:d.start,end:d.end,...showdownLipScores(d,now),myHits:d.hits[p.id]||[],canTap:d.ids.includes(p.id)&&!d.proxy.includes(p.id),proxy:d.proxy,winner:resultVisible?d.winner||null:null,tie:resultVisible?!!d.tie:false,order:resultVisible?d.order||[]:[]}:null};
 }
 const view={social:s.phase==='status'?socialView(s,p.id):null,stats:p.stats||{},statsReady:!!p.statsReady,phaseSocialActions:p.socialPhase===s.phaseNumber?p.socialCount:0,id:s.id,host:s.host,mode:s.mode,format:s.format,status:s.status,endedReason:s.endedReason||null,nextRoom:s.nextRoom||null,phase:s.phase,phaseNumber:s.phaseNumber,phaseAt:s.phaseAt,deadline:s.deadline,revision:s.revision,serverTime:now,paused:s.paused,pausedAt:s.pausedAt,created:s.created,me:p.id,bracketEpisode:s.bracketEpisode,semiEpisode:s.semiEpisode,finalKind:s.finalKind||null,players:visiblePlayers.map(mapPlayer),people:s.players.filter(other=>!other.bot).map(other=>({id:other.id,username:other.username,character:catalog.get(other.charId)||null,stars:other.stars,active:other.active,online:now-other.lastSeen<25000,bracket:groupsOpen?other.bracket:other.id===p.id?p.bracket:null})),groups:(groupsOpen?s.groups:s.groups.filter(g=>g.id===p.bracket)).map(g=>({id:g.id,name:g.name,color:g.color,players:g.players,qualified:['cut','semifinalists','wildcard'].includes(s.phase)||s.semiEpisode||s.status==='finished'?g.qualified||[]:[],tied:['cut','semifinalists'].includes(s.phase)?g.tied||false:false})),current,qualifiers:groupsOpen?s.qualifiers:[],wildcards:s.phase==='wildcard'?s.wildcards.slice(0,Math.max(0,Math.floor((now-s.phaseAt-4000)/4000))):s.semiEpisode?s.wildcards:[],events:s.events.filter(e=>e.at<=now&&(groupsOpen||e.player&&visiblePlayers.some(p=>p.id===e.player))).slice(-30),track:s.status==='finished'?s.track:null,episodes:s.status==='finished'?s.episodes.map(({rankingPoints,...episode})=>episode):null,duels:s.status==='finished'?s.duels:null,finalRounds:s.finalKind?s.finalRounds||[]:[],finalPool:s.finalKind?s.finalPool:[],finalMatches:s.finalKind?s.finalMatches:[],winner:['coronation','finished'].includes(s.phase)?s.winner:null,podium:['coronation','finished'].includes(s.phase)?s.podium||[]:[]};
 return view;
}
