import {randomInt,randomUUID} from 'node:crypto';
import {isStaff} from './account-roles.mjs';
import {CHARACTERS} from './public/simulator/ice-breaker/characters.mjs';
import {QUESTION_BANK} from './public/simulator/x-million/questions.mjs';

const PRIZES=[100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000];
const PHASES=[{name:'Ronda clasificatoria',questions:5,keep:4},{name:'Semifinal',questions:3,keep:2},{name:'Gran final',questions:3,keep:2}];
const CHARACTER_LIST=CHARACTERS.map(c=>({id:c.id,name:c.name,image:'/simulator/ice-breaker/'+c.image.replace(/^\.\//,''),portrait:c.portrait||'/simulator/ice-breaker/'+c.image.replace(/^\.\//,'')}));
const validCharacters=new Set(CHARACTER_LIST.map(c=>c.id));
const nowIso=(now)=>new Date(now).toISOString();
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('es');
const shuffle=items=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
const sample=(items,count)=>shuffle(items).slice(0,count);
const getDifficulty=index=>index<3?'easy':index<8?'medium':'hard';
const publicQuestion=(q,reveal=false)=>({id:q.id,question:q.question,choices:q.choices,category:q.category,difficulty:q.difficulty,...(reveal?{correctIndex:q.correctIndex}:{} )});
const safeUser=user=>user?{id:user.id,name:user.name}:null;

export function createXMillion({db,json,fail,body,checkRate,access,notify=()=>{},serialize=fn=>fn(),now=Date.now}){
 async function questions(){
  const custom=(await db.all('SELECT id,question,choices,correct_index,category,difficulty,created FROM x_million_questions ORDER BY created,id')).map(row=>({id:row.id,question:row.question,choices:JSON.parse(row.choices),correctIndex:Number(row.correct_index),category:row.category,difficulty:row.difficulty,created:Number(row.created),custom:true}));
  return [...QUESTION_BANK,...custom];
 }
 const character=id=>CHARACTER_LIST.find(item=>item.id===id);
 function assertCharacter(id){if(!validCharacters.has(id))fail(400,'Elige uno de los personajes de Ice Breaker.');return id;}
 async function openGame(user){if(!(await access('x-million',user)).canPlay)fail(403,'THE X MILLION sigue cerrado al público.');}
 function validateQuestion(input){
  const question=typeof input.question==='string'?input.question.trim().replace(/\s+/g,' '):'';
  const choices=Array.isArray(input.choices)?input.choices.map(value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):''):[];
  const category=typeof input.category==='string'?input.category.trim().replace(/\s+/g,' ').slice(0,36):'';
  const difficulty=input.difficulty;
  const correctIndex=input.correctIndex;
  if(question.length<12||question.length>240)fail(400,'La pregunta debe tener entre 12 y 240 caracteres.');
  if(choices.length!==4||choices.some(choice=>choice.length<1||choice.length>90)||new Set(choices.map(normalize)).size!==4)fail(400,'Escribe cuatro respuestas distintas, de hasta 90 caracteres.');
  if(!Number.isInteger(correctIndex)||correctIndex<0||correctIndex>3)fail(400,'Marca cuál de las cuatro respuestas es correcta.');
  if(!category)fail(400,'Escribe una categoría para la pregunta.');
  if(!['easy','medium','hard'].includes(difficulty))fail(400,'Elige una dificultad válida.');
  return {question,choices,correctIndex,category,difficulty};
 }
 async function saveRoom(room){room.updated=now();await db.run('UPDATE x_million_rooms SET status=?,state=?,updated=? WHERE id=?',room.status,JSON.stringify(room),room.updated,room.id);}
 async function readRoom(id){const row=await db.one('SELECT * FROM x_million_rooms WHERE id=?',id);if(!row)fail(404,'No encontramos esa sala. Revisa el código o crea una nueva.');return JSON.parse(row.state);}
 const phase=room=>PHASES[room.phaseIndex]||PHASES[0];
 const activePlayers=room=>room.players.filter(player=>player.alive);
 function startQuestion(room,stamp){room.status='question';room.deadline=stamp+20000;room.answers={};room.currentResults=null;room.correctIndex=null;room.revealUntil=0;room.updated=stamp;}
 function rank(players){return [...players].sort((a,b)=>b.score-a.score||b.correctCount-a.correctCount||a.responseMs-b.responseMs||a.name.localeCompare(b.name,'es'));}
 function resolveQuestion(room,stamp){
  if(room.status!=='question')return;
  const question=room.questions[room.questionCursor],results=[];
  for(const player of activePlayers(room)){
   const answer=room.answers[player.userId],correct=!!answer&&answer.choiceIndex===question.correctIndex;
   const responseMs=answer?Math.max(0,answer.answeredAt-(room.deadline-20000)):20000;
   const points=correct?100+Math.round(400*Math.max(0,20000-responseMs)/20000):0;
   if(correct){player.score+=points;player.correctCount++;player.responseMs+=responseMs;}
   player.lastChoice=answer?.choiceIndex??null;player.lastCorrect=correct;player.lastPoints=points;
   results.push({userId:player.userId,name:player.name,choiceIndex:answer?.choiceIndex??null,correct,points,score:player.score});
  }
  room.currentResults=results;room.correctIndex=question.correctIndex;room.status='reveal';room.revealUntil=stamp+3500;
 }
 function beginPhase(room,phaseIndex,stamp){room.phaseIndex=phaseIndex;room.phaseName=PHASES[phaseIndex].name;room.phaseQuestionIndex=0;room.questionCursor=room.phaseStartIndex;startQuestion(room,stamp);}
 function afterReveal(room,stamp){
  if(room.status!=='reveal'||stamp<room.revealUntil)return;
  const config=phase(room),lastQuestion=room.phaseQuestionIndex+1>=config.questions;
  if(!lastQuestion){room.phaseQuestionIndex++;room.questionCursor++;startQuestion(room,stamp);return;}
  if(room.phaseIndex===PHASES.length-1){
   const winner=rank(activePlayers(room))[0];room.winnerId=winner?.userId||null;room.status='finished';room.finishedAt=stamp;room.deadline=0;return;
  }
  const ranked=rank(activePlayers(room)),kept=ranked.slice(0,Math.min(config.keep,ranked.length));
  const keepIds=new Set(kept.map(player=>player.userId));room.eliminatedNames=ranked.filter(player=>!keepIds.has(player.userId)).map(player=>player.name);
  for(const player of room.players)if(player.alive&&!keepIds.has(player.userId))player.alive=false;
  room.phaseIndex++;room.phaseName=PHASES[room.phaseIndex].name;room.phaseStartIndex=room.questionCursor+1;room.phaseQuestionIndex=0;room.status='break';room.breakUntil=stamp+5000;room.deadline=0;
 }
 function advanceRoom(room,stamp){
  if(room.status==='question'&&(stamp>=room.deadline||activePlayers(room).every(player=>room.answers[player.userId])))resolveQuestion(room,stamp);
  else if(room.status==='reveal')afterReveal(room,stamp);
  else if(room.status==='break'&&stamp>=room.breakUntil)startQuestion(room,stamp);
 }
 function publicRoom(room,user,stamp){
  const inRoom=room.players.find(player=>player.userId===user.id);if(!inRoom)fail(403,'Esta sala es privada; únete con su código primero.');
  const showing=room.status==='question'||room.status==='reveal';
  const liveQuestion=showing?room.questions[room.questionCursor]:null;
  return {
   id:room.id,code:room.code,mode:room.mode,status:room.status,hostId:room.hostId,phase:room.phaseName||'Sala de espera',phaseIndex:room.phaseIndex,
   phaseQuestion:room.phaseQuestionIndex+1,phaseQuestionCount:room.phaseIndex>=0?PHASES[room.phaseIndex]?.questions||0:0,
   questionNumber:room.questionCursor+1,questionTotal:room.questions?.length||11,deadline:room.deadline||null,serverTime:stamp,
   question:liveQuestion?{...publicQuestion(liveQuestion,room.status==='reveal'),...(room.status==='reveal'?{results:room.currentResults||[],yourChoice:room.answers[user.id]?.choiceIndex??null}:{} )}:null,
   answered:!!room.answers?.[user.id],yourChoice:room.status==='reveal'?room.answers?.[user.id]?.choiceIndex??null:null,
   players:room.players.map(player=>({userId:player.userId,name:player.name,characterId:player.characterId,score:player.score,correctCount:player.correctCount,alive:player.alive,online:stamp-player.lastSeen<15000,lastChoice:room.status==='reveal'?player.lastChoice??null:null,lastCorrect:room.status==='reveal'?!!player.lastCorrect:null,lastPoints:room.status==='reveal'?player.lastPoints||0:null})),
   eliminatedNames:room.eliminatedNames||[],winnerId:room.winnerId||null,winner:room.players.find(player=>player.userId===room.winnerId)?.name||null,
   nextRoom:room.nextRoom||null,breakUntil:room.status==='break'?room.breakUntil:null,viewerIsHost:room.hostId===user.id,
  };
 }
 function soloView(room){
  const revealed=room.hasAnswer&&['reveal','lost','won','retired'].includes(room.status),q=room.questions[room.questionIndex];
  return {id:room.id,status:room.status,characterId:room.characterId,questionIndex:room.questionIndex,questionNumber:room.questionIndex+1,questionTotal:15,prizes:PRIZES,banked:room.banked,finalPrize:room.finalPrize??null,correctAnswer:revealed?q.correctIndex:null,currentQuestion:q?publicQuestion(q,revealed):null,lifelines:room.lifelines,removedChoices:room.removedChoices||[],audience:room.audience||null,serverTime:now(),won:room.status==='won'};
 }
 async function buildQuestionRun(custom){
  const pool=[...QUESTION_BANK,...custom],chosen=[];
  for(let i=0;i<15;i++){const available=pool.filter(q=>q.difficulty===getDifficulty(i)&&!chosen.some(item=>item.id===q.id));if(!available.length)fail(503,'No hay suficientes preguntas para iniciar.');chosen.push(sample(available,1)[0]);}
  return chosen;
 }
 async function checkAdmin(user){if(!user)fail(401,'Inicia sesión con una cuenta de Staff.');if(!isStaff(user.id))fail(403,'Solo el Staff puede gestionar preguntas.');}
 async function handle(req,res,url,user){
  const p=url.pathname;if(!p.startsWith('/api/x-million'))return false;
  res.setHeader?.('Cache-Control','private, no-store');res.setHeader?.('Vary','Cookie');await openGame(user);
  if(p==='/api/x-million/bootstrap'&&req.method==='GET'){
   const customCount=Number((await db.one('SELECT COUNT(*) AS n FROM x_million_questions')).n);
   json(res,{user:safeUser(user),staff:isStaff(user?.id),characters:CHARACTER_LIST,questionCount:QUESTION_BANK.length+customCount});return true;
  }
  if(p==='/api/x-million/admin/questions'){
   await checkAdmin(user);
   if(req.method==='GET'){json(res,{questions:await questions()});return true;}
   if(req.method==='POST'){
    checkRate(req,'x-million-question',40,3600000);const item=validateQuestion(await body(req));
    if((await questions()).some(q=>normalize(q.question)===normalize(item.question)))fail(409,'Ya existe una pregunta igual en el banco.');
    const id=randomUUID(),stamp=now();await db.run('INSERT INTO x_million_questions(id,created_by,question,choices,correct_index,category,difficulty,created) VALUES(?,?,?,?,?,?,?,?)',id,user.id,item.question,JSON.stringify(item.choices),item.correctIndex,item.category,item.difficulty,stamp);
    json(res,{question:{...item,id,created:stamp,custom:true}},201);return true;
   }
  }
  const deleteQuestion=p.match(/^\/api\/x-million\/admin\/questions\/([a-f0-9-]{36})$/);
  if(deleteQuestion&&req.method==='DELETE'){await checkAdmin(user);const removed=await db.run('DELETE FROM x_million_questions WHERE id=?',deleteQuestion[1]);if(!removed.changes)fail(404,'La pregunta ya no existe.');json(res,{ok:true});return true;}
  if(p==='/api/x-million/solo/start'&&req.method==='POST'){
   checkRate(req,'x-million-solo',40,3600000);const input=await body(req),characterId=assertCharacter(input.characterId),pool=await questions();
   const id=randomUUID(),sequence=await buildQuestionRun(pool),stamp=now();
   const room={id,code:'SOLO-'+id,mode:'solo',status:'intro',hostId:user?.id||null,characterId,questions:sequence,questionIndex:0,banked:0,finalPrize:null,lifelines:{fifty:true,audience:true,swap:true},removedChoices:[],audience:null,hasAnswer:false,created:stamp,updated:stamp};
   await db.run('INSERT INTO x_million_rooms(id,code,mode,status,host_id,state,created,updated) VALUES(?,?,?, ?,?,?,?,?)',id,room.code,'solo',room.status,room.hostId,JSON.stringify(room),stamp,stamp);
   json(res,{run:soloView(room)},201);return true;
  }
  const solo=p.match(/^\/api\/x-million\/solo\/([a-f0-9-]{36})(?:\/(begin|answer|next|retire|lifeline))?$/);
  if(solo){
   const room=await readRoom(solo[1]);if(room.mode!=='solo')fail(404,'Esta partida no existe.');
   const action=solo[2];
   if(!action&&req.method==='GET'){json(res,{run:soloView(room)});return true;}
   if(req.method!=='POST')fail(405,'Acción no permitida.');
   checkRate(req,'x-million-solo-play',180,60000);
   if(action==='begin'){
    if(room.status!=='intro')fail(409,'Esta partida ya empezó.');room.status='question';room.startedAt=now();await saveRoom(room);json(res,{run:soloView(room)});return true;
   }
   if(action==='answer'){
    if(room.status!=='question')fail(409,'No hay una pregunta esperando respuesta.');const input=await body(req);if(!Number.isInteger(input.choiceIndex)||input.choiceIndex<0||input.choiceIndex>3)fail(400,'Elige una respuesta válida.');
    const q=room.questions[room.questionIndex];room.answerChoice=input.choiceIndex;room.answerCorrect=input.choiceIndex===q.correctIndex;room.hasAnswer=true;
    if(room.answerCorrect){if([4,9].includes(room.questionIndex))room.banked=PRIZES[room.questionIndex];room.status=room.questionIndex===14?'won':'reveal';room.finalPrize=room.questionIndex===14?PRIZES[14]:null;}
    else{room.status='lost';room.finalPrize=room.banked;}
    room.audience=null;room.removedChoices=[];await saveRoom(room);json(res,{run:soloView(room),answerChoice:room.answerChoice,answerCorrect:room.answerCorrect});return true;
   }
   if(action==='next'){
    if(room.status!=='reveal')fail(409,'Responde la pregunta actual antes de continuar.');room.questionIndex++;room.status='question';room.answerChoice=null;room.answerCorrect=null;room.hasAnswer=false;room.removedChoices=[];room.audience=null;await saveRoom(room);json(res,{run:soloView(room)});return true;
   }
   if(action==='retire'){
    if(room.status!=='question'&&room.status!=='reveal')fail(409,'No puedes retirarte ahora.');const answeredCorrectly=room.status==='reveal'&&room.answerCorrect===true;room.status='retired';room.hasAnswer=answeredCorrectly;room.finalPrize=answeredCorrectly?PRIZES[room.questionIndex]:room.questionIndex?PRIZES[room.questionIndex-1]:0;await saveRoom(room);json(res,{run:soloView(room)});return true;
   }
   if(action==='lifeline'){
    if(room.status!=='question')fail(409,'Usa los comodines antes de responder.');const input=await body(req),kind=input.kind;if(!['fifty','audience','swap'].includes(kind)||!room.lifelines[kind])fail(409,'Ese comodín ya se usó o no existe.');
    const q=room.questions[room.questionIndex];room.lifelines[kind]=false;
    if(kind==='fifty'){const wrong=shuffle([0,1,2,3].filter(index=>index!==q.correctIndex));room.removedChoices=wrong.slice(0,2);}
    if(kind==='audience'){
     const correctPct=randomInt(54,83),wrong=[0,1,2,3].filter(index=>index!==q.correctIndex),parts=[randomInt(0,101-correctPct),randomInt(0,101-correctPct)];let first=Math.min(parts[0],100-correctPct),second=Math.min(parts[1],100-correctPct-first),last=100-correctPct-first-second;
     room.audience=[0,1,2,3].map(()=>0);room.audience[q.correctIndex]=correctPct;room.audience[wrong[0]]=first;room.audience[wrong[1]]=second;room.audience[wrong[2]]=last;
    }
    if(kind==='swap'){
     const used=new Set(room.questions.map(item=>item.id));const alternatives=(await questions()).filter(item=>item.difficulty===q.difficulty&&!used.has(item.id));if(!alternatives.length){room.lifelines[kind]=true;fail(409,'No quedan preguntas de reemplazo con esta dificultad.');}
     room.questions[room.questionIndex]=sample(alternatives,1)[0];room.removedChoices=[];room.audience=null;
    }
    await saveRoom(room);json(res,{run:soloView(room)});return true;
   }
   fail(404,'No encontramos esa acción.');
  }
  if(p==='/api/x-million/rooms'&&req.method==='POST'){
   if(!user)fail(401,'Inicia sesión en The Xpedition para crear una sala multijugador.');checkRate(req,'x-million-room',20,3600000);const input=await body(req),characterId=assertCharacter(input.characterId),stamp=now(),id=randomUUID();let code='';
   for(let attempt=0;attempt<8;attempt++){const candidate=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');if(!await db.one('SELECT 1 FROM x_million_rooms WHERE code=?',candidate)){code=candidate;break;}}
   if(!code)fail(503,'No pudimos generar un código de sala. Intenta de nuevo.');
   const room={id,code,mode:'multi',status:'waiting',hostId:user.id,hostName:user.name,phaseName:'Sala de espera',phaseIndex:-1,phaseQuestionIndex:0,phaseStartIndex:0,questionCursor:0,questions:[],players:[{userId:user.id,name:user.name,characterId,score:0,correctCount:0,responseMs:0,alive:true,lastSeen:stamp}],answers:{},eliminatedNames:[],created:stamp,updated:stamp};
   await db.run('INSERT INTO x_million_rooms(id,code,mode,status,host_id,state,created,updated) VALUES(?,?,?,?,?,?,?,?)',id,code,'multi',room.status,user.id,JSON.stringify(room),stamp,stamp);json(res,{room:publicRoom(room,user,stamp)},201);return true;
  }
  if(p==='/api/x-million/join'&&req.method==='POST'){
   if(!user)fail(401,'Inicia sesión en The Xpedition para unirte a una sala.');checkRate(req,'x-million-join',120,60000);const input=await body(req),code=String(input.code||'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,24),row=await db.one('SELECT id FROM x_million_rooms WHERE code=?',code);
   if(!row)fail(404,'Ese código no corresponde a una sala abierta.');const room=await readRoom(row.id);if(room.mode!=='multi')fail(404,'Esa sala no está disponible.');if(room.status!=='waiting')fail(409,'La partida ya empezó. Pide un código para la revancha.');
   let player=room.players.find(item=>item.userId===user.id);if(!player&&room.players.length>=8)fail(409,'La sala ya tiene ocho jugadores.');const characterId=assertCharacter(input.characterId);
   if(room.players.some(item=>item.userId!==user.id&&item.characterId===characterId))fail(409,'Ese personaje ya está elegido en la sala.');
   if(player){player.characterId=characterId;player.lastSeen=now();player.name=user.name;}else room.players.push({userId:user.id,name:user.name,characterId,score:0,correctCount:0,responseMs:0,alive:true,lastSeen:now()});
   await saveRoom(room);notify(room.players.map(item=>item.userId),'x-million-room',{id:room.id});json(res,{room:publicRoom(room,user,now())});return true;
  }
  const multiplayer=p.match(/^\/api\/x-million\/rooms\/([a-f0-9-]{36})(?:\/(character|start|answer|leave|rematch))?$/);
  if(multiplayer){
   if(!user)fail(401,'Inicia sesión en The Xpedition para jugar en línea.');const room=await readRoom(multiplayer[1]),action=multiplayer[2],player=room.players.find(item=>item.userId===user.id);if(!player)fail(403,'Únete a la sala con su código antes de entrar.');
   if(!action&&req.method==='GET'){
    checkRate(req,'x-million-poll',120,60000);const before=JSON.stringify(room),stamp=now();if(stamp-Number(player.lastSeen||0)>5000)player.lastSeen=stamp;advanceRoom(room,stamp);if(JSON.stringify(room)!==before)await saveRoom(room);json(res,{room:publicRoom(room,user,stamp)});return true;
   }
   if(req.method!=='POST')fail(405,'Acción no permitida.');checkRate(req,'x-million-action',240,60000);const input=await body(req),stamp=now();advanceRoom(room,stamp);
   if(action==='character'){
    if(room.status!=='waiting')fail(409,'Ya empezó el concurso.');const characterId=assertCharacter(input.characterId);if(room.players.some(item=>item.userId!==user.id&&item.characterId===characterId))fail(409,'Ese personaje ya está elegido en la sala.');player.characterId=characterId;player.lastSeen=stamp;await saveRoom(room);
   }else if(action==='start'){
    if(room.hostId!==user.id)fail(403,'Solo quien creó la sala puede empezar.');if(room.status!=='waiting')fail(409,'La partida ya empezó.');if(room.players.length<2)fail(409,'Invita por lo menos a otra persona para empezar.');if(room.players.length>8)fail(409,'Una sala admite hasta ocho jugadores.');
    const pool=await questions(),required=[...Array(3).fill('easy'),...Array(4).fill('medium'),...Array(4).fill('hard')],chosen=[];
    for(const difficulty of required){const choices=pool.filter(q=>q.difficulty===difficulty&&!chosen.some(item=>item.id===q.id));if(!choices.length)fail(503,'No hay preguntas suficientes para iniciar esta partida.');chosen.push(sample(choices,1)[0]);}
    room.questions=chosen;room.phaseStartIndex=0;room.questionCursor=0;room.phaseIndex=0;room.phaseName=PHASES[0].name;room.phaseQuestionIndex=0;room.eliminatedNames=[];room.winnerId=null;for(const p of room.players){p.score=0;p.correctCount=0;p.responseMs=0;p.alive=true;p.lastChoice=null;p.lastCorrect=null;p.lastPoints=0;}startQuestion(room,stamp);await saveRoom(room);
   }else if(action==='answer'){
    if(room.status!=='question')fail(409,'No hay una pregunta esperando respuesta.');if(!player.alive)fail(403,'Ya quedaste fuera de esta ronda.');if(stamp>=room.deadline){advanceRoom(room,stamp);await saveRoom(room);fail(409,'Se acabó el tiempo para responder.');}if(room.answers[user.id])fail(409,'Tu respuesta ya quedó registrada.');
    if(!Number.isInteger(input.choiceIndex)||input.choiceIndex<0||input.choiceIndex>3)fail(400,'Elige una respuesta válida.');room.answers[user.id]={choiceIndex:input.choiceIndex,answeredAt:stamp};player.lastSeen=stamp;if(activePlayers(room).every(p=>room.answers[p.userId]))resolveQuestion(room,stamp);await saveRoom(room);
   }else if(action==='leave'){
    player.lastSeen=0;player.online=false;if(room.status==='waiting'&&room.hostId===user.id){const next=room.players.find(item=>item.userId!==user.id&&item.lastSeen>0);if(next)room.hostId=next.userId;}await saveRoom(room);notify(room.players.map(item=>item.userId),'x-million-room',{id:room.id});json(res,{ok:true});return true;
   }else if(action==='rematch'){
    if(room.hostId!==user.id)fail(403,'Solo quien creó la sala puede iniciar la revancha.');if(room.status!=='finished')fail(409,'La revancha estará disponible al terminar la partida.');
    const present=room.players.filter(item=>stamp-Number(item.lastSeen||0)<30000||item.userId===user.id).map(item=>({...item,score:0,correctCount:0,responseMs:0,alive:true,lastSeen:item.userId===user.id?stamp:item.lastSeen,lastChoice:null,lastCorrect:null,lastPoints:0}));if(present.length<2)fail(409,'Necesitas que se reconecten al menos dos jugadores para la revancha.');room.players=present;room.status='waiting';room.phaseName='Sala de espera';room.phaseIndex=-1;room.phaseQuestionIndex=0;room.questions=[];room.answers={};room.questionCursor=0;room.phaseStartIndex=0;room.eliminatedNames=[];room.winnerId=null;room.deadline=0;room.nextRoom=null;room.finishedAt=0;await saveRoom(room);
   }else fail(404,'No encontramos esa acción.');
   notify(room.players.map(item=>item.userId),'x-million-room',{id:room.id});json(res,{room:publicRoom(room,user,stamp)});return true;
  }
  fail(404,'No encontramos esta función de THE X MILLION.');
 }
 return {handle};
}
