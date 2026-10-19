import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('los mensajes recibidos suenan tras interactuar, sin duplicar ni sonar para mensajes propios',async()=>{
 const events={},listeners={},storage=new Map(),notes=[];let audio;
 class Audio{constructor(){this.state='suspended';this.currentTime=0;this.destination={};audio=this;}async resume(){this.state='running';}createOscillator(){return {frequency:{set value(value){notes.push(value);}},connect(){},start(){},stop(){}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
 const stream={addEventListener:(name,fn)=>listeners[name]=fn},context={state:{user:{id:'recipient'},stream},startStream(){},document:{addEventListener:(name,fn)=>events[name]=fn},window:{AudioContext:Audio,addEventListener(){}},navigator:{locks:{request:async(name,fn)=>fn()}},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},EventSource:class{}};
 vm.runInNewContext(fs.readFileSync(new URL('../public/message-notifications.js',import.meta.url),'utf8'),context);context.startStream();
 const message=(id,sender)=>({data:JSON.stringify({message:{id,sender:{id:sender}}})});
 await listeners.message(message('own','recipient'));assert.equal(notes.length,0);
 await listeners.message(message('before-interaction','sender'));assert.equal(notes.length,0);
 await events.pointerdown();assert.equal(audio.state,'running');
 await listeners.message(message('incoming','sender'));assert.deepEqual(notes,[740,988]);
 await listeners.message(message('incoming','sender'));assert.equal(notes.length,2);
 await listeners.message(message('second','sender'));assert.equal(notes.length,4);
});
