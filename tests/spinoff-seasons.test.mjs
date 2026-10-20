import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const pub=new URL('../public/',import.meta.url),catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',pub))),details=JSON.parse(fs.readFileSync(new URL('content-details.json',pub))),archive=JSON.parse(fs.readFileSync(new URL('seasons/spinoffs/seasons.json',pub)));
const india=['Maria Villegas','Coronel','Ivy','Kareli','Lui Mclean','Sebas','Ducky','Pablo','Amanda Lewis','Maria Luna','Popu Yay','Javi','Luciano','Nahuee','Teseo','Violeta','Gokuh Moreno','Stephany','Robert','Gaba Hochbaum','Robinson Lewis','Carlos Rojas','Victoria Olaya','Camila Francisca','Cassie Casu'];
const baw=['Alexandro','Cristian Julio','Gokuh Moreno','Ian Esteban','Iker','Isaac','Sadith','Dani','Felix','Amanda Lewis','Jose Julián','Pablo','Luciano','Robin','Vita','Paulis Queen','Marcos','Renata'];
test('India y BAW siguen a Diamond Rush y conservan fechas, ambos artes y los elencos exactos',()=>{
 assert.deepEqual(catalog.content.spinoffs.slice(-3).map(i=>i.id),['diamond-rush-6','desafio-india','baw']);
 for(const [id,year,cast,main] of [['desafio-india',2015,india,india.slice(0,5)],['baw',2018,baw,['Maria Villegas','Alexandro','Dani','Luciano','Jose Julián','Isaac']]]){
  const item=catalog.content.spinoffs.find(i=>i.id===id),r=archive.seasons[id];assert.equal(item.meta,String(year));assert.equal(r.year,year);assert.equal(item.integrated,true);assert.equal(item.url,'#temporada/'+id);assert.deepEqual(details[id].cast,cast);assert.deepEqual(details[id].previewCast,main);assert.deepEqual(r.participants.map(p=>p.name),cast);assert.deepEqual(r.mainCast.map(p=>p.name),main);
  for(const file of [item.art.background,item.art.poster,item.art.logo.src])assert(fs.statSync(new URL(file,pub)).size>100);assert.notEqual(item.art.poster,item.art.background);
 }
 for(const name of ['Ducky','Robinson Lewis','Camila Francisca']){assert.equal(archive.seasons['desafio-india'].participants.find(p=>p.name===name).image,'seasons/shared/persona-sin-foto.webp');assert(!catalog.characters.some(p=>p.name===name));}
 const r=archive.seasons['desafio-india'];assert.equal(r.participants.find(p=>p.name==='Victoria Olaya').image,'seasons/shared/victoria-olaya.webp');assert.equal(r.stats['Elenco completo'],'25');
 for(const id of ['desafio-india','baw']){const season=archive.seasons[id];assert.deepEqual(season.credits.presenters,['Maria Villegas']);assert.equal(season.mainCast.find(p=>p.name==='Maria Villegas').place,'Presentadora');}
 assert.equal(r.participants.find(p=>p.name==='Coronel').place,'Staff');assert.equal(r.mainCast.find(p=>p.name==='Coronel').place,'Staff');
});
test('Showdown conserva el archivo de brackets y muestra los dos track records actualizados',()=>{
 const canonical=n=>({'Andrómeda':'Andromeda','Bryan':'Bryan Montalvo'}[n]||n);
 for(const [id,cast,stages] of [['safari-showdown',19,3],['traitor-showdown',28,4]]){
  const r=archive.seasons[id],item=catalog.content.spinoffs.find(i=>i.id===id);assert.equal(item.url,'#temporada/'+id);assert.equal(item.integrated,true);assert.equal(r.theme,'showdown');assert.equal(r.participants.length,cast);assert.equal(r.brackets.length,stages);
  r.brackets.forEach((stage,i)=>{const original=r.source.brackets[i],people=Array.isArray(original)?original:original.p;assert.deepEqual(stage.people.map(p=>p.name),people.map(p=>canonical(p.name||p.n)));assert.deepEqual(stage.people.map(p=>p.mark),people.map(p=>p.mark||(p.up?'⭐':'')));});
  const bytes=fs.readFileSync(new URL(r.track.src,pub));assert.equal(createHash('sha256').update(bytes).digest('hex'),r.source.trackSha256);assert.equal(bytes.readUInt32BE(16),r.track.width);assert.equal(bytes.readUInt32BE(20),r.track.height);
  for(const p of r.participants)assert(fs.existsSync(new URL(p.image,pub)),p.name);
 }
 assert.deepEqual(archive.seasons['safari-showdown'].brackets.map(b=>b.people.length),[6,6,6]);assert.deepEqual(archive.seasons['traitor-showdown'].brackets.map(b=>b.people.length),[9,9,9,14]);
});
function browser(id){
 const dom=new JSDOM('<main id="main"></main><dialog id="modal"></dialog>',{url:'https://test.invalid/#temporada/'+id,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.state={route:'temporada',catalog:{...catalog,details},profiles:[]};w.$=(s,root=w.document)=>root.querySelector(s);w.$$=(s,root=w.document)=>[...root.querySelectorAll(s)];w.esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');w.norm=v=>String(v).toLowerCase();w.closeModal=()=>{};w.saved=()=>false;w.icon=()=>'';w.castProfile=()=>null;w.castNames=names=>names.map(w.esc).join(', ');w.contentArt=item=>item.art?.background||'';w.brandArt=(item,cls)=>`<span class="${cls}">${w.esc(item.name)}</span>`;w.empty=()=>'<p>ERROR</p>';w.fetch=async()=>({ok:true,json:async()=>archive});w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.character=name=>catalog.characters.find(p=>p.name===name);
 w.eval(fs.readFileSync(new URL('seasons.js',pub),'utf8')+'\n'+fs.readFileSync(new URL('spinoff-seasons.js',pub),'utf8')+'\n'+fs.readFileSync(new URL('showdown.js',pub),'utf8')+'\nwindow.renderSeasonPage=renderSeasonPage;window.showdownScores=showdownScores;');return {dom,w};
}
test('las cuatro páginas abren dentro de la web y sus pestañas, búsquedas y vínculos funcionan',async()=>{
 for(const id of Object.keys(archive.seasons)){
  const {dom,w}=browser(id);try{
   await w.renderSeasonPage(id);assert(w.document.querySelector('.sd-page'));assert.equal(w.document.title,'The Xpedition');assert.match(w.document.querySelector('h1').textContent,new RegExp(catalog.content.spinoffs.find(i=>i.id===id).name));
   if(['desafio-india','baw'].includes(id)){assert.match(w.document.querySelector('.sd-host').textContent,/Presenta Maria Villegas/);if(id==='desafio-india')assert.match(w.document.querySelector('.sd-host').textContent,/Staff Coronel/);}
   w.document.querySelector('[data-tab="participantes"]').click();assert.equal(w.document.querySelectorAll('[data-person-search]').length,archive.seasons[id].participants.length);
   const input=w.document.querySelector('#seasonParticipantSearch');input.value=id==='baw'?'Jose Julián':id==='desafio-india'?'Ducky':'Luciano';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('[data-person-search]:not([hidden])').length,1);
   if(id.endsWith('showdown')){w.document.querySelector('[data-tab="brackets"]').click();assert.equal(w.document.querySelectorAll('.sh-group-picker>button').length,3);assert.equal(w.document.querySelectorAll('.sh-standing').length,archive.seasons[id].tournament.groups[0].people.length);w.document.querySelector('[data-tab="track-record"]').click();assert.equal(w.document.querySelector('.ch-track-canvas img').getAttribute('src'),archive.seasons[id].track.src);}else{w.document.querySelector('[data-tab="arte"]').click();assert.equal(w.document.querySelectorAll('.sd-art-gallery img').length,2);}
  }finally{dom.window.close();}
 }
});

test('Showdown 1 asigna X Vote al episodio elegible y conserva abstenciones, resultados y progresión',()=>{
 const t=archive.seasons['safari-showdown'].tournament;
 assert.equal(t.episodes.length,16);assert.equal(t.episodes[14].duels[0].winner,'Eris Midnight');assert.equal(t.champion,'Ignacio Ricci');
 assert.deepEqual(t.episodes[15].duels.map(d=>d.winner),['Eris Midnight','Oscar','Rafael']);
 assert.deepEqual(t.episodes[15].duels.map(d=>d.eliminated),['Eris Midnight','Oscar','Rafael']);
 assert.equal(t.episodes[2].duels[0].noWinner,true);assert.equal(t.episodes[2].duels[0].winner,null);
 assert.deepEqual(t.episodes[9].wildcard,['Esteban']);assert.deepEqual(t.episodes[12].quit,['Isabel']);
 assert.deepEqual(t.episodes[14].eliminated,['Lucas Mendez','Luciano','Lalamila','Alexandro','Esteban']);
 assert.deepEqual(t.semifinalists,['Alexandro','Isabel','Rafael','Eris Midnight','Ignacio Ricci','Lalamila','Lucas Mendez','Luciano','Oscar']);assert.deepEqual(t.finalists,['Eris Midnight','Ignacio Ricci','Rafael','Oscar']);
 for(const group of t.groups){
  for(const number of group.episodes){const ep=t.episodes[number-1],top=ep.duels[0].people;assert.equal(ep.votes.length,4);assert.deepEqual([...ep.votes.map(v=>v.from),...top].sort(),[...group.people].sort());for(const vote of ep.votes)assert(vote.to===null||group.people.includes(vote.to));}
 }
 const votes=number=>Object.fromEntries(t.episodes[number-1].votes.map(v=>[v.from,v.to]));
 assert.equal(votes(1).Alexandro,'Garnet');assert.equal(votes(1).Greg,null);assert.equal(votes(2).Isabel,'Greg');assert.equal(votes(3).Rafael,'Greg');assert.equal(votes(4)['Eris Midnight'],'Andromeda');assert.equal(votes(6).Pier,'Esteban');assert.equal(votes(7).Catalina,'Lucas Mendez');
});

test('Showdown 2 conserva solo el primer bracket completo y mantiene el resto pendiente',()=>{
 const t=archive.seasons['traitor-showdown'].tournament;
 assert.equal(t.episodes.length,20);assert.equal(t.champion,null);assert.equal(t.episodes[19].status,'upcoming');
 assert.deepEqual(t.groups.map(g=>g.name),['Naranja','Rosa','Morado']);assert.deepEqual(t.groups.map(g=>g.people.length),[9,9,9]);
 assert.equal(t.groups[0].status,'complete');assert.deepEqual(t.groups[0].duels.map(d=>d.winner),['Ari Salgado','Mary Hao','Adriana Pereira']);
 assert.equal(t.groups[0].stars.Christopher,6);assert.equal(t.groups[0].reveal.length,6);assert.equal(t.groups[0].verdict.advanced,'Adriana Pereira');
 for(const group of t.groups.slice(1)){assert.equal(group.status,'partial');assert.equal(group.stars,undefined);assert.equal(group.duels,undefined);assert.equal(group.reveal,undefined);}
 for(const ep of t.episodes.slice(3,19)){assert.equal(ep.status,'partial');assert.equal(ep.duels,undefined);}
 assert.deepEqual(t.episodes.filter(ep=>ep.phase==='fase-2').map(ep=>ep.number),[10,11,12,13]);
});

test('el navegador de episodios, los marcadores y los enlaces directos funcionan sin mezclar temporadas',async()=>{
 const {dom,w}=browser('safari-showdown');try{
  await w.renderSeasonPage('safari-showdown');
  const t=archive.seasons['safari-showdown'].tournament,totals=w.showdownScores(t.groups[0]);
  assert.deepEqual(Array.from(totals,row=>[row.name,row.total]),[['Alexandro',6],['Bayron',3],['Garnet',3],['Greg',3],['Isabel',4],['Rafael',6]]);
  w.document.querySelector('[data-tab="episodios"]').click();assert.equal(w.document.querySelectorAll('.sh-episode-nav button').length,16);assert.match(w.document.querySelector('.sh-episode-heading').textContent,/La Bomba/);
  w.document.querySelector('.sh-episode-nav [data-episode="15"]').click();assert.match(w.location.hash,/episodios\/15$/);assert.match(w.document.querySelector('.sh-duel-result').textContent,/Eris Midnight gana/);
  w.document.querySelector('.sh-episode-nav [data-episode="15"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.match(w.location.hash,/episodios\/16$/);assert.equal(w.document.querySelectorAll('.sh-duel').length,3);assert.match(w.document.querySelector('.sh-final-winner').textContent,/Ignacio Ricci/);
  w.document.querySelector('[data-tab="brackets"]').click();w.document.querySelector('.sh-group-picker [data-bracket="amarillo"]').click();assert.match(w.document.querySelector('.sh-bracket-heading').textContent,/Amarillo/);assert.match(w.location.hash,/brackets\/amarillo$/);assert.equal(w.document.querySelectorAll('.sh-vote-matrix tbody tr').length,6);
  w.location.hash='#temporada/traitor-showdown/episodios/20';await w.renderSeasonPage('traitor-showdown');assert.equal(w.document.querySelectorAll('.sh-episode-nav button').length,20);assert.match(w.document.querySelector('.sh-episode-heading').textContent,/Por hacerse/);assert.equal(w.document.querySelector('.sh-final-winner'),null);
  w.document.querySelector('[data-tab="brackets"]').click();w.document.querySelector('.sh-group-picker [data-bracket="rosa"]').click();assert.equal(w.document.querySelectorAll('.sh-total').length,9);assert(Array.from(w.document.querySelectorAll('.sh-total')).every(n=>n.textContent.includes('—')));assert.equal(w.document.querySelector('.sh-vote-section'),null);
  w.location.hash='#temporada/safari-showdown/episodios/999';await w.renderSeasonPage('safari-showdown');assert.match(w.document.querySelector('.sh-episode-heading').textContent,/EPISODIO 01/);
 }finally{dom.window.close();}
});
