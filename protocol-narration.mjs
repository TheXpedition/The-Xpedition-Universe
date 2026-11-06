// Speech can pace dialogue, but a delayed voice must never freeze the ceremony.
import {PROTOCOL_TIMED} from './public/juegos/x-protocol/engine.mjs';
export class ProtocolNarration {
 constructor(now=Date.now,{maxStartWaitMs=4500,cancelSpeech=()=>{}}={}){Object.assign(this,{now,maxStartWaitMs,cancelSpeech,current:null});}
 start(speech,enqueue,message){
  const previous=this.current;if(previous&&previous.speechId!==speech.id&&previous.voiceId)this.cancelSpeech(previous.voiceId);
  const gate={speechId:speech.id,created:this.now(),startedAt:null,endsAt:null,timedOut:false};this.current=gate;
  const start=clip=>{if(this.current===gate&&!gate.timedOut)gate.startedAt=clip.startsAt;};
  const complete=clip=>{if(this.current===gate&&!gate.timedOut){gate.startedAt=clip.startsAt;gate.endsAt=clip.startsAt+clip.duration+150;}};
  const fail=()=>{if(this.current===gate&&!gate.timedOut){gate.failed=true;gate.startedAt=this.now();gate.endsAt=this.now()+Math.min(7000,Math.max(2500,speech.text.length*45));}};
  try{const result=enqueue({...message,onAudioStart:start,onAudioComplete:complete,onAudioError:fail});if(!result?.url)this.current=null;else gate.voiceId=result.id;}catch{fail();}
 }
 cancelCurrent(){if(this.current?.voiceId)this.cancelSpeech(this.current.voiceId);this.current=null;}
 view(speech){
  const g=this.current;if(!g||g.speechId!==speech?.id)return null;const now=this.now();
  if(!g.timedOut&&g.startedAt===null&&now-g.created>=this.maxStartWaitMs){g.timedOut=true;if(g.voiceId)this.cancelSpeech(g.voiceId);}
  const expired=now-g.created>120000,active=!g.timedOut&&!expired&&(g.endsAt===null||now<g.endsAt);
  return{speechId:g.speechId,voiceId:g.voiceId,failed:!!g.failed,pending:active&&(g.startedAt===null||now<g.startedAt),active};
 }
 hold(state){const view=this.view(state.speech);if(!view?.active)return false;if(['DUEL_ACTIVE','DUEL_COUNTDOWN','INTRO_VIDEO'].includes(state.phase))return false;if(view.pending)return true;if(state.phase==='LUCKY_SKULLS_REVEAL')return state.clock-state.phaseAt>=Math.max(5500,(state.secret.skulls?.length||6)*450+1500);if(state.phase==='RESULTS_REVEAL')return state.clock-(state.speech.created??state.phaseAt)>=(state.config?.revealMs||3300);if(PROTOCOL_TIMED[state.phase])return state.clock-state.phaseAt>=PROTOCOL_TIMED[state.phase];return true;}
}
