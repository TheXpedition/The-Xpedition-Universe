import {isStaff} from './account-roles.mjs';

const dailyLimit=10000;
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});

export function createAwardsVoting({db,json,fail,body,ballot,now=Date.now}){
 const categories=new Map(ballot.sections.flatMap(section=>section.categories).map(category=>[category.id,category]));
 const dayOf=timestamp=>dayFormat.format(timestamp);
 // Keep the single-choice records from the first version in every tally.
 async function voteCounts(voterId){
  const userFilter=voterId?' AND voter_id=?':'';
  const params=voterId?[ballot.edition,voterId,ballot.edition,voterId]:[ballot.edition,ballot.edition];
  return db.all(`SELECT category,nominee,SUM(votes) AS votes FROM (
   SELECT category,nominee,COUNT(*) AS votes FROM award_votes WHERE edition=?${userFilter} GROUP BY category,nominee
   UNION ALL
   SELECT category,nominee,COUNT(*) AS votes FROM award_vote_entries WHERE edition=?${userFilter} GROUP BY category,nominee
  ) AS recorded_votes GROUP BY category,nominee`,...params);
 }
 async function tally(){
  const today=dayOf(now());
  const [totals,daily]=await Promise.all([
   voteCounts(),
   db.one('SELECT count FROM award_vote_days WHERE edition=? AND day=?',ballot.edition,today)
  ]);
  const counts=new Map(totals.map(row=>[row.category+'/'+row.nominee,Number(row.votes)]));
  return {today,dailyCount:Number(daily?.count||0),dailyLimit,sections:ballot.sections.map(section=>({
   name:section.name,categories:section.categories.map(category=>({
    id:category.id,name:category.name,nominees:category.nominees.map(nominee=>({
     name:nominee.name,details:nominee.details,votes:counts.get(category.id+'/'+nominee.id)||0
    }))
   }))
  }))};
 }
 async function vote(req,res,user){
  if(!user)fail(401,'Inicia sesión para votar.');
  if(!isStaff(user.id))fail(403,'La votación está disponible solo para el Staff.');
  if(req.method==='GET'){
   const rows=await voteCounts(user.id),votes={};
   for(const row of rows)if(categories.has(row.category))(votes[row.category]??={})[row.nominee]=Number(row.votes);
   return json(res,{ballot,votes});
  }
  if(req.method!=='POST')fail(405,'Actualiza la página para votar.');
  const input=await body(req),category=categories.get(input?.category);
  if(!category?.nominees.some(nominee=>nominee.id===input?.nominee))fail(400,'Elige un nominado de esta categoría.');
  if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.requestId))fail(400,'El identificador de voto es inválido.');
  const timestamp=now(),today=dayOf(timestamp);
  const votes=await db.transaction(async()=>{
   const recorded=await db.run('INSERT INTO award_vote_entries(edition,voter_id,request_id,category,nominee,created) VALUES(?,?,?,?,?,?) ON CONFLICT(edition,voter_id,request_id) DO NOTHING',ballot.edition,user.id,input.requestId,category.id,input.nominee,timestamp);
   if(recorded.changes){
    const counted=await db.run('INSERT INTO award_vote_days AS current_day(edition,day,count) VALUES(?,?,1) ON CONFLICT(edition,day) DO UPDATE SET count=current_day.count+1 WHERE current_day.count<?',ballot.edition,today,dailyLimit);
    if(!counted.changes)fail(429,'Se alcanzó el límite de 10.000 votos de hoy. Intenta después de la medianoche, hora de Colombia.');
   }else{
    const existing=await db.one('SELECT category,nominee FROM award_vote_entries WHERE edition=? AND voter_id=? AND request_id=?',ballot.edition,user.id,input.requestId);
    if(existing.category!==category.id||existing.nominee!==input.nominee)fail(409,'Este identificador ya se usó para otro voto.');
   }
   const personal=await db.one('SELECT (SELECT COUNT(*) FROM award_votes WHERE edition=? AND voter_id=? AND category=? AND nominee=?)+(SELECT COUNT(*) FROM award_vote_entries WHERE edition=? AND voter_id=? AND category=? AND nominee=?) AS count',ballot.edition,user.id,category.id,input.nominee,ballot.edition,user.id,category.id,input.nominee);
   return Number(personal.count);
  });
  return json(res,{category:category.id,nominee:input.nominee,votes});
 }
 async function results(req,res,user){
  if(!user)fail(401,'Inicia sesión.');
  if(!isStaff(user.id))fail(403,'Solo el Staff puede ver los resultados.');
  if(req.method!=='GET')fail(405,'Método no permitido.');
  return json(res,await tally());
 }
 return {vote,results};
}
