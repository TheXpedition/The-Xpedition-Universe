import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createProtocolRemoteProxy} from '../protocol-remote-proxy.mjs';

test('silent bridge stops delivering state and reconnects without losing World subscriptions', {timeout:10000},async()=>{
 let attempts=0;
 const deliveries=[];
 const client={user:{id:'test-player'},characterId:'bruno',zone:{id:'base'},p:{x:0,y:0},vitals:{}};
 const clients=new Map([[{},client]]);
 class FakeSocket extends EventEmitter {
  readyState=0;
  sent=[];
  constructor(){
   super();
   this.number=++attempts;
   setImmediate(()=>{this.readyState=1;this.emit('open');});
  }
  send(raw){this.sent.push(JSON.parse(raw));}
  ping(){if(this.number!==1)setImmediate(()=>this.emit('pong'));}
  terminate(){this.readyState=3;this.emit('close',1006,Buffer.alloc(0));}
  close(){this.readyState=3;this.emit('close',1000,Buffer.alloc(0));}
 }
 const sockets=[];
 const proxy=createProtocolRemoteProxy({
  serviceURL:'https://ceremony.example.test',
  secret:'12345678901234567890123456789012',
  clients,send:(_c,packet)=>deliveries.push(packet),heartbeatMs:35,
  makeSocket:()=>{const s=new FakeSocket();sockets.push(s);return s;}
 });
 const until=async predicate=>{
  const limit=Date.now()+4500;
  while(!predicate()&&Date.now()<limit)await new Promise(resolve=>setTimeout(resolve,10));
  assert(predicate(),'Expected automatic recovery of silent bridge');
 };
 try{
  await until(()=>sockets[0]?.readyState===1);
  await proxy.handle(client,{type:'protocol-subscribe'});
  assert.equal(client.protocolActive,true);
  await until(()=>attempts>=2&&sockets[1].sent.some(p=>p.type==='input'&&p.data.type==='protocol-subscribe'));
  assert.equal(proxy.bridgeStatus().connected,true);
  assert.equal(client.protocolActive,true);
  assert(sockets[1].sent.some(p=>p.type==='attach'&&p.player.id===client.user.id));
  assert(sockets[1].sent.some(p=>p.type==='sync'));
  assert.equal(deliveries.length,0);
 }finally{await proxy.close();}
});

test('live Virginia status frames keep the bridge connected without WebSocket ping', {timeout:10000},async()=>{
 let attempts=0;const timers=[];
 class StatusSocket extends EventEmitter{
  readyState=0;
  constructor(){
   super();attempts++;
   setImmediate(()=>{
    this.readyState=1;this.emit('open');
    const interval=setInterval(()=>this.emit('message',Buffer.from(JSON.stringify({
     type:'status',state:{id:null,phase:'CLOSED',revision:0,participants:[],invitees:[]}
    }))),10);
    timers.push(interval);
   });
  }
  send(){}
  terminate(){this.readyState=3;this.emit('close',1006,Buffer.alloc(0));}
  close(){this.readyState=3;this.emit('close',1000,Buffer.alloc(0));}
 }
 const proxy=createProtocolRemoteProxy({
  serviceURL:'https://ceremony.example.test',
  secret:'12345678901234567890123456789012',
  clients:new Map(),send(){},heartbeatMs:35,makeSocket:()=>new StatusSocket()
 });
 try{
  await new Promise(resolve=>setTimeout(resolve,190));
  assert.equal(attempts,1,'Regular authority state means no forced reconnect');
  assert.equal(proxy.bridgeStatus().connected,true);
 }finally{await proxy.close();for(const interval of timers)clearInterval(interval);}
});
