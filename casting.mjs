import {accountRole} from './account-roles.mjs';
import {randomUUID} from 'node:crypto';
import {CASTING_SEASON,AUDITION_PRICE,DIRECT_PRICE,DIRECT_STANDARD_CAPACITY,DIRECT_CAPACITY,LAST_DIRECT_PRICE,castingQuestions,castingProfile,agreementLabels} from './public/casting-config.mjs';

export function createCasting({db,json,fail,body,checkRate,progression,catalog,now=Date.now,onParticipantChange=()=>{},isParticipant=()=>false}){
 const season=CASTING_SEASON;
 const franchises={
  'The Xpedition':catalog.content.xpedition,
  'The Traitor':catalog.content.spinoffs.filter(x=>/^traitor\d*$/.test(x.id)),
  Showdown:catalog.content.spinoffs.filter(x=>x.saga==='showdown'),
  Campria:catalog.content.campria.filter(x=>x.id!==season)
 };
 const options=Object.fromEntries(Object.entries(franchises).map(([name,items])=>[name,items.map(x=>({id:x.id,name:x.name}))]));
 const entry=uid=>db.one('SELECT * FROM casting_entries WHERE season=? AND user_id=?',season,uid);
 const parse=row=>JSON.parse(row?.answers||'{}');
 async function ensure(uid){await db.run("INSERT INTO casting_entries(season,user_id,state,answers,revision,step) VALUES(?,?,'ready','{}',0,0) ON CONFLICT DO NOTHING",season,uid);}
 async function lock(uid){await db.run('UPDATE casting_entries SET revision=revision+1 WHERE season=? AND user_id=?',season,uid);return entry(uid);}
 function privateEntry(row){
  if(!row)return null;const answers=parse(row);
  return {auditionPurchased:!!row.audition_purchased,directSlot:row.direct_slot?Number(row.direct_slot):null,state:row.state,step:Number(row.step),started:Number(row.started||0),finished:Number(row.finished||0),stepStarted:Number(row.step_started||0),deadline:Number(row.deadline||0),answers,profile:row.state==='completed'?castingProfile(answers):null,revision:Number(row.revision)};
 }
 async function advance(row,timestamp){
  if(row.state!=='running')return row;
  const answers=parse(row);let step=Number(row.step),stepStarted=Number(row.step_started),deadline=Number(row.deadline),changed=false;
  // The server owns the deadlines, including while the tab is closed.
  while(step<castingQuestions.length&&timestamp>=deadline){
   const q=castingQuestions[step],draft=answers[q.id];
   answers[q.id]={value:draft?.value??null,timedOut:true,seconds:q.seconds,submitted:deadline};
   changed=true;step++;stepStarted=deadline;deadline+= (castingQuestions[step]?.seconds||0)*1000;
  }
  if(changed){const finished=step===castingQuestions.length?stepStarted:0;
   await db.run('UPDATE casting_entries SET answers=?,step=?,step_started=?,deadline=?,state=?,finished=?,revision=revision+1 WHERE season=? AND user_id=?',JSON.stringify(answers),step,stepStarted,deadline,finished?'completed':'running',finished,season,row.user_id);
   return entry(row.user_id);
  }return row;
 }
 async function fresh(uid){return db.transaction(async()=>{const existing=await entry(uid);if(!existing)return null;return advance(await lock(uid),now());});}
 async function publicCast(){
  const rows=await db.all('SELECT u.id,u.name,u.avatar,c.direct_slot,c.direct_purchased FROM casting_entries c JOIN users u ON u.id=c.user_id WHERE c.season=? AND c.direct_slot IS NOT NULL ORDER BY c.direct_slot',season);
  return rows.map(row=>({id:row.id,name:row.name,avatar:row.avatar,slot:Number(row.direct_slot),apocalypseParticipant:true,...accountRole(row.id)}));
 }
 async function publicAuditionCast(){
  const rows=await db.all('SELECT u.id,u.name,u.avatar,a.audition_slot FROM apocalypse_cast a JOIN users u ON u.id=a.user_id WHERE a.audition_slot IS NOT NULL ORDER BY a.audition_slot');
  return rows.map(row=>({id:row.id,name:row.name,avatar:row.avatar,slot:Number(row.audition_slot),apocalypseParticipant:true,...accountRole(row.id)}));
 }
 function validate(q,value,{draft=false}={}){
  if(value===null&&draft)return null;
  if(q.type==='text'){if(typeof value!=='string'||value.length>q.max||(!draft&&!value.trim()))fail(400,'Escribe tu respuesta antes de continuar.');return value.trim();}
  if(q.type==='history'){
   if(!value||typeof value.played!=='boolean')fail(400,'Indica si participaste antes.');
   if(!value.played)return {played:false};
   if(typeof value.forgot!=='boolean'||typeof value.multiple!=='boolean')fail(400,'Completa tu experiencia anterior.');
   if(value.forgot)return {played:true,forgot:true,multiple:value.multiple,franchise:null,season:null};
   const list=options[value.franchise];if(!list||!list.some(x=>x.id===value.season))fail(400,'Elige una franquicia y una temporada, o marca «No me acuerdo».');
   return {played:true,forgot:false,multiple:value.multiple,franchise:value.franchise,season:value.season};
  }
  if(q.type==='scale'){if(!Number.isInteger(value)||value<1||value>5)fail(400,'Elige tu grado de acuerdo.');return value;}
  if(q.type==='multi'){if(!Array.isArray(value)||value.length>q.max||(!draft&&!value.length)||new Set(value).size!==value.length||value.some(x=>!q.options.includes(x)))fail(400,'Elige entre 1 y 3 retos.');return value;}
  if(!q.options.includes(value))fail(400,'Elige una de las opciones.');return value;
 }
 async function summary(uid){const cast=await publicCast(),occupied=new Set(cast.map(person=>person.slot)),slotPrices=Array.from({length:DIRECT_CAPACITY},(_,i)=>i>=DIRECT_STANDARD_CAPACITY?LAST_DIRECT_PRICE:DIRECT_PRICE),nextSlot=Array.from({length:DIRECT_CAPACITY},(_,i)=>i+1).find(slot=>!occupied.has(slot));return {season,auditionPrice:AUDITION_PRICE,directPrice:nextSlot&&nextSlot>DIRECT_STANDARD_CAPACITY?LAST_DIRECT_PRICE:DIRECT_PRICE,capacity:DIRECT_CAPACITY,auditionCapacity:6,slotPrices,cast,auditionCast:await publicAuditionCast(),entry:uid?privateEntry(await fresh(uid)):null,franchises:options,questions:castingQuestions,serverTime:now(),wallet:uid?await progression.wallet(uid):null};}
 async function handle(req,res,url,user){
  const p=url.pathname,method=req.method,isStaffRoute=p.startsWith('/api/moderation/auditions');
  if(!p.startsWith('/api/casting/')&&!isStaffRoute)return false;
  const base='/api/casting/'+season;
  if(isStaffRoute){
   if(!user)fail(401,'Inicia sesión.');if(!accountRole(user.id).staff)fail(403,'Solo el Staff puede revisar las audiciones.');
   const selection=p.match(/^\/api\/moderation\/auditions\/([a-f0-9-]+)\/participant$/);
   if(selection&&method==='PUT'){
    checkRate(req,'apocalypse-cast-selection',100,3600000);const input=await body(req),userId=selection[1];
    if(typeof input.selected!=='boolean')fail(400,'Indica si la cuenta debe ocupar un lugar por audición.');
    const candidate=await db.one('SELECT id FROM users WHERE id=?',userId);if(!candidate)fail(404,'No encontramos esta cuenta.');
    let assignedSlot=null;
    await db.transaction(async()=>{
     const existing=await db.one('SELECT audition_slot FROM apocalypse_cast WHERE user_id=?',userId);
     const direct=await db.one('SELECT direct_slot FROM casting_entries WHERE season=? AND user_id=?',season,userId);
     if(input.selected&&direct?.direct_slot)return;
     if(input.selected&&existing?.audition_slot){assignedSlot=Number(existing.audition_slot);return;}
     if(input.selected){
      const rows=await db.all('SELECT audition_slot FROM apocalypse_cast WHERE audition_slot IS NOT NULL ORDER BY audition_slot');
      const occupied=new Set(rows.map(row=>Number(row.audition_slot)));
      if(occupied.size>=6)fail(409,'Los seis lugares por audición ya están ocupados.');
      assignedSlot=Array.from({length:6},(_,index)=>index+1).find(slot=>!occupied.has(slot));
      await db.run('INSERT INTO apocalypse_cast(user_id,audition_slot,updated_by,updated) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET audition_slot=excluded.audition_slot,updated_by=excluded.updated_by,updated=excluded.updated',userId,assignedSlot,user.id,now());
     }else{
      const removed=await db.run('UPDATE apocalypse_cast SET audition_slot=NULL,updated_by=?,updated=? WHERE user_id=? AND audition_slot IS NOT NULL',user.id,now(),userId);
      await db.run('UPDATE casting_entries SET direct_slot=NULL WHERE season=? AND user_id=? AND direct_slot IS NOT NULL',season,userId);
      if(removed.changes)await db.run('DELETE FROM apocalypse_cast WHERE user_id=? AND style_override IS NULL',userId);
     }
     await db.run('INSERT INTO moderation_actions(id,moderator,action,subject,details,created) VALUES(?,?,?,?,?,?)',randomUUID(),user.id,input.selected?'apocalypse-audition-select':'apocalypse-audition-unselect',userId,JSON.stringify({name:(await db.one('SELECT name FROM users WHERE id=?',userId))?.name||'',slot:assignedSlot}),now());
    });
    const direct=await db.one('SELECT direct_slot FROM casting_entries WHERE season=? AND user_id=?',season,userId);
    onParticipantChange(userId,!!assignedSlot||!!direct?.direct_slot);
    json(res,{selected:input.selected,slot:assignedSlot,auditionCast:await publicAuditionCast()});return true;
   }
   if(method!=='GET')fail(405,'Método no permitido.');
   const detail=p.match(/^\/api\/moderation\/auditions\/([a-f0-9-]+)$/);
   if(detail){const row=await fresh(detail[1]),person=await db.one('SELECT id,name,avatar,created FROM users WHERE id=?',detail[1]);if(!person)fail(404,'No encontramos esta cuenta.');const cast=await db.one('SELECT audition_slot FROM apocalypse_cast WHERE user_id=?',detail[1]),direct=await db.one('SELECT direct_slot FROM casting_entries WHERE season=? AND user_id=?',season,detail[1]),filled=await db.one('SELECT COUNT(*) AS n FROM apocalypse_cast WHERE audition_slot IS NOT NULL');json(res,{person:{...person,apocalypseParticipant:isParticipant(person.id),...accountRole(person.id)},entry:{...(privateEntry(row)||{auditionPurchased:false,directSlot:null,state:'ready',step:0,started:0,finished:0,answers:{},profile:null,revision:0}),directSlot:direct?.direct_slot?Number(direct.direct_slot):null,auditionSlot:cast?.audition_slot?Number(cast.audition_slot):null},auditionCastCount:Number(filled.n),questions:castingQuestions,agreementLabels,franchises:options,serverTime:now()});return true;}
   if(p!=='/api/moderation/auditions')fail(404,'No encontramos esta audición.');
   // Classify expired attempts even when their owner has never reopened the page.
   await db.transaction(async()=>{const expired=await db.all("SELECT user_id FROM casting_entries WHERE season=? AND state='running' AND deadline<=? ORDER BY user_id",season,now());for(const row of expired)await advance(await lock(row.user_id),now());});
   const query=String(url.searchParams.get('query')||'').slice(0,80).toLocaleLowerCase('es'),status=url.searchParams.get('status')||'all',offset=Math.floor(Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0)));
   if(!['all','ready','running','completed','direct'].includes(status))fail(400,'Filtro inválido.');
   const from='users u LEFT JOIN casting_entries c ON c.season=? AND c.user_id=u.id LEFT JOIN apocalypse_cast a ON a.user_id=u.id',where=(status==='all'?"LOWER(u.name) LIKE ?":"c.season=? AND LOWER(u.name) LIKE ?")+(status==='direct'?' AND c.direct_slot IS NOT NULL':status==='all'?'':' AND c.state=? AND c.audition_purchased IS NOT NULL');
   const args=status==='all'?[season,'%'+query+'%']:[season,season,'%'+query+'%',...(['direct'].includes(status)?[]:[status])];
   const rows=await db.all('SELECT u.id AS user_id,u.name,u.avatar,c.audition_purchased,c.direct_purchased,c.direct_slot,c.state,c.started,c.finished,c.step,c.step_started,c.deadline,c.answers,c.revision,a.audition_slot FROM '+from+' WHERE '+where+' ORDER BY COALESCE(c.finished,c.started,c.audition_purchased,c.direct_purchased) DESC,u.name,u.id LIMIT 26 OFFSET ?',...args,offset);
   const entries=[];for(const row of rows.slice(0,25)){const updated=await fresh(row.user_id),entry=privateEntry(updated);entries.push({userId:row.user_id,name:row.name,avatar:row.avatar,apocalypseParticipant:isParticipant(row.user_id),auditionSlot:row.audition_slot?Number(row.audition_slot):null,...(entry||{auditionPurchased:false,directSlot:null,state:'ready',step:0,started:0,finished:0,answers:{},profile:null,revision:0}),directSlot:row.direct_slot?Number(row.direct_slot):null});}
   json(res,{entries,hasMore:rows.length>25,offset,total:Number((await db.one('SELECT COUNT(*) AS n FROM '+from+' WHERE '+where,...args)).n)});return true;
  }
  if(p===base&&method==='GET'){json(res,await summary(user?.id));return true;}
  if(!user)fail(401,'Inicia sesión para participar en el casting.');
  checkRate(req,'casting',180,60000);
  if(p===base+'/purchase'&&method==='POST'){
   const input=await body(req),kind=input.kind;
   if(!['audition','direct'].includes(kind)||input.acceptNoRefund!==true)fail(400,'Debes aceptar que la compra en tickets no tiene devolución.');
   await db.transaction(async()=>{
    await ensure(user.id);const row=await lock(user.id);
    if(kind==='audition'&&row.audition_purchased||kind==='direct'&&row.direct_slot)return;
    if(kind==='audition'&&row.direct_slot)fail(409,'Ya tienes una entrada directa. Tu lugar en el cast está confirmado.');
    let slot=null;
    if(kind==='direct'){
     const occupiedRows=await db.all('SELECT direct_slot FROM casting_entries WHERE season=? AND direct_slot IS NOT NULL',season),occupied=new Set(occupiedRows.map(item=>Number(item.direct_slot)));
     slot=Array.from({length:DIRECT_CAPACITY},(_,index)=>index+1).find(candidate=>!occupied.has(candidate));
     if(!slot)fail(409,'Las doce entradas directas están agotadas. Todavía puedes audicionar.');
    }
    const price=kind==='audition'?AUDITION_PRICE:slot>DIRECT_STANDARD_CAPACITY?LAST_DIRECT_PRICE:DIRECT_PRICE;
    if(kind==='direct'&&(slot>DIRECT_STANDARD_CAPACITY||input.expectedPrice!==undefined)&&input.expectedPrice!==price)fail(409,'El precio de la entrada disponible cambió. Revisa el cupo y confirma su precio antes de comprar.');
    const paid=await db.run('UPDATE user_progression SET tickets=tickets-? WHERE user_id=? AND tickets>=?',price,user.id,price);
    if(!paid.changes)fail(409,'No tienes suficientes tickets. Completa tu perfil, participa en la comunidad o termina temporadas en el simulador.');
    const timestamp=now();
    if(kind==='direct'){
     await db.run('UPDATE casting_entries SET direct_slot=?,direct_purchased=? WHERE season=? AND user_id=?',slot,timestamp,season,user.id);
    }else await db.run('UPDATE casting_entries SET audition_purchased=? WHERE season=? AND user_id=?',timestamp,season,user.id);
    await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,?,0,0,?,?)',user.id,'casting:'+season+':'+kind+':'+randomUUID(),-price,kind==='direct'?'Entrada directa · Apocalypse II':'Audición · Apocalypse II',timestamp);
   });
   if(kind==='direct')onParticipantChange(user.id,true);
   json(res,await summary(user.id));return true;
  }
  if(p===base+'/start'&&method==='POST'){
   await db.transaction(async()=>{const row=await lock(user.id);if(!row?.audition_purchased)fail(403,'Primero compra el acceso a la audición.');if(row.state!=='ready')return;const timestamp=now();await db.run("UPDATE casting_entries SET state='running',started=?,step_started=?,deadline=? WHERE season=? AND user_id=?",timestamp,timestamp,timestamp+castingQuestions[0].seconds*1000,season,user.id);});
   json(res,await summary(user.id));return true;
  }
  if(p===base+'/answer'&&method==='POST'){
   const input=await body(req);
   await db.transaction(async()=>{
    let row=await lock(user.id);if(!row?.audition_purchased||row.state==='ready')fail(403,'Empieza tu audición primero.');row=await advance(row,now());
    if(row.state!=='running'||Number(input.step)!==Number(row.step))return;
    const q=castingQuestions[Number(row.step)],answers=parse(row),value=validate(q,input.value,{draft:input.draft===true}),timestamp=now();
    answers[q.id]={value,timedOut:false,seconds:Math.min(q.seconds,Math.max(0,(timestamp-Number(row.step_started))/1000)),submitted:input.draft===true?null:timestamp};
    if(input.draft===true){await db.run('UPDATE casting_entries SET answers=? WHERE season=? AND user_id=?',JSON.stringify(answers),season,user.id);return;}
    const step=Number(row.step)+1,finished=step===castingQuestions.length;
    await db.run('UPDATE casting_entries SET answers=?,step=?,state=?,finished=?,step_started=?,deadline=? WHERE season=? AND user_id=?',JSON.stringify(answers),step,finished?'completed':'running',finished?timestamp:0,timestamp,finished?0:timestamp+castingQuestions[step].seconds*1000,season,user.id);
   });json(res,await summary(user.id));return true;
  }
  fail(404,'No encontramos esta opción del casting.');
 }
 return {handle,summary};
}
