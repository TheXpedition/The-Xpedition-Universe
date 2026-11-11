import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {createProtocolRemoteProxy} from '../protocol-remote-proxy.mjs';

class FakeSocket extends EventEmitter{
 readyState=0;
 constructor(){super();setImmediate(()=>{this.readyState=1;this.emit('open');});}
 send(){}
 close(){this.readyState=3;this.emit('close',1000,Buffer.alloc(0));}
 terminate(){this.readyState=3;this.emit('close',1006,Buffer.alloc(0));}
}

const harness=async (request,db)=>{
 const proxy=createProtocolRemoteProxy({
  serviceURL:'https://ceremony.example.test',
  secret:'12345678901234567890123456789012',
  scope:'',clients:new Map(),send(){},request,db,makeSocket:()=>new FakeSocket()
 });
 const server=http.createServer(async(req,res)=>{
  try{
   await proxy.handleHttp(req,res,new URL(req.url,'http://local.invalid'),{id:'player'},{
    json:(response,value,status=200)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});response.end(JSON.stringify(value));},
    body:async()=>({})
   });
  }catch(error){res.writeHead(error.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:async()=>{await proxy.close();await new Promise(resolve=>server.close(resolve));}};
};

test('GET start plan retries transient HTML 502 and recovers actual JSON',async()=>{
 let calls=0;const h=await harness(async()=>{calls++;return calls<3?new Response('<!DOCTYPE html><title>Bad Gateway</title>',{status:502,headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response(JSON.stringify({episodes:[],cast:[],final:null}),{status:200,headers:{'Content-Type':'application/json; charset=utf-8'}});});
 try{const response=await fetch(h.url+'/api/world/x-protocol/start-plan');assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/json/);assert.deepEqual(await response.json(),{episodes:[],cast:[],final:null});assert.equal(calls,3);}finally{await h.close();}
});

test('GET history reads recorded episodes while the remote engine returns 502',async()=>{
 const contestant={id:'player',characterId:'alice'};
 const episode={id:'previous-episode',episode:1,cast:[contestant]};
 let upstreamCalls=0;
 const h=await harness(async()=>{
  upstreamCalls++;
  return new Response('Bad Gateway',{status:502,headers:{'Content-Type':'text/html'}});
 },{
  async all(sql, key){
   return key==='x-protocol:public:%'?[{state:JSON.stringify(episode)}]:[];
  },
  async one(){return null;}
 });
 try{
  const response=await fetch(h.url+'/api/world/x-protocol/history');
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{season:'Apocalypse II',episodes:[episode],cast:[contestant],final:null});
  assert.equal(upstreamCalls,0);
 }finally{await h.close();}
});

test('POST control is never replayed and upstream HTML 502 is transformed to JSON error',async()=>{
 let calls=0;const h=await harness(async()=>{calls++;return new Response('<!DOCTYPE html><title>Bad Gateway</title>',{status:502,headers:{'Content-Type':'text/html'}});});
 try{const response=await fetch(h.url+'/api/world/x-protocol/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'pause'})});assert.equal(response.status,502);assert.match(response.headers.get('content-type'),/json/);assert.match((await response.json()).error,/Ceremonias/);assert.equal(calls,1);}finally{await h.close();}
});
