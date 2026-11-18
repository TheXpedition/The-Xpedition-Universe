import {isStaff} from './account-roles.mjs';

// The limits are independent for each signed-in account and reset at midnight in Colombia.
const dailyLimit=100000;
const nomineeDailyLimit=10000;
const categoryChoiceLimit=2;
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});
const dayOf=timestamp=>{
 const parts=Object.fromEntries(dayFormat.formatToParts(timestamp).map(part=>[part.type,part.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
};
const bounds=day=>{
 const start=Date.parse(day+'T05:00:00.000Z'); // Bogota is UTC-05:00, without DST.
 return [start,start+86400000];
};

export function createAwardsVoting({db,json,fail,body,ballot,now=Date.now}){
 const categories=new Map(ballot.sections.flatMap(section=>section.categories).map(category=>[category.id,category]));
 async function voteCounts(voterId){
  const userFilter=voterId?' AND voter_id=?':'';
  const params=voterId?[ballot.edition,voterId,ballot.edition,voterId]:[ballot.edition,ballot.edition];
  return db.all(`SELECT category,nominee,SUM(votes) AS votes FROM (
   SELECT category,nominee,COUNT(*) AS votes FROM award_votes WHERE edition=?${userFilter} GROUP BY category,nominee
   UNION ALL
   SELECT category,nominee,COALESCE(SUM(votes),0) AS votes FROM award_vote_entries WHERE edition=?${userFilter} GROUP BY category,nominee
  ) AS recorded_votes GROUP BY category,nominee`,...params);
 }
 async function quotaFor(voterId,timestamp=now()){
  const day=dayOf(timestamp),[start,end]=bounds(day);
  const [ledger,history,nominees,selections]=await Promise.all([
   db.one('SELECT count FROM award_vote_user_days WHERE edition=? AND day=? AND voter_id=?',ballot.edition,day,voterId),
   db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<?',ballot.edition,voterId,start,end),
   db.all('SELECT category,nominee,SUM(votes) AS votes FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<? GROUP BY category,nominee',ballot.edition,voterId,start,end),
   db.all('SELECT category,nominee FROM award_vote_choices WHERE edition=? AND voter_id=?',ballot.edition,voterId)
  ]);
  const spent=Math.max(0,Number(ledger?.count??history?.count??0));
  const spentByNominee={},selected={};
  for(const entry of nominees)(spentByNominee[entry.category]??={})[entry.nominee]=Number(entry.votes);
  for(const entry of selections)(selected[entry.category]??=[]).push(entry.nominee);
  return {day,dailyLimit,nomineeDailyLimit,categoryChoiceLimit,spent,remaining:Math.max(0,dailyLimit-spent),spentByNominee,selected};
 }
 async function tally(){
  const day=dayOf(now()),[start,end]=bounds(day);
  const [totals,daily]=await Promise.all([
   voteCounts(),
   db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND created>=? AND created<?',ballot.edition,start,end)
  ]);
  const counts=new Map(totals.map(row=>[row.category+'/'+row.nominee,Number(row.votes)]));
  return {today:day,dailyCount:Number(daily?.count||0),dailyLimit,sections:ballot.sections.map(section=>({
   name:section.name,categories:section.categories.map(category=>({
    id:category.id,name:category.name,nominees:category.nominees.map(nominee=>({
     name:nominee.name,details:nominee.details,votes:counts.get(category.id+'/'+nominee.id)||0
    }))
   }))
  }))};
 }
 async function vote(req,res,user){
  if(!user)fail(401,'Inicia sesión para votar.');
  if(req.method==='GET'){
   const [rows,quota]=await Promise.all([voteCounts(user.id),quotaFor(user.id)]),votes={};
   for(const row of rows)if(categories.has(row.category))(votes[row.category]??={})[row.nominee]=Number(row.votes);
   return json(res,{ballot,votes,quota});
  }
  if(req.method!=='POST')fail(405,'Actualiza la página para votar.');
  const input=await body(req),category=categories.get(input?.category);
  if(!category?.nominees.some(nominee=>nominee.id===input?.nominee))fail(400,'Elige un nominado de esta categoría.');
  if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.requestId))fail(400,'El identificador de voto es inválido.');
  const amount=Number(input.votes??1);
  if(!Number.isSafeInteger(amount)||amount<1||amount>nomineeDailyLimit)fail(400,'Elige entre 1 y 10.000 votos.');
  const timestamp=now(),day=dayOf(timestamp),[start,end]=bounds(day);
  const total=await db.transaction(async()=>{
   // The user-day row serializes competing requests from this account, including retries.
   const dayRow=await db.one('SELECT count FROM award_vote_user_days WHERE edition=? AND day=? AND voter_id=?',ballot.edition,day,user.id);
   if(!dayRow){
    const historical=await db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<?',ballot.edition,user.id,start,end);
    await db.run('INSERT INTO award_vote_user_days(edition,day,voter_id,count) VALUES(?,?,?,?) ON CONFLICT(edition,day,voter_id) DO NOTHING',ballot.edition,day,user.id,Number(historical?.count||0));
   }
   const inserted=await db.run('INSERT INTO award_vote_entries(edition,voter_id,request_id,category,nominee,votes,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(edition,voter_id,request_id) DO NOTHING',ballot.edition,user.id,input.requestId,category.id,input.nominee,amount,timestamp);
   if(inserted.changes){
    const spent=await db.run('UPDATE award_vote_user_days SET count=count+? WHERE edition=? AND day=? AND voter_id=? AND count+?<=?',amount,ballot.edition,day,user.id,amount,dailyLimit);
    if(!spent.changes)fail(429,'Ya no tienes más votos disponibles por hoy.');
    const nomineeToday=await db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND voter_id=? AND category=? AND nominee=? AND created>=? AND created<?',ballot.edition,user.id,category.id,input.nominee,start,end);
    if(Number(nomineeToday.count)>nomineeDailyLimit)fail(409,'Solo puedes dar un máximo de 10.000 votos al día al mismo nominado.');
    const selected=await db.all('SELECT nominee FROM award_vote_choices WHERE edition=? AND voter_id=? AND category=?',ballot.edition,user.id,category.id);
    if(!selected.some(row=>row.nominee===input.nominee)){
     if(selected.length>=categoryChoiceLimit)fail(409,'Solo puedes votar por un máximo de 2 nominados en la misma categoría.');
     await db.run('INSERT INTO award_vote_choices(edition,voter_id,category,nominee,created) VALUES(?,?,?,?,?) ON CONFLICT(edition,voter_id,category,nominee) DO NOTHING',ballot.edition,user.id,category.id,input.nominee,timestamp);
    }
   }else{
    const existing=await db.one('SELECT category,nominee,votes FROM award_vote_entries WHERE edition=? AND voter_id=? AND request_id=?',ballot.edition,user.id,input.requestId);
    if(!existing||existing.category!==category.id||existing.nominee!==input.nominee||Number(existing.votes)!==amount)fail(409,'Este identificador ya se usó para otro voto.');
   }
   const personal=await db.one('SELECT (SELECT COUNT(*) FROM award_votes WHERE edition=? AND voter_id=? AND category=? AND nominee=?)+(SELECT COALESCE(SUM(votes),0) FROM award_vote_entries WHERE edition=? AND voter_id=? AND category=? AND nominee=?) AS count',ballot.edition,user.id,category.id,input.nominee,ballot.edition,user.id,category.id,input.nominee);
   return Number(personal.count);
  });
  return json(res,{category:category.id,nominee:input.nominee,votes:total,added:amount,quota:await quotaFor(user.id,timestamp)});
 }
 async function results(req,res,user){
  if(!user)fail(401,'Inicia sesión.');
  if(!isStaff(user.id))fail(403,'Solo el Staff puede ver los resultados.');
  if(req.method!=='GET')fail(405,'Método no permitido.');
  return json(res,await tally());
 }
 return {vote,results};
}
