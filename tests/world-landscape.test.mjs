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

test('phone portrait blocks play, landscape releases it, and unsupported orientation locking never breaks World',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://example.invalid'}),names=['document','window','matchMedia','innerWidth','innerHeight','screen','Event'],before=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try{for(const [key,value]of Object.entries({document:dom.window.document,window:dom.window,Event:dom.window.Event,matchMedia:()=>({matches:true}),innerWidth:390,innerHeight:844,screen:{orientation:{lock:async()=>{throw Error('Unsupported');}}}}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  const mode=installLandscapeMode(),gate=document.querySelector('#world-landscape-gate');assert.equal(gate.hidden,false);assert(document.documentElement.classList.contains('world-needs-landscape'));
  await mode.request();assert.equal(gate.hidden,false);globalThis.innerWidth=844;globalThis.innerHeight=390;window.dispatchEvent(new Event('resize'));assert.equal(gate.hidden,true);assert(!document.documentElement.classList.contains('world-needs-landscape'));mode.destroy();assert(!document.querySelector('#world-landscape-gate'));
 }finally{for(const [key,descriptor]of before)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];dom.window.close();}
});
