import {playExplosion} from './explosion-audio.mjs?v=20261127-audio';
import {arrange,present,impactPoint} from './scene.mjs?v=20261127-throw';
import {worldIcon} from '../world-icons.mjs';
import {worldApiPath,worldSocketPath} from '../world-api-path.mjs';
const el=id=>document.getElementById(id);
const cards=new Map();
let ws, game, pending=false, connected=false, offset=0, retry, outage, zone, acknowledgement;
let attempts=0, connecting=false, blocked=false;
const dialog=el('rules'),direction=el('direction'),confirm=el('staff-confirm');
function toggleDirection(open){
 direction.hidden=!open;
 el('staff-toggle').setAttribute('aria-expanded',String(open));
}
el('staff-toggle').innerHTML=worldIcon('shield');
el('staff-close').innerHTML=worldIcon('close');
el('staff-toggle').onclick=()=>{if(game?.staff)toggleDirection(direction.hidden);};
el('staff-close').onclick=()=>toggleDirection(false);
el('cancel-no').onclick=()=>confirm.close();
el('cancel-yes').onclick=()=>{confirm.close();act('cancel');};
el('return-home').onclick=()=>act('return');
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
 const remaining=game.until-(game.pausedAt??(Date.now()+offset));
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
 pending=true;el('notice').textContent='';el('staff-note').textContent='';
 ws.send(JSON.stringify({type:'potato',action,target,ready:action==='ready'?target:undefined,gameId:game.id,revision:game.revision}));
 clearTimeout(acknowledgement);
 acknowledgement=setTimeout(()=>{
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'potato',action:'subscribe',compactPass:true}));
 },3500);
}
function acknowledge(){clearTimeout(acknowledgement);pending=false;}
function canPassTo(p){
 return connected&&!pending&&game.phase==='playing'&&game.pausedAt==null&&game.holder===game.self&&p.id!==game.self&&p.lives>0;
}
function updatePassTarget(button,p){
 const enabled=canPassTo(p);
 button.setAttribute('aria-disabled',String(!enabled));
 button.tabIndex=enabled?0:-1;
}
function passTo(id){
 const target=game?.players.find(p=>p.id===id);
 if(target&&canPassTo(target))act('pass',id);
}
const cast=el('cast'),stage=cast.closest('.stage');
for(const type of ['contextmenu','selectstart','dragstart']){
 stage.addEventListener(type,event=>{if(game?.phase==='playing')event.preventDefault();});
}
cast.addEventListener('touchend',event=>{
 const button=event.target.closest('.person');
 if(!button||game?.phase!=='playing'||!event.cancelable)return;
 // Handle the release directly and suppress the browser's follow-up click.
 event.preventDefault();
 if(event.touches.length||event.changedTouches.length!==1)return;
 const {clientX,clientY}=event.changedTouches[0];
 if(document.elementFromPoint(clientX,clientY)?.closest('.person')===button)passTo(button.dataset.player);
},{passive:false});
function card(p){
 const b=document.createElement('button');b.type='button';b.className='person';b.dataset.player=p.id;
 const hearts=document.createElement('b'),sprite=document.createElement('div'),name=document.createElement('span');
 sprite.className='sprite';
 const images=['happy','hold'].map(pose=>{
  const im=document.createElement('img');
  im.className=pose==='happy'?'pose-idle':'pose-hold';im.alt='';im.draggable=false;
  im.src='art/'+encodeURIComponent(p.characterId)+'-'+pose+'.webp';
  return im;
 });
 sprite.append(...images);
 for(const im of images)void im.decode().catch(()=>{});
 b.append(hearts,sprite,name);b.onclick=()=>passTo(p.id);
 return {b,hearts,sprite,name};
}
function receivePass(m){
 if(!game||game.id!==m.gameId||game.phase!=='playing'||m.revision!==game.revision+1){
  ws.send(JSON.stringify({type:'potato',action:'subscribe',compactPass:true}));
  return;
 }
 const previous=game;
 game={...game,holder:m.holder,revision:m.revision};acknowledge();
 const mine=game.self===m.holder;
 const receiver=game.players.find(p=>p.id===m.holder);
 el('phase').textContent=mine?'¡Tienes la papa! Elige a quién pasarla':receiver.name+' tiene la papa';
 for(const p of game.players){
  const {b}=cards.get(p.id),holder=p.id===m.holder;
  if(mine||previous.holder===game.self)updatePassTarget(b,p);
  if(!holder&&p.id!==previous.holder)continue;
  b.classList.toggle('holder',holder);
  b.setAttribute('aria-label',p.name+', '+p.lives+' vidas'+(holder?', tiene la papa':''));
 }
 present(previous,game,cards,null);
}
function render(){
 if(!game)return;const g=game,phase=g.phase,self=g.players.find(p=>p.id===g.self),holding=g.holder===g.self;
 const labels={closed:'Lobby cerrado',cancelled:'Reto cancelado',lobby:'Lobby abierto',intro:'Bonju presenta',tutorial:'Cómo jugar',countdown:'Prepárense',playing:holding?'¡Tienes la papa! Elige a quién pasarla':'La papa está en juego',blast:'Fin de ronda',finished:'Reto terminado'};
 const owner=g.players.find(p=>p.id===g.holder);
 el('phase').textContent=phase==='playing'&&!holding&&owner?owner.name+' tiene la papa':labels[phase];
 const paused=g.pausedAt!=null;el('pause-status').hidden=!paused;el('game').dataset.paused=String(paused);
 const mode=g.players.length?{users:'Solo usuarios',bots:'Solo bots',mixed:'Usuarios y bots'}[g.mode]:'';
 el('mode').textContent=mode||'';el('mode').hidden=!mode;
 el('return-home').hidden=!g.canReturn;el('return-home').disabled=!connected||pending;
 el('game').dataset.phase=phase;
 const showRound=['playing','blast'].includes(phase);
 el('round-banner').hidden=!showRound;
 el('round').textContent=showRound?'RONDA '+g.round+' · '+g.players.filter(p=>p.lives>0).length+' EN PIE':'';
 el('bonju').hidden=phase!=='intro';
 audio.hidden=phase!=='intro'||!('speechSynthesis' in window);
 displaySpeech();
 const tutorial=phase==='tutorial';
 if(tutorial&&!dialog.dataset.automatic){
  if(dialog.open)dialog.close();
  dialog.dataset.automatic='true';dialog.show();dialog.scrollTop=0;
 }else if(!tutorial&&dialog.dataset.automatic){delete dialog.dataset.automatic;dialog.close();}
 if(phase==='countdown'&&dialog.open)dialog.close();
 el('help').disabled=phase==='countdown';
 el('close').hidden=tutorial;el('rules-clock').hidden=!tutorial;
 for(const [id,c] of cards)if(!g.players.some(p=>p.id===id)){c.b.remove();cards.delete(id);}
 for(const p of g.players){
  if(!cards.has(p.id))cards.set(p.id,card(p));const {b,hearts,name}=cards.get(p.id);
  const holder=p.id===g.holder;
  b.classList.toggle('holder',holder);b.classList.toggle('out',!p.lives);
  updatePassTarget(b,p);
  b.setAttribute('aria-label',p.name+', '+p.lives+' vidas'+(holder?', tiene la papa':''));
  if(hearts.dataset.lives!==String(p.lives)){hearts.dataset.lives=String(p.lives);hearts.textContent='♥'.repeat(p.lives)+'♡'.repeat(3-p.lives);}
  if(name.textContent!==p.name)name.textContent=p.name;

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
   who.textContent=name(id);detail.textContent=winner?(person.bot?'Ganador de la partida':'Gana inmunidad'):g.lastHit.lives?('♥ '.repeat(g.lastHit.lives)+' · '+g.lastHit.lives+(g.lastHit.lives===1?' vida':' vidas')):'Sin vidas · Fuera del juego';
   body.append(title,who,detail);event.replaceChildren(portrait,body);
  }
 }
 countdown();
 el('staff-toggle').hidden=!g.staff;
 if(!g.staff&&!direction.hidden)toggleDirection(false);
 el('staff-status').textContent=(paused?'Pausado por Dirección':labels[phase])+(mode?' · '+mode:'');
 const isLobby=phase==='lobby',startBlocked=g.players.length<2||g.players.some(p=>!p.ready||p.connected===false);
 const manage=[['fillUsers','Completar con usuarios'],['fillBots','Completar con bots'],['start','Iniciar Hot Potato',startBlocked]];
 const controls=[];
 if(g.staff&&['closed','finished','cancelled'].includes(phase))controls.push(['open','ABRIR LOBBY']);
 if(g.staff&&isLobby){
  controls.push(['cancel','CERRAR LOBBY'],...manage);
  if(g.players.some(p=>p.bot))controls.push(['removeBots','RETIRAR BOTS']);
 }
 if(g.staff&&['intro','tutorial','countdown','playing','blast'].includes(phase))controls.push(paused?['resume','REANUDAR']:['pause','PAUSAR'],['cancel','CANCELAR RETO']);
 renderControls(el('staff-actions'),controls);
 renderLobby(g,self,manage);
}
function renderLobby(g,self,manage){
 const open=g.phase==='lobby',lobby=['closed','lobby','cancelled'].includes(g.phase);
 el('lobby').hidden=!lobby;
 if(!lobby)return;
 const actions=[];
 if(!g.staff&&!g.canReturn){
  if(self&&open)actions.push(['ready',self.ready?'CANCELAR LISTO':'ESTOY LISTO',false,!self.ready],['leave','SALIR DEL LOBBY']);
  else{
   if(g.canJoin&&!g.players.some(p=>p.characterId===g.characterId))actions.push(['join','ENTRAR AL LOBBY',!open]);
   if(!g.watching)actions.push(['visit','ENTRAR COMO ESPECTADOR',!open]);
  }
 }
 if(g.staff&&!open)actions.push(['open','ABRIR LOBBY']);
 el('lobby-note').textContent=g.canReturn?'Regresa al refugio antes de inscribirte de nuevo.':!open?'El lobby todavía está cerrado.':self?'Ya tienes tu plaza. Confirma cuando estés listo.':g.staff?'Prepara las plazas y comienza cuando estén todos.':g.watching?'Estás como espectador.':'Entra al lobby o acompaña el reto como espectador.';
 renderControls(el('actions'),actions);
 renderControls(el('lobby-controls'),g.staff&&open?manage:[]);
 const capacity=g.capacity??17,slots=el('slots'),key=JSON.stringify([capacity,g.players,g.staff,open]);
 const seats=el('seats');
 if(seats.dataset.key!==g.players.length+'/'+capacity){
  seats.dataset.key=g.players.length+'/'+capacity;
  const total=document.createElement('small');total.textContent=' / '+capacity;seats.replaceChildren(String(g.players.length),total);
 }
 if(slots.dataset.key===key){
  for(const remove of slots.querySelectorAll('.slot-remove'))remove.disabled=!connected||pending;
  return;
 }
 slots.dataset.key=key;
 const entries=Array.from({length:capacity},(_,i)=>{
  const p=g.players[i],slot=document.createElement('article'),status=document.createElement('small');
  if(!p){
   const seat=document.createElement('span');seat.textContent=String(i+1).padStart(2,'0');status.textContent='PLAZA DISPONIBLE';
   slot.className='slot empty';slot.append(seat,status);return slot;
  }
  slot.className='slot occupied'+(p.id===g.self?' self':'')+(p.ready?' ready':'');
  const img=document.createElement('img'),name=document.createElement('strong');
  const id=encodeURIComponent(p.characterId);
  img.src=['luciano','nacho'].includes(id)?'../cast-apocalypse/'+id+'-portrait-f4e4bc.webp':'../x-protocol/art/portraits/'+id+'-face.webp';
  img.alt='';
  img.onerror=()=>{img.onerror=null;img.src='art/'+encodeURIComponent(p.characterId)+'-happy.webp';};
  name.textContent=p.name;status.textContent=(p.bot?'BOT':p.id===g.self?'TÚ':p.connected?'PARTICIPANTE':'PLAZA RESERVADA')+(p.ready?' · LISTO':'');
  slot.append(img,name,status);
  if(g.staff&&open){
   const remove=document.createElement('button');remove.className='slot-remove';remove.title='Quitar de este lobby';remove.setAttribute('aria-label','Quitar a '+p.name);
   remove.innerHTML=worldIcon('close');remove.disabled=!connected||pending;remove.onclick=()=>act('remove',p.id);slot.append(remove);
  }
  return slot;
 });
 slots.replaceChildren(...entries);
}
function renderControls(actions,controls){
 const key=JSON.stringify(controls);
 if(actions.dataset.key!==key){
  actions.replaceChildren();
  for(const [action,label,,target] of controls){
   const b=document.createElement('button');b.textContent=label;
   if(['open','start','join','resume'].includes(action))b.className='primary';
   b.onclick=()=>{if(action==='cancel'&&game.phase!=='lobby')confirm.showModal();else act(action,target);};
   actions.append(b);
  }
  actions.dataset.key=key;
 }
 for(const [i,b] of Array.from(actions.children).entries())b.disabled=pending||!connected||!!controls[i][2];
}
function countdown(){
 if(!game||!['tutorial','countdown'].includes(game.phase))return;
 const seconds=Math.max(1,Math.ceil((game.until-(game.pausedAt??(Date.now()+offset)))/1000));
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
  const r=await fetch(worldApiPath('/world/hot-potato/entry'),{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok){if([401,403,404,410].includes(r.status)){blocked=true;el('phase').textContent='Inicia sesión en World para entrar';return;}throw Error();}
  const boot=await r.json();
  if(boot.needsSelection){blocked=true;el('phase').textContent='Vuelve a World y selecciona tu personaje para entrar';return;}
   zone=boot.zone;
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
    connected=true;acknowledge();attempts=0;render();present(previous,game,cards,point);
    if(!direction.hidden&&previous?.phase==='lobby'&&game.phase==='intro')toggleDirection(false);
    if(game.phase==='blast'&&game.lastHit?.id===game.self&&previous?.phase==='playing'&&previous.id===game.id)playExplosion();}
   if(m.type==='potato-return'){location.assign(m.url);return;}
   if(m.type==='potato-error'){acknowledge();el('notice').textContent=m.message;el('staff-note').textContent=m.message;render();}
  };
  socket.onclose=e=>{
   clearTimeout(timeout);if(socket!==ws)return;
   if([4002,4003].includes(e.code)){blocked=true;clearTimeout(outage);connected=false;acknowledge();render();el('phase').textContent=e.code===4002?'World está abierto en otra pestaña':'Sesión cerrada. Vuelve a World';return;}
   reconnect();
  };
 }catch{reconnect();}
 finally{connecting=false;}
}
function reconnect(){
 const wasConnected=connected;connected=false;acknowledge();
 if(wasConnected||!attempts){
  render();
  clearTimeout(outage);
  outage=setTimeout(()=>{if(!connected&&!blocked)el('notice').textContent='Conexión inestable. Conservamos tu plaza.';},1400);
 }
 clearTimeout(retry);
 retry=setTimeout(connect,Math.min(8000,300*2**Math.min(5,attempts++))+Math.random()*150);
}
window.addEventListener('online',connect);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!connected)connect();});
connect();
