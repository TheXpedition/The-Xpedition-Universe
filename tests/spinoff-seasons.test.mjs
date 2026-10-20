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
test('Showdown conserva los tres brackets originales, las semifinales de S2 y ambas tablas sin pérdidas',()=>{
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
 w.eval(fs.readFileSync(new URL('seasons.js',pub),'utf8')+'\n'+fs.readFileSync(new URL('spinoff-seasons.js',pub),'utf8')+'\nwindow.renderSeasonPage=renderSeasonPage;');return {dom,w};
}
test('las cuatro páginas abren dentro de la web y sus pestañas, búsquedas y vínculos funcionan',async()=>{
 for(const id of Object.keys(archive.seasons)){
  const {dom,w}=browser(id);try{
   await w.renderSeasonPage(id);assert(w.document.querySelector('.sd-page'));assert.equal(w.document.title,'The Xpedition');assert.match(w.document.querySelector('h1').textContent,new RegExp(catalog.content.spinoffs.find(i=>i.id===id).name));
   if(['desafio-india','baw'].includes(id)){assert.match(w.document.querySelector('.sd-host').textContent,/Presenta Maria Villegas/);if(id==='desafio-india')assert.match(w.document.querySelector('.sd-host').textContent,/Staff Coronel/);}
   w.document.querySelector('[data-tab="participantes"]').click();assert.equal(w.document.querySelectorAll('[data-person-search]').length,archive.seasons[id].participants.length);
   const input=w.document.querySelector('#seasonParticipantSearch');input.value=id==='baw'?'Jose Julián':id==='desafio-india'?'Ducky':'Luciano';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('[data-person-search]:not([hidden])').length,1);
   if(id.endsWith('showdown')){w.document.querySelector('[data-tab="brackets"]').click();assert.equal(w.document.querySelectorAll('.sd-bracket').length,archive.seasons[id].brackets.length);w.document.querySelector('[data-tab="track-record"]').click();assert.equal(w.document.querySelector('.ch-track-canvas img').getAttribute('src'),archive.seasons[id].track.src);}else{w.document.querySelector('[data-tab="arte"]').click();assert.equal(w.document.querySelectorAll('.sd-art-gallery img').length,2);}
  }finally{dom.window.close();}
 }
});
