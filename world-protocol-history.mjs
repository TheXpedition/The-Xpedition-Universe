import {WORLD_CHARACTERS} from './public/juegos/world-characters.mjs';
import {activeLosers,duelLosers,duelWinners} from './public/juegos/x-protocol/outcomes.mjs';
const parse=s=>{try{return JSON.parse(s);}catch{return null;}};
const character=id=>WORLD_CHARACTERS.find(p=>p.id===id);
const exitCodes={quit:'QUIT',resigned:'QUIT',disqualified:'DISQ',disq:'DISQ',injured:'OUT',out:'OUT',dead:'DEAD'};
export function episodeCell(s,p){
 const a=s.advantages||{},nominees=new Set([...Object.keys(s.nominationReasons||{}),...(s.skulls.order||[]),...(s.nominees||[])]),rank=s.ranking.findIndex(r=>r.id===p.id);
 if(exitCodes[p.episodeExit])return exitCodes[p.episodeExit];
 if(activeLosers(s).includes(p.id))return 'ELIM';
 if(duelLosers(s.duel).includes(p.id)&&(a.eliminationCancelled||a.savedEliminations?.includes(p.id)))return 'ELIM_CANCELLED';
 if(s.duel?.ids.includes(p.id))return 'BTM2';
 if(a.retired?.includes(p.id))return 'SAFE_ADV';
 if(a.protected?.includes(p.id)&&nominees.has(p.id))return a.used?.some(u=>u.kind==='idol'&&(u.target||u.actor)===p.id)?'IDOL':'SAFE_ADV';
 if(nominees.has(p.id))return 'LOW';
 if(p.id===s.winner)return 'WIN';
 if(/bonju[\s-]*chef/i.test(s.source?.name||''))return rank>=0&&s.ranking[rank]?.challengeHigh?'HIGH':'SAFE';
 const high=/last[\s-]*grip/i.test(s.source?.name||'')||s.source?.kind==='last-grip'?6:3;
 return rank>=1&&rank<high?'HIGH':'SAFE';
}
function publicRounds(s){const rows=s.events.filter(e=>e.phase==='VOTE_ARCHIVE').map(e=>({round:e.round,tally:e.tally||{}}));if(s.vote.round)rows.push({round:s.vote.round,tally:s.vote.tally||{}});return rows.filter((r,i)=>rows.findLastIndex(t=>t.round===r.round)===i).map(r=>({round:r.round,tally:Object.fromEntries(Object.entries(r.tally).filter(([,n])=>Number(n)>0))}));}
export function publicProtocolEpisode(s,{episode=1,completedAt=0,users=new Map()}={}){
 const cast=s.roster.map(p=>({id:p.id,characterId:p.characterId,name:character(p.characterId)?.name||p.name,userName:p.bot?'Bot':users.get(p.id)?.name||p.userName||p.name,bot:!!p.bot,result:episodeCell(s,p)})),rounds=publicRounds(s),ids=s.skulls.order?.length?s.skulls.order:s.nominees;
 const received=id=>[...rounds].reverse().find(r=>Object.hasOwn(r.tally,id))?.tally[id]||0;
 const announced=(id,step)=>s.interview.step>step||s.interview.reply?.step===step&&(s.interview.reply.actorId===id||!s.interview.reply.actorId)||s.interview.replyQueue?.indexOf(id)>=0&&s.interview.replyQueue.indexOf(id)<=s.interview.replyIndex&&s.interview.step===step;
 const interviews=duelLosers(s.duel).map(id=>{const response=s.interview.responses?.[id]||{},answers=s.interview.answers||{};return {id,lastWords:announced(id,0)?response.lastWords||answers[0]?.[id]?.text||(s.duel.loser===id?s.interview.lastWords:null)||null:null,seasonWinner:announced(id,1)?response.seasonWinner||answers[1]?.[id]?.target||(s.duel.loser===id?s.interview.seasonWinner:null)||null:null,shouldLeave:announced(id,2)?response.shouldLeave||answers[2]?.[id]?.target||(s.duel.loser===id?s.interview.shouldLeave:null)||null:null};});
 return {id:s.id,episode,completedAt,challenge:s.source?.name||'Reto del episodio',cast,ranking:s.ranking.map((r,i)=>({id:r.id,rank:i+1})),nominees:ids.map(id=>({id,reason:s.nominationReasons[id]||'Nominación',votes:received(id)})),voteRounds:rounds,
  skulls:(s.secret.skulls||[]).map((value,index)=>({index:index+1,value,chosenBy:Object.entries(s.skulls.picks||{}).filter(([,v])=>(Array.isArray(v)?v:[v]).includes(index)).map(([id])=>id)})),
  duel:s.duel?{type:s.duel.type,outcome:s.duel.outcome||'single',ids:[...s.duel.ids],winners:duelWinners(s.duel),losers:activeLosers(s),annulled:duelLosers(s.duel).filter(id=>!activeLosers(s).includes(id)),reason:s.duel.reason||null,roundWins:{...s.duel.roundWins},actors:Object.fromEntries(s.duel.ids.map((id,i)=>{const p=s.duel.actors[id];return [id,{score:p.score||0,completed:p.completed||0,correct:p.good||0,wrong:p.wrong||0,attempts:p.attempts||0,balance:Math.round(p.balance||0),force:Math.round((i?100-s.duel.force:s.duel.force)*10)/10}];})),interviews}:null,
  bets:Object.entries(s.bets).filter(([id])=>cast.some(p=>p.id===id&&!p.bot)).map(([id,b])=>({id,target:b.target,amount:b.amount,payout:b.payout||0,result:!b.settled?'pending':s.cancelled?'refund':b.payout>0?'won':'lost'}))};
}
export function createProtocolHistory({db,now=Date.now}){
 const complete=s=>!s.cancelled&&!!s.duel&&(s.effects?.elimination||['DUEL_DRAW_CLOSING','ELIMINATION_VIDEO','EPISODE_END_CARD','RETURN_TO_WORLD','ELIMINATION_FINISHED'].includes(s.phase));
 async function rows(){return (await db.all("SELECT state FROM world_environment WHERE id LIKE ? ORDER BY updated ASC",'x-protocol:public:%')).map(r=>parse(r.state)).filter(Boolean).sort((a,b)=>a.episode-b.episode);}
 return {async record(s){if(!complete(s))return false;const key='x-protocol:public:'+s.id,old=parse((await db.one('SELECT state FROM world_environment WHERE id=?',key))?.state),all=old?[]:await rows(),users=new Map((s.roster.length?await db.all('SELECT id,name FROM users WHERE id IN ('+s.roster.map(()=>'?').join(',')+')',...s.roster.map(p=>p.id)):[]).map(p=>[p.id,p])),next=publicProtocolEpisode(s,{episode:old?.episode||Math.max(0,...all.map(e=>e.episode))+1,completedAt:old?.completedAt||now(),users});if(old&&JSON.stringify(old)===JSON.stringify(next))return false;await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated',key,JSON.stringify(next),now());return true;},
  async list(){const episodes=await rows(),cast=new Map();for(const e of episodes)for(const p of e.cast)cast.set(p.characterId,p);const season=parse((await db.one('SELECT state FROM world_seasons WHERE id=?','antarctica-1'))?.state)||{},active=await db.all('SELECT user_id FROM world_contestants WHERE season=? AND status=?','antarctica-1','active'),winner=[...cast.values()].find(p=>p.id===season.winner),final=winner?{winner:winner.characterId,runners:active.length<=3?[...cast.values()].filter(p=>p.id!==season.winner&&active.some(a=>a.user_id===p.id)).map(p=>p.characterId):[]}:null;return {season:'Apocalypse II',episodes,cast:[...cast.values()],final};}
 };
}
