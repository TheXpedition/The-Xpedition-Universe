import {randomUUID,randomBytes} from 'node:crypto';
import {createShowdown,joinShowdown,selectShowdownCharacter,fillShowdownBots,beginShowdown,tickShowdown,showdownAction,showdownPublicView,sdFail} from './showdown-engine.mjs';
import {SHOWDOWN_FORMATS,SHOWDOWN_CHALLENGES,SHOWDOWN_PRICE} from './public/showdown/config.mjs';

export function createShowdownGame({db,json,fail,body,checkRate,progression,characters,notify=()=>{},messageView,pushNotifications,serialize=fn=>fn(),now=Date.now}){
 const cache=new Map(),loading=new Map(),locked=new Map();let closing=false;
 const queue=(id,fn)=>{const old=locked.get(id)||Promise.resolve(),next=old.catch(()=>{}).then(fn);locked.set(id,next);next.finally(()=>{if(locked.get(id)===next)locked.delete(id);}).catch(()=>{});return next;};
 async function getRecord(id){
  if(cache.has(id)){const record=cache.get(id);record.access=now();if(record.error){cache.delete(id);throw record.error;}return record;}
  if(loading.has(id))return loading.get(id);
  const promise=(async()=>{const row=await db.one('SELECT * FROM showdown_rooms WHERE id=?',id);if(!row)fail(404,'Esta sala no existe o su enlace no es válido.');const state=JSON.parse(row.snapshot),record={state,secret:row.secret,dbRevision:Number(row.revision),persisted:state.revision,access:now(),flushing:null,error:null};cache.set(id,record);return record;})();loading.set(id,promise);try{return await promise;}finally{loading.delete(id);}
 }
 async function flush(record,target=record.state.revision){
  while(record.persisted<target){
   if(record.error)throw record.error;
   if(!record.flushing){const revision=record.state.revision,snapshot=JSON.stringify(record.state),previous=record.dbRevision,stamp=now();
    record.flushing=(async()=>{const result=await db.run('UPDATE showdown_rooms SET snapshot=?,host=?,status=?,revision=revision+1,updated=? WHERE id=? AND revision=?',snapshot,record.state.host,record.state.status,stamp,record.state.id,previous);if(!result.changes){record.error=Object.assign(new Error('La sala se actualizó en otro servidor. Vuelve a conectar.'),{status:409});cache.delete(record.state.id);throw record.error;}record.dbRevision++;record.persisted=revision;})().finally(()=>record.flushing=null);
   }
   await record.flushing;
  }
 }
 const timer=setInterval(()=>{for(const [id,record]of cache){if(record.state.revision>record.persisted)void flush(record).catch(()=>{});else if(now()-record.access>600000)cache.delete(id);}},500);timer.unref?.();
 const member=(s,uid)=>s.players.find(p=>p.userId===uid);
 const ids=s=>s.players.filter(p=>p.userId&&p.present).map(p=>p.userId);
 async function paid(uid){if(!await progression.canPlay(uid,'showdown'))fail(403,'Compra Showdown una sola vez por 1.000 monedas para entrar. No requiere nivel.');}
 function advance(record,user){const s=record.state,p=member(s,user.id),stamp=now();if(s.mode==='solo'){if(p&&stamp-p.lastSeen>=3000){p.lastSeen=stamp;s.revision++;}return;}
  if(p&&s.mode==='solo'&&s.status==='running'&&!s.paused&&stamp-p.lastSeen>30000){const at=Math.max(s.phaseAt,p.lastSeen+1000);tickShowdown(s,at);if(s.status==='running')showdownAction(s,user.id,{type:'pause'},at);}
  else tickShowdown(s,stamp);
  if(p&&stamp-p.lastSeen>=3000){p.lastSeen=stamp;s.revision++;}
 }
 async function chat(room,after=0){const rows=await db.all('SELECT c.id,c.sender,c.text,c.created,u.name,u.avatar FROM showdown_chat c JOIN users u ON u.id=c.sender WHERE c.room=? AND c.created>? ORDER BY c.created DESC,c.id DESC LIMIT 60',room,after);return rows.reverse().map(r=>({id:r.id,sender:r.sender,name:r.name,avatar:r.avatar,text:r.text,created:Number(r.created)}));}
 async function response(record,user,{includeChat=false}={}){const s=record.state;const view=showdownPublicView(s,user.id,now(),characters);return {...view,soloClassic:s.mode==='solo',soloSnapshot:s.mode==='solo'?s.soloSnapshot||null:null,soloRevision:s.soloRevision||0,shareUrl:s.status==='lobby'?'/#showdown/'+s.id+'/'+record.secret:null,...(includeChat?{chat:await chat(s.id)}:{})};}
 async function notifyInvitation(room,user,target){
  const stamp=now(),old=await db.one('SELECT * FROM showdown_invites WHERE room=? AND target=?',room.state.id,target);
  if(old&&stamp-Number(old.created)<300000)return {alreadySent:true};
  const recipient=await db.one('SELECT id FROM users WHERE id=?',target);if(!recipient)fail(404,'No encontramos esa cuenta.');
  let conversation,mid;
  await serialize(()=>db.transaction(async()=>{
   const existing=await db.one("SELECT c.id FROM conversations c JOIN members a ON a.conversation=c.id JOIN members b ON b.conversation=c.id WHERE c.type='dm' AND a.user_id=? AND b.user_id=? LIMIT 1",user.id,target);
   conversation=existing?.id||randomUUID();
   if(!existing){await db.run("INSERT INTO conversations(id,type,title,created) VALUES(?,'dm','',?)",conversation,stamp);for(const id of [user.id,target])await db.run("INSERT INTO members(conversation,user_id,role,read_at) VALUES(?,?,'member',0)",conversation,id);}
   mid=randomUUID();const metadata=JSON.stringify({room:room.state.id,token:room.secret});
   await db.run("INSERT INTO messages(id,conversation,sender,text,type,filename,created) VALUES(?,?,?,?,'showdown-invite',?,?)",mid,conversation,user.id,user.name+' te está invitando a jugar Showdown. Acepta la invitación para elegir tu personaje.',metadata,stamp);
   await db.run('INSERT INTO showdown_invites(room,target,inviter,message,created) VALUES(?,?,?,?,?) ON CONFLICT(room,target) DO UPDATE SET inviter=excluded.inviter,message=excluded.message,created=excluded.created',room.state.id,target,user.id,mid,stamp);
  }));
  const message=messageView?await messageView(await db.one('SELECT * FROM messages WHERE id=?',mid)):null;
  if(message){notify([user.id,target],'message',{conversation,message});void pushNotifications?.notifyMessage(message).catch(()=>{});}
  notify([target],'showdown-invite',{room:room.state.id,token:room.secret,inviter:{id:user.id,name:user.name,avatar:user.avatar},url:'/#showdown/'+room.state.id+'/'+room.secret});
  return {alreadySent:false,conversation};
 }
 async function handle(req,res,url,user){
  const path=url.pathname;if(!path.startsWith('/api/showdown'))return false;
  res.setHeader?.('Cache-Control','private, no-store');res.setHeader?.('Vary','Cookie');
  if(!user)fail(401,'Inicia sesión con tu cuenta de The Xpedition para jugar.');
  const method=req.method;
  if(path==='/api/showdown'&&method==='GET'){
   const wallet=await progression.wallet(user.id),owned=await progression.canPlay(user.id,'showdown');
   const rooms=await db.all('SELECT r.id,r.mode,r.status,r.created,r.updated,r.snapshot FROM showdown_rooms r JOIN showdown_members m ON m.room=r.id WHERE m.user_id=? AND m.left_at IS NULL ORDER BY r.updated DESC LIMIT 12',user.id);
   const collection=await progression.view(user.id),ownedCharacters=collection.shop.items.filter(i=>i.kind==='character'&&(i.starter||collection.owned.includes(i.id))).map(i=>i.id.replace('character:',''));
   json(res,{owned,wallet,price:SHOWDOWN_PRICE,characters,ownedCharacters,formats:Object.values(SHOWDOWN_FORMATS),challenges:SHOWDOWN_CHALLENGES,rooms:rooms.map(r=>{const s=cache.get(r.id)?.state||JSON.parse(r.snapshot);return {id:r.id,isHost:s.host===user.id,mode:r.mode,status:s.status,phase:s.phase,format:s.format,created:Number(r.created),updated:Number(r.updated),players:s.players.filter(p=>!p.bot).length,winner:s.soloWinner|| (s.winner?characters.find(c=>c.id===s.players.find(p=>p.id===s.winner)?.charId)?.name:null)};})});return true;
  }
  if(path==='/api/showdown/rooms'&&method==='POST'){
   checkRate(req,'showdown-create',12,3600000);await paid(user.id);const input=await body(req);
   if(!['solo','multi'].includes(input.mode)||![2,3,4].includes(input.format))fail(400,'Elige un modo y un formato.');
   const count=Number((await db.one("SELECT COUNT(*) AS n FROM showdown_rooms WHERE host=? AND status IN ('running','lobby')",user.id)).n);if(count>=6)fail(409,'Ya tienes seis salas abiertas. Cierra una antes de crear otra.');
   const stamp=now(),id=randomUUID(),state=createShowdown({id,host:user.id,mode:input.mode,format:input.format,seed:randomBytes(4).readUInt32BE(),now:stamp});joinShowdown(state,user,stamp);
   const secret=randomBytes(24).toString('base64url');
   await serialize(()=>db.transaction(async()=>{await db.run('INSERT INTO showdown_rooms(id,host,mode,status,snapshot,secret,created,updated) VALUES(?,?,?,?,?,?,?,?)',id,user.id,state.mode,state.status,JSON.stringify(state),secret,stamp,stamp);await db.run('INSERT INTO showdown_members(room,user_id,joined) VALUES(?,?,?)',id,user.id,stamp);}));
   const record={state,secret,dbRevision:0,persisted:state.revision,access:stamp,flushing:null,error:null};cache.set(id,record);json(res,{room:await response(record,user,{includeChat:true})},201);return true;
  }
  const match=path.match(/^\/api\/showdown\/rooms\/([a-f0-9-]+)(?:\/(join|action|character|bots|start|invite|chat|leave|close|solo))?$/);
  if(!match)fail(404,'No encontramos esa sala.');
  const [,,action]=match,id=match[1],record=await getRecord(id);let s=record.state;
  if(!action&&method==='GET'){
   if(!member(s,user.id)){
    if(url.searchParams.get('invite')!==record.secret)fail(403,'Necesitas una invitación para entrar en esta sala.');
    const owner=await db.one('SELECT name FROM users WHERE id=?',s.host);json(res,{preview:{id,host:owner?.name||'Un explorador',mode:s.mode,status:s.status,players:s.players.filter(p=>!p.bot).length},owned:await progression.canPlay(user.id,'showdown'),wallet:await progression.wallet(user.id),price:SHOWDOWN_PRICE});return true;
   }
   if(!member(s,user.id).present&&s.status==='running'){member(s,user.id).present=true;s.revision++;await db.run('UPDATE showdown_members SET left_at=NULL WHERE room=? AND user_id=?',id,user.id);}
   advance(record,user);json(res,{room:await response(record,user)});return true;
  }
  if(action==='join'&&method==='POST'){
   checkRate(req,'showdown-join',80,60000);await paid(user.id);const input=await body(req);if(input.token!==record.secret&&!member(s,user.id))fail(403,'La invitación no es válida.');
   await queue(id,async()=>{await flush(record);joinShowdown(s,user,now());await serialize(()=>db.run('INSERT INTO showdown_members(room,user_id,joined,left_at) VALUES(?,?,?,NULL) ON CONFLICT(room,user_id) DO UPDATE SET left_at=NULL',id,user.id,now()));await flush(record);});
   notify(ids(s),'showdown-room',{id,revision:s.revision});json(res,{room:await response(record,user,{includeChat:true})});return true;
  }
  if(!member(s,user.id))fail(403,'Esta sala es privada.');
  if(action==='solo'&&method==='POST'){
   if(s.status==='closed')fail(409,'Esta temporada ya se cerró.');if(s.mode!=='solo'||s.host!==user.id)fail(403,'Esta simulación es privada.');await paid(user.id);const input=await body(req),snapshot=input.snapshot;
   if(!snapshot||snapshot.version!==1||!snapshot.vars||JSON.stringify(snapshot).length>350000||/[<>]/.test(JSON.stringify(snapshot))||!['cast','format','distribution','episode','track','finished'].includes(snapshot.stage))fail(400,'Guardado de Showdown inválido.');
   if(![2,3,4].includes(snapshot.vars.advFormat)||snapshot.vars.castSize!==18)fail(400,'El formato no es válido.');
   if(!Number.isInteger(snapshot.vars.episode)||snapshot.vars.episode<1||snapshot.vars.episode>17||!Array.isArray(snapshot.vars.trackData)||snapshot.vars.trackData.length>18)fail(400,'El progreso no es válido.');for(const row of snapshot.vars.trackData)if(!Array.isArray(row.cells)||row.cells.length>17||row.cells.some(c=>!/^[a-z0-9 -]{0,30}$/i.test(c.cls||'')||typeof c.txt!=='string'||c.txt.length>80))fail(400,'La tabla de resultados no es válida.');
   const collection=await progression.view(user.id),owned=new Set(collection.shop.items.filter(i=>i.kind==='character'&&(i.starter||collection.owned.includes(i.id))).map(i=>i.id.replace('character:',''))),allowed=new Set(characters.filter(c=>owned.has(c.id)).map(c=>c.name));
   for(const list of [snapshot.vars.selected18||[],snapshot.cast||[],...Object.values(snapshot.vars.groups||{})]){if(!Array.isArray(list)||list.length>18||new Set(list.filter(Boolean)).size!==list.filter(Boolean).length||list.some(n=>n&&!allowed.has(n)))fail(403,'El elenco solo puede usar personajes de tu colección.');}
   await queue(id,async()=>{if(input.revision!==(s.soloRevision||0))fail(409,'Otra ventana actualizó esta temporada. Vuelve a abrirla desde Showdown.');s.soloSnapshot=snapshot;s.soloRevision=(s.soloRevision||0)+1;s.format=snapshot.vars.advFormat;s.phase='solo';s.paused=false;s.status=snapshot.stage==='finished'?'finished':'running';s.soloWinner=Object.entries(snapshot.vars.finalRank||{}).find(([,rank])=>rank===1)?.[0]||null;s.revision++;await flush(record);});
   json(res,{revision:s.soloRevision,saved:true});return true;
  }
  if(action==='chat'&&method==='GET'){json(res,{messages:await chat(id,Number(url.searchParams.get('after'))||0)});return true;}
  if(action==='chat'&&method==='POST'){
   checkRate(req,'showdown-chat',40,60000);const input=await body(req),text=typeof input.text==='string'?input.text.trim():'';if(!text||text.length>600)fail(400,'Escribe entre 1 y 600 caracteres.');
   const mid=typeof input.id==='string'&&/^[a-f0-9-]{36}$/.test(input.id)?input.id:randomUUID();
   const previous=await db.one('SELECT room,sender FROM showdown_chat WHERE id=?',mid);if(previous&&(previous.room!==id||previous.sender!==user.id))fail(409,'Ese mensaje pertenece a otra cuenta.');
   if(!previous)await db.run('INSERT INTO showdown_chat(id,room,sender,text,created) VALUES(?,?,?,?,?)',mid,id,user.id,text,now());
   notify(ids(s),'showdown-chat',{id});json(res,{messages:await chat(id)});return true;
  }
  if(action==='invite'&&method==='POST'){
   checkRate(req,'showdown-invite',30,3600000);if(s.status!=='lobby'||s.mode!=='multi')fail(409,'Las invitaciones se envían antes de empezar una sala con amigos.');
   const input=await body(req);if(input.userId===user.id||member(s,input.userId))fail(400,'Esa persona ya está en la sala.');
   json(res,await queue('invite:'+id+':'+input.userId,()=>notifyInvitation(record,user,String(input.userId||''))));return true;
  }
  if(method!=='POST')fail(405,'Acción no permitida.');
  const input=await body(req);checkRate(req,'showdown-actions',500,60000);
  advance(record,user);
  if(action==='character'){
   // Human character selections respect the collection shared by all simulators.
   const collection=await progression.view(user.id),character=characters.find(c=>c.id===input.character),item=collection.shop.items.find(i=>i.id==='character:'+input.character);
   if(!character)fail(400,'Elige un personaje.');if(!item||!item.starter&&!collection.owned.includes(item.id))fail(403,'Ese personaje todavía no está en tu colección. Puedes elegir uno incluido o conseguirlo en la tienda.');
   selectShowdownCharacter(s,user.id,input.character,characters,input.slot||null);
   if(s.mode==='solo'&&s.players.length===1)fillShowdownBots(s,characters);
  }else if(action==='bots'){
   if(s.mode!=='solo'||s.host!==user.id||s.status!=='lobby')fail(403,'Solo puedes cambiar bots antes de empezar tu partida solo.');s.players=s.players.filter(p=>!p.bot);fillShowdownBots(s,characters);
  }else if(action==='start'){
   if(s.host!==user.id)fail(403,'Solo quien creó la sala puede empezar.');beginShowdown(s,characters,now(),{fillBots:input.fillBots===true});
  }else if(action==='action'){
   showdownAction(s,user.id,input,now());tickShowdown(s,now());
  }else if(action==='leave'){
   const p=member(s,user.id);p.present=false;p.lastSeen=0;if(s.status==='lobby')s.players=s.players.filter(p=>p.userId!==user.id);
   const next=s.players.find(p=>p.userId&&p.present);if(s.host===user.id&&next)s.host=next.userId;if(!next)s.status='closed';s.revision++;
   await serialize(()=>db.run('UPDATE showdown_members SET left_at=? WHERE room=? AND user_id=?',now(),id,user.id));await flush(record);notify(ids(s),'showdown-room',{id,revision:s.revision});json(res,{ok:true});return true;
  }else if(action==='close'){
   if(s.host!==user.id)fail(403,'Solo quien creó la sala puede cerrarla.');if(s.status==='finished')fail(409,'La temporada ya terminó. Su track record permanece guardado.');s.status='closed';s.revision++;
  }else fail(404,'Acción no encontrada.');
  await flush(record);
  if(action!=='action'||input.type!=='tap')notify(ids(s),'showdown-room',{id,revision:s.revision});
  json(res,{room:await response(record,user)});return true;
 }
 async function close(){closing=true;clearInterval(timer);await Promise.allSettled([...cache.values()].map(r=>flush(r)));}
 return {handle,close,flush:()=>Promise.all([...cache.values()].map(r=>flush(r))),_cache:cache};
}
