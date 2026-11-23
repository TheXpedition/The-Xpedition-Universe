import {playExplosion} from './explosion-audio.mjs';
import {arrange,present,impactPoint} from './scene.mjs';
import {worldApiPath,worldSocketPath} from '../world-api-path.mjs';
const el=id=>document.getElementById(id);
const cards=new Map(), warmed=new Set();
let ws, game, pending=false, connected=false, offset=0, retry, outage, zone;
let attempts=0, connecting=false, blocked=false;
let watching=false,lobbyId;
const dialog=el('rules'),direction=el('direction');
el('staff-toggle').onclick=()=>{if(game?.staff)direction.showModal();};
el('staff-close').onclick=()=>direction.close();
const audio=el('voice');
const speech=[
 '¡Bienvenidos a Hot Potato!',
 'Cuando empiece el conteo, pásense la papa lo más rápido que puedan. ¡Puede explotar en cualquier momento!',
 'Tienen tres vidas. Si la papa explota en tus manos, pierdes una. Si pierdes las tres, quedas fuera.',
 'El último en pie gana inmunidad. ¿Listos?'
];
let line=-1,manualLine=0,introId;
function displaySpeech(){
 if(game?.phase!=='intro')return;
 if(introId!==game.id){introId=game.id;manualLine=0;line=-1;}
 const remaining=game.until-(Date.now()+offset);
 const automatic=Math.max(0,Math.min(speech.length-1,speech.length-Math.ceil(remaining/5000)));
 const current=Math.max(manualLine,automatic);
 if(current===line)return;
 line=current;
 const message=el('welcome');
 if(current===0){const title=document.createElement('em');title.textContent='Hot Potato';message.replaceChildren('¡Bienvenidos a ',title,'!');}
 else message.textContent=speech[current];
 el('next-line').hidden=current===speech.length-1;
}
el('next-line').onclick=()=>{manualLine=Math.min(line+1,speech.length-1);displaySpeech();};
audio.onclick=()=>{const line=new SpeechSynthesisUtterance(speech.join(' '));line.lang='es';speechSynthesis.cancel();speechSynthesis.speak(line);};
el('help').onclick=()=>{if(!dialog.open)dialog.showModal();};
dialog.addEventListener('cancel',e=>{if(game?.phase==='tutorial')e.preventDefault();});
el('close').onclick=()=>dialog.close();
function act(action,target){
 if(!connected||pending||!game||ws.readyState!==WebSocket.OPEN)return;
 pending=true;el('notice').textContent='';
 ws.send(JSON.stringify({type:'potato',action,target,ready:action==='ready'?target:undefined,gameId:game.id,revision:game.revision}));
}
el('cast').addEventListener('contextmenu',event=>event.preventDefault());
function card(p){
 const b=document.createElement('button');b.className='person';
 const hearts=document.createElement('b'),img=document.createElement('img'),name=document.createElement('span');
 b.style.setProperty('--beat',(-cards.size*.23)+'s');img.alt='';img.draggable=false;b.append(hearts,img,name);b.onclick=()=>act('pass',p.id);el('cast').append(b);
 return {b,hearts,img,name};
}
function receivePass(m){
 if(!game||game.id!==m.gameId||game.phase!=='playing'||m.revision!==game.revision+1){
  ws.send(JSON.stringify({type:'potato',action:'subscribe',compactPass:true}));
  return;
 }
 const previous=game;
 game={...game,holder:m.holder,revision:m.revision};pending=false;
 const mine=game.self===m.holder;
 const receiver=game.players.find(p=>p.id===m.holder);
 el('phase').textContent=mine?'¡Tienes la papa! Elige a quién pasarla':receiver.name+' tiene la papa';
 for(const p of game.players){
  const {b,img}=cards.get(p.id),holder=p.id===m.holder;
  if(mine||previous.holder===game.self)b.disabled=!mine||holder||!p.lives;
  if(!holder&&p.id!==previous.holder)continue;
  b.classList.toggle('holder',holder);
  b.setAttribute('aria-label',p.name+', '+p.lives+' vidas'+(holder?', tiene la papa':''));
  img.src='art/'+encodeURIComponent(p.characterId)+(holder?'-hold.webp':'-happy.webp');
 }
 present(previous,game,cards,null);
}
function render(){
 if(!game)return;const g=game,phase=g.phase,self=g.players.find(p=>p.id===g.self),holding=g.holder===g.self;
 const labels={closed:'Lobby cerrado',cancelled:'Reto cancelado',lobby:g.mode?'Esperando autorización de Dirección':'El staff está preparando el lobby',intro:'Bonju presenta',tutorial:'Cómo jugar',countdown:'Prepárense',playing:holding?'¡Tienes la papa! Elige a quién pasarla':'La papa está en juego',blast:'Fin de ronda',finished:'Reto terminado'};
 const owner=g.players.find(p=>p.id===g.holder);
 el('phase').textContent=phase==='playing'&&!holding&&owner?owner.name+' tiene la papa':labels[phase];
 el('mode').textContent=g.mode?(g.mode==='users'?'Solo usuarios':'Solo bots')+' · '+g.players.length+' participantes':'';
 el('game').dataset.phase=phase;
 el('round').textContent=['playing','blast'].includes(phase)?'RONDA '+g.round+' · '+g.players.filter(p=>p.lives>0).length+' EN PIE':'';
 el('bonju').hidden=phase!=='intro';
 audio.hidden=phase!=='intro'||!('speechSynthesis' in window);
 displaySpeech();
 const tutorial=phase==='tutorial';
 if(tutorial&&!dialog.dataset.automatic){
  if(direction.open)direction.close();
  if(!dialog.open)dialog.showModal();
  dialog.dataset.automatic='true';dialog.scrollTop=0;
 }else if(!tutorial&&dialog.dataset.automatic){delete dialog.dataset.automatic;dialog.close();}
 if(phase==='countdown'&&direction.open)direction.close();
 if(phase==='countdown'&&dialog.open)dialog.close();
 el('help').disabled=phase==='countdown';
 el('close').hidden=tutorial;el('rules-clock').hidden=!tutorial;
 for(const [id,c] of cards)if(!g.players.some(p=>p.id===id)){c.b.remove();cards.delete(id);}
 for(const p of g.players){
  if(!cards.has(p.id))cards.set(p.id,card(p));const {b,img,hearts,name}=cards.get(p.id);
  const holder=p.id===g.holder;
  b.classList.toggle('holder',holder);b.classList.toggle('out',!p.lives);
  b.disabled=!connected||pending||phase!=='playing'||!holding||holder||!p.lives;
  b.setAttribute('aria-label',p.name+', '+p.lives+' vidas'+(holder?', tiene la papa':''));
  if(hearts.dataset.lives!==String(p.lives)){hearts.dataset.lives=String(p.lives);hearts.textContent='♥'.repeat(p.lives)+'♡'.repeat(3-p.lives);}
  if(name.textContent!==p.name)name.textContent=p.name;
  const prefix='art/'+encodeURIComponent(p.characterId);
  if(!warmed.has(prefix)){for(const pose of ['happy','hold'])new Image().src=prefix+'-'+pose+'.webp';warmed.add(prefix);}
  const src=prefix+(holder?'-hold.webp':'-happy.webp');if(img.getAttribute('src')!==src)img.src=src;
 }
 arrange(cards,g.players);
 const event=el('event'),name=id=>g.players.find(p=>p.id===id)?.name||'';
 event.hidden=!['blast','countdown','finished'].includes(phase);
 event.classList.toggle('blast',phase==='blast');
 if(phase==='blast'||phase==='finished'){
  const winner=phase==='finished',id=winner?g.winner:g.lastHit.id,person=g.players.find(p=>p.id===id);
  const stamp=[g.id,phase,g.round,id].join('/');
  if(event.dataset.stamp!==stamp){
   event.dataset.stamp=stamp;
   const portrait=document.createElement('img'),body=document.createElement('div'),title=document.createElement('small'),who=document.createElement('strong'),detail=document.createElement('span');
   portrait.src='art/'+person.characterId+(winner?'-happy.webp':'-hold.webp');portrait.alt='';
   title.textContent=winner?'GANADOR DEL RETO':'¡LA PAPA HA EXPLOTADO!';
   who.textContent=name(id);detail.textContent=winner?'Gana inmunidad':g.lastHit.lives?('♥ '.repeat(g.lastHit.lives)+' · '+g.lastHit.lives+(g.lastHit.lives===1?' vida':' vidas')):'Sin vidas · Fuera del juego';
   body.append(title,who,detail);event.replaceChildren(portrait,body);
  }
 }
 countdown();
 el('staff-toggle').hidden=!g.staff;
 if(!g.staff&&direction.open)direction.close();
 el('staff-status').textContent=labels[phase]+(g.mode?' · '+el('mode').textContent:'');
 const controls=[];
 if(g.staff&&['closed','finished','cancelled'].includes(phase))controls.push(['open','Abrir lobby']);
 if(g.staff&&phase==='lobby'&&!g.mode)controls.push(['users','Solo usuarios'],['bots','Solo bots']);
 if(g.staff&&phase==='lobby'&&g.mode)controls.push(['start','Autorizar inicio',g.players.length<2||g.players.some(p=>!p.ready||p.connected===false)]);
 if(g.staff&&['lobby','intro','tutorial','countdown','playing','blast'].includes(phase))controls.push(['cancel',phase==='lobby'?'Cerrar lobby':'Cancelar reto']);
 renderControls(el('staff-actions'),controls);
 renderLobby(g,self,labels[phase],controls);
}
function renderLobby(g,self,label,controls){
 const lobby=['closed','lobby','cancelled'].includes(g.phase);
 el('lobby').hidden=!lobby;
 if(!lobby)return;
 if(g.id!==lobbyId){lobbyId=g.id;watching=false;}
 el('lobby-phase').textContent=label;
 const actions=[];
 if(g.phase==='lobby'&&g.mode==='users'&&!g.staff){
  if(self)actions.push(['ready',self.ready?'Listo ✓ · Cambiar estado':'Estoy listo',false,!self.ready],['leave','Salir del lobby']);
  else if(g.canJoin)actions.push(['join','Entrar al lobby']);
 }
 if(g.phase==='lobby'&&g.mode&&!self&&!g.staff&&!watching)actions.push(['watch','Ver como espectador']);
 el('lobby-note').textContent=self?(self.ready?'Ya estás listo. El staff indicará el inicio.':'Confirma que estás listo cuando quieras comenzar.'):watching?'Estás como espectador. La arena se abrirá cuando el staff inicie.':g.mode==='users'?'La inscripción está abierta para los participantes activos.':g.mode==='bots'?'El staff eligió una partida de bots.':'El staff elige la modalidad y autoriza el inicio.';
 renderControls(el('actions'),actions);
 renderControls(el('lobby-controls'),controls);
 const capacity=g.capacity??17;
 el('seats').textContent=g.players.length+' / '+capacity;
 const slots=el('slots'),key=JSON.stringify([capacity,g.players]);
 if(slots.dataset.key===key)return;
 slots.dataset.key=key;
 const entries=Array.from({length:capacity},(_,i)=>{
  const p=g.players[i],slot=document.createElement('li');
  if(!p){slot.className='vacant';slot.textContent='Disponible';return slot;}
  const img=document.createElement('img'),copy=document.createElement('span'),name=document.createElement('strong'),status=document.createElement('small');
  img.src='art/'+encodeURIComponent(p.characterId)+'-happy.webp';img.alt='';
  name.textContent=p.name;status.textContent=g.mode==='bots'?'Bot listo':p.connected===false?'Desconectado':p.ready?'Listo':'Preparándose';
  copy.append(name,status);slot.append(img,copy);return slot;
 });
 slots.replaceChildren(...entries);
}
function renderControls(actions,controls){
 const key=JSON.stringify(controls);
 if(actions.dataset.key!==key){actions.replaceChildren();for(const [action,label,,target] of controls){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(action==='watch'){watching=true;render();}else act(action,target);};actions.append(b);}actions.dataset.key=key;}
 for(const [i,b] of Array.from(actions.children).entries())b.disabled=pending||!connected||!!controls[i][2];
}
function countdown(){
 if(!game||!['tutorial','countdown'].includes(game.phase))return;
 const seconds=Math.max(1,Math.ceil((game.until-Date.now()-offset)/1000));
 const target=game.phase==='tutorial'?el('rules-clock'):el('event');
 const value=game.phase==='tutorial'?'Empieza en '+Math.min(10,seconds)+' s':String(Math.min(5,seconds));
 if(target.textContent!==value)target.textContent=value;
}
matchMedia('(max-width:600px)').addEventListener('change',render);
setInterval(()=>{countdown();displaySpeech();},150);
async function connect(){
 if(connecting||blocked||navigator.onLine===false||[WebSocket.CONNECTING,WebSocket.OPEN].includes(ws?.readyState))return;
 clearTimeout(retry);connecting=true;
 try{
  if(attempts===3)zone=null;
  if(!zone){
  const r=await fetch(worldApiPath('/world/bootstrap'),{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok){if([401,403,404,410].includes(r.status)){blocked=true;el('phase').textContent='Inicia sesión en World para entrar';return;}throw Error();}
  const boot=await r.json();
  if(boot.characterAvailability?.needsSelection){blocked=true;el('phase').textContent='Vuelve a World y selecciona tu personaje para entrar';return;}
   zone=boot.profile.lastZone;
  }
  const url=new URL(worldSocketPath('/world/live'),location.href);
  url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('zone',zone);
  if(game)url.searchParams.set('resume','1');
  const socket=ws=new WebSocket(url);
  const timeout=setTimeout(()=>socket.close(),12000);
  socket.onmessage=({data})=>{if(socket!==ws)return;const m=JSON.parse(data);
   if(m.type==='welcome')ws.send(JSON.stringify({type:'potato',action:'subscribe',compactPass:true}));
   if(m.type==='potato-pass')receivePass(m);
   if(m.type==='potato-state'){const previous=game,point=impactPoint(m.game,cards);game=m.game;offset=game.serverTime-Date.now();if(!connected){clearTimeout(timeout);clearTimeout(outage);el('notice').textContent='';}
    connected=true;pending=false;attempts=0;render();present(previous,game,cards,point);
    if(direction.open&&previous?.phase==='lobby'&&game.phase==='intro')direction.close();
    if(game.phase==='blast'&&game.lastHit?.id===game.self&&previous?.phase==='playing'&&previous.id===game.id)playExplosion();}
   if(m.type==='potato-error'){pending=false;el('notice').textContent=m.message;render();}
  };
  socket.onclose=e=>{
   clearTimeout(timeout);if(socket!==ws)return;
   if([4002,4003].includes(e.code)){blocked=true;clearTimeout(outage);connected=false;pending=false;render();el('phase').textContent=e.code===4002?'World está abierto en otra pestaña':'Sesión cerrada. Vuelve a World';return;}
   reconnect();
  };
 }catch{reconnect();}
 finally{connecting=false;}
}
function reconnect(){
 const wasConnected=connected;connected=false;pending=false;
 if(wasConnected||!attempts){
  render();
  clearTimeout(outage);
  outage=setTimeout(()=>{if(!connected&&!blocked)el('notice').textContent='Volviendo a conectar…';},1400);
 }
 clearTimeout(retry);
 retry=setTimeout(connect,Math.min(8000,300*2**Math.min(5,attempts++))+Math.random()*150);
}
window.addEventListener('online',connect);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!connected)connect();});
connect();
