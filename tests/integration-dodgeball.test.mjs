import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('El anfiteatro queda libre de burbujas de retos y los juegos conservan su menú',()=>{assert(!WORLD_MAPS.desafios.props.some(p=>p.portal?.zone.startsWith('challenge:')),'no challenge marker remains on the amphitheatre');const ui=fs.readFileSync(path.join(root,'public/juegos/world-ui.mjs'),'utf8');assert(ui.includes("a==='goto-dodgeball'"),'dodgeball menu action remains');assert(ui.includes("a==='challenge'"),'Ice Breaker menu action remains');assert(ui.includes("window.location.href='/juegos/reto-pelotas/'"),'dodgeball opens directly from its menu');assert(!ui.includes("Camina hasta el cartel ESQUIVA PELOTAS"),'removed markers are no longer required');});
test('Se conservan los accesos de los retos en las 48 zonas Apocalypse y los alias de partidas guardadas',()=>{
 assert.equal(Object.keys(WORLD_MAPS).length,48);
 for(const id of ['base','refugio-1','refugio-2','comida','confesionario','montana','cueva','muelle','desafios','eliminacion','mirador','termales','taller','bosque'])assert.ok(WORLD_MAPS[id]);
 assert.ok(WORLD_MAPS.desafios.props.some(p=>p.portal?.zone==='eliminacion'));
});
test('El reto está integrado bajo la misma ruta autenticada de World',()=>{
 const code=fs.readFileSync(path.join(root,'world-instance.mjs'),'utf8');
 const ui=fs.readFileSync(path.join(root,'public/juegos/world-ui.mjs'),'utf8');
 assert(code.includes('reto-pelotas/ws'),'arena WebSocket stays under World');assert(code.includes('world.access(user)'),'World access is still checked');
 assert(ui.includes('challenge:dodgeball'),'legacy challenge access remains recognized');assert(ui.includes('goto-dodgeball'),'arena menu remains connected');
 for(const item of ['index.html','style.css','game.js','poster.png','assets/cast/nahuee.webp','assets/scenery/panorama.webp'])assert.ok(fs.existsSync(path.join(root,'public/juegos/reto-pelotas',item)),item);
});
test('El menú STAFF no se concede por orden de llegada',()=>{
 const code=fs.readFileSync(path.join(root,'dodgeball-network.mjs'),'utf8');
 assert(code.includes('find(p=>p.ws.isDirector)'),'host election requires a director');
 assert(code.includes("m.t==='staff'&&r.host===p.id&&ws.isDirector"),'staff controls require an authorized host');
 assert(code.includes('ws.authenticatedName'),'names come from authenticated sessions');
});
