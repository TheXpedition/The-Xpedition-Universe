import test from 'node:test';import assert from 'node:assert/strict';import {CLINIC_CONTROLS,applyClinicalGesture,clinicalFocus,clinicalPath} from '../public/juegos/clinic-gestures.mjs';
test('each clinical care uses its own continuous gesture and requires server time before observation',()=>{
 for(const [kind,def]of Object.entries(CLINIC_CONTROLS)){let at=100000,s={kind,status:'active',step:1,hits:0,stepAt:at};for(let hit=0;hit<3;hit++){
  if(def.mode==='hold'){applyClinicalGesture(s,{phase:'start'},at);at+=1700+hit*150;applyClinicalGesture(s,{phase:'end'},at);}
  else if(def.mode==='focus'){const target=clinicalFocus(s);for(let i=0;i<7;i++){applyClinicalGesture(s,{phase:i?'move':'start',...target},at);at+=200;}}
  else{const points=clinicalPath(s);applyClinicalGesture(s,{phase:'start',...points[0]},at);for(const p of points.slice(1)){at+=350;applyClinicalGesture(s,{phase:'move',...p},at);}at+=250;applyClinicalGesture(s,{phase:'end',...points.at(-1)},at);}
  at+=300;
 }assert.equal(s.step,2,kind);assert.equal(s.hits,3,kind);assert.equal(s.status,'active',kind+' still awaits clinical observation');}
});
test('forged, instant, incomplete and out-of-position gestures never complete a care',()=>{
 const focus={kind:'exam',status:'active',step:1,hits:0};for(let i=0;i<100;i++)applyClinicalGesture(focus,{phase:'move',...clinicalFocus(focus)},100000);assert.equal(focus.hits,0);applyClinicalGesture(focus,{phase:'move',x:NaN,y:0},100000);assert.equal(focus.hits,0);
 const trace={kind:'bandage',status:'active',step:1,hits:0};applyClinicalGesture(trace,{phase:'start',x:.15,y:.6},100000);applyClinicalGesture(trace,{phase:'end',x:.85,y:.6},105000);assert.equal(trace.hits,0);
 const hold={kind:'pressure',status:'active',step:1,hits:0};applyClinicalGesture(hold,{phase:'start'},100000);applyClinicalGesture(hold,{phase:'end',hits:3},100001);assert.equal(hold.hits,0);assert.equal(applyClinicalGesture({...hold,step:2},{phase:'start'},100001).handled,false);
});
