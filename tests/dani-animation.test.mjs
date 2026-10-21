import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RIG,sampleDaniPose,walkFoot} from '../public/simulator/ice-breaker/dani-rig.mjs';
import {newRun,stepRun,jumpTo} from '../public/simulator/ice-breaker/engine.mjs';
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const options=p=>({...p,stride:p.walk});
function validate(pose){
 for(const name of ['farLeg','nearLeg','farArm','nearArm']){
  const limb=pose[name],leg=name.endsWith('Leg');
  for(const point of [limb.root,limb.joint,limb.end])assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
  assert(Math.abs(length(limb.root,limb.joint)-(leg?RIG.upperLeg:RIG.upperArm))<1e-7,name+' upper length');
  assert(Math.abs(length(limb.joint,limb.end)-(leg?RIG.lowerLeg:RIG.lowerArm))<1e-7,name+' lower length');
  if(leg){const a=limb.root,b=limb.joint,c=limb.end;assert((c.x-a.x)*(b.y-a.y)-(c.y-a.y)*(b.x-a.x)>0,'both knees bend forward');}
 }
}
test('a full walk and jump keep all four limbs at their model lengths, with knees on the same side',()=>{
 for(let i=0;i<720;i++)validate(sampleDaniPose({phase:'walk',stride:i/720*Math.PI*2}));
 const run=newRun();jumpTo(run,'f1');for(let i=0;i<155;i++){stepRun(run,{},1/120);validate(sampleDaniPose(options(run.player)));}
});
test('each supporting foot stays planted in the world throughout its contact interval',()=>{
 const scale=206.04/980;
 for(const near of [false,true]){
  let previous;
  for(let i=0;i<1000;i++){
   const cycle=i/1000,foot=walkFoot(cycle*Math.PI*2,near),pose=sampleDaniPose({phase:'walk',stride:cycle*Math.PI*2}),end=pose[near?'nearLeg':'farLeg'].end;
   assert(length(foot,end)<1e-7,'IK must reach the drawn foot');
   const worldX=-cycle*RIG.cycleDistance+end.x*scale;
   if(foot.contact&&previous?.contact)assert(Math.abs(worldX-previous.worldX)<.0001,'no sliding during contact');
   previous={contact:foot.contact,worldX};
  }
 }
});
test('stopping walking blends back to the resting pose',()=>{
 const run=newRun();for(let i=0;i<45;i++)stepRun(run,{x:1},1/120);const stride=run.player.walk;for(let i=0;i<85;i++)stepRun(run,{},1/120);assert.equal(run.player.walk,stride);assert.equal(run.player.phase,'idle');assert.equal(run.player.walkBlend,0);const rest=sampleDaniPose(options(run.player)),idle=sampleDaniPose({time:run.time});assert(length(rest.nearArm.end,idle.nearArm.end)<2);
});
test('the walk loop and apex have no pose discontinuity; takeoff and landing have no joint pops',()=>{
 const loopA=sampleDaniPose({phase:'walk',stride:0}),loopB=sampleDaniPose({phase:'walk',stride:Math.PI*2});
 for(const name of ['nearArm','farArm','nearLeg','farLeg'])assert(length(loopA[name].end,loopB[name].end)<1e-6);
 const run=newRun();jumpTo(run,'f1');let previous=sampleDaniPose(options(run.player));
 for(let i=0;i<155;i++){
  stepRun(run,{},1/120);const pose=sampleDaniPose(options(run.player));
  for(const name of ['nearArm','farArm','nearLeg','farLeg'])for(const point of ['joint','end'])assert(length(pose[name][point],previous[name][point])<24,name+' '+point+' popped');
  previous=pose;
 }
});
