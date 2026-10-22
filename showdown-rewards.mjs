export function createShowdownRewards({db,progression,serialize,now=Date.now}){
 return async function reward(s,uid){
  const p=s.players.find(p=>p.userId===uid);if(!p)return {};
  const solo=s.mode==='solo',snapshot=s.soloSnapshot,elapsed=now()-(s.started||s.created),completed=solo?Math.max(0,(snapshot?.vars.episode||1)-1):(s.episodes||[]).filter(e=>s.track[p.id]?.[e.key]).length;
  if(completed<1||elapsed<45000)return {};
  s.rewardCursors??={};const cursor=s.rewardCursors[uid]||{episodes:0,done:false};
  const eligible=Math.min(completed,Math.floor(elapsed/20000));
  const finished=s.status==='finished'&&(s.winner||s.soloWinner||s.endedReason==='no-humans')&&elapsed>=180000;
  if(eligible<=cursor.episodes&&(!finished||cursor.done))return {};
  const awards=[];await serialize(async()=>{
   const dayStart=Math.floor((now()-5*3600000)/86400000)*86400000+5*3600000;
   for(let n=cursor.episodes+1;n<=eligible;n++){
    const count=Number((await db.one("SELECT COUNT(*) AS n FROM economy_rewards WHERE user_id=? AND event_key LIKE 'showdown:episode:%' AND created>=?",uid,dayStart)).n);
    if(count<45&&await progression.grant(uid,'showdown:episode:'+s.id+':'+n,{tickets:3,coins:7,xp:12,label:'Showdown · Episodio '+n}))awards.push({id:s.id+':'+n,tickets:3,coins:7,label:'Episodio completado'});
   }
   cursor.episodes=eligible;
   if(finished&&!cursor.done){const count=Number((await db.one("SELECT COUNT(*) AS n FROM economy_rewards WHERE user_id=? AND event_key LIKE 'showdown:finish:%' AND created>=?",uid,dayStart)).n),full=!!(s.winner||s.soloWinner),tickets=full?110:20,coins=full?140:30;
    if(count<3&&await progression.grant(uid,'showdown:finish:'+s.id,{tickets,coins,xp:full?100:20,label:full?'Showdown · Temporada completada':'Showdown · Participación en la temporada'}))awards.push({id:s.id+':finish',tickets,coins,label:full?'Temporada completada':'Participación en Showdown'});cursor.done=true;
   }
  });s.rewardCursors[uid]=cursor;s.revision++;return awards.length?{awards,wallet:await progression.wallet(uid)}:{};
 };
}
