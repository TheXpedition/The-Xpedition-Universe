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
const initial=()=>({id:null,phase:'closed',mode:null,capacity:participants.length,players:[],holder:null,revision:0,round:0,deadline:0,botAt:0,lastHit:null,winner:null});
const active=s=>['intro','tutorial','countdown','playing','blast'].includes(s.phase);
const reject=message=>{throw Error(message);};
export function createHotPotato({db,clients,send,can,canPlay,beforeStart,now=Date.now,rand=randomInt}){
 let state=initial(),tail=Promise.resolve(),timer,closed=false;
 const online=id=>[...clients.values()].find(c=>c.user.id===id&&c.potatoSubscribed&&c.ws.readyState===1);
 const serial=fn=>{const job=tail.then(fn);tail=job.catch(()=>{});return job;};
 const ready=db.one('SELECT state FROM world_environment WHERE id=?','hot-potato').then(row=>{if(row)state=JSON.parse(row.state);schedule();});
 function packet(c){const {deadline,botAt,...publicState}=state;
  if(state.phase==='lobby'&&state.mode==='users')publicState.players=state.players.map(p=>({...p,connected:!!online(p.id)}));
  return {type:'potato-state',game:{...publicState,until:state.phase==='playing'?0:deadline,staff:!!c.potatoDirector,canJoin:!!c.potatoEligible,self:c.user.id,serverTime:now()}};}
 function publish(previous){
  const pass=previous.phase==='playing'&&state.phase==='playing'&&previous.id===state.id&&previous.holder!==state.holder;
  const update=pass?{type:'potato-pass',gameId:state.id,revision:state.revision,holder:state.holder}:null;
  for(const c of clients.values())if(c.potatoSubscribed)send(c,update&&c.compactPotato?update:packet(c));
 }
 function schedule(){clearTimeout(timer);if(closed||!active(state))return;
  const due=state.phase==='playing'&&state.botAt?Math.min(state.botAt,state.deadline):state.deadline;
  timer=setTimeout(()=>serial(advance).catch(error=>{console.error('Hot Potato:',error.message);if(!closed)timer=setTimeout(schedule,1000);}),Math.max(1,due-now()));timer.unref?.();
 }
 async function save(s){
  s.revision=state.revision+1;
  const write=(id,value)=>db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated',id,JSON.stringify(value),now());
  if(s.phase==='finished'&&s.mode==='users'){
   await db.transaction(async()=>{await write('hot-potato',s);await write('hot-potato-immunity:'+s.winner,{game:s.id});});
  }else await write('hot-potato',s);
  const opened=s.phase==='lobby'&&s.mode&&state.mode!==s.mode;
  const previous=state;state=s;schedule();publish(previous);
  if(opened)for(const c of clients.values())if(!c.potatoSubscribed)send(c,{type:'potato-open',mode:s.mode});
 }
 const live=s=>s.players.filter(p=>p.lives>0);
 function give(s,id){s.holder=id;s.botAt=s.mode==='bots'?now()+rand(350,1100):0;}
 async function advance(){
  if(!active(state))return;const s=structuredClone(state),t=now();
  if(t<s.deadline){
   if(s.phase!=='playing'||!s.botAt||s.botAt>t)return;
   const others=live(s).filter(p=>p.id!==s.holder);give(s,others[rand(others.length)].id);
  }else if(s.phase==='intro'){s.phase='tutorial';s.deadline=t+10000;}
  else if(s.phase==='tutorial'){s.phase='countdown';s.deadline=t+5000;}
  else if(s.phase==='countdown'||s.phase==='blast'){
   const alive=live(s);if(alive.length===1){s.phase='finished';s.winner=alive[0].id;s.deadline=0;}
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
   if(a==='subscribe'){c.compactPotato=input.compactPass===true;c.potatoDirector=await can(c.user,'direct');c.potatoEligible=!c.potatoDirector&&await canPlay(c.user)&&(await hotPotatoCast(db)).includes(c.characterId);c.potatoSubscribed=true;send(c,packet(c));if(state.phase==='lobby'&&state.players.some(p=>p.id===c.user.id))for(const peer of clients.values())if(peer!==c&&peer.potatoSubscribed)send(peer,packet(peer));return;}
   if(!c.potatoSubscribed)return;
   try{
    await advance();const s=structuredClone(state),id=c.user.id;
    const joiningCurrentLobby=['join','leave','ready'].includes(a)&&s.phase==='lobby'&&input.gameId===s.id;
    if(input.revision!==s.revision&&!joiningCurrentLobby)reject('La partida cambió. Mira quién tiene la papa.');
    if(['open','users','bots','start','cancel'].includes(a)&&!await can(c.user,'direct'))reject('Solo Dirección puede autorizar esta acción.');
    if(a==='open'){
     if(!['closed','finished','cancelled'].includes(s.phase))reject('Cierra el lobby anterior primero.');
     const cast=await hotPotatoCast(db);
     Object.assign(s,initial(),{id:randomUUID(),phase:'lobby',capacity:cast.length});
    }else if(a==='users'||a==='bots'){
     if(s.phase!=='lobby'||s.mode)reject('Abre un lobby nuevo para elegir la modalidad.');
     s.mode=a;
     if(a==='bots'){
      const cast=await hotPotatoCast(db);s.capacity=cast.length;
      s.players=cast.map(characterId=>({id:'bot-'+characterId,characterId,name:worldCharacter(characterId).name,lives:3,ready:true}));
     }
    }else if(a==='cancel'){
     if(!active(s)&&s.phase!=='lobby')reject('El reto ya terminó.');
     s.phase='cancelled';s.holder=null;s.deadline=s.botAt=0;
    }else if(['join','leave','ready'].includes(a)){
     if(s.phase!=='lobby'||s.mode!=='users')reject('La inscripción de usuarios está cerrada.');
     const entry=s.players.find(p=>p.id===id);
     if(a==='leave')s.players=s.players.filter(p=>p.id!==id);
     else if(a==='ready'){
      if(!entry)reject('Entra al lobby antes de confirmar.');
      entry.ready=input.ready===true;
     }else{
      if(!await canPlay(c.user)||!(await hotPotatoCast(db)).includes(c.characterId))reject('Tu personaje no está en el reparto activo.');
      if(entry||s.players.some(p=>p.characterId===c.characterId))reject('Este participante ya está inscrito.');
      s.players.push({id,characterId:c.characterId,name:c.user.name,lives:3,ready:false});
     }
    }else if(a==='start'){
     if(s.phase!=='lobby'||!s.mode)reject('Abre un lobby y elige la modalidad.');await beforeStart();
     const cast=await hotPotatoCast(db),valid=[];
     for(const p of s.players){if(!cast.includes(p.characterId))continue;
      if(s.mode==='users'){const peer=online(p.id);if(!peer)reject('Hay participantes desconectados. Espera a que regresen al lobby.');if(peer.characterId!==p.characterId||!await canPlay(peer.user))continue;}valid.push(p);}
     s.players=valid;if(valid.length<2){await save(s);reject('Se necesitan dos participantes habilitados.');}
     if(s.mode==='users'&&valid.some(p=>!p.ready))reject('Falta confirmar quién está listo.');
     s.phase='intro';s.deadline=now()+20000;
    }else if(a==='pass'){
     if(s.phase!=='playing'||s.mode!=='users'||s.holder!==id)reject('Solo quien tiene la papa puede pasarla.');
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
 },returnToArena:async id=>{await ready;return active(state)&&state.mode==='users'&&live(state).some(p=>p.id===id);},active:()=>active(state),engaged:id=>active(state)&&state.players.some(p=>p.id===id),async close(){closed=true;clearTimeout(timer);await ready;await tail;}};
}
