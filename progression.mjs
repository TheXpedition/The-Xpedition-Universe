import {randomUUID,createHash} from 'node:crypto';

export const xpThresholds=[0,60,170,340,580,900,1320,1850,2500,3300];
export function levelFor(xp){let level=1;while(xp>=(xpThresholds[level]??3300+(level-9)*1000))level++;return level;}
export const dayKey=time=>new Date(time-5*3600000).toISOString().slice(0,10);
const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,32);
export const gameKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function hasPlayableCast(snapshot){
 if(!snapshot||snapshot.version!==1||!snapshot.state||snapshot.point==='setup'||snapshot.point==='world:renderCast')return false;
 const v=snapshot.state.vars||{},w=snapshot.state.world;
 return !!(v.selected18?.length||v.activePlayers?.length||v.selectedPlayers?.length||v.cast?.length||v.raceSeason?.teams?.length||w?.cast?.length||w?.reps?.filter(Boolean).length);
}

export function createProgression({db,shop,catalog,body,json,fail,checkRate,serialize,notify,now=Date.now}){
 const items=new Map(shop.items.map(item=>[item.id,item]));
 const modes=new Map(shop.modes.map(mode=>[mode.id,mode]));
 const day=()=>dayKey(now());
 async function wallet(uid){
  const row=await db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',uid);
  const tickets=Number(row?.tickets||0),coins=Number(row?.coins||0),xp=Number(row?.xp||0),level=levelFor(xp);
  return {tickets,coins,xp,level,levelStart:xpThresholds[level-1]??3300+(level-10)*1000,nextLevelXP:xpThresholds[level]??3300+(level-9)*1000};
 }
 async function grantRaw(uid,key,{tickets=0,coins=0,xp=0,label='Actividad del universo'}={}){
  await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,0,0,0) ON CONFLICT DO NOTHING',uid);
  const inserted=await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',uid,key,tickets,coins,xp,label,now());
  if(!inserted.changes)return false;
  const before=await wallet(uid);
  await db.run('UPDATE user_progression SET tickets=tickets+?,coins=coins+?,xp=xp+? WHERE user_id=?',tickets,coins,xp,uid);
  const level=levelFor(before.xp+xp);
  for(let n=before.level+1;n<=level;n++){
   const bonus=await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,3,?,0,?,?) ON CONFLICT DO NOTHING',uid,'level:'+n,20+n*10,'Nivel '+n+' alcanzado',now());
   if(bonus.changes)await db.run('UPDATE user_progression SET tickets=tickets+3,coins=coins+? WHERE user_id=?',20+n*10,uid);
  }
  return true;
 }
 async function grant(uid,key,reward){return db.transaction(()=>grantRaw(uid,key,reward));}
 async function bootstrap(user){
  const fresh=await grant(user.id,'welcome',{tickets:15,coins:80,label:'Bienvenida al universo'});
  if(fresh){
   await profile(user,{});
   for(const id of JSON.parse(user.saved||'[]'))await grant(user.id,'saved:'+id,{tickets:5,label:'Añadido a Mi lista'});
   for(const f of await db.all('SELECT target FROM follows WHERE actor=?',user.id))await follow(user.id,f.target);
   for(const f of await db.all('SELECT actor FROM follows WHERE target=?',user.id))await grant(user.id,'follower:'+f.actor,{tickets:1,label:'Un nuevo seguidor'});
  }
  return wallet(user.id);
 }
 async function profile(user,changes){
  const bio=String(user.bio||'').trim();
  if(bio.length>=3&&bio!=='Mi próxima aventura empieza aquí.')await grant(user.id,'profile:bio',{tickets:20,label:'Tu biografía'});
  if(user.pronouns)await grant(user.id,'profile:identity',{tickets:10,label:'Identidad y pronombres'});
  if(user.gender_identity)await grant(user.id,'profile:gender',{tickets:10,label:'Tu identidad de género'});
  if(user.orientation)await grant(user.id,'profile:orientation',{tickets:10,label:'Tu orientación en el perfil'});
  if(changes.avatar)await grant(user.id,'profile:avatar',{tickets:10,label:'Tu ícono de perfil'});
 }
 async function follow(actor,target){
  await grant(actor,'follow:'+target,{tickets:1,label:'Primer seguimiento a un perfil'});
  if(!target.startsWith('char:'))await grant(target,'follower:'+actor,{tickets:1,label:'Un nuevo seguidor'});
 }
 async function saved(uid,ids){for(const id of ids)await grant(uid,'saved:'+id,{tickets:5,label:'Añadido a Mi lista'});}
 async function limited(uid,category,limit,key,reward){
  const prefix=category+':'+day()+':';
  const count=Number((await db.one('SELECT COUNT(*) AS n FROM economy_rewards WHERE user_id=? AND event_key LIKE ?',uid,prefix+'%')).n);
  if(count>=limit)return false;
  return grant(uid,prefix+digest(key),reward);
 }
 async function socialAction(uid,type,key,text=''){
  const rules={post:{limit:3,tickets:5,min:12,label:'Publicación en Comunidad'},comment:{limit:5,tickets:2,min:5,label:'Comentario en Comunidad'},message:{limit:10,tickets:1,min:4,label:'Conversación con tu comunidad'},group:{limit:3,tickets:5,min:0,label:'Un nuevo chat grupal'}};
  const rule=rules[type];if(!rule||text.trim().length<rule.min)return;
  return limited(uid,type,rule.limit,key,{tickets:rule.tickets,label:rule.label});
 }
 async function inventory(uid){return new Set((await db.all('SELECT item_id FROM economy_inventory WHERE user_id=?',uid)).map(row=>row.item_id));}
 async function preferences(uid){const row=await db.one('SELECT autosave,hidden FROM simulator_preferences WHERE user_id=?',uid);return {autosave:row?!!Number(row.autosave):true,hidden:JSON.parse(row?.hidden||'[]')};}
 async function expireArchives(uid){await db.run("UPDATE game_runs SET status='expired' WHERE user_id=? AND status='archived' AND updated<=?",uid,now()-86400000);}
 async function canPlay(uid,mode){const item=modes.get(mode);if(!item||item.upcoming)return false;const w=await wallet(uid);return (item.noLevelRequirement||w.level>=item.level)&&(!item.price||(await inventory(uid)).has('mode:'+mode));}
 async function view(uid){
  const w=await wallet(uid),owned=await inventory(uid);
  await expireArchives(uid);
  return {wallet:w,owned:[...owned],preferences:await preferences(uid),shop,activeRun:await activeRun(uid)};
 }
 async function activeRun(uid){
  const rows=await db.all("SELECT id,mode,status,snapshot,revision,updated,episode FROM game_runs WHERE user_id=? AND status='active' ORDER BY updated DESC",uid);
  const row=rows.find(row=>hasPlayableCast(JSON.parse(row.snapshot)));if(row)delete row.snapshot;
  return row?{...row,updated:Number(row.updated),revision:Number(row.revision),episode:Number(row.episode)}:null;
 }
 async function owned(uid,kind,value){const key=gameKey(value),alias=shop.aliases[key]||key,item=items.get(kind+':'+alias);return !!item&&(item.starter||(await inventory(uid)).has(item.id));}
 async function handle(req,res,url,user){
  const p=url.pathname,method=req.method;
  if(!p.startsWith('/api/economy')&&!p.startsWith('/api/game-runs'))return false;
  if(!user)fail(401,'Inicia sesión con tu cuenta para jugar.');
  checkRate(req,'progression',180,60000);
  if(p==='/api/economy'&&method==='GET'){
   const result=await serialize(async()=>{
    await bootstrap(user);
    if(url.searchParams.get('surface')==='simulator')await grant(user.id,'login:'+day(),{coins:30,label:'Tu visita diaria al simulador'});
    return view(user.id);
   });json(res,result);return true;
  }
  if(p==='/api/economy/history'&&method==='GET'){
   json(res,{history:await db.all('SELECT tickets,coins,xp,label,created FROM economy_rewards WHERE user_id=? ORDER BY created DESC,event_key DESC LIMIT 10',user.id)});return true;
  }
  if(p==='/api/economy/preferences'&&method==='POST'){
   const b=await body(req),pref=await preferences(user.id);
   if(b.autosave!==undefined){if(typeof b.autosave!=='boolean')fail(400,'Elige el estado del guardado automático.');pref.autosave=b.autosave;}
   if(b.item!==undefined){const item=items.get(b.item);if(item?.kind!=='character'||typeof b.enabled!=='boolean'||!await owned(user.id,'character',item.name))fail(400,'Elige un personaje de tu colección.');const hidden=new Set(pref.hidden);if(b.enabled)hidden.delete(item.id);else hidden.add(item.id);pref.hidden=[...hidden];}
   await db.run('INSERT INTO simulator_preferences(user_id,autosave,hidden) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET autosave=?,hidden=?',user.id,pref.autosave?1:0,JSON.stringify(pref.hidden),pref.autosave?1:0,JSON.stringify(pref.hidden));
   json(res,{preferences:pref});return true;
  }
  if(p==='/api/economy/redeem'&&method==='POST'){
   checkRate(req,'coupons',15,60000);const b=await body(req),code=gameKey(String(b.code||'').slice(0,40));
   const coupons={chatgpt:{items:['character:chadgilpete'],label:'Chad Gil Pete ya es tuyo'},bonju:{coins:500,label:'500 monedas para tu expedición'},moda:{items:['character:ednadroga'],label:'Edna Droga ya es tuya'},lgbtq:{items:['team:lesbianas','team:gays','team:trans'],label:'Equipos Lesbianas, Gays y Trans desbloqueados'},levelup:{level:true,label:'¡Subiste un nivel!'}};
   const coupon=coupons[code];if(!coupon)fail(400,'Ese cupón no existe. Revisa el código.');
   const redemption=await db.transaction(async()=>{
    const before=await wallet(user.id),reward=await grantRaw(user.id,'coupon:'+code,{coins:coupon.coins||0,xp:coupon.level?before.nextLevelXP-before.xp:0,label:'Cupón · '+coupon.label});
    if(!reward)fail(409,'Ya utilizaste este cupón en tu cuenta.');
    for(const id of coupon.items||[]){if(!items.has(id))throw new Error('Cupón mal configurado');await db.run('INSERT INTO economy_inventory(user_id,item_id,acquired) VALUES(?,?,?) ON CONFLICT DO NOTHING',user.id,id,now());}
    const after=await wallet(user.id);
    return {items:(coupon.items||[]).map(id=>{const i=items.get(id);return {id:i.id,name:i.name,image:i.image,kind:i.kind};}),coins:after.coins-before.coins,tickets:after.tickets-before.tickets,level:after.level>before.level?after.level:null};
   });
   json(res,{...await view(user.id),message:coupon.label,redemption});return true;
  }
  if(p==='/api/economy/buy'&&method==='POST'){
   const b=await body(req),item=items.get(b.item)||shop.modes.find(m=>'mode:'+m.id===b.item);
   if(!item||item.starter||item.upcoming||(item.kind==='mode'&&!item.price))fail(400,'Este artículo no está a la venta.');
   const id=item.kind==='mode'?'mode:'+item.id:item.id,w=await wallet(user.id);
   if(!item.noLevelRequirement&&w.level<(item.level||1))fail(409,'Primero alcanza el nivel '+item.level+'.');
   await db.transaction(async()=>{
    const added=await db.run('INSERT INTO economy_inventory(user_id,item_id,acquired) VALUES(?,?,?) ON CONFLICT DO NOTHING',user.id,id,now());
    if(!added.changes)return;
    const debit=await db.run('UPDATE user_progression SET coins=coins-? WHERE user_id=? AND coins>=?',item.price,user.id,item.price);
    if(!debit.changes)fail(409,'Todavía no tienes suficientes monedas. Sigue jugando para conseguirlas.');
    await grantRaw(user.id,'purchase:'+id,{coins:0,tickets:2,xp:5,label:'Desbloqueaste '+item.name});
   });
   json(res,await view(user.id));return true;
  }
  if(p==='/api/economy/activity'&&method==='POST'){
   const b=await body(req),surface=b.surface==='simulator'?'simulator':'web';
   const validRoutes=new Set(['inicio','explorar','temporada','premios','comunidad','noticias','simuladores','guardados','universo','perfil','mensajes','buscar','privacidad','audicion','showdown']);
   const route=String(b.route||'inicio').split('/')[0];if(!validRoutes.has(route))fail(400,'Página inválida.');
   const key=String(b.route||'inicio').slice(0,100);
   const previous=await db.one('SELECT active_seconds,updated FROM activity_days WHERE user_id=? AND day=? AND surface=?',user.id,day(),surface);
   const elapsed=previous?Math.max(0,Math.min(25,Math.floor((now()-Number(previous.updated))/1000))):0;
   const seconds=Math.max(0,Math.min(elapsed,Number.isFinite(b.seconds)?Math.floor(b.seconds):0));
   await db.run('INSERT INTO activity_days(user_id,day,surface,active_seconds,updated) VALUES(?,?,?,?,?) ON CONFLICT(user_id,day,surface) DO UPDATE SET active_seconds=activity_days.active_seconds+?,updated=?',user.id,day(),surface,seconds,now(),seconds,now());
   const active=Number(previous?.active_seconds||0)+seconds;
   if(surface==='web'){
    if(b.event==='visit')await limited(user.id,'visit',12,key,{tickets:1,label:'Una página nueva del universo'});
    if(b.event==='click'&&active>=10)await limited(user.id,'explore',5,key,{tickets:1,label:'Explorando el universo'});
    if(b.event==='scroll'&&active>=20)await limited(user.id,'scroll',8,key,{tickets:2,label:'Recorriendo una página'});
    if(b.event==='complete'&&active>=45)await limited(user.id,'read',5,key,{tickets:3,label:'Una página explorada completa'});
    if(b.event==='video'&&active>=30&&catalog.content.xpedition.concat(catalog.content.spinoffs).some(item=>item.id===b.content))await limited(user.id,'video',5,String(b.content),{tickets:2,label:'Una previa del universo'});
    for(let bucket=1;bucket<=Math.min(6,Math.floor(active/300));bucket++)await grant(user.id,'time:web:'+day()+':'+bucket,{tickets:2,label:'Tiempo explorando el universo'});
   }else{
    for(let bucket=1;bucket<=Math.min(15,Math.floor(active/120));bucket++)await grant(user.id,'time:sim:'+day()+':'+bucket,{coins:2,xp:4,label:'Tiempo activo en el simulador'});
    if(b.run&&seconds)await db.run("UPDATE game_runs SET active_seconds=active_seconds+? WHERE id=? AND user_id=? AND status='active'",seconds,b.run,user.id);
   }
   json(res,{wallet:await wallet(user.id)});return true;
  }
  if(p==='/api/game-runs'&&method==='POST'){
   const b=await body(req),mode=String(b.mode||'');if(mode==='showdown')fail(409,'Showdown se juega desde su sala dentro de la web.');
   if(!await canPlay(user.id,mode))fail(403,'Esta temporada aún está bloqueada. Revisa tu nivel y la tienda.');
   const active=await activeRun(user.id);if(active)fail(409,'Ya tienes una partida sin terminar. Puedes continuarla o archivarla.',{run:active});
   await db.run("UPDATE game_runs SET status='discarded' WHERE user_id=? AND status='active'",user.id);
   const id=randomUUID();
   await db.run("INSERT INTO game_runs(id,user_id,mode,status,snapshot,revision,episode,decisions,active_seconds,created,updated,last_reward) VALUES(?,?,?,'active','{}',0,0,0,0,?,?,?)",id,user.id,mode,now(),now(),now());
   json(res,{run:{id,mode,status:'active',revision:0,episode:0,updated:now()},wallet:await wallet(user.id)},201);return true;
  }
  if(p==='/api/game-runs'&&method==='GET'){
   await expireArchives(user.id);
   const rows=await db.all("SELECT id,mode,status,snapshot,revision,episode,updated,winner FROM game_runs WHERE user_id=? AND status IN ('active','archived','finished') ORDER BY updated DESC",user.id);
   json(res,{runs:rows.filter(row=>hasPlayableCast(JSON.parse(row.snapshot))).slice(0,30).map(({snapshot,...row})=>({...row,episode:JSON.parse(snapshot).progress?.completed??row.episode,expiresAt:row.status==='archived'?Number(row.updated)+86400000:null}))});return true;
  }
  const match=p.match(/^\/api\/game-runs\/([a-f0-9-]+)(?:\/(decision|finish|abandon|resume))?$/);
  if(match){
   await expireArchives(user.id);
   const run=await db.one('SELECT * FROM game_runs WHERE id=? AND user_id=?',match[1],user.id);if(!run||['deleted','expired','discarded'].includes(run.status))fail(404,'Partida no encontrada.');
   if(method==='DELETE'&&!match[2]){await db.run("UPDATE game_runs SET status='deleted',revision=revision+1 WHERE id=? AND user_id=?",run.id,user.id);json(res,{ok:true});return true;}
   if(method==='POST'&&match[2]==='resume'){
    if(run.status==='finished')fail(409,'La temporada terminó. Puedes consultar el guardado.');
    const active=await activeRun(user.id);if(active&&active.id!==run.id)fail(409,'Archiva tu partida actual para continuar esta.');
    if(run.status==='archived')await db.run("UPDATE game_runs SET status='active',revision=revision+1,updated=? WHERE id=? AND user_id=?",now(),run.id,user.id);
    const updated=await db.one('SELECT * FROM game_runs WHERE id=? AND user_id=?',run.id,user.id);json(res,{run:{...updated,snapshot:JSON.parse(updated.snapshot)}});return true;
   }
   if(method==='GET'&&!match[2]){json(res,{run:{...run,snapshot:JSON.parse(run.snapshot)}});return true;}
   if(method==='PUT'&&!match[2]&&run.status==='finished'){
    const b=await body(req),snapshot=JSON.stringify(b.snapshot);if(!b.manual||!hasPlayableCast(b.snapshot)||b.snapshot.progress?.winner!==run.winner||snapshot.length>800000)fail(409,'Esta temporada ya terminó.');
    const saved=await db.run('UPDATE game_runs SET snapshot=?,revision=revision+1,updated=? WHERE id=? AND user_id=? AND revision=?',snapshot,now(),run.id,user.id,b.revision);
    if(!saved.changes)fail(409,'La partida se actualizó en otra ventana.');json(res,{revision:Number(run.revision)+1,wallet:await wallet(user.id),saved:true});return true;
   }
   if(run.status!=='active'){
    if(match[2]==='finish'&&run.status==='finished'){json(res,{wallet:await wallet(user.id),alreadyFinished:true});return true;}
    fail(409,'Esta partida ya está cerrada.');
   }
   const b=await body(req);
   if(method==='PUT'&&!match[2]){
    if(!Number.isInteger(b.revision)||b.revision!==Number(run.revision))fail(409,'La partida se ha actualizado en otra ventana. Vuelve a cargarla.');
    const snapshot=JSON.stringify(b.snapshot);if(!b.snapshot||b.snapshot.version!==1||snapshot.length>800000)fail(400,'Guardado inválido.');
    if(!hasPlayableCast(b.snapshot)){json(res,{revision:Number(run.revision),wallet:await wallet(user.id),saved:false});return true;}
    const episode=Number(b.episode||0);if(!Number.isInteger(episode)||episode<0||episode>100||episode>Number(run.episode)+1)fail(400,'El progreso del episodio no es válido.');
    let reps=JSON.parse(run.representatives||'[]');
    if(!reps.length&&Array.isArray(b.representatives)&&b.representatives.length){
     if(b.representatives.length>3)fail(400,'Representantes inválidos.');
     for(const name of b.representatives)if(!await owned(user.id,'character',name))fail(403,'Este personaje no pertenece a tu colección.');
     reps=[...new Set(b.representatives)];
    }
    const advanced=episode>Number(run.episode)&&now()-Number(run.last_reward)>=15000;
    const persist=b.manual===true||(b.persist!==false&&(await preferences(user.id)).autosave);
    const saved=await db.run('UPDATE game_runs SET snapshot=?,revision=revision+1,episode=?,updated=?,last_reward=?,representatives=? WHERE id=? AND user_id=? AND revision=?',persist?snapshot:run.snapshot,episode,persist?now():Number(run.updated),advanced?now():Number(run.last_reward),JSON.stringify(reps),run.id,user.id,run.revision);
    if(!saved.changes)fail(409,'La partida se ha actualizado en otra ventana. Vuelve a cargarla.');
    if(advanced)await grant(user.id,'episode:'+run.id+':'+episode,{tickets:2,coins:6,xp:12,label:'Episodio '+episode+' completado'});
    await limited(user.id,'started',8,run.id,{tickets:1,label:'Una nueva expedición'});
    json(res,{revision:Number(run.revision)+1,wallet:await wallet(user.id),saved:persist,savedAt:persist?now():null});return true;
   }
   if(method==='POST'&&match[2]==='decision'){
    if(Number(run.decisions)>=40||now()-Number(run.last_decision||run.created)<1200){json(res,{wallet:await wallet(user.id)});return true;}
    const kind=String(b.kind||''),value=String(b.value||'').slice(0,100);
    if(!['character','challenge','team','choice','advance','random'].includes(kind)||!value)fail(400,'Decisión inválida.');
    if(['character','challenge','team'].includes(kind)&&!await owned(user.id,kind,value))fail(403,'Primero desbloquea este artículo.');
    const manual=!['random','advance'].includes(kind),key='decision:'+run.id+':'+digest(kind+':'+value+':'+run.episode);
    const added=await grant(user.id,key,{tickets:manual?1:0,coins:manual?2:1,xp:manual?4:1,label:manual?'Una decisión propia en la expedición':'Progreso en la expedición'});
    if(added)await db.run('UPDATE game_runs SET decisions=decisions+1,last_decision=? WHERE id=?',now(),run.id);
    json(res,{wallet:await wallet(user.id)});return true;
   }
   if(method==='POST'&&match[2]==='finish'){
    if(Number(run.episode)<4||Number(run.active_seconds)<60)fail(409,'Completa los episodios de la temporada antes de recoger la recompensa final.');
    const winner=String(b.winner||'').slice(0,90),reps=JSON.parse(run.representatives||'[]');
    const bonus=run.mode==='world'&&reps.includes(winner)?(reps.length===1?60:30):0;
    const paid=await limited(user.id,'finished',3,run.id,{tickets:40+bonus,coins:65+(bonus?bonus:0),xp:60+(bonus?30:0),label:bonus?'Victoria de tu delegación · '+(reps.length===1?'Representante en solitario':'Vs. The World'):'Temporada completada'});
    await db.run("UPDATE game_runs SET status='finished',winner=?,updated=? WHERE id=? AND user_id=?",winner,now(),run.id,user.id);
    json(res,{wallet:await wallet(user.id),rewarded:!!paid});return true;
   }
   if(method==='POST'&&match[2]==='abandon'){
    await db.run("UPDATE game_runs SET status='archived',updated=? WHERE id=? AND user_id=?",now(),run.id,user.id);json(res,{ok:true});return true;
   }
  }
  fail(404,'Acción no encontrada.');
 }
 return {handle,wallet,bootstrap,profile,follow,saved,socialAction,canPlay,grant,view};
}
