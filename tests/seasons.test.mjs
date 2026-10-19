import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
const archive=JSON.parse(fs.readFileSync(path.join(root,'seasons/campria/seasons.json'),'utf8'));
const ids=['retroverse','popular','comeback','golden','money','allstars','elements','andromeda','apocalypse','newera','empire','allstars2'];

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
 assert.deepEqual(catalog.content.campria.map(x=>x.critics.score),[7.2,7.5,8.6,8.2,5.7,8.9,7.4,8.1,9.3,7.8,6.9,5.4]);
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
  for(const image of Object.values(season.images))asset(image);
  for(const person of season.protagonists){assert(person.name&&person.place);asset(person.image);}
 }
});

test('Versus conserva los treinta enfrentamientos, los empates y los participantes de cada resultado',()=>{
 const a=archive.seasons.newera.versus,b=archive.seasons.empire.versus;
 assert.equal(a.format,'assassin');assert.equal(a.rounds.length,17);
 assert.equal(b.format,'killer');assert.equal(b.rounds.length,13);
 assert(a.rounds.some(x=>x.winners.length>1));assert(b.rounds.some(x=>x.winners.length>1));
 assert.equal(Object.values(archive.seasons).filter(x=>x.versus).length,2);
 for(const season of [archive.seasons.newera,archive.seasons.empire])for(const round of season.versus.rounds){
  const competitors=round.competitors||[round.assassin,...round.opponents];
  assert(round.ep&&round.winners.length>0);assert(round.winners.every(name=>competitors.includes(name)));
  assert(competitors.every(name=>season.images[name]));
 }
});
