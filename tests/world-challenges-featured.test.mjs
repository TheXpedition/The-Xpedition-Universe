import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WORLD_CHALLENGE_CARDS} from '../public/juegos/world-challenge-cards.mjs';

const source=fs.readFileSync(new URL('../public/juegos/world-ui.mjs',import.meta.url),'utf8');
const start=source.indexOf('function renderChallenges(root){');
const end=source.indexOf('function renderShop(root){',start);
const markup=source.slice(start,end);

test('The Last Grip and Bonju Chef remain the only two playable challenge cards',()=>{
 assert(start>0&&end>start);
 assert(markup.includes('href="/juegos/last-grip/"'));
 assert(markup.includes('href="/juegos/bonju-chef/"'));
 assert.equal((markup.match(/class="featured-challenge(?: chef)?"/g)||[]).length,2);
 assert.doesNotMatch(markup,/challenge-catalog-heading|challenge-world-card|challenge-dodge-card|challenge-preview|ELIGE TU PRÓXIMO DESAFÍO/);
 assert.doesNotMatch(markup,/new WorldScene/);
});

test('fourteen supplied artwork cards appear immediately after active cards with no new section heading or entry controls',()=>{
 assert.equal(WORLD_CHALLENGE_CARDS.length,14);
 assert.equal(new Set(WORLD_CHALLENGE_CARDS.map(c=>c.id)).size,14);
 const expected=['apo-cars','gym-camila','the-hunt','the-x-feud','the-last-standing','critical-flow','the-brain','the-witching-hour','make-that-noise','death-zone','tactical-sketch','bunker-grid','shatter-point','knockout'];
 assert.deepEqual(WORLD_CHALLENGE_CARDS.map(c=>c.id),expected);
 for(const item of WORLD_CHALLENGE_CARDS){
  assert(item.title.length>=6&&item.category.length>=6&&item.description.length>=20);
  assert.equal(item.image,'/juegos/challenge-catalog/art/'+item.id+'.webp');
  const data=fs.readFileSync(new URL('../public'+item.image,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert(data.length<100000,'Cards should use the lightweight original logo');
 }
 assert(markup.includes("WORLD_CHALLENGE_CARDS.map(item=>"));
 assert(markup.includes('<article class="featured-challenge challenge-informative"'));
 assert(markup.includes('loading="lazy" decoding="async"'));
 const cards=markup.slice(markup.indexOf('WORLD_CHALLENGE_CARDS.map(item=>'));
 assert(!cards.includes('href='),'Informative cards cannot navigate to lobbies');
 assert(!cards.includes('<button'),'Informative cards cannot create buy, enter or preview buttons');
 assert.doesNotMatch(markup,/PRÓXIMAS PRUEBAS|MÁS RETOS|PROXIMAS PRUEBAS/);
});
