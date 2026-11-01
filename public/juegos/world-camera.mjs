import {COUNCIL_PRESENTER as HOST} from './council-layout.mjs';
const mix=(a,b,t)=>a+(b-a)*t;
export function introTime(s,time){return Math.max(0,(s.paused?s.pausedAt:time)-s.introStarted+(s.introOffset||0))/1000;}
export function directedShot(s,players,time){
 if(!s||['preparation','summoning','finished','cancelled'].includes(s.phase)||s.camera?.shot==='free')return null;
 const present=players.filter(p=>s.participants.includes(p.userId)).sort((a,b)=>s.focusOrder?s.focusOrder.indexOf(a.userId)-s.focusOrder.indexOf(b.userId):0),group=present.length?{x:present.reduce((n,p)=>n+p.x,0)/present.length,y:present.reduce((n,p)=>n+p.y*.62-65,0)/present.length,zoom:present.length>5?.75:1}: {x:HOST.x,y:HOST.y*.62,zoom:.36};
 let shot=s.camera?.shot||'wide',target=s.camera?.target;
 if(s.phase==='intro'&&shot==='timeline'){const t=introTime(s,time);if(t<8)return {x:mix(HOST.x*.86,HOST.x,t/8),y:HOST.y*.62,zoom:mix(.32,.42,t/8),label:'APOCALYPSE · EL CONSEJO',night:1};if(t<25)return {...group,zoom:.85,label:'CAMINO AL CONSEJO',night:1};if(t<32){const who=present[Math.floor((t-25)/3.5)%Math.max(1,present.length)];return who?{x:who.x,y:who.y*.62-80,zoom:1.8,close:true,label:'LA EXPEDICIÓN',night:1}:{...group,night:1};}if(t<38)return {x:HOST.x*(t<35?.73:1),y:HOST.y*.62,zoom:.9,label:'EL CONSEJO',night:1};if(t<49)return {...group,zoom:.9,label:'CADA DECISIÓN CUENTA',night:1};shot='bonju';}
 if(shot==='participant'){const p=players.find(p=>p.userId===target);if(p)return {x:p.x,y:p.y*.62-70,zoom:1.8,close:true,label:p.name,night:1};}
 if(shot==='bonju')return {x:HOST.x,y:HOST.y*.62-100,zoom:1.1,close:true,label:s.presenter==='maria-villegas'?'MARÍA VILLEGAS':'BONJU',night:1};
 if(shot==='torches')return {x:HOST.x*.7,y:HOST.y*.62,zoom:1.1,label:'EL CONSEJO',night:1};
 if(shot==='group'||shot==='nominees')return {...group,label:shot==='nominees'?'EN RIESGO':'LOS EXPEDICIONARIOS',night:1};
 return {x:HOST.x,y:HOST.y*.62,zoom:.36,label:'CEREMONIA DE ELIMINACIÓN',night:1};
}
export class WorldCamera{
 constructor(){this.x=1100;this.y=520;this.zoom=1;this.ready=false;}
 update(target,dt,reduced=false){if(!this.ready||reduced){Object.assign(this,target);this.ready=true;return;}const a=1-Math.exp(-dt*3.4);this.x=mix(this.x,target.x,a);this.y=mix(this.y,target.y,a);this.zoom=mix(this.zoom,target.zoom,a);}
 project(x,y,z=0,width=1200,height=675){return {x:(x-this.x)*this.zoom+width/2,y:(y*.62-z-this.y)*this.zoom+height/2};}
 unproject(x,y,width=1200,height=675){return {x:(x-width/2)/this.zoom+this.x,y:((y-height/2)/this.zoom+this.y)/.62};}
}
