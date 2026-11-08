const SAMPLE_LIMIT=600;

export function protocolMonitorFps(profile){
 const value=Number(profile?.fps);
 return Math.max(12,Math.min(60,Number.isFinite(value)?value:45));
}

const percentile=(values,p)=>{
 if(!values.length)return 0;
 const sorted=[...values].sort((a,b)=>a-b);
 return Math.round(sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))]*10)/10;
};

export function createProtocolMonitorMetrics({now=()=>globalThis.performance?.now?.()??Date.now(),limit=SAMPLE_LIMIT}={}){
 let phase='',phaseAt=0,phaseVisibleAt=null,lastFrame=null,frameDeltas=[],frameWork=[],phaseSamples=[],videoStarts=[],actionAcks=[],actionSerial=0;
 const actions=new Map();
 const keep=(list,value)=>{list.push(value);if(list.length>limit)list.splice(0,list.length-limit);};
 return {
  setPhase(next,at=now()){
   if(next===phase)return;
   if(phase)keep(phaseSamples,{phase,enteredAt:phaseAt,visibleMs:phaseVisibleAt===null?null:Math.round(phaseVisibleAt-phaseAt),heldMs:Math.max(0,Math.round(at-phaseAt))});
   phase=next;phaseAt=at;phaseVisibleAt=null;
  },
  frame(at=now(),workMs=0){
   if(lastFrame!==null&&at>=lastFrame)keep(frameDeltas,at-lastFrame);
   lastFrame=at;
   if(Number.isFinite(workMs)&&workMs>=0)keep(frameWork,workMs);
   if(phase&&phaseVisibleAt===null)phaseVisibleAt=at;
  },
  videoStarted(at=now()){
   if(phase==='INTRO_VIDEO')keep(videoStarts,Math.max(0,Math.round(at-phaseAt)));
  },
  actionStarted(label,at=now()){
   const id=++actionSerial;actions.set(id,{label:String(label||'action').slice(0,48),at});return id;
  },
  actionAcknowledged(id,at=now(),ok=true){
   const action=actions.get(id);if(!action)return;
   actions.delete(id);keep(actionAcks,{action:action.label,ms:Math.max(0,Math.round(at-action.at)),ok:!!ok});
  },
  snapshot(){
   const elapsed=frameDeltas.length?frameDeltas.reduce((sum,value)=>sum+value,0):0;
   const visibility=phaseSamples.slice();
   if(phase)visibility.push({phase,enteredAt:phaseAt,visibleMs:phaseVisibleAt===null?null:Math.round(phaseVisibleAt-phaseAt),heldMs:Math.max(0,Math.round(now()-phaseAt))});
   return Object.freeze({
    phase,
    fps:elapsed?Math.round(frameDeltas.length*1000/elapsed):0,
    p95FrameMs:percentile(frameDeltas,.95),
    p95WorkMs:percentile(frameWork,.95),
    framesOver50ms:frameDeltas.filter(value=>value>50).length,
    phaseVisibility:visibility,
    videoStartMs:videoStarts.slice(),
    actionAcks:actionAcks.slice()
   });
  }
 };
}
