import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {installLandscapeMode} from '../public/world-landscape.mjs';
import {frontCameraTarget} from '../public/juegos/front-world.mjs';
import {WorldCamera} from '../public/juegos/world-camera.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';

test('illustrated exploration fills the viewport and keeps clicks aligned at map edges',()=>{
 for(const map of Object.values(WORLD_MAPS).filter(map=>map.projection==='front')){
  for(const [width,height] of [[1897,752],[844,350],[568,280],[1376,856],[390,705]]){
   for(const x of [12,map.spawn[0],map.width-12]){
    const y=map.spawn[1],camera=new WorldCamera();
    camera.update(frontCameraTarget(map,width,height,{x,y}),1,true);
    const left=camera.project(0,0,0,width,height);
    const right=camera.project(map.illustration.width,map.illustration.height/.62,0,width,height);
    assert(left.x<=.01&&left.y<=.01&&right.x>=width-.01&&right.y>=height-.01,map.id);
    const point=camera.project(x,y,0,width,height);
    const hit=camera.unproject(point.x,point.y,width,height);
    assert(Math.abs(hit.x-x)<.01&&Math.abs(hit.y-y)<.01,map.id);
   }
  }
 }
});

test('the phone gate releases on rotation even when viewport dimensions lag, and has a manual fallback',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://example.invalid'});
 const w=dom.window,orientation=new w.EventTarget(),landscape=new w.EventTarget();
 orientation.type='portrait-primary';
 landscape.matches=false;
 const globals={document:w.document,window:w,Event:w.Event,matchMedia:query=>query.includes('coarse')?{matches:true}:landscape,innerWidth:390,innerHeight:844,screen:{orientation}};
 const before=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 try{
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  let stops=0;
  w.addEventListener('world-landscape-blocked',()=>stops++);
  const mode=installLandscapeMode(),gate=document.querySelector('#world-landscape-gate');
  assert.equal(gate.hidden,false);
  assert(document.documentElement.classList.contains('world-needs-landscape'));
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(stops,1,'repeated viewport events should not resend stop commands');
  orientation.type='landscape-primary';
  orientation.dispatchEvent(new w.Event('change'));
  assert.equal(gate.hidden,true,'orientation wins while dimensions are stale');
  orientation.type='portrait-primary';
  orientation.dispatchEvent(new w.Event('change'));
  assert.equal(gate.hidden,false);
  landscape.matches=true;
  landscape.dispatchEvent(new w.Event('change'));
  assert.equal(gate.hidden,true,'the CSS orientation signal also releases the gate');
  landscape.matches=false;
  w.dispatchEvent(new w.Event('orientationchange'));
  assert.equal(gate.hidden,false);
  globalThis.innerWidth=844;
  globalThis.innerHeight=390;
  await new Promise(resolve=>setTimeout(resolve,280));
  assert.equal(gate.hidden,true,'delayed dimensions settle even without a resize event');
  globalThis.innerWidth=390;
  globalThis.innerHeight=844;
  w.dispatchEvent(new w.Event('pageshow'));
  assert.equal(gate.hidden,false);
  gate.querySelector('button').click();
  assert.equal(gate.hidden,true);
  assert(!document.documentElement.classList.contains('world-needs-landscape'));
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(gate.hidden,true,'manual dismissal remains in effect');
  mode.destroy();
  assert(!document.querySelector('#world-landscape-gate'));
 }finally{
  for(const [key,descriptor] of before)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  w.close();
 }
});
