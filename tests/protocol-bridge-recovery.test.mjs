import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createProtocolRemoteProxy} from '../protocol-remote-proxy.mjs';

test('failed remote ceremony handshake must not kill the World room worker; retry reconnects', {timeout:10000},async()=>{
 let attempts=0;
 class FakeSocket extends EventEmitter{
  readyState=0;
  constructor(){
   super();
   const current=++attempts;
   setImmediate(()=>{
    if(current===1){
     this.readyState=3;
     this.emit('error',Object.assign(Error('Simulated remote Render sleep/handshake refusal'),{code:'ECONNREFUSED'}));
     this.emit('close',1006);
    }else{
     this.readyState=1;
     this.emit('open');
    }
   });
  }
  send(_message){}
  terminate(){this.readyState=3;this.emit('close',1006);}
  close(){this.readyState=3;this.emit('close',1000);}
 }
 const proxy=createProtocolRemoteProxy({
  serviceURL:'https://ceremony.example.test',
  secret:'12345678901234567890123456789012',
  clients:new Map(),send(){},makeSocket:()=>new FakeSocket()
 });
 try{
  await proxy.ready;
  assert.equal(proxy.bridgeStatus().connected,false,'World startup must not block on remote authority');
  const limit=Date.now()+3500;
  while(!proxy.bridgeStatus().connected&&Date.now()<limit)await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(proxy.bridgeStatus().connected,true,'Bridge reconnects after a rejected handshake');
  assert(attempts>=2,'Expected another attempt to the remote engine');
  await proxy.close();
  await assert.rejects(proxy.handle({user:{id:'test-staff'}},{type:'protocol-subscribe'}),{status:503});
 }finally{await proxy.close();}
});
