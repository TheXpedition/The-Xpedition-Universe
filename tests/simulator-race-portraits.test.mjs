import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root=fileURLToPath(new URL('../',import.meta.url));
const html=readFileSync(path.join(root,'public/simulator/game/index.html'),'utf8');
const catalog=JSON.parse(readFileSync(path.join(root,'public/simulator/catalog.json'),'utf8'));
const start=html.indexOf('function raceSetPortraitSource(img, name){');
const end=html.indexOf('function raceGo(stage){',start);
assert(start>=0 && end>start);
const source=html.slice(start,end);
const image=name=>{
 const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const key=norm(name);
 const id=catalog.aliases?.[key]||key;
 return catalog.items.find(i=>i.id==='character:'+id)?.image||'/personajes/dani.png';
};
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const sandbox={window:{XPBridge:{image}},slug};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

test('Race uses actual shared catalog portraits for new characters, not its generic logo',()=>{
 for(const [name,expected] of [
  ['Kiara Mileena','/personajes/kiara-mileena.png'],
  ['Jessie Rabbit','/personajes/jessica-rabbit.png'],
  ['Jessica Rabbit','/personajes/jessica-rabbit.png'],
  ['Guillermo','/personajes/guillermo.png'],
 ]){
  const img={style:{},onerror:null,src:''};
  sandbox.img=img;sandbox.name=name;
  vm.runInContext('raceSetPortraitSource(img,name)',sandbox);
  assert.equal(img.src,expected,name);
  assert(existsSync(path.join(root,'public',img.src)),name+' has an existing image asset');
  assert.notEqual(img.src,'assets/race.png');
 }
});
