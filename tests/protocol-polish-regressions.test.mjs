import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import sharp from 'sharp';import {JSDOM} from 'jsdom';
import {mountProtocolPolish} from '../public/juegos/x-protocol/polish-ui.mjs';import {createProtocol,protocolView} from '../public/juegos/x-protocol/engine.mjs';

test('all ten illustrated duel guides embed the correct image MIME and valid preview coordinates',async()=>{
 const base=new URL('../public/juegos/x-protocol/art/guides/',import.meta.url);
 for(const file of (await fs.readdir(base)).filter(f=>f.endsWith('.svg'))){const svg=await fs.readFile(new URL(file,base),'utf8'),tag=/<image[^>]+>/.exec(svg)?.[0],m=/href="data:([^;]+);base64,([^"]+)"/.exec(tag);assert(m,file);const meta=await sharp(Buffer.from(m[2],'base64')).metadata();assert.equal(m[1],meta.format==='jpeg'?'image/jpeg':'image/'+meta.format,file);assert.match(tag,/x="44" y="187" width="640" height="360"/,file);assert(!svg.includes('65536'),file);const png=await sharp(Buffer.from(svg)).resize(400,225).png().toBuffer();assert(png.length>10000,file+' contains its illustration');}
});

test('skull elements remain mounted while order, narration, turns, picks and pause states change',async()=>{
 const html=await fs.readFile(new URL('../public/juegos/x-protocol/index.html',import.meta.url),'utf8'),dom=new JSDOM(html);globalThis.window=dom.window;globalThis.document=dom.window.document;
 const ui=mountProtocolPolish({act:()=>{}}),s=createProtocol({id:'stable-skulls',now:0});s.phase='LUCKY_SKULLS_ORDER';s.roster=[{id:'a',name:'A',characterId:'arisantana'},{id:'b',name:'B',characterId:'ivy'},{id:'c',name:'C',characterId:'carmine'}];s.skulls={order:['a','b','c'],turn:0,picks:{},count:6,positions:{a:{x:.5,y:.94}}};
 try{const show=()=>ui.update(protocolView(s,{selfId:'a'}));show();const root=document.querySelector('#skull-stage'),first=root.querySelector('button'),image=first.querySelector('img'),monitor=document.querySelector('#monitor'),ranking=document.querySelector('#monitor-ranking');assert(!root.hidden);assert.equal(root.querySelectorAll('button').length,6);ranking.remove();show();assert.equal(document.querySelector('#monitor-ranking'),ranking);assert.equal(ranking.parentElement,monitor);s.phase='LUCKY_SKULLS_PICKING';show();assert.equal(root.querySelector('button'),first);assert(!first.disabled);s.paused=true;show();assert.equal(first.querySelector('img'),image);assert(first.disabled);s.paused=false;s.skulls.picks.a=0;s.skulls.turn=1;show();assert.equal(root.querySelector('button'),first);assert(first.classList.contains('chosen'));s.phase='LUCKY_SKULLS_REVEAL';s.secret.skulls=[3,1,6,2,4,5];show();assert.equal(first.querySelector('img'),image);assert(!root.hidden);
 }finally{ui.destroy();dom.window.close();delete globalThis.window;delete globalThis.document;}
});

