import {isStaff} from './account-roles.mjs';

const dailyLimit=10000;
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});

export function createAwardsVoting({db,json,fail,body,ballot,now=Date.now}){
 const categories=new Map(ballot.sections.flatMap(section=>section.categories).map(category=>[category.id,category]));
 const dayOf=timestamp=>dayFormat.format(timestamp);
 async function tally(){
  const today=dayOf(now());
  const [totals,daily]=await Promise.all([
   db.all('SELECT category,nominee,COUNT(*) AS votes FROM award_votes WHERE edition=? GROUP BY category,nominee',ballot.edition),
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
  if(req.method==='GET'){
   const rows=await db.all('SELECT category,nominee FROM award_votes WHERE edition=? AND voter_id=?',ballot.edition,user.id);
   return json(res,{ballot,votes:Object.fromEntries(rows.map(row=>[row.category,row.nominee]))});
  }
  if(req.method!=='PUT')fail(405,'Método no permitido.');
  const input=await body(req),category=categories.get(input?.category);
  if(!category?.nominees.some(nominee=>nominee.id===input?.nominee))fail(400,'Elige un nominado de esta categoría.');
  const timestamp=now(),today=dayOf(timestamp);
  await db.transaction(async()=>{
   const recorded=await db.run('INSERT INTO award_votes AS current_vote(edition,category,voter_id,nominee,updated) VALUES(?,?,?,?,?) ON CONFLICT(edition,voter_id,category) DO UPDATE SET nominee=excluded.nominee,updated=excluded.updated WHERE current_vote.nominee<>excluded.nominee',ballot.edition,category.id,user.id,input.nominee,timestamp);
   if(!recorded.changes)return;
   const counted=await db.run('INSERT INTO award_vote_days AS current_day(edition,day,count) VALUES(?,?,1) ON CONFLICT(edition,day) DO UPDATE SET count=current_day.count+1 WHERE current_day.count<?',ballot.edition,today,dailyLimit);
   if(!counted.changes)fail(429,'Se alcanzó el límite de 10.000 votos de hoy. Intenta después de la medianoche, hora de Colombia.');
  });
  return json(res,{category:category.id,nominee:input.nominee});
 }
 async function results(req,res,user){
  if(!user)fail(401,'Inicia sesión.');
  if(!isStaff(user.id))fail(403,'Solo el Staff puede ver los resultados.');
  if(req.method!=='GET')fail(405,'Método no permitido.');
  return json(res,await tally());
 }
 return {vote,results};
}
