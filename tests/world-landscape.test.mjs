import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {installLandscapeMode} from '../public/world-landscape.mjs';
test('phone portrait blocks play, landscape releases it, and unsupported orientation locking never breaks World',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://example.invalid'}),names=['document','window','matchMedia','innerWidth','innerHeight','screen','Event'],before=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try{for(const [key,value]of Object.entries({document:dom.window.document,window:dom.window,Event:dom.window.Event,matchMedia:()=>({matches:true}),innerWidth:390,innerHeight:844,screen:{orientation:{lock:async()=>{throw Error('Unsupported');}}}}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  const mode=installLandscapeMode(),gate=document.querySelector('#world-landscape-gate');assert.equal(gate.hidden,false);assert(document.documentElement.classList.contains('world-needs-landscape'));
  await mode.request();assert.equal(gate.hidden,false);globalThis.innerWidth=844;globalThis.innerHeight=390;window.dispatchEvent(new Event('resize'));assert.equal(gate.hidden,true);assert(!document.documentElement.classList.contains('world-needs-landscape'));mode.destroy();assert(!document.querySelector('#world-landscape-gate'));
 }finally{for(const [key,descriptor]of before)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];dom.window.close();}
});
