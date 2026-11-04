import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {BonjuApocalypsePresenter} from '../public/juegos/bonju-apocalypse-presenter.mjs';
import {BONJU_PRESENTER_ART} from '../public/juegos/bonju-presenter-art.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {castHeightRatio} from '../public/juegos/world-cast-proportions.mjs';
test('the ceremony uses the exact supplied transparent Bonju with a height just below Guillermo',async()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../design/bonju-apocalypse-presenter.json',import.meta.url))),bytes=fs.readFileSync(new URL('../public/juegos/hosts/bonju-apocalypse.png',import.meta.url)),metadata=await sharp(bytes).metadata();assert(metadata.hasAlpha);assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.sha256);assert.deepEqual(BONJU_PRESENTER_ART.bounds,proof.bounds);
 const map=WORLD_MAPS.eliminacion,guillermo=map.avatarHeight*1.35*castHeightRatio('guillermo'),ratio=map.presenter.height/guillermo;assert(ratio>.96&&ratio<.99);assert.equal(map.presenter.z,0);
});
test('Bonju is uniformly drawn with feet on the stage and no generated mesh or skew',()=>{
 const presenter=new BonjuApocalypsePresenter(),im={width:761,height:2105};presenter.image=im;const calls=[],ctx={save(){},restore(){},translate:(...a)=>calls.push(['translate',...a]),drawImage:(...a)=>calls.push(['draw',...a])};assert(presenter.draw(ctx,{x:500,y:700,height:300}));assert.deepEqual(calls[0],['translate',500,700]);const call=calls[1];assert.equal(call[1],im);assert.equal(call.at(-3),-300);assert.equal(call.at(-1),300);assert.equal(call.at(-2)/300,BONJU_PRESENTER_ART.bounds[2]/BONJU_PRESENTER_ART.bounds[3]);
});
