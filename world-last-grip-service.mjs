import {createGripAnnouncements,serveAnnouncement} from './world-grip-announcements.mjs';
import {mobility} from './public/juegos/world-health-systems.mjs';
import {CLINIC_POINT} from './public/juegos/last-grip/navigation.mjs';
import {randomUUID,randomInt} from 'node:crypto';
import {createEpisode,applyEpisode,tickEpisode,episodeView,isEngaged,touch,attendee,normalizeEpisode,cinematicFor} from './public/juegos/last-grip/engine.mjs';
import {MediaGate} from './public/juegos/last-grip/media-gate.mjs';
import {EPISODE_MEDIA} from './public/juegos/last-grip/media-config.mjs';
import {worldCharacter} from './public/juegos/world-characters.mjs';
export function episodeMediaFor(saved={}){return {...structuredClone(EPISODE_MEDIA),...saved,presentation:saved.presentation||structuredClone(EPISODE_MEDIA.presentation),draws:EPISODE_MEDIA.draws.map((round,i)=>({...round,...saved.draws?.[i]}))};}
export function createLastGrip({db,clients,send,can,now=Date.now,stop,getEnvironment=()=>null,onAftermath=async()=>{},synthesizeAnnouncement,onMariaMessage,canMariaAnnounce,canParticipate=async()=>true}){
 let state=createEpisode({id:randomUUID(),now:now()}),queue=Promise.resolve(),closed=false,lastSave=0,lastWire=0,dirty=false;
 const subscribers=new Set();
 const announcements=createGripAnnouncements({now,synthesize:synthesizeAnnouncement,onReady:announcement=>{if(announcement.episodeId!==state.id)return;for(const c of clients.values())if(isEngaged(state,c.user.id)||subscribers.has(c.user.id)&&(attendee(state,c.user.id)||c.direct))send(c,{type:'grip-announcement',announcement});},onError:m=>{const c=[...clients.values()].find(c=>c.user.id===m.userId);if(c)send(c,{type:'error',message:'No se pudo generar la voz de este anuncio. El mensaje permanece en el chat; puedes volver a enviarlo.'});}});
 const mediaGate=new MediaGate(),eligible=id=>isEngaged(state,id)&&[...clients.values()].some(c=>c.user.id===id);
 function observeMedia(){mediaGate.observe(cinematicFor(state),eligible);}
 function advance(){observeMedia();const time=now(),delta=Math.max(0,Math.min(1000,time-state.at)),allowed=mediaGate.advance(cinematicFor(state),state.clock,delta),changed=tickEpisode(state,state.at+allowed);state.at=time;observeMedia();return changed;}
 const ready=(async()=>{const row=await db.one('SELECT state FROM world_environment WHERE id=?','last-grip');if(row){try{const loaded=JSON.parse(row.state);if(loaded.version===1){if(loaded.winner&&!loaded.completedAt){loaded.completedAt=Number(row.updated);loaded.completedId=loaded.id;}state=normalizeEpisode(loaded);state.media=episodeMediaFor(loaded.media);if(state.phase==='intro'&&!loaded.media?.presentation)state.phaseAt=state.clock;state.at=now();for(const p of [...state.roster,...state.visitors]){p.connected=!!p.bot;p.lastSeen=state.clock;p.input=null;}if(!['closed','lobby','finished'].includes(state.phase)){state.paused=true;touch(state,'restart-paused');}}}catch{}}if(!row)state.media=structuredClone(EPISODE_MEDIA);normalizeEpisode(state);})();
 const serial=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 const save=async()=>{if(state.winner&&state.completedId!==state.id){state.completedAt=now();state.completedId=state.id;}await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated', 'last-grip',JSON.stringify(state),now());lastSave=now();dirty=false;};
 function actorFor(c){return {id:c.user.id,name:c.user.name,characterId:c.characterId,petId:c.petId||null,role:worldCharacter(c.characterId)?.role,vitals:c.vitals,origin:{zone:c.zone.id,x:c.p.x,y:c.p.y}};}
 function snapshot(c){return {...episodeView(state,{selfId:c.user.id,staff:!!c.direct,now:now()}),announcements:announcements.live(state.id),environment:getEnvironment(),mediaWaiting:mediaGate.pending()&&cinematicFor(state)&&state.clock>=cinematicFor(state).start+cinematicFor(state).duration-1,ownVitals:{...c.vitals}};}
 async function flushEffort(){for(const record of state.aftercare||[])if(!record.applied){await onAftermath(record);record.applied=true;dirty=true;}}
 function syncActors(){for(const c of clients.values()){const p=attendee(state,c.user.id);if(p){if(c.direct&&!state.roster.includes(p)&&p.characterId!==c.characterId){p.characterId=c.characterId;p.name=worldCharacter(c.characterId)?.name||c.user.name;p.changed=false;touch(state,'staff-character',c.user.id);dirty=true;}p.petId=c.petId||null;p.vitals={...c.vitals};const m=mobility(c.wellness,c.vitals);p.moveScale=m.speedFactor;p.canRun=m.canRun;}}}
 function publish(){for(const c of clients.values())if(subscribers.has(c.user.id)||isEngaged(state,c.user.id))send(c,{type:'grip-state',episode:snapshot(c)});lastWire=now();}
 async function action(c,input){await ready;return serial(async()=>{
  if(!input||typeof input.type!=='string')throw Object.assign(Error('Acción del episodio inválida.'),{status:400});
  syncActors();advance();const director=await can(c.user,'direct'),actor={id:c.user.id,name:c.user.name,characterId:c.characterId,petId:c.petId||null,role:worldCharacter(c.characterId)?.role,vitals:c.vitals,origin:{zone:c.zone.id,x:c.p.x,y:c.p.y}};
  if(input.type==='join'&&!await canParticipate(c.user))throw Object.assign(Error('Solo los participantes confirmados pueden competir. Puedes entrar como espectador.'),{status:403});
  if(input.type==='join'&&c.wellness?.life?.status!=='alive')throw Object.assign(Error('Debes estar consciente para competir.'),{status:409});
  if(director&&['start','draw','final','beginRound'].includes(input.type)){for(const p of state.roster){const live=[...clients.values()].find(q=>q.user.id===p.id);if(live){if(input.type==='start')p.origin={zone:live.zone.id,x:live.p.x,y:live.p.y};p.vitals={...live.vitals};p.connected=true;}}}
  if(director&&input.type==='open'&&state.phase==='finished')await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated','last-grip:history:'+state.id,JSON.stringify(state),now());
  if(input.type==='open'&&director)state.media=structuredClone(EPISODE_MEDIA);
  if(['start','fillBots'].includes(input.type)&&director)for(const live of clients.values())if(!attendee(state,live.user.id))applyEpisode(state,{type:'visit'},{actor:actorFor(live),now:now()});
  const result=applyEpisode(state,input,{actor,staff:director,now:now(),random:()=>randomInt(0,0x1000000)/0x1000000});
  if(input.type==='start')for(const live of clients.values())if(isEngaged(state,live.user.id))stop(live);
  if(input.type==='visit'&&isEngaged(state,c.user.id))stop(c);
  if(input.type==='finish')for(const live of clients.values())if(state.returns[live.user.id])stop(live);
  observeMedia();dirty=true;await flushEffort();
  // Sample movement at 10 Hz instead of broadcasting and writing every input.
  if(input.type==='move')return result;
  if(input.type!=='pulse')await save();publish();send(c,{type:'grip-result',action:input.type,result,requestId:input.requestId});return result;
 });}
 const timer=setInterval(()=>{if(closed)return;void serial(async()=>{await ready;syncActors();const changed=advance();if(changed)dirty=true;await flushEffort();if(changed&&now()-lastWire>=100||state.paused&&now()-lastWire>=1000)publish();if(dirty&&now()-lastSave>=1500)await save();}).catch(()=>{});},50);timer.unref();
 return {
  ready,phase:()=>state.phase,engaged:id=>isEngaged(state,id),
  clinicVenue(id){const p=attendee(state,id);return p&&isEngaged(state,id)&&p.area==='monitor'&&Math.hypot(p.x-CLINIC_POINT.x,p.y-CLINIC_POINT.y)<145?'last-grip:'+state.id:null;},
  async attach(c){await ready;if(!c.direct&&!['closed','lobby','finished'].includes(state.phase)&&!attendee(state,c.user.id))await action(c,{type:'visit'});syncActors();const p=attendee(state,c.user.id);if(p){p.connected=true;p.lastSeen=state.clock;p.input=null;dirty=true;}if(isEngaged(state,c.user.id))send(c,{type:'grip-state',episode:snapshot(c)});},
  disconnect(c){const p=attendee(state,c.user.id);if(p){p.connected=false;p.lastSeen=state.clock;p.input=null;dirty=true;}subscribers.delete(c.user.id);mediaGate.viewer(c.user.id,false,cinematicFor(state),eligible);},
  async handle(c,input){if(input.type==='grip-media-viewer'){await ready;return serial(()=>{mediaGate.viewer(c.user.id,input.visible===true,cinematicFor(state),eligible);return true;});}if(input.type==='grip-media-ended'){await ready;return serial(()=>{mediaGate.ended(c.user.id,input.key);return true;});}if(input.type==='grip-subscribe'){await ready;subscribers.add(c.user.id);send(c,{type:'grip-state',episode:snapshot(c)});return true;}if(input.type==='grip-action'){await action(c,input.action);return true;}if(input.type==='grip-chat'){
    await ready;if(!attendee(state,c.user.id)&&!await can(c.user,'direct'))throw Object.assign(Error('El chat está reservado al episodio.'),{status:403});
    if(now()-(c.lastChat||0)<1400)throw Object.assign(Error('Espera antes de enviar otro mensaje.'),{status:429});
    const mute=await db.one('SELECT muted_until FROM world_contestants WHERE user_id=? AND season=?',c.user.id,'antarctica-1').catch(()=>null);if(Number(mute?.muted_until)>now())throw Object.assign(Error('Tienes el chat silenciado.'),{status:403});
    const isAnnouncement=c.characterId==='maria-villegas'&&await can(c.user,'direct');if(isAnnouncement&&!(canMariaAnnounce?canMariaAnnounce():announcements.canQueue()))throw Object.assign(Error('Hay varios anuncios en cola. Espera a que María termine de hablar.'),{status:429});
    const text=typeof input.text==='string'?input.text.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,220):'';if(!text)return true;c.lastChat=now();const m={id:randomUUID(),userId:c.user.id,name:c.user.name,text,created:now(),announcement:isAnnouncement};await db.run('INSERT INTO world_chat(id,zone,sender,text,created) VALUES(?,?,?,?,?)',m.id,'episode:'+state.id,c.user.id,text,m.created);for(const live of clients.values())if(subscribers.has(live.user.id))send(live,{type:'grip-chat',message:m});if(isAnnouncement){if(onMariaMessage)onMariaMessage(m);else announcements.enqueue({...m,episodeId:state.id});}return true;
   }return false;},
  async handleHttp(req,res,url,user){const match=/^\/api\/world\/last-grip\/announcements\/([a-f0-9-]{36})\.mp3$/.exec(url.pathname);if(!match)return false;if(!['GET','HEAD'].includes(req.method))throw Object.assign(Error('Método no permitido.'),{status:405});await ready;const clip=announcements.get(match[1]);if(!clip||clip.episodeId!==state.id)throw Object.assign(Error('Anuncio no disponible.'),{status:404});if(!attendee(state,user.id)&&!await can(user,'direct'))throw Object.assign(Error('Este anuncio pertenece al episodio.'),{status:403});serveAnnouncement(req,res,clip);return true;},
  async status(user){await ready;const c=[...clients.values()].find(c=>c.user.id===user.id);return {...episodeView(state,{selfId:user.id,staff:await can(user,'direct'),now:now()}),announcements:announcements.live(state.id),environment:getEnvironment(),ownVitals:c?{...c.vitals}:null};},
  async history(){await ready;return (await db.all('SELECT w.id,w.sender,w.text,w.created,u.name FROM world_chat w JOIN users u ON u.id=w.sender WHERE w.zone=? ORDER BY w.created DESC LIMIT 30','episode:'+state.id)).reverse().map(m=>({id:m.id,userId:m.sender,name:m.name,text:m.text,created:Number(m.created)}));},
  async close(){closed=true;announcements.close();clearInterval(timer);await ready;await queue;if(dirty)await save();},
  // Engine state never leaves this service; clients cannot set stamina, time or winner.
 };
}
