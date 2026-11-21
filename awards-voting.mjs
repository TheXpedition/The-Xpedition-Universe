import {isStaff} from './account-roles.mjs';

// The limits are independent for each signed-in account and reset at midnight in Colombia.
const standardDailyLimit=100000;
const standardNomineeLimit=10000;
const staffDailyLimit=1000000;
const staffNomineeLimit=200000;
const categoryChoiceLimit=2;
const limitsFor=voterId=>isStaff(voterId)
 ?{dailyLimit:staffDailyLimit,nomineeDailyLimit:staffNomineeLimit,categoryChoiceLimit:null}
 :{dailyLimit:standardDailyLimit,nomineeDailyLimit:standardNomineeLimit,categoryChoiceLimit};
// Shared nominations count toward every person's daily Staff allowance.
// Staff limits apply across categories; regular accounts retain per-category limits.
const groupedNominees={
  "lucas-mendez-y-elias": [
    "Lucas Mendez",
    "Elias"
  ],
  "alexandro-ari-salgado-the-traitor-2": [
    "Alexandro Martin",
    "Ari Salgado"
  ],
  "sal-lua-peggy-showdown-2": [
    "Sal Lua",
    "Peggy Marianne"
  ],
  "carlos-harrington-y-felix": [
    "Carlos Harrington",
    "Felix Gagenze"
  ],
  "bruno-macri-y-daelly-bonbom": [
    "Bruno Macri",
    "Daelly BonBom"
  ],
  "alice-bayron-carlos-harrington-eduard-luciano-showdown-2": [
    "Alice Torrico",
    "Bayron",
    "Carlos Harrington",
    "Eduard Salerno",
    "Luciano Funes"
  ],
  "kim-camila-vs-eduard": [
    "Kim Camila",
    "Eduard Salerno"
  ],
  "alexandro-vs-luciano": [
    "Alexandro Martin",
    "Luciano Funes"
  ],
  "esteban-vs-renzo": [
    "Esteban Cooper",
    "Renzo Rodriguez"
  ],
  "lucas-mendez-vs-bayron": [
    "Lucas Mendez",
    "Bayron"
  ],
  "sal-lua-peggy-vs-carlos-harrington": [
    "Sal Lua",
    "Peggy Marianne",
    "Carlos Harrington"
  ],
  "guillermo-vs-roger": [
    "Guillermo Coronado",
    "Roger Lida"
  ]
};
const canonicalPerson=name=>{
 const clean=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 return ({
  'alexandro':'alexandro martin',
  'andromeda':'andromeda sc',
  'alice':'alice torrico',
  'luciano':'luciano funes',
  'eduard':'eduard salerno',
  'renzo':'renzo rodriguez',
  'esteban':'esteban cooper',
  'peggy':'peggy marianne',
  'isabel':'isabel vilches',
  'catalina':'catalina diaz',
  'vita':'vita molotov',
  'guillermo':'guillermo coronado',
  'roger':'roger lida',
  'felix':'felix gagenze',
  'daelly':'daelly bonbom'
 })[clean]||clean;
};
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
 const personKeys=new Map();
 for(const category of categories.values())for(const nominee of category.nominees){
  const recipients=groupedNominees[nominee.id]||(nominee.people?.length?nominee.people.map(person=>typeof person==='string'?person:person.name):[nominee.name]);
  personKeys.set(category.id+'/'+nominee.id,[...new Set(recipients.map(canonicalPerson))]);
 }
 const usageByPerson=rows=>{
  const used=new Map();
  for(const row of rows){
   const recipients=personKeys.get(row.category+'/'+row.nominee)||[];
   for(const key of recipients)used.set(key,(used.get(key)||0)+Number(row.votes));
  }
  return used;
 };
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
  const {dailyLimit,nomineeDailyLimit,categoryChoiceLimit}=limitsFor(voterId);
  const day=dayOf(timestamp),[start,end]=bounds(day);
  const [ledger,history,nominees,selections]=await Promise.all([
   db.one('SELECT count FROM award_vote_user_days WHERE edition=? AND day=? AND voter_id=?',ballot.edition,day,voterId),
   db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<?',ballot.edition,voterId,start,end),
   db.all('SELECT category,nominee,SUM(votes) AS votes FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<? GROUP BY category,nominee',ballot.edition,voterId,start,end),
   db.all('SELECT category,nominee FROM award_vote_choices WHERE edition=? AND voter_id=?',ballot.edition,voterId)
  ]);
  const spent=Math.max(0,Number(ledger?.count??history?.count??0));
  const spentByNominee={},selected={};
  if(isStaff(voterId)){
   const usage=usageByPerson(nominees);
   for(const category of categories.values())for(const nominee of category.nominees){
    const keys=personKeys.get(category.id+'/'+nominee.id)||[];
    const used=Math.max(0,...keys.map(key=>usage.get(key)||0));
    if(used)(spentByNominee[category.id]??={})[nominee.id]=used;
   }
  }else{
   for(const entry of nominees)(spentByNominee[entry.category]??={})[entry.nominee]=Number(entry.votes);
  }
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
  return {today:day,dailyCount:Number(daily?.count||0),dailyLimit:standardDailyLimit,sections:ballot.sections.map(section=>({
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
  const {dailyLimit,nomineeDailyLimit,categoryChoiceLimit}=limitsFor(user.id);
  const input=await body(req),category=categories.get(input?.category);
  if(!category?.nominees.some(nominee=>nominee.id===input?.nominee))fail(400,'Elige un nominado de esta categoría.');
  if(typeof input.requestId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.requestId))fail(400,'El identificador de voto es inválido.');
  const amount=Number(input.votes??1);
  if(!Number.isSafeInteger(amount)||amount<1||amount>nomineeDailyLimit)fail(400,`Elige entre 1 y ${nomineeDailyLimit.toLocaleString('es-CO')} votos.`);
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
    if(isStaff(user.id)){
     const entriesToday=await db.all('SELECT category,nominee,SUM(votes) AS votes FROM award_vote_entries WHERE edition=? AND voter_id=? AND created>=? AND created<? GROUP BY category,nominee',ballot.edition,user.id,start,end);
     const used=usageByPerson(entriesToday);
     const keys=personKeys.get(category.id+'/'+input.nominee)||[];
     if(keys.some(key=>(used.get(key)||0)>nomineeDailyLimit))fail(409,'Como Staff puedes dar hasta 200.000 votos diarios a una misma persona, sumando todas las categorías.');
    }else{
     const nomineeToday=await db.one('SELECT COALESCE(SUM(votes),0) AS count FROM award_vote_entries WHERE edition=? AND voter_id=? AND category=? AND nominee=? AND created>=? AND created<?',ballot.edition,user.id,category.id,input.nominee,start,end);
    if(Number(nomineeToday.count)>nomineeDailyLimit)fail(409,'Solo puedes dar un máximo de 10.000 votos al día al mismo nominado.');
    }
    const selected=await db.all('SELECT nominee FROM award_vote_choices WHERE edition=? AND voter_id=? AND category=?',ballot.edition,user.id,category.id);
    if(!selected.some(row=>row.nominee===input.nominee)){
     if(categoryChoiceLimit!==null&&selected.length>=categoryChoiceLimit)fail(409,'Solo puedes votar por un máximo de 2 nominados en la misma categoría.');
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
