import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const archive=JSON.parse(fs.readFileSync(path.join(root,'seasons/campria/seasons.json'),'utf8'));
const details=JSON.parse(fs.readFileSync(path.join(root,'content-details.json'),'utf8'));
const streaming=fs.readFileSync(path.join(root,'streaming.js'),'utf8');
const seasonsJS=fs.readFileSync(path.join(root,'seasons.js'),'utf8');
const ids=['retroverse','popular','comeback','golden','money','allstars','elements','andromeda','apocalypse','newera','empire','allstars2'];
const norm=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const castKey=name=>norm(name).replace(/[^a-z0-9]/g,'');
const aliases={mariavillegas:'Maria',marcosjc:'Marcos',jeremias:'Jere',javier:'Javi',felipe:'Felipe Vicente',plastique:'Plastique Doll',sophie:'Sophie Bradley'};
const identity=name=>castKey(aliases[castKey(name)]||name);
const names=people=>people.map(p=>p.name);
const round=(id,ep)=>archive.seasons[id].versus.rounds.find(r=>r.ep===String(ep));
const result=(round,type)=>round.results.find(r=>r.type===type).people;

function renderContext(){
 const context=vm.createContext({
  state:{catalog:{...catalog,details},profiles:[]},
  esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  norm,castKey,castProfile:()=>null,character:name=>catalog.characters.find(c=>identity(c.name)===identity(name)),
  canonicalCastName:name=>name==='Sophie'?'Sophie Bradley':name,
  icon:()=>'',brandArt:()=>'',contentArt:item=>item.art?.background||'',saved:()=>false,
  allContent:()=>Object.values(catalog.content).flat(),contentCard:item=>`<article>${item.name}</article>`,
  castNames:names=>names.join(', '),$ :()=>({focus(){}}),
  document:{addEventListener(){}},go:()=>{throw new Error('No debe navegar antes de pulsar Ir a la temporada');}
 });
 vm.runInContext(seasonsJS,context);
 return context;
}

test('las doce temporadas de Campria se abren dentro de la web y tienen su archivo completo',()=>{
 assert.deepEqual(catalog.content.campria.map(x=>x.id),ids);
 assert.deepEqual(Object.keys(archive.seasons),ids);
 for(const [i,id] of ids.entries()){
  const item=catalog.content.campria[i],season=archive.seasons[id];
  assert.equal(item.url,'#temporada/'+id);
  assert.equal(season.number,i+1);
  assert(season.description.length>100,id+' sinopsis');
  assert.equal(Object.keys(season.stats).length,4,id+' estadísticas');
  assert(season.protagonists.length>0,id+' protagonistas');
 }
});

test('las notas publicadas de The X Critics coinciden con las doce notas proporcionadas',()=>{
 assert.deepEqual(catalog.content.campria.map(x=>x.critics.score),[7.2,7.5,8.6,8.2,5.7,8.9,7.4,8.5,9.3,7.8,6.9,5.4]);
 for(const item of catalog.content.campria){assert.equal(item.critics.source,'The X Critics');assert.equal(item.critics.outOf,10);}
});

test('todos los retratos, pósteres y track records existen con rutas válidas también en Linux',()=>{
 function asset(src){
  assert.equal(typeof src,'string');assert(!src.includes('..')&&!src.includes('\\'));
  const absolute=path.resolve(root,src);assert(absolute.startsWith(root));
  let folder=root;for(const name of src.split('/')){assert(fs.readdirSync(folder).includes(name),src+' mayúsculas/ruta');folder=path.join(folder,name);}
  assert(fs.statSync(absolute).size>100);return fs.readFileSync(absolute);
 }
 for(const season of Object.values(archive.seasons)){
  asset(season.poster);
  const track=asset(season.track.src);
  assert.equal(track.readUInt32BE(16),season.track.width);assert.equal(track.readUInt32BE(20),season.track.height);
  for(const image of Object.values(season.images))if(image!==null)asset(image);
  for(const person of season.protagonists){assert(person.name&&person.place);asset(person.image);}
  for(const person of [...season.mainCast,...season.participants]){
   assert(person.name&&person.place);if(person.image!==null)asset(person.image);
  }
 }
});

test('New Era y Empire of Blood conservan sus treinta Versus y los episodios de los archivos originales',()=>{
 const a=archive.seasons.newera.versus,b=archive.seasons.empire.versus;
 assert.equal(a.format,'assassin');assert.equal(a.rounds.length,17);
 assert.equal(b.format,'killer');assert.equal(b.rounds.length,13);
 assert(a.rounds.some(x=>x.winners.length>1));assert(b.rounds.some(x=>x.winners.length>1));
 assert.deepEqual(a.rounds.map(r=>r.ep),['1','2','3','4','5','6','7','8','9','10','11','12','12','12','12','12','12']);
 assert.deepEqual(b.rounds.map(r=>r.ep),['1','2','3','4','5','6','7','8','9','10','10','10','10']);
 // These hashes cover the source participants, results, ties and episode numbers.
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(hash(a.rounds),'6652cb55a32d1f8b2afbd0d9626f15cd360cb0b9f40b6749148cbaf217a65038');
 assert.equal(hash(b.rounds),'bfb00093e04e6cef177113a3ee48ad1e96094c87a63d8081835541bea7283f4a');
 for(const season of [archive.seasons.newera,archive.seasons.empire])for(const round of season.versus.rounds){
  const competitors=round.competitors||[round.assassin,...round.opponents];
  assert(round.ep&&round.winners.length>0);assert(round.winners.every(name=>competitors.includes(name)));
  assert(competitors.every(name=>season.images[name]));
 }
});

test('las tarjetas recuperan la ficha completa antes de abrir la temporada dentro de la web',()=>{
 const context=renderContext();
 vm.runInContext(streaming.slice(streaming.indexOf('function relatedContent('),streaming.indexOf("document.addEventListener('click'",streaming.indexOf('contentModal=function'))),context);
 for(const item of catalog.content.campria){
  let html;
  context.modal=body=>{html=body;};context.contentModal(item.id);
  assert(html.includes('data-content-id="'+item.id+'"'));
  assert(html.includes('Más títulos similares')&&html.includes('Elenco completo:')&&html.includes('Ver más'));
  for(const name of details[item.id].cast)assert(html.includes(name),item.id+' '+name);
  for(const genre of details[item.id].genres)assert(html.includes(genre));
  assert(html.includes(item.desc.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')));
  const cta=html.match(/<a class="btn primary"[^>]*>[\s\S]*?<\/a>/)[0];
  assert(cta.includes('href="#temporada/'+item.id+'"')&&cta.includes('data-season-action="open-season"'));
  assert(cta.includes('Ir a la temporada'));assert(!cta.includes('_blank'));
  assert(html.includes(`The X Critics: ${item.critics.score.toFixed(1)} de 10`));
 }
});

test('el elenco principal es completo, Maria encabeza cada temporada y Participantes incluye a todo el elenco',()=>{
 for(const id of ids){
  const record=archive.seasons[id];
  assert.equal(record.mainCast[0].name,'Maria Villegas');
  assert.deepEqual(record.mainCast.map(p=>identity(p.name)),details[id].previewCast.map(identity));
  const participants=new Set(record.participants.map(p=>identity(p.name)));
  assert.equal(participants.size,record.participants.length,id+' duplicados');
  for(const name of details[id].cast)assert(participants.has(identity(name)),id+' falta '+name);
 }
 const hasOldSophie=value=>typeof value==='string'?/\bSophie\b(?!\s+Bradley)/.test(value):Array.isArray(value)?value.some(hasOldSophie):value&&typeof value==='object'?Object.values(value).some(hasOldSophie):false;
 assert(!hasOldSophie(catalog)&&!hasOldSophie(details)&&!hasOldSophie(archive));
});

test('los cinco retratos solicitados usan la imagen actual de Comunidad en elenco, participantes y Versus',()=>{
 for(const name of ['Pier','Plastique Doll','Dani','Felix','Eduard']){
  const image=catalog.characters.find(c=>c.name===name).image;
  for(const season of Object.values(archive.seasons)){
   for(const person of [...season.protagonists,...season.mainCast,...season.participants].filter(p=>identity(p.name)===identity(name)))assert.equal(person.image,image,name);
   for(const [key,src] of Object.entries(season.images))if(identity(key)===identity(name))assert.equal(src,image,name);
  }
 }
});

test('las diez temporadas de Versus contienen los 107 enfrentamientos solicitados',()=>{
 const counts={popular:3,comeback:6,golden:9,allstars:12,elements:10,andromeda:15,apocalypse:11,newera:17,empire:13,allstars2:11};
 assert.equal(Object.values(archive.seasons).filter(s=>s.versus).length,10);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b),107);
 const context=renderContext();
 for(const [id,count] of Object.entries(counts)){
  const season=archive.seasons[id];assert.equal(season.versus.rounds.length,count,id);
  for(const [i,r] of season.versus.rounds.entries()){
   const html=context.seasonDuel(r,i,season);
   assert(html.includes(`<span>VERSUS</span><strong>${i+1}</strong>`));
   assert(html.includes('Episodio '+r.ep));assert(!html.includes('RONDA')&&!html.includes('Duelo '));
   for(const group of r.results||[])for(const person of group.people){
    assert(person.name);assert(html.includes(person.name));
   }
  }
 }
});

test('Andromeda distingue Winner y Top2 solo en sus seis primeros episodios y conserva su final',()=>{
 const rounds=archive.seasons.andromeda.versus.rounds;
 assert.deepEqual(rounds.slice(0,6).map(r=>r.competitors.find(p=>p.badge==='Winner').name),['Felix','Dani','Alexandro','Humberto','Emanuel','Dani']);
 for(const r of rounds.slice(0,6))assert.equal(r.competitors.filter(p=>p.badge==='Top2').length,1);
 assert(rounds.slice(6).every(r=>r.competitors.every(p=>!p.badge)));
 assert.deepEqual(names(result(rounds.at(-1),'winner')),['Emanuel']);
 assert.equal(result(round('andromeda',11),'eliminated')[0].note,'Renuncia');
});

test('los eliminados aparecen en gris y los ganadores de las finales conservan el color',()=>{
 const context=renderContext();
 const apocalypse=archive.seasons.apocalypse;
 const idol=round('apocalypse',10).competitors[0];assert.equal(idol.name,'Marcos');assert.equal(idol.badge,'Ídolo');assert(idol.grayscale);
 const elimination=context.seasonDuel(round('apocalypse',1),0,apocalypse);
 assert(elimination.includes('Eliminado')&&/is-eliminated\s+is-gray/.test(elimination));
 const finale=context.seasonDuel(apocalypse.versus.rounds.at(-1),10,apocalypse);
 assert(finale.includes('Ganadora')&&finale.includes('Plastique Doll'));assert(!finale.includes('is-gray'));
});

test('All Stars muestra ambas filas y respeta renuncias, empates y eliminaciones dobles',()=>{
 const s6=round('allstars',6);assert.deepEqual(names(result(s6,'eliminated')),['Nidia Mirella']);
 assert.equal(result(s6,'eliminated')[0].note,'Renuncia');assert(s6.competitors.every(p=>p.choice==='Felix'));
 assert.deepEqual(names(result(round('allstars',10),'eliminated')),['Felix']);
 assert.deepEqual(names(result(round('allstars2',7),'eliminated')),['Eris Midnight']);
 assert.deepEqual(names(result(round('allstars2',8),'eliminated')),['Elvin']);
 assert.deepEqual(names(result(round('allstars2',9),'eliminated')),['Maicol','Eduardo']);
 assert.deepEqual(names(result(round('allstars2',10),'winner')),['Beto']);
 assert.deepEqual(names(result(round('allstars2',10),'eliminated')),['Vita']);
 assert.deepEqual(names(result(round('allstars2',11),'winner')),['Pablo']);
 assert.deepEqual(names(result(round('allstars2',11),'eliminated')),['Amanda Lewis']);
 const context=renderContext();
 for(const id of ['allstars','allstars2'])for(const [i,r] of archive.seasons[id].versus.rounds.entries()){
  const html=context.seasonDuel(r,i,archive.seasons[id]);
  assert.equal((html.match(/class="ch-result-row"/g)||[]).length,2);
  assert(html.includes('data-result-type="winner"')&&html.includes('data-result-type="eliminated"'));
  assert.equal((html.match(/class="ch-choice"/g)||[]).length,r.competitors.filter(p=>p.choice).length);
 }
});
