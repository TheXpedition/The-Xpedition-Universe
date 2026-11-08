import test from 'node:test';
import assert from 'node:assert/strict';
import {worldApiPath,worldSocketPath} from '../public/juegos/world-api-path.mjs';

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
