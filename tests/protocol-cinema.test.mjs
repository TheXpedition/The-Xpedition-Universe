import test from 'node:test';
import assert from 'node:assert/strict';
import {ProtocolCinema,shouldShowProtocolCinema} from '../public/juegos/x-protocol/cinema.mjs';
import {reclaimIdleWorlds} from '../world-media-stream.mjs';
import {MediaGate} from '../public/juegos/last-grip/media-gate.mjs';

test('an unfinished preload cannot reset playback after the shared start',async()=>{
 const f=fixture(),listeners=new Map();let loads=0;
 Object.assign(f.video,{readyState:0,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),load(){loads++;}});
 const media={url:'/intro.mp4',fallbackUrl:'/fallback.mp4'};
 const ready=f.player.prepare(media);
 f.player.sync({...media,key:'ceremony-intro'},{paused:false});
 await ready;f.retry();
 assert.equal(f.video.src,media.url);
 assert.equal(loads,1);
 assert.equal(listeners.size,0);
 f.player.destroy();
});
test('an ended video releases its black full-screen cover while the audience gate synchronizes',()=>{assert.equal(shouldShowProtocolCinema({key:'intro'},null),true);assert.equal(shouldShowProtocolCinema({key:'intro'},'intro'),false);assert.equal(shouldShowProtocolCinema({key:'next'},'intro'),true);assert.equal(shouldShowProtocolCinema(null,'intro'),false);});
function fixture(){let callback=null,ended=0,failed=0,plays=0;const video={paused:true,muted:false,volume:1,src:'',load(){},pause(){this.paused=true;},removeAttribute(){this.src='';},play(){plays++;this.paused=false;return Promise.resolve();}},note={hidden:true,textContent:''};const player=new ProtocolCinema({video,note,onEnded:()=>ended++,onFailed:()=>failed++,setTimer:fn=>{callback=fn;return 1;},clearTimer:()=>{callback=null;}});return {player,video,note,retry:()=>callback?.(),get ended(){return ended;},get failed(){return failed;},get plays(){return plays;}};}
test('a failed video is not a successful finish; a later real ended event is',()=>{
 const gate=new MediaGate({maxWaitMs:10000});
 const clip={key:'intro',start:0,duration:15070};
 gate.viewer('viewer',true,clip,()=>true);
 gate.failed('viewer','intro');
 assert.equal(gate.current.ended.has('viewer'),true);
 assert.equal(gate.current.completed.has('viewer'),false);
 gate.ended('viewer','intro');
 assert.equal(gate.current.completed.has('viewer'),true);
});
test('a failed intro retries from its source and cannot count as completed before the real ended event',async()=>{const f=fixture();f.player.sync({key:'intro',url:'/intro.mp4'},{paused:false});await Promise.resolve();f.video.onerror();assert.equal(f.failed,1);assert.equal(f.ended,0);assert.match(f.note.textContent,/Reconectando/);f.retry();assert.match(f.video.src,/intro.mp4\?playback-retry=1$/);assert.equal(f.ended,0);f.video.onplaying();assert.equal(f.note.hidden,true);f.video.onended();f.video.onended();assert.equal(f.ended,1);f.player.destroy();});
test('autoplay denial retries muted without any gesture, then allows sound on gesture and survives pause',async()=>{const f=fixture();let attempts=0;f.video.play=function(){attempts++;if(!this.muted)return Promise.reject(Object.assign(Error('gesture required'),{name:'NotAllowedError'}));this.paused=false;return Promise.resolve();};f.player.sync({key:'intro',url:'/intro.mp4'},{paused:false,enabled:true});await new Promise(resolve=>setImmediate(resolve));assert(attempts>=2,'automatic muted retry must run without user interaction');assert.equal(f.player.needsGesture,false);assert.equal(f.video.muted,true);assert.equal(f.video.paused,false);assert.equal(f.ended,0);f.player.unlock();assert.equal(f.video.muted,false);f.video.onplaying();f.video.onwaiting();assert.match(f.note.textContent,/Cargando/);f.player.sync({key:'intro',url:'/intro.mp4'},{paused:true});assert.equal(f.video.paused,true);assert.equal(f.video.src,'/intro.mp4');f.video.play=function(){this.paused=false;return Promise.resolve();};f.player.sync({key:'intro',url:'/intro.mp4'},{paused:false});assert.equal(f.video.src,'/intro.mp4');assert.equal(f.ended,0);f.video.onended();assert.equal(f.ended,1);f.player.destroy();});
test('a second ceremony with the same clip restarts from frame zero',async()=>{const f=fixture();f.player.sync({key:'first',url:'/intro.mp4'},{paused:false});await Promise.resolve();f.video.onended();f.video.currentTime=9.5;f.player.sync({key:'second',url:'/intro.mp4'},{paused:false});assert.equal(f.video.currentTime,0,'new ceremonies must not reuse the previous playback position');assert.equal(f.player.ended,false);f.player.destroy();});
test('the live intro keeps playing when its tab is hidden',async()=>{const f=fixture();f.player.sync({key:'live-intro',url:'/intro.mp4'},{paused:false,visible:false});await Promise.resolve();assert.equal(f.video.paused,false);assert.equal(f.plays,1);f.player.sync({key:'live-intro',url:'/intro.mp4'},{paused:false,visible:true});assert.equal(f.video.paused,false);assert.equal(f.plays,1);f.player.destroy();});
test('memory reclamation stops only unused worlds and preserves connected players and active requests',async()=>{const records=[{id:'online',connections:2,requests:0,used:1},{id:'loading',connections:0,requests:1,used:2},{id:'booting',booting:true,connections:0,requests:0,used:0},{id:'idle',connections:0,requests:0,used:3}],stopped=[];await reclaimIdleWorlds(records,async record=>stopped.push(record.id),()=>true);assert.deepEqual(stopped,['idle']);});
test('entry buffers the real intro without playing; release uses the prepared source once',async()=>{const f=fixture(),listeners=new Map();let loads=0;Object.assign(f.video,{autoplay:true,readyState:0,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),load(){loads++;}});const media={url:'/real-intro.mp4',duration:15070},ready=f.player.prepare(media);assert.equal(f.video.autoplay,false);assert.equal(f.plays,0);assert.equal(f.video.src,media.url);f.player.unlock();assert.equal(f.video.src,media.url,'a gesture must not replace the real intro with the warmup clip');listeners.get('canplay')();await ready;f.player.sync({...media,key:'live-intro'},{paused:false});await Promise.resolve();assert.equal(loads,1,'the shared start must not discard the buffered video');assert.equal(f.plays,1);assert.equal(f.video.muted,false);f.player.destroy();});
