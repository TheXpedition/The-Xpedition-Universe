// Read-only production smoke test. No login credentials or live game actions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';

const WORLD='https://the-xpedition-universe.onrender.com';
const ENGINE='https://the-xpedition-protocol-virginia.onrender.com';
const MEDIA='https://the-xpedition-protocol-media.onrender.com';

async function probe(url,{method='GET',timeout=85000,redirect='manual'}={}){
 const started=performance.now();
 let response;
 try{response=await fetch(url,{method,redirect,signal:AbortSignal.timeout(timeout),cache:'no-store'});}
 catch(error){throw Error('NETWORK_PROBE_FAILED '+url+' after '+Math.round(performance.now()-started)+' ms: '+error.message);}
 const result={url,status:response.status,elapsedMs:Math.round(performance.now()-started),bytes:Number(response.headers.get('content-length')||0),type:response.headers.get('content-type'),location:response.headers.get('location')};
 console.log('PRODUCTION_SMOKE',JSON.stringify(result));
 return {response,result};
}

test('World and Virginia ceremony server answer real Internet health checks', {timeout:190000},async()=>{
 for(const origin of [ENGINE,WORLD]){
  const {response,result}=await probe(origin+'/api/health');
  assert.equal(result.status,200,'Health failed: '+JSON.stringify(result));
  assert((await response.text()).length>1,'Health response unexpectedly empty: '+origin);
 }
});
test('Real ceremony path redirects unauthenticated users to sign-in, not an error', {timeout:100000},async()=>{
 const {response,result}=await probe(WORLD+'/juegos/x-protocol/');
 assert.equal(result.status,302,'Ceremony guest entry did not redirect: '+JSON.stringify(result));
 assert.match(result.location||'',/auth=login/,'Guest access must redirect to login');
});
test('Published home page and independent intro video are actually reachable', {timeout:150000},async()=>{
 const home=await probe(WORLD+'/');
 assert.equal(home.response.status,200);
 assert.match(home.result.type||'',/text\/html/);
 assert.match(await home.response.text(),/The Xpedition/);
 const intro=await probe(MEDIA+'/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4',{method:'HEAD'});
 assert.equal(intro.response.status,200,'CDN introduction unavailable: '+JSON.stringify(intro.result));
 assert.match(intro.result.type||'',/video\/mp4/,'Expected an MP4 intro');
});
test('Real remote API rejects anonymous requests instead of crashing', {timeout:100000},async()=>{
 const {response,result}=await probe(WORLD+'/api/world/x-protocol');
 assert.equal(response.status,401,'Unauthenticated ceremony API should return 401: '+JSON.stringify(result));
});
