import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../public/juegos/world-ui.mjs',import.meta.url),'utf8');
const start=source.indexOf('function renderChallenges(root){');
const end=source.indexOf('function renderShop(root){',start);
const markup=source.slice(start,end);

test('challenge catalog presents only the two existing featured challenges',()=>{
 assert(start>0&&end>start);
 assert.match(markup,/href="\\/juegos\\/last-grip\\/"/);
 assert.match(markup,/href="\\/juegos\\/bonju-chef\\/"/);
 assert.doesNotMatch(markup,/challenge-catalog-heading|challenge-world-card|challenge-dodge-card|challenge-preview|ELIGE TU PRÓXIMO DESAFÍO/);
 assert.equal((markup.match(/class="featured-challenge(?: chef)?"/g)||[]).length,2);
 assert.doesNotMatch(markup,/new WorldScene/);
});
