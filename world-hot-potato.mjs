import {randomInt,randomUUID} from 'node:crypto';
import {worldCharacter} from './public/juegos/world-characters.mjs';

const participants=[
 'alice','andromeda','arisantana','kareli','bruno','daelly','vitany','guillermo','ivy',
 'marianito','roger','sallua','vita','carmine','nacho','luciano','leandro'
];
export async function hotPotatoCast(db){
 const row=await db.one('SELECT state FROM world_environment WHERE id=?','x-protocol-exclusions');
 const excluded=new Set(row?JSON.parse(row.state):[]);
 const losses=await db.all("SELECT p.character_id FROM world_contestants c JOIN world_preferences p ON p.user_id=c.user_id WHERE c.season=? AND c.status IN ('eliminated','quit','disqualified','injured','dead')",'antarctica-1');
 for(const p of losses)excluded.add(p.character_id);
 return participants.filter(id=>!excluded.has(id));
}
const initial=()=>({id:null,phase:'closed',mode:null,capacity:participants.length,players:[],returns:[],holder:null,previousHolder:null,pausedAt:null,revision:0,round:0,deadline:0,botAt:0,lastHit:null,winner:null});
const active=s=>['intro','tutorial','countdown','playing','blast'].includes(s.phase);
const bot=p=>p?.bot===true||String(p?.id||'').startsWith('bot-');
const rosterMode=players=>players.some(bot)?players.every(bot)?'bots':'mixed':'users';
const reject=message=>{throw Error(message);};
export function createHotPotato({db,clients,send,can,canPlay,beforeStart,onReturn=async()=>{},now=Date.now,rand=randomInt}){
 let state=initial(),tail=Promise.resolve(),timer,closed=false;
 const online=id=>[...clients.values()].find(c=>c.user.id===id&&c.potatoSubscribed&&c.ws.readyState===1);
 const serial=fn=>{const job=tail.then(fn);tail=job.catch(()=>{});return job;};
 const ready=db.one('SELECT state FROM world_environment WHERE id=?','hot-potato').then(row=>{if(row)state={...initial(),...JSON.parse(row.state)};schedule();});
 function packet(c){const {deadline,botAt,returns,previousHolder,...publicState}=state;
  publicState.players=state.players.map(p=>({...p,bot:bot(p),...(state.phase==='lobby'?{connected:bot(p)||!!online(p.id)}:{})}));
  return {type:'potato-state',game:{...publicState,until:state.phase==='playing'?0:deadline,staff:!!c.potatoDirector,canJoin:!!c.potatoEligible&&!returns.includes(c.user.id),canReturn:returns.includes(c.user.id),watching:!!c.potatoWatching,characterId:c.characterId,self:c.user.id,serverTime:now()}};}
 function publish(previous){
  const pass=previous.phase==='playing'&&state.phase==='playing'&&previous.id===state.id&&previous.holder!==state.holder;
  const update=pass?{type:'potato-pass',gameId:state.id,revision:state.revision,holder:state.holder}:null;
  for(const c of clients.values())if(c.potatoSubscribed)send(c,update&&c.compactPotato?update:packet(c));
 }
 function schedule(){clearTimeout(timer);if(closed||!active(state)||state.pausedAt!==null)return;
  const due=state.phase==='playing'&&state.botAt?Math.min(state.botAt,state.deadline):state.deadline;
  timer=setTimeout(()=>serial(advance).catch(error=>{console.error('Hot Potato:',error.message);if(!closed)timer=setTimeout(schedule,1000);}),Math.max(1,due-now()));timer.unref?.();
 }
 async function save(s){
  s.revision=state.revision+1;
  const write=(id,value)=>db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated',id,JSON.stringify(value),now());
  if(s.phase==='finished'&&state.phase!=='finished'&&!bot(s.players.find(p=>p.id===s.winner))){
   await db.transaction(async()=>{await write('hot-potato',s);await write('hot-potato-immunity:'+s.winner,{game:s.id});});
  }else await write('hot-potato',s);
  const opened=s.phase==='lobby'&&state.phase!=='lobby';
  if(opened)for(const c of clients.values()){c.potatoWatching=false;if(!c.potatoSubscribed)send(c,{type:'potato-open'});}
  const previous=state;state=s;schedule();publish(previous);
 }
 const live=s=>s.players.filter(p=>p.lives>0);
 function give(s,id){
  s.previousHolder=s.holder;
  s.holder=id;
  // Bots have a reaction time and sometimes hesitate. They play without the fuse.
  s.botAt=bot(s.players.find(p=>p.id===id))?now()+(rand(4)===0?rand(2800,4601):rand(950,2401)):0;
 }
 function prepareReturns(s){
  s.returns=[...new Set([...s.returns,...s.players.filter(p=>!bot(p)).map(p=>p.id)])];
 }
 async function eligible(c,cast){return !c.potatoDirector&&(c.wellness?.life?.status??'alive')==='alive'&&!state.returns.includes(c.user.id)&&cast.includes(c.characterId)&&await canPlay(c.user);}
 function enter(s,c,ready=false){s.players.push({id:c.user.id,characterId:c.characterId,name:c.user.name,lives:3,ready,bot:false});}

 async function advance(){
  if(!active(state)||state.pausedAt!==null)return;const s=structuredClone(state),t=now();
  if(t<s.deadline){
   if(s.phase!=='playing'||!s.botAt||s.botAt>t)return;
   const others=live(s).filter(p=>p.id!==s.holder);
   const different=others.filter(p=>p.id!==s.previousHolder);
   const choices=different.length?different:others;
   give(s,choices[rand(choices.length)].id);
  }else if(s.phase==='intro'){s.phase='tutorial';s.deadline=t+10000;}
  else if(s.phase==='tutorial'){s.phase='countdown';s.deadline=t+5000;}
  else if(s.phase==='countdown'||s.phase==='blast'){
   const alive=live(s);if(alive.length===1){s.phase='finished';s.winner=alive[0].id;s.deadline=0;prepareReturns(s);}
   else{
    s.phase='playing';s.round++;
    let duration=60000;
    if(s.round>1)duration=alive.length*2<=s.players.length?rand(10000,30001):rand(30000,50001);
    s.deadline=t+duration;give(s,alive[rand(alive.length)].id);
   }
  }else{const hit=s.players.find(p=>p.id===s.holder);hit.lives--;s.lastHit={id:hit.id,lives:hit.lives};s.phase='blast';s.holder=null;s.botAt=0;s.deadline=t+10000;}
  await save(s);
 }
 async function handle(c,input){
  if(input.type!=='potato')return false;
  await ready;await serial(async()=>{
   const a=input.action;
   if(a==='subscribe'){c.compactPotato=input.compactPass===true;c.potatoDirector=await can(c.user,'direct');c.potatoEligible=await eligible(c,await hotPotatoCast(db));c.potatoSubscribed=true;send(c,packet(c));if(state.phase==='lobby'&&state.players.some(p=>p.id===c.user.id))for(const peer of clients.values())if(peer!==c&&peer.potatoSubscribed)send(peer,packet(peer));return;}
   if(!c.potatoSubscribed)return;
   try{
    await advance();const s=structuredClone(state),id=c.user.id;
    const joiningCurrentLobby=['join','leave','ready','visit'].includes(a)&&s.phase==='lobby'&&input.gameId===s.id;
    if(input.revision!==s.revision&&!joiningCurrentLobby&&a!=='return')reject('La partida cambió. Mira quién tiene la papa.');
    const staffActions=['open','users','bots','fillUsers','fillBots','removeBots','remove','start','pause','resume','cancel'];
    if(staffActions.includes(a)&&!await can(c.user,'direct'))reject('Solo Dirección puede autorizar esta acción.');
    if(a==='open'){
     if(!['closed','finished','cancelled'].includes(s.phase))reject('Cierra el lobby anterior primero.');
     const cast=await hotPotatoCast(db),returns=s.returns;
     Object.assign(s,initial(),{id:randomUUID(),phase:'lobby',capacity:cast.length,returns});
    }else if(['users','bots','fillUsers','fillBots','removeBots','remove'].includes(a)){
     if(s.phase!=='lobby')reject('Abre el lobby antes de preparar el reparto.');
     const cast=await hotPotatoCast(db);
     s.capacity=cast.length;
     s.players=s.players.filter(p=>cast.includes(p.characterId));
     if(a==='bots'||a==='fillBots'){
      const occupied=new Set(s.players.map(p=>p.characterId));
      for(const characterId of cast)if(!occupied.has(characterId))s.players.push({id:'bot-'+characterId,characterId,name:worldCharacter(characterId).name,lives:3,ready:true,bot:true});
     }else if(a==='users'||a==='fillUsers'){
      const candidates=[...clients.values()].filter(p=>p.potatoSubscribed&&!p.potatoWatching&&p.ws.readyState===1);
      const allowed=await Promise.all(candidates.map(async p=>await eligible(p,cast)?p:null));
      for(const peer of allowed.filter(Boolean)){
       if(s.players.some(p=>!bot(p)&&(p.id===peer.user.id||p.characterId===peer.characterId)))continue;
       s.players=s.players.filter(p=>p.characterId!==peer.characterId);
       enter(s,peer,true);
      }
     }else if(a==='removeBots')s.players=s.players.filter(p=>!bot(p));
     else s.players=s.players.filter(p=>p.id!==input.target);
     s.mode=rosterMode(s.players);
    }else if(a==='pause'||a==='resume'){
     if(!active(s))reject('El reto no está en juego.');
     if(a==='pause'){
      if(s.pausedAt!==null)reject('El reto ya está pausado.');
      s.pausedAt=now();
     }else{
      if(s.pausedAt===null)reject('El reto ya está en marcha.');
      const elapsed=now()-s.pausedAt;
      s.deadline+=elapsed;if(s.botAt)s.botAt+=elapsed;s.pausedAt=null;
     }
    }else if(a==='cancel'){
     if(!active(s)&&s.phase!=='lobby')reject('El reto ya terminó.');
     if(active(s))prepareReturns(s);
     s.phase='cancelled';s.holder=null;s.deadline=s.botAt=0;s.pausedAt=null;
    }else if(a==='return'){
     if(!s.returns.includes(id))reject('Tu regreso al refugio aún no está disponible.');
     await onReturn(c);
     s.returns=s.returns.filter(userId=>userId!==id);
     await save(s);send(c,{type:'potato-return',url:'/juegos/?view=play'});return;
    }else if(['join','leave','ready','visit'].includes(a)){
     if(s.phase!=='lobby')reject('La inscripción está cerrada.');
     const entry=s.players.find(p=>p.id===id&&!bot(p));
     if(a==='visit'){
      if(entry)reject('Sal de tu plaza antes de entrar como espectador.');
      c.potatoWatching=true;send(c,packet(c));return;
     }else if(a==='leave'){
      c.potatoWatching=false;s.players=s.players.filter(p=>p.id!==id);
     }else if(a==='ready'){
      if(!entry)reject('Entra al lobby antes de confirmar.');
      entry.ready=input.ready===true;
     }else{
      if(!await eligible(c,await hotPotatoCast(db)))reject('Tu personaje no está en el reparto activo.');
      if(entry||s.players.some(p=>p.characterId===c.characterId))reject('Esta plaza ya está ocupada.');
      c.potatoWatching=false;enter(s,c);
     }
     s.mode=rosterMode(s.players);
    }else if(a==='start'){
     if(s.phase!=='lobby')reject('Abre el lobby primero.');
     const cast=await hotPotatoCast(db);
     const accepted=await Promise.all(s.players.filter(p=>cast.includes(p.characterId)).map(async p=>{
      if(bot(p))return p;
      const peer=online(p.id);
      if(!peer)reject('Hay participantes desconectados. Espera su regreso o libera esas plazas.');
      return peer.characterId===p.characterId&&await eligible(peer,cast)?p:null;
     }));
     s.players=accepted.filter(Boolean);
     if(s.players.length<2)reject('Se necesitan dos participantes habilitados.');
     if(s.players.some(p=>!p.ready&&!bot(p)))reject('Falta confirmar quién está listo.');
     await beforeStart(s.players);s.mode=rosterMode(s.players);s.phase='intro';s.deadline=now()+20000;
    }else if(a==='pass'){
     if(s.pausedAt!==null)reject('Dirección pausó el reto.');
     if(s.phase!=='playing'||s.holder!==id)reject('Solo quien tiene la papa puede pasarla.');
     if(input.target===id||!live(s).some(p=>p.id===input.target))reject('Elige a otro jugador que tenga vidas.');
     give(s,input.target);
    }else reject('Acción desconocida.');
    await save(s);
   }catch(e){send(c,{type:'potato-error',message:e.message});send(c,packet(c));}
  });return true;
 }
 return {handle,disconnect(c){
  if(!c.potatoSubscribed)return;
  c.potatoSubscribed=false;
  if(state.phase==='lobby'&&state.players.some(p=>p.id===c.user.id))publish(state);
 },returnToArena:async id=>{await ready;return state.returns.includes(id)||active(state)&&state.players.some(p=>p.id===id&&!bot(p));},active:()=>active(state),engaged:id=>state.returns.includes(id)||active(state)&&state.players.some(p=>p.id===id&&!bot(p)),async close(){closed=true;clearTimeout(timer);await ready;await tail;}};
}
