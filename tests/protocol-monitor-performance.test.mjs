import test from 'node:test';
import assert from 'node:assert/strict';
import {createProtocolMonitorMetrics,protocolMonitorFps} from '../public/juegos/x-protocol/monitor-performance.mjs';

test('ceremony monitor follows the user performance profile instead of forcing a 31 fps ceiling',()=>{
 assert.equal(protocolMonitorFps({fps:60}),60);
 assert.equal(protocolMonitorFps({fps:45}),45);
 assert.equal(protocolMonitorFps({fps:30}),30);
 assert.equal(protocolMonitorFps({fps:120}),60);
 assert.equal(protocolMonitorFps({fps:0}),12);
 assert.equal(protocolMonitorFps(undefined),45);
});

test('monitor records first visible frame, frame cost, intro start and staff acknowledgement across a full ceremony',()=>{
 const metrics=createProtocolMonitorMetrics({now:()=>0});
 const phases=['ELIMINATION_LOADING','INTRO_VIDEO','CEREMONY_STAGE_VISIBLE','MONITOR_BOOT','MARIA_INTRO','RESULTS_REVEAL','FIRST_NOMINEE','WINNER_NOMINATION','GROUP_VOTE','LUCKY_SKULLS_PICKING','LUCKY_SKULLS_REVEAL','SAFE_PLAYER_REVEAL','DUEL_TYPE_REVEAL','BETTING_PHASE','DUEL_ACTIVE','DUEL_RESULT','ELIMINATED_INTERVIEW','INVENTORY_GIFT','ELIMINATION_VIDEO','EPISODE_END_CARD','RETURN_TO_WORLD','ELIMINATION_FINISHED'];
 let clock=0;
 for(const phase of phases){
  metrics.setPhase(phase,clock);
  metrics.frame(clock+16,8);metrics.frame(clock+32,8);
  if(phase==='INTRO_VIDEO')metrics.videoStarted(clock+20);
  clock+=32;
 }
 const action=metrics.actionStarted('pause',clock);
 metrics.actionAcknowledged(action,clock+180);
 metrics.setPhase('DONE',clock+250);
 const result=metrics.snapshot();
 assert.equal(result.phaseVisibility.length,phases.length+1);
 assert(result.phaseVisibility.slice(0,phases.length).every(sample=>sample.visibleMs===16),JSON.stringify(result.phaseVisibility));
 assert.equal(result.phaseVisibility.at(-1).phase,'DONE');
 assert.deepEqual(result.videoStartMs,[20]);
 assert.equal(result.p95FrameMs,16);
 assert.equal(result.p95WorkMs,8);
 assert.deepEqual(result.actionAcks,[{action:'pause',ms:180,ok:true}]);
});

test('monitor reports slow frames so production profiling can distinguish dropped frames from delayed authority updates',()=>{
 const metrics=createProtocolMonitorMetrics();
 metrics.setPhase('GROUP_VOTE',0);
 metrics.frame(16,7);metrics.frame(82,65);metrics.frame(98,9);
 const result=metrics.snapshot();
 assert.equal(result.framesOver50ms,1);
 assert.equal(result.p95FrameMs,66);
 assert.equal(result.p95WorkMs,65);
});
