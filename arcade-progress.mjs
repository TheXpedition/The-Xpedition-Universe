import {randomUUID,createHash} from 'node:crypto';
import {dayKey} from './progression.mjs';
import {newRun,stepRun,jumpTo,walkTo} from './public/simulator/ice-breaker/engine.mjs';
import {LEVELS,DIFFICULTIES,CAMPAIGN_VERSION} from './public/simulator/ice-breaker/levels.mjs';
export function createArcadeProgress({db,body,json,fail,checkRate,access,progression,now=Date.now}){
 async function completed(uid){return uid?(await db.all("SELECT DISTINCT level FROM arcade_runs WHERE user_id=? AND game_id='ice-breaker' AND status='won'",uid)).map(r=>Number(r.level)):[];}
 async function receipt(row){
  let reward=null;
  if(row.status==='won'){
   const config=LEVELS.find(l=>l.id===Number(row.level));
   const added=await progression.grant(row.user_id,'arcade:ice-breaker:'+dayKey(Number(row.updated))+':'+config.id,{tickets:config.tickets,label:'Ice Breaker · '+config.name+' completado'});
   reward={tickets:added?config.tickets:0,alreadyClaimed:!added,level:config.id};
  }
  return {id:row.id,revision:Number(row.revision),status:row.status,reward,wallet:await progression.wallet(row.user_id),completed:await completed(row.user_id)};
 }
 async function handle(req,res,url,user){
  const route=url.pathname,progress=route==='/api/arcade/ice-breaker/progress',start=route==='/api/arcade/ice-breaker/runs',match=route.match(/^\/api\/arcade\/ice-breaker\/runs\/([a-f0-9-]{36})$/);
  if(!progress&&!start&&!match)return false;
  res.setHeader?.('Cache-Control','private, no-store');res.setHeader?.('Vary','Cookie');
  if(!(await access('ice-breaker',user)).canPlay)fail(403,'Este juego sigue cerrado al público.');
  if(progress&&req.method==='GET'){json(res,{userId:user?.id||null,completed:await completed(user?.id),wallet:user?await progression.wallet(user.id):null,levels:LEVELS});return true;}
  if(!user)fail(401,'Inicia sesión para guardar tus tickets.');
  if(start&&req.method==='POST'){
   checkRate(req,'arcade-start',80,3600000);const input=await body(req),level=LEVELS.find(l=>l.id===input.level);
   if(!level||!Object.hasOwn(DIFFICULTIES,input.difficulty))fail(400,'Elige un nivel y una dificultad válidos.');
   if(level.id>1&&!(await completed(user.id)).includes(level.id-1))fail(409,'Completa el nivel anterior para desbloquear este.');
   const id=randomUUID(),run=newRun({level:level.id,difficulty:input.difficulty}),time=now();
   await db.run('INSERT INTO arcade_runs(id,user_id,game_id,level,difficulty,status,snapshot,revision,last_batch,active_ticks,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',id,user.id,'ice-breaker',level.id,input.difficulty,'playing',JSON.stringify(run),0,'',0,time,time);
   json(res,{id,revision:0,userId:user.id},201);return true;
  }
  if(match&&req.method==='PUT'){
   checkRate(req,'arcade-progress',150,60000);const input=await body(req),row=await db.one('SELECT * FROM arcade_runs WHERE id=? AND user_id=?',match[1],user.id);
   if(!row)fail(404,'No se encontró esta expedición.');
   if(!Number.isSafeInteger(input.revision)||input.revision<0||!Array.isArray(input.commands)||!input.commands.length||input.commands.length>120)fail(400,'Progreso no válido.');
   const hash=createHash('sha256').update(JSON.stringify(input.commands)).digest('hex');
   if(Number(row.revision)!==input.revision){if(Number(row.revision)===input.revision+1&&row.last_batch===hash){json(res,await receipt(row));return true;}fail(409,'La expedición cambió en otra ventana.');}
   if(row.status!=='playing'){json(res,await receipt(row));return true;}
   let ticks=0;
   for(const command of input.commands){
    if(command.op==='step'){
     if(!Number.isInteger(command.ticks)||command.ticks<1||command.ticks>600||!command.input||!Number.isFinite(command.input.x)||Math.abs(command.input.x)>1||!Number.isFinite(command.input.y)||Math.abs(command.input.y)>1||typeof command.input.dodge!=='boolean')fail(400,'Movimiento no válido.');ticks+=command.ticks;
    }else if(command.op==='jump'){if(typeof command.id!=='string'||command.id.length>24)fail(400,'Destino no válido.');}
    else if(command.op==='walk'){if(!Number.isFinite(command.x)||!Number.isFinite(command.y))fail(400,'Destino no válido.');}
    else if(command.op!=='cancel')fail(400,'Movimiento desconocido.');
   }
   if(ticks>600||Number(row.active_ticks)+ticks>Math.floor((now()-Number(row.created))*.12)+240)fail(400,'El progreso llegó antes de tiempo.');
   const run=JSON.parse(row.snapshot);if(run.version!==CAMPAIGN_VERSION)fail(409,'La campaña se actualizó. Empieza una nueva expedición.');
   for(const command of input.commands){
    if(command.op==='step')for(let i=0;i<command.ticks;i++)stepRun(run,command.input,1/120);
    if(command.op==='jump'&&!jumpTo(run,command.id))fail(409,'El salto no coincide con la expedición.');
    if(command.op==='walk'&&!walkTo(run,{x:command.x,y:command.y}))fail(409,'El paso no coincide con la expedición.');
    if(command.op==='cancel')run.walkTarget=null;
    run.events.length=0;
   }
   const updated=now(),saved=await db.run('UPDATE arcade_runs SET status=?,snapshot=?,revision=revision+1,last_batch=?,active_ticks=active_ticks+?,updated=? WHERE id=? AND user_id=? AND revision=?',run.status,JSON.stringify(run),hash,ticks,updated,row.id,user.id,input.revision);
   if(!saved.changes)fail(409,'La expedición cambió en otra ventana.');
   json(res,await receipt({...row,status:run.status,revision:Number(row.revision)+1,updated}));return true;
  }
  fail(405,'Acción no permitida.');
 }
 return {handle};
}
