import test from 'node:test';import assert from 'node:assert/strict';import {roomText,roomData} from '../world-room-paths.mjs';
test('room URLs retain their server while relative imports and chat remain unchanged',()=>{
 const prefix='/world-play/servers/example',source="import a from '../juegos/shared/a.mjs'; fetch('/api/world/bootstrap'); video.src='/juegos/media/a.mp4';";
 const out=roomText(source,prefix);assert(out.includes("'../juegos/shared/a.mjs'"));assert(out.includes("fetch('"+prefix+"/api/world/bootstrap')"));assert(out.includes("src='"+prefix+"/juegos/media/a.mp4'"));
 assert.equal(roomText("https://example.com/juegos/file",prefix),"https://example.com/juegos/file");
 assert.deepEqual(roomData({url:'/juegos/x-protocol/',text:'/juegos/mi mensaje',media:{url:'/api/world/voice/one.mp3'}},prefix),{url:prefix+'/juegos/x-protocol/',text:'/juegos/mi mensaje',media:{url:prefix+'/api/world/voice/one.mp3'}});
});
