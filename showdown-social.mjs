import {SHOWDOWN_STATS,SHOWDOWN_CHALLENGES} from './public/showdown/config.mjs';
const random=s=>{s.random=(Math.imul(s.random,1664525)+1013904223)>>>0;return s.random/4294967296;};
const choose=(s,a)=>a[Math.floor(random(s)*a.length)];
export function initializeShowdownSocial(s){
 s.relationships??={};s.socialLog??=[];s.botAlliances??={};
 for(const p of s.players){p.stats??=Object.fromEntries(SHOWDOWN_STATS.map(k=>[k,3]));if(p.bot&&!p.statsReady){for(let n=0;n<12;n++){const a=choose(s,SHOWDOWN_STATS),b=choose(s,SHOWDOWN_STATS);if(p.stats[a]<5&&p.stats[b]>1&&a!==b){p.stats[a]++;p.stats[b]--;}}p.statsReady=true;}
  s.relationships[p.id]??={};for(const q of s.players)if(q.id!==p.id)s.relationships[p.id][q.id]??=Math.floor(random(s)*41)-20;
 }
}
export const affinity=(s,a,b)=>s.relationships?.[a]?.[b]||0;
export function relationshipLabel(value){return value>=85?'Pareja':value>=55?'Alianza':value>=25?'Amigos':value<=-25?'Enemigos':'Indiferente';}
export function activeBotAllianceCount(s,userId){return Object.values(s.botAlliances?.[userId]||{}).filter(a=>a.status==='active').length;}
export function botAllianceTargets(s,botId,pool){return Object.entries(s.botAlliances||{}).filter(([userId,alliances])=>alliances[botId]?.status==='active'&&pool.includes(userId)).map(([userId])=>userId);}
export function socialAction(s,p,target,action,now){
 const q=s.players.find(p=>p.id===target);if(!q||p.id===target||!['greet','insult','mock','alliance','attack'].includes(action))throw Object.assign(Error('Elige otra persona y una reacción válida.'),{status:400});
 initializeShowdownSocial(s);
 if(!p.bot&&!q.bot)throw Object.assign(Error('Con otra persona, envía un mensaje privado durante el backstage.'),{status:400});
 if(action==='alliance'){
  if(p.bot||!q.bot)throw Object.assign(Error('Solo puedes pedir una alianza a un bot. Con otra persona, envía un mensaje privado.'),{status:400});
  s.botAlliances[p.id]??={};const alliances=s.botAlliances[p.id],previous=alliances[q.id];
  if(previous)throw Object.assign(Error(previous.status==='active'?'Ya tienes una alianza con este bot.':previous.status==='abandoned'?'Este bot ya abandonó tu alianza y no puedes volver a pedírsela.':'Este bot ya rechazó tu alianza y no puedes volver a pedírsela.'),{status:409});
  if(activeBotAllianceCount(s,p.id)>=3)throw Object.assign(Error('Solo puedes tener tres alianzas activas con bots a la vez.'),{status:409});
 }
 const change={greet:13,insult:-26,mock:-17,alliance:22,attack:-45}[action],accepted=action!=='alliance'||affinity(s,q.id,p.id)>=-10;
 const amount=accepted?change:-8;for(const [a,b,mult]of [[q.id,p.id,1],[p.id,q.id,.7]])s.relationships[a][b]=Math.max(-100,Math.min(100,affinity(s,a,b)+Math.round(amount*mult)));
 if(action==='alliance'){
  s.botAlliances[p.id][q.id]={status:accepted?'active':'rejected',requestedAt:now};
  if(accepted){s.relationships[p.id][q.id]=Math.max(55,affinity(s,p.id,q.id));s.relationships[q.id][p.id]=Math.max(55,affinity(s,q.id,p.id));}
 }
 s.socialSerial=Math.max(s.socialSerial||0,s.socialLog.at(-1)?.id||0)+1;s.socialLog.push({id:s.socialSerial,actor:p.id,target:q.id,action,accepted,at:now});s.socialLog=s.socialLog.slice(-80);s.revision++;
}
export function socialView(s,me,allowedIds=null){
 const allowed=allowedIds?new Set(allowedIds):null,players=s.players.filter(p=>!allowed||allowed.has(p.id));
 const alliances=Object.fromEntries(Object.entries(s.botAlliances?.[me]||{}).filter(([id])=>!allowed||allowed.has(id))),relations=Object.fromEntries(players.filter(p=>p.bot&&p.id!==me).map(p=>{const status=alliances[p.id]?.status;return [p.id,status==='active'?'Alianza':status==='abandoned'?'Abandonó la alianza':status==='rejected'?'No aceptó':relationshipLabel(affinity(s,p.id,me))];}));
 const featured=players.map(p=>{const others=players.filter(q=>q.id!==p.id),target=others.sort((a,b)=>Math.abs(affinity(s,p.id,b.id))-Math.abs(affinity(s,p.id,a.id)))[0];const n=affinity(s,p.id,target?.id);return {actor:p.id,target:target?.id,feeling:n<=-25?'odia a':n>=65?'le gusta':n>=25?'le agrada':'le da igual'};});
 const log=(s.socialLog||[]).filter(e=>!allowed||allowed.has(e.actor)&&allowed.has(e.target));
 return {relations,featured,log,alliances,activeAllianceCount:activeBotAllianceCount(s,me)};
}
export function challengePerformance(s,p,challenge){const c=SHOWDOWN_CHALLENGES.find(c=>c.id===challenge),area=c?.area||'Rapidez';return (p.stats?.[area]??3)/5;}
export function prepareAssignments(s,r){const c=SHOWDOWN_CHALLENGES.find(c=>c.id===r.challenge);if(!c?.assignment)return;r.assignments??={};r.slots=r.pool.map((_,i)=>({id:'slot'+i,label:c.assignment==='teams'?`Equipo ${i<Math.ceil(r.pool.length/2)?'Luz':'Sombra'} · Puesto ${i%Math.ceil(r.pool.length/2)+1}`:c.assignment==='order'?`Turno ${i+1}`:`${['Protagonista','Antagonista','Narrador','Comedia','Acción','Revelación','Cameo','Voz principal','Doblaje','Final'][i]||'Papel '+(i+1)}`}));}
export function fillAssignments(s,r,at,force=false){if(!r.slots)return;for(const id of r.pool){const p=s.players.find(p=>p.id===id);if(!r.assignments[id]&&(force||p.bot&&at-s.phaseAt>4500+(r.pool.indexOf(id)%5)*1200)){const free=r.slots.filter(slot=>!Object.values(r.assignments).includes(slot.id));r.assignments[id]=choose(s,free).id;s.revision++;}}}
export function simulateShowdownBots(s,now){
 if(s.mode!=='multi')return;initializeShowdownSocial(s);
 if(s.phase==='status'){
  for(const [userId,alliances]of Object.entries(s.botAlliances))for(const [botId,alliance]of Object.entries(alliances)){
   if(alliance.status!=='active'||alliance.checkedPhase===s.phaseNumber||now-s.phaseAt<12000)continue;alliance.checkedPhase=s.phaseNumber;
   if(random(s)<.08){alliance.status='abandoned';alliance.endedAt=now;const bot=s.players.find(p=>p.id===botId);if(bot){s.relationships[userId][botId]=Math.min(s.relationships[userId][botId]||0,35);s.relationships[botId][userId]=Math.min(s.relationships[botId][userId]||0,35);}s.socialSerial=Math.max(s.socialSerial||0,s.socialLog.at(-1)?.id||0)+1;s.socialLog.push({id:s.socialSerial,actor:botId,target:userId,action:'alliance-abandoned',at:now});s.socialLog=s.socialLog.slice(-80);s.revision++;}
  }
  for(const p of s.players.filter(p=>p.bot&&p.active)){p.socialTurn??=-1;if(p.socialTurn===s.phaseNumber||now-s.phaseAt<3000+(Number(p.id.slice(3))%9)*1600)continue;p.socialTurn=s.phaseNumber;const target=choose(s,s.players.filter(q=>q.id!==p.id&&q.active));if(target)socialAction(s,p,target.id,affinity(s,p.id,target.id)<-20?'mock':'greet',now);}
 }
 for(const r of Object.values(s.rounds)){
  if(s.phase==='assign')fillAssignments(s,r,now);
  for(const id of r.pool){const p=s.players.find(p=>p.id===id);if(!p?.bot||now-s.phaseAt<4000+(r.pool.indexOf(id)%6)*1300)continue;
   if(s.phase==='challenge'&&!r.votes[id]){r.votes[id]=choose(s,r.choices);s.revision++;}
   if(s.phase==='xvote'&&!r.top.includes(id)&&!r.gifts[id]){const pool=r.pool.filter(q=>q!==id),allies=botAllianceTargets(s,id,pool),scored=pool.map(q=>({id:q,n:affinity(s,id,q)+random(s)*28-(s.players.find(p=>p.id===q).stars*1.5)})).sort((a,b)=>b.n-a.n);if(allies.length&&random(s)<.7)r.gifts[id]=choose(s,allies);else if(allies.length&&pool.some(q=>!allies.includes(q)))r.gifts[id]=choose(s,pool.filter(q=>!allies.includes(q)));else r.gifts[id]=random(s)<.8?scored[0].id:choose(s,pool);s.revision++;}
  }
  if(s.phase==='rival'&&!r.rival&&s.players.find(p=>p.id===r.picker)?.bot&&now-s.phaseAt>6500){r.rival=choose(s,r.pool.filter(id=>id!==r.picker));s.revision++;}
 }
}
