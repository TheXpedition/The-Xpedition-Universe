import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {createMariaVoice} from '../world-maria-voice.mjs';
import {AnnouncementPlayer,announcementURLAllowed} from '../public/juegos/world-announcement-player.mjs';
import {roomText} from '../world-room-paths.mjs';
const settle=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),release:()=>resolve()};};
class Response extends EventEmitter{
 chunks=[];ended=false;headersSent=false;
 writeHead(status,headers){Object.assign(this,{status,headers,headersSent:true});}
 flushHeaders(){}
 write(bytes){this.chunks.push(Buffer.from(bytes));}
 end(bytes){if(bytes)this.write(bytes);this.ended=true;}
}
test('global announcements publish immediately and send MP3 bytes before synthesis completes, then support byte ranges',async()=>{
 const mp3=readFileSync(new URL('../public/juegos/last-grip/media/fall-female.mp3',import.meta.url)),start=gate(),tail=gate(),published=[],errors=[];
 let generated=0;
 const voice=createMariaVoice({stream:async function*(text){generated++;await start.promise;yield mp3.subarray(0,1024);await tail.promise;yield mp3.subarray(1024);},onStart:a=>published.push(a),onError:a=>errors.push(a)});
 try{
  const a=voice.enqueue({id:randomUUID(),text:'Primera voz.'});
  assert.equal(published.length,1);assert.equal(generated,1);assert.equal(a.duration,null);assert.equal(a.streaming,true);
  const res=new Response(),url=new URL(a.url,'http://localhost');
  assert(await voice.handleHttp({method:'GET',headers:{range:'bytes=0-'}},res,url));
  assert.equal(res.status,200);assert.equal(res.headers['Content-Type'],'audio/mpeg');assert.equal(res.headers['Content-Length'],undefined);assert(!res.ended);
  start.release();await settle();assert.equal(Buffer.concat(res.chunks).length,1024);assert(!res.ended,'first frames reach a listener while the provider is still generating');
  const second=new Response();await voice.handleHttp({method:'GET',headers:{}},second,url);assert.equal(Buffer.concat(second.chunks).length,1024,'late listeners receive the beginning too');
  tail.release();for(let i=0;i<50&&!res.ended;i++)await settle();assert(res.ended);assert(second.ended);assert.deepEqual(Buffer.concat(res.chunks),mp3);assert.deepEqual(Buffer.concat(second.chunks),mp3);assert.equal(errors.length,0);
  const range=new Response();await voice.handleHttp({method:'GET',headers:{range:'bytes=0-1'}},range,url);assert.equal(range.status,206);assert.equal(Buffer.concat(range.chunks).length,2);
  const head=new Response();await voice.handleHttp({method:'HEAD',headers:{}},head,url);assert.equal(head.headers['Content-Length'],mp3.length);assert.equal(head.chunks.length,0);
  await assert.rejects(voice.handleHttp({method:'GET',headers:{}},new Response(),new URL('/api/world/voice/'+randomUUID()+'.mp3','http://localhost')),e=>e.status===404);
 }finally{start.release();tail.release();voice.close();}
});
function context(){const sources=[];return {sources,state:'suspended',currentTime:0,destination:{},resume:async function(){this.state='running';},close:async()=>{},decodeAudioData:async()=>({duration:2}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),createBufferSource:()=>{const s={connect(){},disconnect(){},start(){},stop(){this.onended?.();}};sources.push(s);return s;}};}
class NativeAudio{
 paused=true;currentTime=0;calls=[];
 async play(){this.calls.push(this.src);this.paused=false;this.onplaying?.();}
 pause(){this.paused=true;}
 load(){}
 removeAttribute(key){if(key==='src')this.src='';}
}
const clip=text=>({id:randomUUID(),url:'/api/world/voice/'+randomUUID()+'.mp3',text,sequence:1,streaming:true,startsAt:Date.now(),duration:null});

test('voice accepts its own isolated World room paths, while rejecting foreign rooms and remote URLs',async()=>{
 const room='/world-play/servers/room-a',a=clip('María en este servidor'),url=room+a.url;
 assert(announcementURLAllowed(url,room+'/juegos/x-protocol/'));assert(announcementURLAllowed(a.url,room+'/juegos/'));
 assert(!announcementURLAllowed('/world-play/servers/room-b'+a.url,room+'/juegos/'));assert(!announcementURLAllowed('https://evil.invalid'+a.url,room+'/juegos/'));
 const previous=globalThis.location;globalThis.location={pathname:room+'/juegos/x-protocol/'};const ctx=context(),audio=new NativeAudio(),p=new AnnouncementPlayer({createContext:()=>ctx,createAudio:()=>audio});
 try{await p.unlock();p.add({...a,url});await settle();assert.equal(audio.calls.at(-1),url);assert(p.speaking);}finally{p.destroy();if(previous===undefined)delete globalThis.location;else globalThis.location=previous;}
});

test('protocol visuals preload before the intro ends and stale narration cannot outlive its screen',()=>{
 const source=roomText(readFileSync(new URL('../public/juegos/x-protocol/client.mjs',import.meta.url),'utf8'),'/world-play/servers/room-a');
 assert(source.includes("$('#monitor-caption').style.visibility='visible'"));assert(!source.includes("?'hidden':'visible'"));assert(source.includes("void entryResources.prepare(state)"));assert(source.includes('renderer.preloadEntry(s)'));assert(source.includes('cinema.prepare(s.entryMedia||s.cinematic||s.media?.intro)'));assert(source.includes('visible:!document.hidden'));assert(source.includes('cinema.syncClock(protocolClock())'));assert(source.includes('announcer.cancelEvent(old.speech.id)'));
});
test('native audio opens streaming speech immediately after gesture unlock without fetching or decoding the whole MP3',async()=>{
 const ctx=context(),audio=new NativeAudio();let fetched=0;const p=new AnnouncementPlayer({createContext:()=>ctx,createAudio:()=>audio,fetcher:()=>{fetched++;throw Error('must stream');}});
 try{const a=clip('Uno'),b={...clip('Dos'),sequence:2};p.add(a);assert.equal(audio.calls.length,0);await p.unlock();await settle();assert.match(audio.calls[0],/^data:audio\/wav/);assert.equal(audio.calls[1],a.url);assert.equal(fetched,0);assert.equal(ctx.sources.length,0);assert(p.speaking);p.add(a);p.add(b);assert.equal(audio.calls.length,2);audio.onended();await settle();assert.equal(audio.calls[2],b.url);assert.equal(p.caption.text,'Dos');p.setEnabled(false);assert(audio.paused);assert.equal(p.current,null);assert.equal(p.queue.length,0);}finally{p.destroy();}
});
test('the protocol discards stale speech instead of letting its voice run into the next screen',async()=>{
 const ctx=context(),audio=new NativeAudio(),p=new AnnouncementPlayer({createContext:()=>ctx,createAudio:()=>audio}),a={...clip('Primero'),eventId:'episode:speech:1'},b={...clip('Después'),eventId:'episode:speech:2',sequence:2};
 try{await p.unlock();p.add(a);await settle();p.add(b);assert.equal(p.current.eventId,a.eventId);assert.equal(p.queue.length,1);assert(p.cancelEvent(a.eventId));await settle();assert.equal(p.current.eventId,b.eventId);assert(audio.paused===false);assert.equal(audio.calls.at(-1),b.url);}finally{p.destroy();}
});
test('a delayed protocol voice is cancelled silently and closes listeners',async()=>{
 const cancelled=[],errors=[],id=randomUUID();const voice=createMariaVoice({stream:async function*(_text,{signal}){await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));},onCancel:a=>cancelled.push(a),onError:a=>errors.push(a)});
 try{const a=voice.enqueue({id,eventId:'episode:speech:1',text:'Tarde'});assert.equal(a.eventId,'episode:speech:1');const res=new Response();await voice.handleHttp({method:'GET',headers:{}},res,new URL(a.url,'http://localhost'));await settle();assert(voice.cancel(id));assert.equal(cancelled[0].eventId,a.eventId);assert(res.ended);await settle();assert.deepEqual(errors,[]);assert.equal(voice.live().length,0);}finally{voice.close();}
});
test('streaming audio falls back once to buffered playback if native MP3 streaming is unsupported',async()=>{
 const ctx=context(),audio=new NativeAudio();let fetched=0;const p=new AnnouncementPlayer({createContext:()=>ctx,createAudio:()=>audio,fetcher:async()=>{fetched++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 try{await p.unlock();p.add(clip('Compatible'));await settle();audio.onerror();await settle();assert.equal(fetched,1);assert.equal(ctx.sources.length,1);assert.equal(p.current.native,false);assert(p.speaking);ctx.sources[0].onended();assert.equal(p.current,null);}finally{p.destroy();}
});
