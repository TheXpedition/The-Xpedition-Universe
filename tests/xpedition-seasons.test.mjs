import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const catalog=JSON.parse(read('catalog.json')),details=JSON.parse(read('content-details.json'));
const archive=JSON.parse(read('seasons/xpedition/seasons.json'));
const script=read('xpedition-seasons.js'),core=read('seasons.js'),streaming=read('streaming.js');
const canon=name=>({'Dua Lengua':'Dua Lingo','Andrómeda':'Andromeda'}[name]||name);
const norm=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
function context(id='safari'){
 const main={innerHTML:'',focus(){}},location={hash:'#temporada/'+id};
 const ctx=vm.createContext({state:{route:'temporada',catalog:{...catalog,details},profiles:[]},location,
  document:{addEventListener(){},title:''},$:()=>main,$$:()=>[],
  esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),norm,
  castProfile:()=>null,character:name=>catalog.characters.find(c=>c.name===name),canonicalCastName:name=>name,
  castNames:names=>names.join(', '),icon:()=>'',brandArt:()=>'',contentArt:item=>'backdrops/'+item.id+'.jpg',saved:()=>false,
  closeModal(){},contentCard:()=>'',fetch:async()=>({ok:true,json:async()=>archive})
 });
 vm.runInContext(core,ctx);vm.runInContext(script,ctx);
 return {ctx,main,location};
}

test('Antarctica y Safari conservan el elenco completo y abren en rutas internas',()=>{
 assert.deepEqual(Object.keys(archive.seasons),['antarctica','safari']);
 for(const [id,count] of [['antarctica',18],['safari',28]]){
  const item=catalog.content.xpedition.find(c=>c.id===id),record=archive.seasons[id];
  assert.equal(item.url,'#temporada/'+id);assert.equal(item.integrated,true);
  assert.equal(record.participants.length,count+2);
  assert.deepEqual(record.participants.map(p=>p.name),record.source.originalParticipants.map(p=>canon(p.name)));
  assert.deepEqual(record.participants.map(p=>p.place),record.source.originalParticipants.map(p=>p.badge==='host'?'Host':p.badge==='staff'?'Staff':p.placement));
  assert.deepEqual(new Set(record.participants.map(p=>p.name)),new Set(details[id].cast));
  assert.deepEqual(record.mainCast.map(p=>p.name),details[id].previewCast);
  assert.equal(record.teams.length,id==='antarctica'?3:5);
  for(const name of ['Pier','Dani','Felix'])if(record.images[name])assert.equal(record.images[name],catalog.characters.find(c=>c.name===name).image);
 }
 assert.equal(archive.seasons.antarctica.participants[0].place,'Winner');
 // Safari's source ends with two finalists. Do not invent a winner.
 assert.deepEqual(archive.seasons.safari.participants.slice(0,2).map(p=>[p.name,p.place]),[['Coronel','Runner Up'],['Peggy','Runner Up']]);
});

test('los 50 enfrentamientos mantienen episodios, participantes y resultados originales',()=>{
 assert.equal(archive.seasons.antarctica.versus.rounds.length,23);
 assert.equal(archive.seasons.safari.versus.rounds.length,27);
 for(const record of Object.values(archive.seasons)){
  let index=0;
  for(const block of record.source.versus)for(const original of block.episodes){
   if(original.duels){
    for(const duel of original.duels){
     const round=record.versus.rounds[index++];
     assert.equal(round.ep,original.ep);assert.equal(round.year,block.year);
     assert.deepEqual(round.competitors,[duel.p1,duel.p2,...(duel.p3?[duel.p3]:[])].map(canon));
     assert.deepEqual(round.winners,(duel.winners||[duel.winner]).map(canon));
    }
   }else{
    const round=record.versus.rounds[index++];
    assert.equal(round.ep,original.ep);assert.equal(round.year,block.year);
    assert.deepEqual(round.competitors,(original.players||original.list).map(canon));
    if(original.isComeback)assert.deepEqual(round.winners,[original.winner]);
    else if(original.isEmpate||original.isDueloVictoria){assert.deepEqual(round.eliminated,[]);assert.deepEqual(round.winners,[]);}
    else if(round.kind==='final')assert.deepEqual(round.winners,['Dani']);
    else assert.deepEqual(round.eliminated,original.players.slice(original.doubleElim?-2:-1).map(canon));
   }
  }
  assert.equal(index,record.versus.rounds.length);
 }
 const antarctica=archive.seasons.antarctica.versus.rounds,safari=archive.seasons.safari.versus.rounds;
 assert.deepEqual(antarctica.find(r=>r.ep==='15').competitors,['Bayron','Eris Midnight']);
 assert.deepEqual(antarctica.filter(r=>r.ep==='9').at(-1).winners,['Felix','Catalina']);
 assert.deepEqual(safari.find(r=>r.ep==='12').eliminated,['Bayron','Oscar']);
 assert.deepEqual(safari.filter(r=>r.kind==='comeback-ranking').map(r=>r.winners),[['Garnet'],['Bryan Montalvo']]);
});

test('todos los recursos existen en Linux y las tablas se conservan sin pérdida',()=>{
 const assets=new Set();
 for(const record of Object.values(archive.seasons)){
  [record.poster,record.track.src,...Object.values(record.images),...record.teams.map(t=>t.image)].forEach(file=>assets.add(file));
  const buffer=fs.readFileSync(path.join(root,record.track.src));
  assert.equal(buffer.readUInt32BE(16),record.track.width);assert.equal(buffer.readUInt32BE(20),record.track.height);
  assert.equal(hash(buffer),record.id==='antarctica'?'6febecbb83b15c7b3cafd21135d4bb9c747fdb1f14537b4c0b2f676decbec6b6':'ffa7abbe9d7a6e1794a4efef9252d1f0f567f0bbd8f6e6016e8fbcf9ebe4a957');
  for(const round of record.versus.rounds)for(const name of round.competitors)assert(record.images[name],name);
 }
 for(const file of assets){
  assert(!file.includes('..')&&!file.includes('\\')&&!/awards|showdown/i.test(file));
  let current=root;for(const segment of file.split('/')){assert(fs.readdirSync(current).includes(segment),file);current=path.join(current,segment);}
  assert(fs.statSync(current).size>100);
 }
});

test('la ficha original aparece antes de Ir a la temporada y el destacado tampoco abre otra pestaña',()=>{
 const {ctx}=context();
 vm.runInContext(streaming.slice(streaming.indexOf('contentModal=function'),streaming.indexOf("document.addEventListener('click',event=>{",streaming.indexOf('contentModal=function'))),ctx);
 let html='';ctx.modal=value=>html=value;ctx.allContent=()=>Object.values(catalog.content).flat();ctx.relatedContent=()=>[];
 for(const id of ['antarctica','safari']){
  ctx.contentModal(id);
  assert(html.includes('data-season-action="open-season" data-id="'+id+'"'));
  assert(html.includes('Elenco completo:'));assert(html.includes(details[id].cast.join(', ')));
  assert(html.includes('Géneros:'));assert(html.includes('Más títulos similares'));
  assert(!html.includes('target="_blank"'));
 }
 assert.match(streaming,/item\.integrated\?`data-season-action="open-season"/);
});

test('las dos páginas renderizan su identidad, todas las pestañas y excluyen Awards y Showdown',async()=>{
 for(const id of ['antarctica','safari']){
  const {ctx,main}=context(id);await ctx.renderSeasonPage(id);
  assert(main.innerHTML.includes('xp-season xp-'+id));assert(main.innerHTML.includes('Elenco Principal'));
  assert.equal(ctx.document.title,(id==='safari'?'Safari':'Antarctica')+' — The Xpedition');
  for(const tab of ['resumen','participantes','equipos','versus','track-record']){
   vm.runInContext('seasonView.tab='+JSON.stringify(tab),ctx);
   const html=ctx.seasonPanel();assert(html.length>100);
   assert(!/awards|showdown|Campria/i.test(html),id+' '+tab);
   if(tab==='participantes')assert.equal((html.match(/class="ch-person-card"/g)||[]).length,id==='safari'?30:20);
   if(tab==='versus')assert.equal((html.match(/data-duel-year=/g)||[]).length,id==='safari'?27:23);
  }
 }
});

test('el render distingue el empate, comeback y doble eliminación sin cambiar los resultados',()=>{
 const {ctx}=context();
 const safari=archive.seasons.safari,antarctica=archive.seasons.antarctica;
 const tie=ctx.xpeditionDuel(antarctica.versus.rounds.find(r=>r.kind==='tie'),19,antarctica);
 assert(tie.includes('EMPATE')&&tie.includes('Sin eliminación'));assert(!tie.includes('is-gray'));
 const double=ctx.xpeditionDuel(safari.versus.rounds.find(r=>r.ep==='12'),11,safari);
 assert(double.includes('ELIMINADOS'));assert.equal((double.match(/is-gray/g)||[]).length,4);
 const comeback=ctx.xpeditionDuel(safari.versus.rounds.find(r=>r.ep==='25'),24,safari);
 assert(comeback.includes('COMEBACK'));assert(comeback.includes('Bryan Montalvo'));assert(comeback.includes('is-winner'));
 const final=ctx.xpeditionDuel(antarctica.versus.rounds.at(-1),22,antarctica);
 assert(final.includes('GANADORA'));assert(final.includes('Dani'));assert(!final.includes('is-gray'));
});
