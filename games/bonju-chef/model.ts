import Phaser from 'phaser';
import {chefLobby} from '../../public/juegos/bonju-chef/lifecycle.mjs';
export const model:any={episode:null,boot:null,connected:false,coarse:matchMedia('(pointer:coarse)').matches,muted:false,uiKey:'',category:'all',basket:false,guidePage:0,selected:null,help:false,overview:false};
export const events=new Phaser.Events.EventEmitter();
export const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector(s) as T;
export function send(action:any){events.emit('send',action);}
export function notify(text:string){events.emit('notice',text);}
export const clock={value:0,target:0,at:0,received:-Infinity,key:'',paused:true,latency:0,
 sync(s:any){const t=performance.now(),key=s.id+':'+s.phase+':'+s.round;if(key!==this.key||s.paused!==this.paused||t-this.received>1500){this.value=s.clock;this.key=key;}else this.read(t);this.target=s.clock+(s.paused?0:this.latency);this.at=t;this.received=t;this.paused=s.paused;},
 read(t=performance.now()){const dt=Math.max(0,Math.min(1000,t-this.at));if(!this.paused&&t-this.received<1500){this.value+=dt*(1+Math.max(-.08,Math.min(.08,(this.target-this.value)/250)));this.target+=dt;}this.at=t;return this.value;},fresh(){return performance.now()-this.received<1200;}};
export const own=()=>model.episode?.roster.find((p:any)=>p.id===model.episode.selfId);
export const displayStation=()=>model.episode?.watchedStation||model.episode?.station;
export const displayActor=()=>model.episode?.roster.find((p:any)=>p.id===(model.episode.spectating?.id||model.episode.selfId));
export function sceneKey(){const s=model.episode;if(model.help)return 'TutorialScene';if(!s)return 'MariaIntroScene';if(chefLobby(s))return 'LobbyScene';if(s.phase==='kitchen'&&!s.spectating&&model.overview)return 'AudienceScene';if(s.phase==='kitchen'&&displayStation()){return ({prep:'StationPrepScene',blend:'StationBlendScene',cook:'StationCookScene',mix:'StationMixScene',plate:'StationPlateScene',served:'StationServeScene'} as any)[displayStation().stage];}return ({closed:'LobbyScene',lobby:'LobbyScene',tutorial:'TutorialScene',intro:'MariaIntroScene',recipe:s.round===(s.totalRounds||6)?'FinalScene':'RecipeAnnounceScene',fridge:model.basket?'IngredientSelectScene':'SharedFridgeScene',kitchen:'AudienceScene',judging:'JudgingScene',results:'GroupResultsScene',elimination:'EliminationScene',between:'GroupResultsScene',finalists:'FinalistsScene',winner:'WinnerScene',farewell:'FarewellScene',finished:'LobbyScene',cancelled:'LobbyScene'} as any)[s.phase]||'MariaIntroScene';}
