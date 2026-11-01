// Speech preparation and playback share one gate with the authoritative clock.
export class ProtocolNarration {
 constructor(now=Date.now){this.now=now;this.current=null;}
 start(speech,enqueue,message){const gate={speechId:speech.id,created:this.now(),startedAt:null,endsAt:null};this.current=gate;const start=clip=>{gate.startedAt=clip.startsAt;},complete=clip=>{gate.startedAt=clip.startsAt;gate.endsAt=clip.startsAt+clip.duration+150;},fail=()=>{gate.failed=true;gate.startedAt=this.now();gate.endsAt=this.now()+Math.min(7000,Math.max(2500,speech.text.length*45));};try{const result=enqueue({...message,onAudioStart:start,onAudioComplete:complete,onAudioError:fail});if(!result?.url)this.current=null;else gate.voiceId=result.id;}catch{fail();}}
 view(speech){const g=this.current;if(!g||g.speechId!==speech?.id)return null;const now=this.now(),expired=now-g.created>120000;return{speechId:g.speechId,voiceId:g.voiceId,failed:!!g.failed,pending:!expired&&(g.startedAt===null||now<g.startedAt),active:!expired&&(g.endsAt===null||now<g.endsAt)};}
 hold(state){const view=this.view(state.speech);if(!view?.active)return false;if(['DUEL_ACTIVE','DUEL_COUNTDOWN','INTRO_VIDEO'].includes(state.phase))return false;if(state.phase==='LUCKY_SKULLS_REVEAL'&&!view.pending)return state.clock-state.phaseAt>=Math.max(5500,(state.secret.skulls?.length||6)*450+1500);return true;}
}
