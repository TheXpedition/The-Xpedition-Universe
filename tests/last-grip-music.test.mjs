import test from 'node:test';
import assert from 'node:assert/strict';
import {gripRoundMusic} from '../public/juegos/last-grip/music.mjs';
import {LoopingMusic} from '../public/juegos/world-music.mjs';

test('Last Grip music plays only in an active round, never over entry videos or waiting screens',()=>{
 const round={engaged:true,phase:'active',round:{id:'round-1'},paused:false};
 assert.equal(gripRoundMusic(round),true);
 for(const phase of ['lobby','opening','arrival','intro','guide','draw','ready','changing','preparation','ending','results','winner','finished'])assert.equal(gripRoundMusic({...round,phase}),false,phase);
 assert.equal(gripRoundMusic({...round,paused:true}),false);
 assert.equal(gripRoundMusic({...round,round:null}),false);
 assert.equal(gripRoundMusic({...round,engaged:false}),false);
 assert.equal(gripRoundMusic(round,{video:true}),false);
});

test('a pending audio play cannot resume a song after a video or leaving the challenge stops it',async()=>{
 let finish;class Audio{paused=true;play(){this.paused=false;return new Promise(resolve=>finish=resolve);}pause(){this.paused=true;}}
 const music=new LoopingMusic({tracks:{round:'round.mp3'},AudioClass:Audio});
 try{music.update('round');const voice=music.voices[0];music.stop();finish();await Promise.resolve();assert.equal(voice.audio.paused,true);assert.equal(music.voices.length,0);assert.equal(music.track,null);}finally{music.destroy();}
});
