import {arrange,present,impactPoint} from './scene.mjs';
import {worldApiPath,worldSocketPath} from '../world-api-path.mjs';
const el=id=>document.getElementById(id);
const cards=new Map(), warmed=new Set();
let ws, game, pending=false, connected=false, offset=0, delay=500, retry;
const dialog=document.querySelector('dialog');
const audio=el('voice');
audio.hidden=!('speechSynthesis' in window);
audio.onclick=()=>{const line=new SpeechSynthesisUtterance(el('welcome').textContent);line.lang='es';speechSynthesis.cancel();speechSynthesis.speak(line);};
el('help').onclick=()=>dialog.showModal();
el('close').onclick=()=>dialog.close();
function act(action,target){
 if(!connected||pending||!game||ws.readyState!==WebSocket.OPEN)return;
 pending=true;el('notice').textContent='';
 ws.send(JSON.stringify({type:'potato',action,target,gameId:game.id,revision:game.revision}));
}
function card(p){
 const b=document.createElement('button');b.className='person';
 const hearts=document.createElement('b'),img=document.createElement('img'),name=document.createElement('span');
 b.style.setProperty('--beat',(-cards.size*.23)+'s');img.alt='';b.append(hearts,img,name);b.onclick=()=>act('pass',p.id);el('cast').append(b);
 return {b,hearts,img,name};
}
function render(){
 if(!game)return;const g=game,phase=g.phase,joined=g.players.some(p=>p.id===g.self),holding=g.holder===g.self;
 const labels={closed:'Lobby cerrado',cancelled:'Reto cancelado',lobby:'Esperando autorización de Dirección',intro:'Bonju presenta',countdown:'Prepárense',playing:holding?'¡Tienes la papa! Elige a quién pasarla':'La papa está en juego',blast:'Fin de ronda',finished:'Reto terminado'};
 const owner=g.players.find(p=>p.id===g.holder);
 el('phase').textContent=connected?(phase==='playing'&&!holding&&owner?owner.name+' tiene la papa':labels[phase]):'Reconectando…';
 el('mode').textContent=g.mode?(g.mode==='users'?'Solo usuarios':'Solo bots')+' · '+g.players.length+' participantes':'';
 el('game').dataset.phase=phase;
 el('round').textContent=['playing','blast'].includes(phase)?'RONDA '+g.round+' · '+g.players.filter(p=>p.lives>0).length+' EN PIE':'';
 el('bonju').hidden=phase!=='intro';
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
 const controls=[];
 if(g.staff&&['closed','finished','cancelled'].includes(phase))controls.push(['users','Abrir solo usuarios'],['bots','Llenar solo con bots']);
 if(phase==='lobby'&&g.mode==='users')controls.push(joined?['leave','Salir del reparto']:['join','Participar']);
 if(g.staff&&phase==='lobby'&&g.players.length>=2)controls.push(['start','Autorizar inicio']);
 if(g.staff&&['lobby','intro','countdown','playing','blast'].includes(phase))controls.push(['cancel','Cancelar reto']);
 const actions=el('actions'),key=JSON.stringify(controls);
 if(actions.dataset.key!==key){actions.replaceChildren();for(const [action,label] of controls){const b=document.createElement('button');b.textContent=label;b.onclick=()=>act(action);actions.append(b);}actions.dataset.key=key;}
 for(const b of actions.children)b.disabled=pending||!connected;
}
function countdown(){if(game?.phase==='countdown')el('event').textContent=String(Math.max(1,Math.ceil((game.until-Date.now()-offset)/1000)));}
matchMedia('(max-width:600px)').addEventListener('change',render);
setInterval(countdown,150);
async function connect(){
 try{
  const r=await fetch(worldApiPath('/world/bootstrap'),{cache:'no-store'});
  if(!r.ok){if([401,403].includes(r.status)){el('phase').textContent='Inicia sesión en World para entrar';return;}throw Error();}
  const boot=await r.json();
  if(boot.characterAvailability?.needsSelection){el('phase').textContent='Vuelve a World y selecciona tu personaje para entrar';return;}
  const url=new URL(worldSocketPath('/world/live'),location.href);
  url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('zone',boot.profile.lastZone);
  ws=new WebSocket(url);
  ws.onmessage=({data})=>{const m=JSON.parse(data);
   if(m.type==='welcome')ws.send(JSON.stringify({type:'potato',action:'subscribe'}));
   if(m.type==='potato-state'){const previous=game,point=impactPoint(m.game,cards);game=m.game;offset=game.serverTime-Date.now();connected=true;pending=false;delay=500;render();present(previous,game,cards,point);}
   if(m.type==='potato-error'){pending=false;el('notice').textContent=m.message;render();}
  };
  ws.onclose=e=>{
   if([4002,4003].includes(e.code)){connected=false;pending=false;render();el('phase').textContent=e.code===4002?'World está abierto en otra pestaña':'Sesión cerrada. Vuelve a World';return;}
   reconnect();
  };
 }catch{reconnect();}
}
function reconnect(){connected=false;pending=false;el('phase').textContent='Reconectando…';render();clearTimeout(retry);retry=setTimeout(connect,delay);delay=Math.min(10000,delay*2);}
connect();
