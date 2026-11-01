import {LoopingMusic} from '../world-music.mjs';
export const CEREMONY_TRACKS={ascent:'/juegos/x-protocol/audio/the-final-ascent.mp3',home:'/juegos/x-protocol/audio/a-long-walk-home.mp3'};
export function ceremonyTrack(state,{introEnded=false}={}){if(!state)return null;const p=state.phase;if(['CLOSED','LOBBY','ELIMINATION_LOADING','ELIMINATION_FINISHED','RETURN_TO_WORLD'].includes(p)||p==='INTRO_VIDEO'&&!introEnded)return null;return p==='DUEL_RESULT'&&state.clock-state.phaseAt>=1800||['DUEL_DRAW_CLOSING','ELIMINATED_INTERVIEW','INVENTORY_GIFT','ELIMINATION_VIDEO','EPISODE_END_CARD'].includes(p)?'home':'ascent';}
export class CeremonyMusic extends LoopingMusic{constructor(options={}){super({tracks:CEREMONY_TRACKS,...options});}}
