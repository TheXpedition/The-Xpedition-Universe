import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=fs.readFileSync(new URL('../public/showdown/solo/index.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1],bridge=fs.readFileSync(new URL('../public/showdown/solo/bridge.js',import.meta.url),'utf8'),all=JSON.parse(fs.readFileSync(new URL('../public/showdown/characters.json',import.meta.url))),shop=JSON.parse(fs.readFileSync(new URL('../public/simulator/catalog.json',import.meta.url))),owned=new Set(shop.items.filter(i=>i.kind==='character'&&i.starter).map(i=>i.id.slice(10))),characters=all.filter(c=>owned.has(c.id));
function create(format,snapshot=null){const dom=new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,''),{runScripts:'outside-only',url:'http://localhost/showdown/solo/',pretendToBeVisual:true}),c=dom.getInternalVMContext(),timers=new Map(),errors=[],saved=[];let sequence=0;dom.window.scrollTo=()=>{};dom.window.ShowdownSoloHost={characters,format,snapshot,ready(){},resize(){},save:s=>saved.push(JSON.parse(JSON.stringify(s))),restart(){}};dom.window.Image=class{set src(v){this._src=v;this.onload?.();}get src(){return this._src;}};dom.window.setTimeout=(fn)=>{timers.set(++sequence,fn);return sequence;};dom.window.clearTimeout=id=>timers.delete(id);dom.window.addEventListener('error',e=>{errors.push(e.error);e.preventDefault();});vm.runInContext(code,c);vm.runInContext(bridge,c);const evaluate=s=>vm.runInContext(s,c);function flush(){let guard=0;while(timers.size&&guard++<300){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}assert(guard<300,'Los temporizadores deben terminar.');}function click(sel){const b=dom.window.document.querySelector(sel);assert(b,'Existe '+sel);assert(!b.disabled,'Está disponible '+sel);b.click();flush();if(errors.length)throw errors.shift();}return {dom,c,evaluate,click,flush,saved,errors};}

test('solo conserva los formatos originales completos, elecciones manuales y un único ganador, sin reloj multijugador',()=>{
 for(const format of [2,3,4]){for(let run=0;run<1;run++){console.log('Comprobando formato solo',format);const app=create(format),doc=app.dom.window.document;app.click('#randomCast');assert.equal(new Set([...doc.querySelectorAll('#castGrid select')].map(s=>s.value)).size,18);assert([...doc.querySelectorAll('#castGrid select option')].every(o=>!o.value||characters.some(c=>c.name===o.value)));app.click('#nextBtn');doc.querySelector('input[name="advCount"][value="'+format+'"]').checked=true;app.click('#confirmFormat');let steps=0;
 while(steps++<220){app.flush();const stage=doc.querySelector('.stage.active').id;if(stage==='stage-6'&&app.evaluate('Object.values(finalRank).includes(1)'))break;
  if(stage==='stage-distribution'){app.click('#distRandomBtn');app.click('#distContinueBtn');}
  else if(stage==='stage-3'){if(!doc.querySelector('#toTrack').classList.contains('hide'))app.click('#toTrack');else app.click('#runChallenge');}
  else if(stage==='stage-top2'){app.click('#randomTop2');app.click('#confirmTop2');}
  else if(stage==='stage-lipsync-arena')app.click('#arenaContinueBtn');
  else if(stage==='stage-mirror-votes')app.click('#mirrorContinueBtn');
  else if(stage==='stage-adv4-elimination')app.click('#adv4DecisionContinue');
  else if(stage==='stage-semifinals-reveal')app.click('#semisRevealContinueBtn');
  else if(stage==='stage-return'){app.click('#returnChoices .clean-circle-card:not(.locked)');app.click('#confirmReturn');}
  else if(stage==='stage-star-cut')app.click('#starCutContinueBtn');
  else if(stage==='stage-final-tournament')app.click('#tourneyContinueBtn');
  else if(stage==='stage-6')app.click('#nextEpisode');
  else assert.fail('Escena sin salida: '+stage);
 }
 assert(steps<220,'La temporada termina');const result=JSON.parse(app.evaluate('JSON.stringify({selected18,finalRank,episode,stars,advFormat})'));assert.equal(result.selected18.length,18);assert.equal(Object.values(result.finalRank).filter(n=>n===1).length,1);assert.equal(Object.keys(result.finalRank).length,18);assert.equal(result.advFormat,format);assert.equal(result.episode,format===3?17:format===4?15:12);assert(!doc.querySelector('#sdClock'));assert(app.saved.some(s=>s.stage==='finished'));app.dom.window.close();}}
});

test('la simulación solo recupera elenco, distribución, estrellas y tabla al cerrar y volver a abrir',()=>{
 const app=create(3);app.click('#randomCast');app.click('#nextBtn');app.click('#confirmFormat');for(let i=0;i<3;i++){app.click('#distRandomBtn');app.click('#distContinueBtn');}app.click('#runChallenge');app.click('#randomTop2');app.click('#confirmTop2');app.click('#arenaContinueBtn');app.click('#toTrack');const checkpoint=app.saved.findLast(s=>s.stage==='track');assert(checkpoint);const restored=create(3,checkpoint);restored.flush();assert.equal(restored.evaluate('episode'),checkpoint.vars.episode);assert.equal(restored.evaluate('JSON.stringify(stars)'),JSON.stringify(checkpoint.vars.stars));assert.equal(restored.dom.window.document.querySelectorAll('#trkBody tr').length,18);assert.equal(restored.dom.window.document.querySelector('.stage.active').id,'stage-6');restored.click('#nextEpisode');assert.equal(restored.evaluate('episode'),2);app.dom.window.close();restored.dom.window.close();
});
