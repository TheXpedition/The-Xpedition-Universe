import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {DESIGN_WIDTH,castScale,seatLayout} from '../public/juegos/x-protocol/scene-layout.mjs';
import {ProtocolRenderer} from '../public/juegos/x-protocol/renderer-v2.mjs';

test('transient artwork failure can recover in the same ceremony',async()=>{
 const oldImage=globalThis.Image,oldMatchMedia=globalThis.matchMedia,oldNow=Date.now;
 let attempts=0,time=1000;
 globalThis.matchMedia=()=>({matches:true});Date.now=()=>time;
 globalThis.Image=class {async decode(){if(++attempts===1)throw Error('temporary 503');}};
 const renderer=new ProtocolRenderer({getContext(){return {};}},null);
 try{
  assert.equal(await renderer.image('stage.webp'),null);
  assert.equal(await renderer.image('stage.webp'),null);
  assert.equal(attempts,1);
  time+=2001;
  assert(await renderer.image('stage.webp'));
  assert.equal(attempts,2);
 }finally{renderer.destroy();globalThis.Image=oldImage;globalThis.matchMedia=oldMatchMedia;Date.now=oldNow;}
});

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

test('Alice and Gabriel Sab use calibrated seating and face the stage from either side',()=>{
 const oldDocument=globalThis.document,oldMatchMedia=globalThis.matchMedia;
 const context={clearRect(){},drawImage(){}};
 globalThis.matchMedia=()=>({matches:true});
 globalThis.document={createElement:()=>({getContext:()=>context})};
 try{
  const renderer=new ProtocolRenderer({getContext:()=>context},null);
  renderer.manifest=JSON.parse(readFileSync(new URL('../public/juegos/x-protocol/assets.json',import.meta.url),'utf8'));
  const draws=[];
  renderer.pose=(p,index,x,y,h,options)=>draws.push({p,index,x,y,h,...options});
  renderer.label=()=>{};
  for(const seat of [1,10]){
   const roster=['alice','gabrielsab'].map(characterId=>({id:characterId,characterId,seat,name:characterId}));
   renderer.seats({roster,nominees:[]},0);
   for(const {p,index,x,y,h,flip} of draws.splice(0)){
    const meta=renderer.manifest.poses[p.characterId][0],a=seatLayout(p.seat);
    assert.equal(index,0);
    assert(existsSync(new URL('../public/juegos/x-protocol/'+meta.url,import.meta.url)));
    assert.equal(flip!==Boolean(meta.facesLeft),seat>=9);
    assert(h<renderer.H*a.height*castScale(p.characterId));
    const width=h*meta.width/meta.height;
    assert(Math.abs(x+(flip?-1:1)*(meta.hip.x-.5)*width-a.x*DESIGN_WIDTH)<1e-8);
    assert(Math.abs(y-(1-meta.hip.y)*h-a.y*renderer.H)<1e-8);
   }
  }
  renderer.destroy();
 }finally{globalThis.document=oldDocument;globalThis.matchMedia=oldMatchMedia;}
});

test('mobile canvas surfaces use fewer pixels and preserve design coordinates after rotation',()=>{
 const oldMatchMedia=globalThis.matchMedia;
 globalThis.matchMedia=()=>({matches:false});
 const surface=()=>{const transforms=[],ctx={setTransform(...args){transforms.push(args);}};
  return {width:1672,height:941,getContext:()=>ctx,transforms};
 };
 try{
  const canvas=surface(),foreground=surface(),renderer=new ProtocolRenderer(canvas,foreground,{mobile:true});
  renderer.resize(844,252);
  assert.equal(renderer.H,Math.round(1672*252/844));
  assert.equal(canvas.width,1024);assert.equal(foreground.width,canvas.width);
  assert.equal(canvas.height,foreground.height);
  assert.deepEqual(canvas.transforms.at(-1),[1024/1672,0,0,1024/1672,0,0]);
  renderer.resize(390,220);
  assert.equal(canvas.width,640);assert.equal(canvas.height,Math.round(renderer.H*640/1672));
  assert.deepEqual(foreground.transforms.at(-1),[640/1672,0,0,640/1672,0,0]);
  renderer.destroy();
  const desktop=surface(),desktopRenderer=new ProtocolRenderer(desktop,null);
  desktopRenderer.resize(1366,600);
  assert.equal(desktop.width,1672);assert.deepEqual(desktop.transforms,[]);
  desktopRenderer.destroy();
 }finally{globalThis.matchMedia=oldMatchMedia;}
});

test('background lighting is composited once per image, phase and size',()=>{
 const oldDocument=globalThis.document,oldMatchMedia=globalThis.matchMedia;
 const rendered=[];
 const target={filter:'none',drawImage(image){rendered.push([image,this.filter]);}};
 const layer={width:0,height:0,getContext(){return target;}};
 globalThis.matchMedia=()=>({matches:false});
 globalThis.document={createElement(){return layer;}};
 try{
  const renderer=new ProtocolRenderer({getContext(){return {};}},null);
  const stage={},duel={};
  assert.equal(renderer.background(stage,'dusk'),stage);
  assert.equal(renderer.background(stage,'day'),layer);
  assert.equal(renderer.background(stage,'day'),layer);
  assert.deepEqual(rendered,[[stage,'brightness(1.12) saturate(.85)']]);

  renderer.background(stage,'night');
  renderer.background(duel,'night');
  renderer.H=800;
  renderer.background(duel,'night');
  assert.equal(layer.height,800);
  const night='brightness(.78) saturate(.8)';
  assert.deepEqual(rendered.slice(1),[[stage,night],[duel,night],[duel,night]]);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldMatchMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=oldMatchMedia;
 }
});
