import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {trackSnapshot,paintTrack} from '../public/juegos/track-image.mjs';
test('track export contains every table row and offscreen episode, without modal background or absent-cell dashes',()=>{
 const dom=new JSDOM('<table><thead><tr><th>Participante</th><th>EP 1</th><th>EP 2</th></tr></thead><tbody><tr><th><strong>Ivy</strong><small>Usuario</small></th><td style="background:red">ELIM</td><td style="background:#160f0b"></td></tr><tr><th><strong>Ari Santana</strong><small>Otro usuario</small></th><td>SAFE</td><td>WIN</td></tr></tbody></table>');const table=dom.window.document.querySelector('table');
 for(const row of table.rows){row.getBoundingClientRect=()=>({height:43});[...row.cells].forEach((cell,i)=>cell.getBoundingClientRect=()=>({width:i?50:270}));}
 const shot=trackSnapshot(table);assert.equal(shot.width,370);assert.equal(shot.height,129);assert.equal(shot.rows.length,3);assert.equal(shot.rows[1].cells[2].text,'');
 const text=[],rects=[],ctx=new Proxy({font:'',measureText:s=>({width:s.length*6}),fillText:s=>text.push(s),fillRect:(...a)=>rects.push(a)},{get:(o,k)=>o[k]||(()=>{})});paintTrack(ctx,shot);assert(text.includes('Ivy'));assert(text.includes('Ari Santana'));assert(text.includes('EP 2'));assert(!text.includes('—'));assert(!text.some(t=>/Desempeño|Ceremonias/.test(t)));assert(!rects.some(([x,y,w,h])=>x===0&&y===0&&w===shot.width&&h===shot.height));dom.window.close();
});
