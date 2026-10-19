import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalog=JSON.parse(read('catalog.json')),details=JSON.parse(read('content-details.json'));
const archive=JSON.parse(read('awards/editions.json'));
const script=read('awards.js'),streaming=read('streaming.js');
const categories=edition=>edition.groups.flatMap(group=>group.categories);
const norm=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const castKey=value=>norm(value).replace(/[^a-z0-9]/g,'');
function context(){
 const main={innerHTML:''};
 const context=vm.createContext({
  state:{catalog:{...catalog,details},profiles:[],user:null,route:'premios'},
  esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),norm,castKey,
  castProfile:()=>null,icon:()=>'',saved:()=>false,controls:()=>'',brandArt:()=>'',
  allContent:()=>Object.values(catalog.content).flat(),contentArt:item=>item.art?.background||'backdrops/'+item.id+'.jpg',
  document:{addEventListener(){}},$:selector=>selector==='#main'?main:{focus(){}},
  contentCard:item=>`<article>${item.name}</article>`,castNames:names=>names.join(', '),
  catalogRail:()=>'',rankRow:list=>`<!--${list.title}-->`,featureHero:()=>'',newsCard:()=>'',
  go:()=>{throw new Error('No debe salir de la ficha antes de pulsar Ver la edición');}
 });
 vm.runInContext(script,context);return {context,main};
}

test('las tres ediciones tienen páginas internas y los años 2022, 2025 y 2026',()=>{
 assert.deepEqual(catalog.content.awards.map(item=>item.year),[2022,2025,2026]);
 for(const [i,item] of catalog.content.awards.entries()){
  assert.equal(item.url,'#premios/edicion-'+(i+1));assert.equal(item.edition,i+1);
  assert.equal(item.upcoming,i===2);assert(!item.disabled);
  assert(details[item.id].genres.includes('Premiación'));
 }
});

test('Inicio sitúa los tres banners justo después de TOP 10 Ganadores',()=>{
 const {context:c,main}=context();
 vm.runInContext(streaming.slice(streaming.indexOf('renderHome=function(){'),streaming.indexOf('const sagaSections=')),c);
 c.renderHome();assert(main.innerHTML.includes('<!--TOP 10 Ganadores--><section class="catalog-row awards-row"'));
 for(const item of catalog.content.awards)assert(main.innerHTML.includes(item.banner));
});

test('2022 y 2025 conservan los 30 premios y sus 153 nominaciones con las cinco principales primero',()=>{
 const first=archive.editions['edicion-1'],second=archive.editions['edicion-2'];
 assert.equal(categories(first).length,12);assert.equal(categories(second).length,18);
 assert.equal(categories(first).reduce((sum,c)=>sum+c.nominees.length,0),63);
 assert.equal(categories(second).reduce((sum,c)=>sum+c.nominees.length,0),90);
 for(const edition of [first,second]){
  assert.equal(edition.groups[0].id,'principales');
  assert.deepEqual(edition.groups[0].categories.map(c=>c.name),['Fan Favorite','Mejor Villano','Mejor Competidor','Miss/Mr. Congeniality','Poop Of The Year']);
  assert(categories(edition).every(c=>c.nominees.filter(n=>n.winner).length===1));
 }
});

test('cada ganador coincide con la lista proporcionada, incluidos grupos y el premio solo para Emanuel',()=>{
 const expected=[
  ['Dani','Emanuel','Bayron','Ximena','Eris Midnight','Andrómeda','Ximena','Ignacio Ricci','Iñaella Rose','Emanuel contra todos','Andrómeda & Peggy','Peggy'],
  ['Alexandro','Pier','Peggy','Greg','Eris Midnight','Iñaella Rose','Julián Sanchez','Alexandro Martin','Coronel','Bryan Montalvo','Julián','Bryan Montalvo, Ximena & Julián','Coronel vs. Daelly','Isabel','Daelly','Iñaella Rose','Bonju’s Drag Race','Vitany Glambert']
 ];
 for(let i=0;i<2;i++)assert.deepEqual(categories(archive.editions['edicion-'+(i+1)]).map(c=>c.nominees.find(n=>n.winner).title),expected[i]);
 const rivalry=categories(archive.editions['edicion-1']).find(c=>c.id==='rivalidad').nominees.find(n=>n.winner);
 assert.deepEqual(rivalry.people,['Emanuel']);assert.equal(rivalry.note,'Premio solo para Emanuel');
});

test('Poop of the Year usa su propio trofeo y los demás premios el de la edición',()=>{
 const {context:c}=context();
 for(let i=1;i<=2;i++){
  const item=catalog.content.awards[i-1],edition=archive.editions['edicion-'+i];
  for(const group of edition.groups){
   const html=c.awardGroup(group,0,item);
   for(const category of group.categories){
    const winner=category.nominees.find(n=>n.winner);
    assert(html.includes(winner.title.replaceAll('&','&amp;')));
    if(category.id==='poop-of-the-year')assert(html.includes(item.poopTrophy));
    else assert(html.includes(item.trophy));
   }
  }
 }
});

test('las fichas de Awards abren la edición en la misma página, incluida la próxima edición',()=>{
 const {context:c}=context();
 vm.runInContext(streaming.slice(streaming.indexOf('function relatedContent('),streaming.indexOf("document.addEventListener('click'",streaming.indexOf('contentModal=function'))),c);
 for(const item of catalog.content.awards){
  let html;c.modal=body=>{html=body;};c.contentModal(item.id);
  const cta=html.match(/<a class="btn primary"[^>]*>[\s\S]*?<\/a>/)[0];
  assert(cta.includes(item.url)&&cta.includes('data-award-action="open-edition"'));
  assert(cta.includes('Ver la edición')&&!cta.includes('_blank'));
  assert(html.includes('Ceremonia de premiación'));assert(html.includes('Más títulos similares'));
  if(item.upcoming)assert(html.includes('Tercera edición · 2026 · Próximamente'));
 }
});

test('la tercera edición muestra sus quince categorías anunciadas sin inventar nominados ni ganadores',()=>{
 const edition=archive.editions['edicion-3'];assert.equal(edition.status,'upcoming');
 assert.deepEqual(edition.groups.map(g=>g.name),['Categorías Principales','Estrategia y Competencia','Personalidad','Premios de Producción']);
 assert.deepEqual(edition.groups.map(g=>g.categories.length),[4,5,5,1]);
 assert(categories(edition).every(c=>c.nominees.length===0));
 assert.deepEqual(edition.groups[0].categories.map(c=>c.name),['Fan Favorite','Mejor Villano','Mejor Competidor','Poop of the Year']);
 const {context:c}=context(),html=c.awardUpcoming(catalog.content.awards[2],edition);
 for(const category of categories(edition))assert(html.includes(category.name));
 assert(html.includes('Nominados por anunciar'));assert(!html.includes('is-award-winner'));
});

test('los retratos de Andrómeda se enlazan al personaje correcto sin confundir nombres',()=>{
 const {context:c}=context();
 const html=c.awardPerson('Andrómeda');assert(html.includes(catalog.characters.find(p=>p.name==='Andromeda').image));
 assert(!c.awardPerson('Angel B. Vanderwood').includes('<img')); // Unknown portraits use initials.
});

test('Eris sustituye a Angel en el dúo y los cinco integrantes reciben la nominación del equipo azul',()=>{
 const general=archive.editions['edicion-1'].groups.find(group=>group.id==='generales');
 const duel=general.categories.find(c=>c.id==='momento-sorpresivo').nominees.find(n=>n.title==='Eris Midnight & Bayron');
 assert.deepEqual(duel.people,['Eris Midnight','Bayron']);assert(!JSON.stringify(archive).includes('Angel B. Vanderwood'));
 const team=general.categories.find(c=>c.id==='mejor-estrategia').nominees.find(n=>n.people.length===5);
 assert.deepEqual(team.people,['Vita','Dani','Ximena','Emanuel','Bayron']);
});

test('los perfiles cuentan cada nominación individual, repetida, de grupo y de dúo sin deduplicar categorías',()=>{
 const {context:c}=context(),totals=c.awardProfileTotals(archive);
 for(const [name,nominations,awards] of [['Eris Midnight',10,2],['Dani',7,1],['Vita',5,0],['Emanuel',9,2],['Bayron',10,1],['Ximena',8,3],['Iñaella Rose',12,3]]){
  const actual=totals.get(castKey(name));assert.equal(actual.nominations,nominations,name);assert.equal(actual.awards,awards,name);
 }
});

test('la rivalidad de Emanuel nomina a todos los involucrados y entrega el premio solo a Emanuel',()=>{
 const nominee=archive.editions['edicion-1'].groups.find(g=>g.id==='generales').categories.find(c=>c.id==='rivalidad').nominees.find(n=>n.winner);
 const {context:c}=context();
 const totals=c.awardProfileTotals({editions:{one:{groups:[{id:'generales',categories:[{nominees:[nominee]}]}]}}});
 assert.equal(totals.size,10);
 for(const [key,total] of totals){assert.equal(total.nominations,1);assert.equal(total.awards,key==='emanuel'?1:0);}
});

test('Bonju recibe producción y extras; Maria Villegas y Dua Lingo conservan sus extras adicionales',()=>{
 const {context:c}=context(),totals=c.awardProfileTotals(archive);
 for(const [name,nominations,awards] of [['Bonju',28,9],['Maria',14,5],['Dua Lingo',5,1]]){
  const actual=totals.get(castKey(name));assert.equal(actual.nominations,nominations,name);assert.equal(actual.awards,awards,name);
 }
 assert.equal(vm.runInContext("awardIdentity('Maria Villegas')",c),'Maria');
 const noExtras=JSON.parse(JSON.stringify(archive));delete noExtras.profileExtras;
 assert.equal(c.awardProfileTotals(noExtras).get('bonju').nominations,5);
 assert.equal(c.awardProfileTotals(noExtras).get('bonju').awards,1);
});

test('las categorías principales destacan al ganador con su fondo, laureles y los otros nominados debajo',()=>{
 const {context:c}=context();
 for(let i=1;i<=2;i++){
  const edition=archive.editions['edicion-'+i],item=catalog.content.awards[i-1];
  for(const [index,category] of edition.groups[0].categories.entries()){
   const html=c.awardMainCategory(category,index,item);
   assert(html.includes(item.stage));assert(html.includes('aw-laurels')&&html.includes('aw-crown'));
   assert(html.indexOf('aw-main-winner')<html.indexOf('aw-main-others'));
   assert.equal((html.match(/data-winner="true"/g)||[]).length,1);
   assert.equal((html.match(/data-winner="false"/g)||[]).length,category.nominees.length-1);
  }
 }
 const upcoming=archive.editions['edicion-3'];
 const html=c.awardMainCategory(upcoming.groups[0].categories[0],0,catalog.content.awards[2],true);
 assert(html.includes('Nominados por anunciar'));assert(!html.includes('is-award-winner')&&!html.includes('aw-crown'));
});

test('banners, imágenes altas, logos y seis trofeos existen con transparencia en los PNG y rutas válidas en Linux',async()=>{
 for(const item of catalog.content.awards){
  for(const file of [item.banner,item.art.background,item.art.logo.src,item.trophy,item.poopTrophy,item.stage]){
   let folder=root;
   for(const segment of file.split('/')){assert(fs.readdirSync(folder).includes(segment),file);folder=path.join(folder,segment);}
   const metadata=await sharp(folder).metadata();
   assert(metadata.width>10&&metadata.height>10);
   if(file.includes('-logo.')||file.endsWith('-trophy.png')&&!file.includes('-poop-'))assert(metadata.hasAlpha,file+' transparencia');
  }
  const logo=await sharp(path.join(root,item.art.logo.src)).metadata();
  assert.equal(logo.width,item.art.logo.width);assert.equal(logo.height,item.art.logo.height);
 }
});
