import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {PROTOCOL_MEDIA_LEGACY_INTRO,PROTOCOL_MEDIA_OFFICIAL_INTRO,selectProtocolIntro} from '../public/juegos/x-protocol/media-config.mjs';
import {createProtocolMedia} from '../world-protocol-media.mjs';
import {ProtocolCinema} from '../public/juegos/x-protocol/cinema.mjs';

test('user-uploaded official 14.83-second MP4 is available in the deployed public tree',async()=>{
 const file='./public/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4';
 const result=await stat(file);
 assert(result.isFile());
 assert(result.size>100000&&result.size<4000000,'optimized clip should download fast on mobile');
 assert.equal(PROTOCOL_MEDIA_OFFICIAL_INTRO.duration,14833);
 const media=createProtocolMedia({canDirect:async()=>true});
 assert.equal(await media.available(PROTOCOL_MEDIA_OFFICIAL_INTRO),true);
 assert.equal(await media.available({url:'/juegos/x-protocol/media/unuploaded-intro.mp4',duration:14833}),false);
 assert.equal(await media.available(PROTOCOL_MEDIA_LEGACY_INTRO),true);
});

test('only switch to the new official intro after the file exists; preserve intentional STAFF overrides',()=>{
 assert.deepEqual(selectProtocolIntro(null,false),PROTOCOL_MEDIA_LEGACY_INTRO);
 assert.deepEqual(selectProtocolIntro(PROTOCOL_MEDIA_LEGACY_INTRO,false),PROTOCOL_MEDIA_LEGACY_INTRO);
 assert.deepEqual(selectProtocolIntro(PROTOCOL_MEDIA_LEGACY_INTRO,true),PROTOCOL_MEDIA_OFFICIAL_INTRO);
 assert.deepEqual(selectProtocolIntro({...PROTOCOL_MEDIA_LEGACY_INTRO,duration:120},true),{...PROTOCOL_MEDIA_LEGACY_INTRO,duration:120},'STAFF override duration must be preserved');
 assert.deepEqual(selectProtocolIntro(null,true),PROTOCOL_MEDIA_OFFICIAL_INTRO);
 const custom={url:'/api/world/x-protocol/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.mp4',duration:18000};
 assert.deepEqual(selectProtocolIntro(custom,true),custom);
});

test('mobile playback starts muted without a play click, then any intentional interaction may enable audio',async()=>{
 let plays=0;
 const video={paused:true,muted:false,readyState:3,currentTime:0,volume:1,src:'',
  pause(){this.paused=true;},load(){},play(){plays++;this.paused=false;return Promise.resolve();},removeAttribute(){this.src='';}};
 const player=new ProtocolCinema({video,note:{hidden:true,textContent:''}});
 player.mobileStartMuted=true;
 player.sync({key:'intro',url:PROTOCOL_MEDIA_OFFICIAL_INTRO.url,duration:14833},{paused:false,enabled:true});
 await Promise.resolve();
 assert.equal(plays,1,'mobile video must start without waiting for a tap');
 assert.equal(video.paused,false);
 assert.equal(video.muted,true);
 player.unlock();
 assert.equal(player.userInteracted,true);
 assert.equal(video.muted,false,'sound is allowed after deliberate user interaction');
 player.destroy();
});
