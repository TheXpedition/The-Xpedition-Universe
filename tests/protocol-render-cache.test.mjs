import test from 'node:test';
import assert from 'node:assert/strict';
import {ProtocolRenderer} from '../public/juegos/x-protocol/renderer-v2.mjs';

test('ceremony keeps the same seats and anchors without repainting 18 actors on every animation frame',()=>{
 const oldDocument=globalThis.document,oldMatchMedia=globalThis.matchMedia;
 let drawnPoses=0,composited=0,created=0,labels=0;
 const layerCtx={
  save(){},restore(){},translate(){},rotate(){},scale(){},clearRect(){},
  drawImage(){drawnPoses++;},strokeText(){},fillText(){labels++;}
 };
 const screenCtx={drawImage(){composited++;}};
 globalThis.matchMedia=()=>({matches:true});
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');created++;return {width:0,height:0,getContext(){return layerCtx;}};}};
 try{
  const renderer=new ProtocolRenderer({getContext(){return screenCtx;}},null);
  renderer.H=941;
  renderer.manifest={poses:{bruno:[{url:'seated-pose',width:100,height:200}]}};
  renderer.images.set('seated-pose',{width:100,height:200});
  const state={roster:Array.from({length:18},(_,i)=>({id:'player-'+i,name:'Actor '+i,characterId:'bruno',seat:i})),nominees:[],winner:null};
  renderer.anchors={};
  renderer.seats(state,100);
  assert.equal(drawnPoses,18);
  assert.equal(labels,18);
  assert.equal(Object.keys(renderer.anchors).length,18);
  renderer.anchors={};
  renderer.seats(state,140);
  renderer.seats(state,180);
  assert.equal(drawnPoses,18,'unchanged seats are composited without repainting character sprites');
  assert.equal(labels,18,'expensive outlined captions are drawn only once');
  assert.equal(composited,3,'cached layer remains visible on each frame');
  assert.equal(created,1,'the seat cache reuses one canvas');

  renderer.anchors={};
  renderer.seats({...state,winner:'player-0'},240);
  assert.equal(drawnPoses,36,'new winner invalidates the cache');
  renderer.anchors={};
  renderer.seats({...state,nominees:['player-0']},280);
  assert.equal(drawnPoses,53,'new nominee causes seated cast to be redrawn correctly');
  assert.equal(Object.keys(renderer.anchors).length,17,'nominee is no longer seated');
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldMatchMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=oldMatchMedia;
 }
});
