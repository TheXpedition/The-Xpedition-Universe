import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {worldApiPath,worldSocketPath} from '../public/juegos/world-api-path.mjs';
import {roomText} from '../world-room-paths.mjs';

const room='/world-play/servers/3e5bfaf1-856d-4456-ad80-02c950a0d89d';

test('World API requests retain the room prefix used by the server hub',()=>{
 assert.equal(worldApiPath('/world/x-protocol/history',room+'/juegos/'),room+'/api/world/x-protocol/history');
 assert.equal(worldApiPath('/world/bootstrap',room+'/juegos/x-protocol/'),room+'/api/world/bootstrap');
 assert.equal(worldApiPath('/api/world/x-protocol/history',room+'/juegos/'),room+'/api/world/x-protocol/history');
});

test('legacy single World URLs keep the root API route',()=>{
 assert.equal(worldApiPath('/world/x-protocol/history','/juegos/'),'/api/world/x-protocol/history');
 assert.equal(worldSocketPath('/world/live',room+'/juegos/'),room+'/api/world/live');
 assert.equal(worldSocketPath('/world/live','/juegos/'),'/api/world/live');
});

test('room proxy rewriting does not duplicate prefixes inside the shared path helper',async()=>{
 const source=await readFile(new URL('../public/juegos/world-api-path.mjs',import.meta.url),'utf8');
 const served=roomText(source,room),module=await import('data:text/javascript;base64,'+Buffer.from(served).toString('base64'));
 assert.equal(module.worldApiPath('/world/x-protocol/history',room+'/juegos/'),room+'/api/world/x-protocol/history');
 assert.equal(module.worldApiPath('/world/bootstrap',room+'/juegos/x-protocol/'),room+'/api/world/bootstrap');
 assert.equal(module.worldSocketPath('/world/live',room+'/juegos/x-protocol/'),room+'/api/world/live');
});
