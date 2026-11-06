import test from 'node:test';
import assert from 'node:assert/strict';
import {protocolWireInterval} from '../protocol-wire-cadence.mjs';
import {protocolDeliveryMedia} from '../protocol-media-delivery.mjs';
import {displayProtocolClock} from '../public/juegos/x-protocol/display-clock.mjs';
import {ProtocolCinema} from '../public/juegos/x-protocol/cinema.mjs';

test('video playback and passive scenes send fewer snapshots while votes and duels remain responsive',()=>{
 assert.equal(protocolWireInterval('INTRO_VIDEO'),1100);
 assert.equal(protocolWireInterval('CEREMONY_STAGE_VISIBLE'),1100);
 assert.equal(protocolWireInterval('RESULTS_REVEAL'),1100);
 assert.equal(protocolWireInterval('GROUP_VOTE'),500);
 assert.equal(protocolWireInterval('ADVANTAGE_WINDOW'),500);
 assert.equal(protocolWireInterval('LUCKY_SKULLS_PICKING'),250);
 assert.equal(protocolWireInterval('DUEL_ACTIVE'),250);
});

test('visible timer progresses smoothly without changing votes, server state or frozen pause',()=>{
 const episode={clock:10000,deadline:24000,paused:false};
 assert.equal(displayProtocolClock(episode,1000,1150),10150);
 assert.equal(displayProtocolClock(episode,1000,6000),11600,'clock never runs away after a socket disconnect');
 assert.equal(episode.clock,10000);
 assert.equal(episode.deadline,24000);
 assert.equal(displayProtocolClock({...episode,paused:true},1000,1500),10000);
});

test('CDN rewrites only bundled public video and always exposes local failover, never private STAFF uploads',()=>{
 const defaultClip={url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',duration:15070,key:'ceremony:INTRO_VIDEO'};
 const external=protocolDeliveryMedia(defaultClip,'https://protocol-cdn.example/');
 assert.equal(external.url,'https://protocol-cdn.example/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4');
 assert.equal(external.fallbackUrl,defaultClip.url);
 assert.equal(external.key,defaultClip.key);
 assert.deepEqual(defaultClip,{url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',duration:15070,key:'ceremony:INTRO_VIDEO'});
 for(const value of ['/api/world/x-protocol/media/private-clip','https://elsewhere.example/file.mp4','/juegos/x-protocol/media/../private.mp4']){
  const data={url:value};
  assert.equal(protocolDeliveryMedia(data,'https://protocol-cdn.example/'),data);
 }
 assert.equal(protocolDeliveryMedia(defaultClip,'http://insecure.example/'),defaultClip);
 assert.equal(protocolDeliveryMedia(defaultClip,'https://user:pass@cd.example/'),defaultClip);
});

test('when a CDN fails before the intro starts, the same player automatically buffers the local video',async()=>{
 const listeners=new Map(),loads=[];
 const video={paused:true,muted:false,readyState:0,src:'',volume:1,currentTime:0,autoplay:true,
  pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},
  load(){loads.push(this.src);},removeAttribute(){this.src='';},
  addEventListener(event,handler){listeners.set(event,handler);},
  removeEventListener(event){listeners.delete(event);}
 };
 let timer;
 const cinema=new ProtocolCinema({video,note:{hidden:true,textContent:''},setTimer(fn){timer=fn;return 1;},clearTimer(){}});
 const media={url:'https://protocol-cdn.example/juegos/x-protocol/media/intro.mp4',fallbackUrl:'/juegos/x-protocol/media/intro.mp4',duration:15070};
 const pending=cinema.prepare(media);
 assert.equal(video.src,media.url);
 listeners.get('error')();
 assert.equal(video.src,media.fallbackUrl);
 listeners.get('canplay')();
 await pending;
 cinema.sync({...media,key:'ceremony-1'},{paused:false,enabled:false});
 assert.equal(video.src,media.fallbackUrl,'the prepared local video should be reused, not downloaded again');
 assert.deepEqual(loads,[media.url,media.fallbackUrl]);
 assert.equal(video.paused,false);
 cinema.destroy();
});
