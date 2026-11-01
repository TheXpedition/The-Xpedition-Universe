// Authenticated rooms share World's account and role checks. Clients never set HP or results.
import {WebSocketServer,WebSocket} from 'ws';
import {createCourt,addPlayer,removePlayer,inputUnit,prepareRound,resetCourt,tickCourt,courtSnapshot} from './dodgeball-engine.mjs';
export function createDodgeballNetwork({authorize}={}){
 const wss=new WebSocketServer({noServer:true,maxPayload:5000,perMessageDeflate:false}),rooms=new Map();let nextId=1;
 const send=(ws,m)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));},announce=(r,message)=>{for(const p of r.people.values())send(p.ws,{t:'notice',message});};
 function elect(r){if(r.host&&r.people.get(r.host)?.ws.isDirector)return;r.host=[...r.people.values()].find(p=>p.ws.isDirector)?.id||null;for(const p of r.people.values())send(p.ws,{t:'host',host:p.id===r.host});}
 function leave(ws){const r=ws.room,p=ws.person;if(!r||!p)return;removePlayer(r,p.id);ws.person=null;ws.room=null;if(!r.people.size){rooms.delete(r.id);return;}elect(r);announce(r,p.name+' salió de la sala.');}
 function join(ws,m){const code=String(m.room||'GLACIA').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)||'GLACIA';let r=rooms.get(code);if(!r){r=createCourt(code);rooms.set(code,r);}const sizes={A:0,B:0};for(const p of r.people.values())if(p!==ws.person)sizes[p.team]++;const team=['A','B'].includes(m.team)?m.team:sizes.A<=sizes.B?'A':'B';if(sizes[team]>=4){send(ws,{t:'error',message:'Ese equipo ya tiene cuatro jugadores.'});return;}if(ws.person)leave(ws);rooms.set(code,r);const id='p'+nextId++,name=String(ws.authenticatedName||'Expedicionario').replace(/[\x00-\x1f<>]/g,'').slice(0,40),p={id,team,name,characterId:m.characterId,ws};if(!addPlayer(r,p))return;ws.person=p;ws.room=r;elect(r);send(ws,{t:'welcome',id,room:code,team,name,characterId:p.unit.characterId,host:r.host===id});if(['countdown','active'].includes(r.phase))send(ws,{t:'notice',message:'La ronda ya empezó. Participarás en la siguiente.'});announce(r,name+' se unió al equipo '+(team==='A'?'Aurora':'Tormenta')+'.');}
 function handle(ws,raw){let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object'||Array.isArray(m))return;const time=Date.now();if(time-ws.rateAt>1000){ws.rateAt=time;ws.rateCount=0;}if(++ws.rateCount>50)return;
  if(m.t==='join'){if(time-ws.joinAt<700)return;ws.joinAt=time;join(ws,m);return;}const r=ws.room,p=ws.person;if(!r||!p)return;
  if(m.t==='input')inputUnit(r,p,m,time);
  if(m.t==='chat'){const text=String(m.message||'').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,150);if(!text||time-ws.lastChat<900)return;ws.lastChat=time;for(const other of r.people.values())send(other.ws,{t:'chat',name:p.name,team:p.team,message:text});}
  if(m.t==='staff'&&r.host===p.id&&ws.isDirector){
   if(m.action==='start'&&['waiting','finished'].includes(r.phase)){prepareRound(r,{next:r.phase==='finished'});announce(r,'La ronda comienza en tres segundos.');}
   if(m.action==='restart'){prepareRound(r);announce(r,'Dirección reinició la ronda actual.');}
   if(m.action==='pause'&&['active','countdown'].includes(r.phase)){r.paused=!r.paused;for(const person of r.people.values())person.unit.controls={};announce(r,r.paused?'Dirección pausó el encuentro.':'El encuentro continúa.');}
   if(m.action==='clear'){resetCourt(r);announce(r,'Marcador reiniciado. Esperando a dirección.');}
  }
 }
 wss.on('connection',(ws,req,identity)=>{ws.authenticatedName=identity.name;ws.isDirector=identity.director;ws.identity=identity;ws.rateAt=Date.now();ws.rateCount=0;ws.lastChat=0;ws.joinAt=0;ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('message',data=>handle(ws,data.toString()));ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));});
 let previous=Date.now(),broadcastAt=0;const timer=setInterval(()=>{const time=Date.now(),elapsed=Math.min(.12,(time-previous)/1000);previous=time;for(const r of rooms.values()){for(let left=elapsed;left>0;left-=1/60)tickCourt(r,Math.min(left,1/60),{time,notice:m=>announce(r,m)});if(time-broadcastAt>=65){const snapshot=courtSnapshot(r);for(const p of r.people.values())send(p.ws,snapshot);}}if(time-broadcastAt>=65)broadcastAt=time;},1000/30);timer.unref();
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();if(authorize&&!ws.checking){ws.checking=true;Promise.resolve(authorize(ws.identity)).then(ok=>{if(!ok)ws.close(4003,'Tu sesión o acceso a World terminó.');}).catch(()=>ws.close(1011,'No se pudo comprobar la sesión.')).finally(()=>ws.checking=false);}}},15000);heartbeat.unref();
 return {upgrade(req,socket,head,identity){wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req,identity));},close(){clearInterval(timer);clearInterval(heartbeat);for(const ws of wss.clients)ws.close(1001,'World se está cerrando');wss.close();}};
}
