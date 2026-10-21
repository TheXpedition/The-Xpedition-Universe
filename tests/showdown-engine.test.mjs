import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShowdown,joinShowdown,selectShowdownCharacter,fillShowdownBots,beginShowdown,tickShowdown,showdownAction,showdownPublicView} from '../showdown-engine.mjs';
import {SHOWDOWN_FORMATS,LIP_BEAT} from '../public/showdown/config.mjs';
const characters=Array.from({length:40},(_,i)=>({id:'c'+i,name:'Personaje '+i,image:'/personajes/test.png'}));
function setup(format=3,mode='solo',seed=100){const s=createShowdown({id:'room',host:'u1',mode,format,seed,now:1000000});joinShowdown(s,{id:'u1',name:'Uno'},1000000);selectShowdownCharacter(s,'u1','c1',characters);if(mode==='multi'){joinShowdown(s,{id:'u2',name:'Dos'},1000000);selectShowdownCharacter(s,'u2','c2',characters);}beginShowdown(s,characters,1000000,{fillBots:true});return s;}
function finish(s){let count=0;while(s.status==='running'&&count++<200)tickShowdown(s,s.deadline);assert.equal(s.status,'finished');return s;}
function until(s,phase){let count=0;while(s.phase!==phase&&s.status==='running'&&count++<200)tickShowdown(s,s.deadline);assert.equal(s.phase,phase);return s;}

test('los tres formatos completan 18 personas, sus clasificatorias, comodines, semifinales y final sin empates',()=>{
 for(const format of [2,3,4])for(let seed=1;seed<=100;seed++){
  const s=finish(setup(format,'solo',seed)),config=SHOWDOWN_FORMATS[format];
  assert.equal(s.players.length,18);assert.equal(s.qualifiers.length,format*3);assert.equal(s.wildcards.length,config.wildcards);assert.equal(new Set(s.wildcards).size,s.wildcards.length);assert(s.wildcards.every(id=>!s.qualifiers.includes(id)));
  assert.equal(s.episodes.filter(e=>e.group==='united').length,config.semiEpisodes);assert.equal(s.episodes.filter(e=>e.group!=='united').length,9);
  assert.equal(s.finalRounds[0].players.length,config.finalists);assert.equal(s.players.filter(p=>p.active).length,1);assert(s.players.some(p=>p.id===s.winner));assert.equal(s.podium[0],s.winner);
  for(const d of s.duels){assert(d.ids.includes(d.winner));assert.equal(new Set(d.ids).size,d.ids.length);assert(Object.values(d.scores).every(Number.isFinite));}
  assert.equal(Object.values(s.track).filter(row=>row.crown==='WINNER').length,1);
 }
});

test('los brackets avanzan en paralelo, cada persona ve únicamente el suyo y el track y ranking permanecen ocultos',()=>{
 const s=setup(3,'multi'),me=s.players[0],view=showdownPublicView(s,me.id,s.phaseAt,characters);
 assert.equal(view.groups.length,1);assert.equal(view.players.length,6);assert(view.players.every(p=>p.bracket===me.bracket));assert.equal(view.track,null);assert.equal(view.episodes,null);assert(!JSON.stringify(view).includes('tieOrder'));assert(!JSON.stringify(view).includes('rankingPoints'));
 until(s,'critiques');for(const group of s.groups){const r=s.rounds[group.id];assert.equal(r.top.length,2);assert.equal(r.pool.length,6);assert(r.top.every(id=>s.players.find(p=>p.id===id).stars===2));}
 assert.equal(s.bracketEpisode,1);tickShowdown(s,s.deadline);assert.equal(s.phase,'countdown');assert(Object.values(s.rounds).every(r=>r.duel.start===s.deadline));
 until(s,'semifinalists');const all=showdownPublicView(s,me.id,s.phaseAt,characters);assert.equal(all.groups.length,3);assert.equal(all.qualifiers.length,9);assert.equal(all.players.length,18);assert.equal(all.track,null);
 until(s,'ranking');const rankView=showdownPublicView(s,me.id,s.phaseAt,characters);assert(!('points' in rankView.current));assert(!('ranking' in rankView.current));
});

test('el Espejo reparte las últimas estrellas una por una y no duplica premios al consultar o restaurar',()=>{
 const s=setup();while(!(s.bracketEpisode===3&&s.phase==='xvote'))tickShowdown(s,s.deadline);
 tickShowdown(s,s.deadline);const r=Object.values(s.rounds)[0],before=s.players.reduce((sum,p)=>sum+p.stars,0),phaseAt=s.phaseAt;
 tickShowdown(s,phaseAt+1600);assert.equal(r.revealed.length,1);assert.equal(s.players.reduce((sum,p)=>sum+p.stars,0),before+3);
 const stored=JSON.parse(JSON.stringify(s));tickShowdown(stored,phaseAt+1600);assert.equal(stored.players.reduce((sum,p)=>sum+p.stars,0),before+3);
 tickShowdown(s,s.deadline);assert.equal(s.phase,'cut');assert(Object.values(s.rounds).every(r=>r.revealed.length===4));assert.equal(s.players.reduce((sum,p)=>sum+p.stars,0),before+12);
});

test('los taps solo valen en los diez segundos del duelo, con un objetivo vigente y sin duplicados',()=>{
 const s=setup(3,'multi');until(s,'critiques');const p=s.players[0],r=s.rounds[p.bracket];r.top=[p.id,r.pool.find(id=>id!==p.id)];p.lastSeen=s.deadline;
 tickShowdown(s,s.deadline);const duel=r.duel;assert(!duel.proxy.includes(p.id));assert.equal(duel.end-duel.start,10000);
 assert.throws(()=>showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:0},duel.start-1));tickShowdown(s,s.deadline);
 showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:0},duel.start+90);showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:0},duel.start+95);assert.equal(duel.scores[p.id],10);
 assert.throws(()=>showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:23},duel.start+100));
 assert.throws(()=>showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:0},duel.start+LIP_BEAT*3));
 tickShowdown(s,duel.end);assert.equal(s.phase,'lipResult');assert(duel.winner);assert.throws(()=>showdownAction(s,p.id,{type:'tap',phase:s.phaseNumber,beat:24},duel.end+1));
});

test('los rankings excluyen al propio personaje y los duplicados; el borrador sobrevive y se completa al vencer 15 segundos',()=>{
 const s=setup();until(s,'ranking');const r=s.rounds.united,p=s.players.find(p=>p.active);p.userId='active';p.bot=false;
 assert.throws(()=>showdownAction(s,'active',{type:'ranking',phase:s.phaseNumber,order:[p.id]},s.phaseAt+100));
 const others=r.pool.filter(id=>id!==p.id);assert.throws(()=>showdownAction(s,'active',{type:'ranking',phase:s.phaseNumber,order:[others[0],others[0]]},s.phaseAt+100));
 showdownAction(s,'active',{type:'ranking',phase:s.phaseNumber,order:others.slice(0,3)},s.phaseAt+500);assert.deepEqual(r.ranking[p.id],others.slice(0,3));
 assert.throws(()=>showdownAction(s,'active',{type:'ranking',phase:s.phaseNumber,order:others.slice(0,3),confirm:true},s.phaseAt+1000));
 assert.equal(s.deadline-s.phaseAt,15000);tickShowdown(s,s.deadline);assert.equal(s.phase,'judging');assert.equal(r.ranking[p.id].length,9);assert.deepEqual(r.ranking[p.id].slice(0,3),others.slice(0,3));
});

test('solo permite los tres formatos, multijugador exige el clásico, 2–18 usuarios, personajes únicos y relleno explícito',()=>{
 assert.throws(()=>createShowdown({id:'x',host:'u1',mode:'multi',format:4}));const s=createShowdown({id:'x',host:'u1',mode:'multi',format:3});joinShowdown(s,{id:'u1',name:'Uno'},0);selectShowdownCharacter(s,'u1','c1',characters);assert.throws(()=>beginShowdown(s,characters,1,{fillBots:true}));joinShowdown(s,{id:'u2',name:'Dos'},0);assert.throws(()=>selectShowdownCharacter(s,'u2','c1',characters));selectShowdownCharacter(s,'u2','c2',characters);assert.throws(()=>beginShowdown(s,characters,1));beginShowdown(s,characters,1,{fillBots:true});assert.equal(s.players.filter(p=>p.bot).length,16);assert.throws(()=>joinShowdown(s,{id:'u3',name:'Tres'},2));
});

test('pausar y reconectar conserva el estado exacto y los resultados; las salas no admiten pausa',()=>{
 const s=setup();until(s,'lipsync');showdownAction(s,'u1',{type:'pause'},s.phaseAt+1000);const old=s.deadline;tickShowdown(s,old+900000);assert.equal(s.deadline,old);showdownAction(s,'u1',{type:'resume'},s.phaseAt+10000);assert.equal(s.deadline,old+9000);
 const cloned=JSON.parse(JSON.stringify(s));finish(s);finish(cloned);assert.equal(cloned.winner,s.winner);assert.deepEqual(cloned.track,s.track);assert.deepEqual(cloned.episodes,s.episodes);
 assert.throws(()=>showdownAction(setup(3,'multi'),'u1',{type:'pause'},1000100));
});
