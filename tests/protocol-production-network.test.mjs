// Read-only production smoke test. Never signs in, starts a live ceremony,
// modifies inventories, or sends STAFF actions to production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

const WORLD='https://the-xpedition-universe.onrender.com';
const ENGINE='https://the-xpedition-protocol-virginia.onrender.com';
const MEDIA='https://the-xpedition-protocol-media.onrender.com';
async function probe(url,{method='GET',timeout=85000,headers={}}={}){
 const started=performance.now();
 let response;
 try{response=await fetch(url,{method,headers,redirect:'follow',signal:AbortSignal.timeout(timeout),cache:'no-store'});}
 catch(error){throw Error('NETWORK_PROBE_FAILED '+url+' after '+Math.round(performance.now()-started)+' ms: '+error.message);}
 const elapsed=Math.round(performance.now()-started);
 const result={url,status:response.status,elapsedMs:elapsed,bytes:Number(response.headers.get('content-length')||0),type:response.headers.get('content-type')};
 console.log('PRODUCTION_SMOKE',JSON.stringify(result));
 return {response,result};
}

test('World and independent Virginia authority answer genuine external health requests', {timeout:200000},async()=>{
 for(const origin of [ENGINE,WORLD]){
  const {response,result}=await probe(origin+'/api/health');
  assert.equal(result.status,200,'Health failed: '+JSON.stringify(result));
  const body=await response.text();
  assert(body.length>1,'Health response was empty: '+origin);
 }
});
test('Real production ceremony HTML, JS, asset manifest and media can be downloaded', {timeout:250000},async()=>{
 const entries=[
  [WORLD+'/juegos/x-protocol/','text/html'],
  [WORLD+'/juegos/x-protocol/client.mjs','javascript'],
  [WORLD+'/juegos/x-protocol/assets.json','application/json'],
  [MEDIA+'/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4','video/mp4']
 ];
 for(const [url,type] of entries){
  const video=type==='video/mp4';
  const {response,result}=await probe(url,{method:video?'HEAD':'GET'});
  assert.equal(result.status,200,'Production asset unavailable: '+JSON.stringify(result));
  assert.match(result.type||'',new RegExp(type==='javascript'?'javascript':type.replace('/','\\/')),'Wrong content type: '+url);
  if(!video){
   const data=await response.text();
   assert(data.length>100,'Production asset unexpectedly empty: '+url);
   if(url.endsWith('/juegos/x-protocol/'))assert.match(data,/client\.mjs/,'The public page no longer loads the ceremony');
  }
 }
});
test('Unauthenticated spectators cannot control ceremony; network responses are not 5xx', {timeout:100000},async()=>{
 const {response,result}=await probe(WORLD+'/api/world/x-protocol');
 assert([401,403].includes(response.status),'Authenticated ceremony API should reject anonymous access, not fail: '+JSON.stringify(result));
});
