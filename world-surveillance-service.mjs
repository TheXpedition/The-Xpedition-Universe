import {SECURITY_CAMERAS,cameraPlayer} from './public/juegos/world-surveillance.mjs';
import {WORLD_MAPS} from './public/juegos/world-maps.mjs';
import {interactionPoint} from './public/juegos/world-interactions.mjs';
export function createWorldSurveillance({clients,send,player,now=Date.now,fail}){
 const viewers=new Map(),speech=new Map();let lastFrame=0;
 function allowed(c){const map=WORLD_MAPS['comisaria-interior'],monitor=map.props.find(p=>p.surveillance),point=interactionPoint(map,monitor);return c.zone.id===map.id&&c.wellness.life.status==='alive'&&Math.hypot(c.p.x-point.x,c.p.y-point.y)<140;}
 function close(c,notify=true){if(viewers.delete(c.user.id)&&notify)send(c,{type:'camera-closed'});}
 function frame(c,view){const camera=SECURITY_CAMERAS.find(v=>v.id===view.id),map=WORLD_MAPS[camera.zone];return {type:'camera-frame',camera,serverTime:now(),players:[...clients.values()].filter(p=>p.zone.id===camera.zone&&!map.private).map(p=>cameraPlayer(player(p))),speech:(speech.get(camera.zone)||[]).filter(m=>now()-m.created<30000)};}
 function open(c){if(!allowed(c))fail(403,'Acércate a los monitores de la comisaría.');const view={id:SECURITY_CAMERAS[0].id,at:now(),lastSelect:0};viewers.set(c.user.id,view);send(c,{type:'camera-open',cameras:SECURITY_CAMERAS,...{frame:frame(c,view)}});}
 function select(c,id){if(!viewers.has(c.user.id)||!allowed(c))fail(403,'Abre las cámaras desde la sala de control.');const view=viewers.get(c.user.id);if(!SECURITY_CAMERAS.some(v=>v.id===id))fail(403,'Esa zona no tiene una cámara disponible.');if(now()-view.lastSelect<250)fail(429,'Espera antes de cambiar de cámara.');view.lastSelect=now();view.id=id;view.at=now();send(c,frame(c,view));}
 function chat(c,m){if(c.zone.private||!SECURITY_CAMERAS.some(v=>v.zone===c.zone.id)||m.radio||m.private)return;const line={id:m.id,userId:m.userId,name:m.name,text:m.text,created:m.created,x:m.x,y:m.y};speech.set(c.zone.id,[...(speech.get(c.zone.id)||[]).filter(v=>now()-v.created<30000),line].slice(-6));}
 function tick(){const t=now();if(t-lastFrame<250)return;lastFrame=t;for(const c of clients.values()){const view=viewers.get(c.user.id);if(!view)continue;if(!allowed(c)||t-view.at>5*60000){close(c);continue;}send(c,frame(c,view));}}
 return {open,select,close,chat,tick,has:id=>viewers.has(id)};
}
