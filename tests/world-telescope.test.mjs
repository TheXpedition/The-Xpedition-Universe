import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {mountTelescope,telescopeGeometry} from '../public/juegos/world-telescope.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {applyWorldBeds,normalizeBeds} from '../public/juegos/world-beds.mjs';import {interactionPoint} from '../public/juegos/world-interactions.mjs';import {hasFloor} from '../public/juegos/world-motion.mjs';
test('panorama remains an interaction; pan bounds cover both lenses at wide and portrait sizes',()=>{
 assert.equal(Object.keys(WORLD_MAPS).length,48);assert(!WORLD_MAPS['panorama-telescopio']);
 for(const [w,h]of [[1440,700],[390,650],[900,300]])for(const pan of [-3,0,.5,1,5]){const g=telescopeGeometry(w,h,pan,2400,1028);assert(g.x<=g.centers[0]-g.r+.001);assert(g.x+g.width>=g.centers[1]+g.r-.001);assert(g.y<=g.cy-g.r);assert(g.y+g.height>=g.cy+g.r);}
});
test('binocular controls pan, receive world weather updates and release animation/listeners on close',()=>{
 const dom=new JSDOM('<main></main>'),win=dom.window,root=win.document.querySelector('main');let id=0,cancelled=0;
 win.requestAnimationFrame=()=>++id;win.cancelAnimationFrame=()=>cancelled++;win.HTMLCanvasElement.prototype.getContext=()=>({});win.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:900,height:500});
 class FakeImage{set src(v){this.value=v;}}
 const panel=mountTelescope(root,{image:'/panorama.webp',environment:{phase:'day',weather:'clear'},ImageClass:FakeImage});root.querySelector('[data-scope-right]').click();assert.equal(root.querySelector('input').value,'600');root.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(root.querySelector('input').value,'555');panel.update({phase:'night',weather:'snow'});panel.destroy();assert(cancelled);assert.equal(root.childElementCount,0);dom.window.close();
});
test('nine independent beds leave entrance and workbench aisles; all have reachable floor approaches',()=>{
 const maps=structuredClone(WORLD_MAPS);applyWorldBeds(maps,{'refugio-1':9,'dormitorio-2':9});assert.equal(normalizeBeds({'refugio-1':20})['refugio-1'],9);
 for(const id of ['refugio-1','dormitorio-2']){const map=maps[id],beds=map.props.filter(p=>p.sleepBed);assert.equal(beds.length,9);assert.equal(new Set(beds.map(p=>p.id)).size,9);for(const b of beds){assert.equal(b.seats.length,1);const p=interactionPoint(map,b);assert(hasFloor(map,p.x,p.y));assert(b.x/map.width>.17&&b.x/map.width<.8);}for(let i=0;i<9;i++)for(let j=i+1;j<9;j++)if(beds[i].y===beds[j].y)assert(Math.abs(beds[i].x-beds[j].x)>beds[i].artWidth);}
 const hut=maps['caseta-montana'];assert(hut.avatarHeight>=500);assert(hut.walkBand[0]>=.87);
});
