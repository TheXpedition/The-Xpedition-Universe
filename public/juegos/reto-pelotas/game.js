'use strict';
const $=id=>document.getElementById(id);
const cv=$('gameCanvas'),W=1180,H=690;let ctx=cv.getContext('2d'),backgroundLayer=null,backgroundKey='';
const elements={join:$('joinOverlay'),wait:$('waitOverlay'),result:$('resultBanner')};
let ws=null,myId=null,myTeam='A',isHost=false,state=null,connected=false,lastPhase='',lastRound=0,keys={up:false,down:false,left:false,right:false},aim={x:W/2,y:H/2},wantsFire=false,wantsDash=false,wantsCatch=false,raf=0,ambient=0,sound=false;
let turn=0,particles=[],previousState=null,stateAt=0;
const prefs={name:'Expedicionario',room:'GLACIA',characterId:'nahuee'};
const params=new URLSearchParams(location.search);if(params.get('sala'))$('roomCode').value=params.get('sala').replace(/[^a-z0-9]/gi,'').slice(0,6).toUpperCase();
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast._id);toast._id=setTimeout(()=>el.classList.remove('show'),2600)}
function addChat(line,className='system-msg',who=''){const el=$('chatMessages'),p=document.createElement('p');if(className==='system-msg')p.className='system-msg';else{const b=document.createElement('b');b.className=className;b.textContent=who+': ';p.appendChild(b)}p.append(document.createTextNode(line));el.appendChild(p);if(el.children.length>45)el.firstElementChild.remove();el.scrollTop=el.scrollHeight;}
function connect(){let host=location.host;const proto=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(`${proto}//${host}/juegos/reto-pelotas/ws`);$('connectText').textContent='CONECTANDO';ws.onopen=()=>{connected=true;$('connectText').textContent='CONECTADO';ws.send(JSON.stringify({t:'join',name:prefs.name,room:prefs.room,team:prefs.team,characterId:prefs.characterId}));};ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}onMsg(m)};ws.onclose=()=>{connected=false;$('connectText').textContent='SIN CONEXIÓN';if(myId){toast('Conexión perdida. Recarga para volver a entrar.');}else{$('joinOverlay').classList.remove('hidden');}};ws.onerror=()=>{$('connectText').textContent='ERROR DE RED'};}
function emit(o){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(o));}
function onMsg(m){if(m.t==='welcome'){renderPortrait($('youPortrait'),prefs.characterId); myId=m.id;myTeam=m.team;isHost=m.host;elements.join.classList.add('hidden');elements.wait.classList.remove('hidden');prefs.name=m.name||prefs.name;$('youName').textContent=prefs.name;$('roomDisplay').textContent=m.room;$('staffPanel').classList.toggle('hidden',!isHost);$('startRound').classList.toggle('hidden',!isHost);$('waitingForHost').textContent=isHost?'También puedes iniciar desde el panel STAFF.':'Esperando a que el anfitrión inicie...';$('roomCode').value=m.room;history.replaceState({},'',`?sala=${encodeURIComponent(m.room)}`);toast(`Entraste al equipo ${myTeam==='A'?'Aurora':'Tormenta'}.`);}
 if(m.t==='host'){isHost=m.host;$('staffPanel').classList.toggle('hidden',!isHost);$('startRound').classList.toggle('hidden',!isHost);toast(isHost?'Ahora tienes el control STAFF.':'Dirección aún no está conectada.');}
 if(m.t==='error')toast(m.message);
 if(m.t==='notice'){addChat(m.message);if(m.message.includes('¡'))toast(m.message);}
 if(m.t==='chat')addChat(m.message,m.team==='A'?'a':'b',m.name);
 if(m.t==='state'){previousState=state;state=m;stateAt=performance.now();updateInterface();}
}
$('joinForm').addEventListener('submit',e=>{e.preventDefault();prefs.name=$('playerName').value.trim().slice(0,18)||'Expedicionario';prefs.room=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)||'GLACIA';prefs.team=$('teamChoice').value;if(ws&&ws.readyState===WebSocket.OPEN){emit({t:'join',...prefs});}else{connect();}});
$('startRound').onclick=()=>emit({t:'staff',action:'start'});
for(const b of document.querySelectorAll('[data-action]'))b.addEventListener('click',()=>{emit({t:'staff',action:b.dataset.action});if(b.dataset.action==='clear')toast('Reinicio completo solicitado.');});
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;if(!connected){toast('Conéctate para escribir.');return}emit({t:'chat',message});input.value='';});
function copyInvite(){const str=location.origin+location.pathname+'?sala='+($('roomCode').value||prefs.room);if(navigator.clipboard){navigator.clipboard.writeText(str).then(()=>toast('Enlace copiado.')).catch(()=>toast(str))}else{prompt('Copia este enlace',str)}}
$('copyLink').onclick=copyInvite;$('copyRoom').onclick=copyInvite;
$('helpBtn').onclick=()=>$('helpModal').classList.remove('hidden');$('closeHelp').onclick=$('gotIt').onclick=()=>$('helpModal').classList.add('hidden');
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'♫':'♪';toast(sound?'Sonidos activados.':'Sonidos desactivados.');};
function playTone(freq=440,duration=.085){if(!sound)return;try{const ac=playTone.ac||(playTone.ac=new (window.AudioContext||window.webkitAudioContext)()),o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=freq;g.gain.value=.04;g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+duration);}catch{}}
function updateInterface(){if(!state)return;const s=state;$('scoreA').textContent=s.score.A;$('scoreB').textContent=s.score.B;$('roundLabel').textContent='RONDA '+String(s.round).padStart(2,'0');$('clock').textContent=`${String(Math.floor(s.time/60)).padStart(2,'0')}:${String(s.time%60).padStart(2,'0')}`;$('phaseTitle').textContent=s.phase==='active'?(s.paused?'PAUSA STAFF':'DESAFÍO EN VIVO'):s.phase==='waiting'?'PREPARANDO LA ARENA':'FIN DE RONDA';$('arenaState').innerHTML='<i class="dot"></i> '+(s.phase==='active'?(s.paused?'PAUSADO':'EN JUEGO'):s.phase==='waiting'?'SALA DE ESPERA':'RONDA FINALIZADA');$('roomStatus').textContent=s.phase==='active'?'EN VIVO':s.phase==='waiting'?'EN ESPERA':'FINALIZADA';$('playerCount').textContent=s.players+'/8 JUGADORES';
 if(s.phase!==lastPhase){if(s.phase==='active'){elements.wait.classList.add('hidden');elements.result.classList.add('hidden');playTone(520,.2);}if(s.phase==='waiting'&&myId){elements.wait.classList.remove('hidden');elements.result.classList.add('hidden')}if(s.phase==='finished'){elements.result.classList.remove('hidden');const win=s.score.A>s.score.B?'AURORA':s.score.B>s.score.A?'TORMENTA':'RONDA TERMINADA';elements.result.textContent='✦ ¡RONDA TERMINADA! ✦';playTone(640,.3)}lastPhase=s.phase}
 if(s.phase==='active')elements.result.classList.add('hidden');
 $('roundCountdown').hidden=s.phase!=='countdown';$('roundCountdown').textContent=s.paused?'PAUSA':s.countdown||'¡YA!';
 if(s.phase==='countdown'){elements.wait.classList.add('hidden');elements.result.classList.add('hidden');$('phaseTitle').textContent='PREPÁRATE';$('roomStatus').textContent='CUENTA ATRÁS';}
 if(s.phase==='finished'){elements.result.textContent=(s.result?'RONDA PARA '+(s.result==='A'?'AURORA':'TORMENTA'):'EMPATE · SIN PUNTOS')+' · SIGUIENTE EN '+s.countdown+' s';}
 $('arenaStaffTab').hidden=!isHost;
 const mine=s.units.find(u=>u.id===myId);if(mine)$('actionCooldowns').textContent='Shift · '+(mine.dashCool>0?mine.dashCool.toFixed(1)+' s':'Esquivar ✓')+'  /  F · '+(mine.catchCool>0?mine.catchCool.toFixed(1)+' s':'Atrapar ✓');
 const me=s.units.find(u=>u.id===myId);if(me){$('youLife').textContent='♥ '.repeat(me.hp).trim()||'ELIMINADO';$('youAmmo').textContent=me.ammo?'● PELOTA LISTA':'○ BUSCA UNA PELOTA';}
 for(const team of ['A','B']){const teamUnits=s.units.filter(u=>u.team===team),list=$('list'+team);$('alive'+team).textContent=teamUnits.filter(u=>u.alive).length+' ACTIVOS';list.replaceChildren(...teamUnits.map(u=>{const item=document.createElement('div');item.className='roster-player '+(team==='B'?'b ':'')+(u.alive?'':'out ')+(u.id===myId?'me':'');const a=document.createElement('span');a.className='avatar';a.textContent=u.name[0]?.toUpperCase()||'?';const who=document.createElement('span');who.className='who';const strong=document.createElement('strong');strong.textContent=u.name+(u.id===myId?' (TÚ)':'');const sub=document.createElement('small');sub.textContent=u.bot?'BOT / NPC':u.alive?'JUGADOR CONECTADO':'FUERA';who.append(strong,sub);if(u.characterId){a.textContent='';const picture=document.createElement('canvas');picture.width=38;picture.height=38;picture.className='roster-portrait';a.appendChild(picture);renderPortrait(picture,u.characterId);}const hp=document.createElement('span');hp.className='hp';hp.textContent=u.alive?'♥'.repeat(u.hp):'✕';item.append(a,who,hp);return item}))}
}
function getPoint(e){const rect=cv.getBoundingClientRect();return{x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height}}
cv.addEventListener('pointermove',e=>{aim=getPoint(e)});cv.addEventListener('pointerdown',e=>{if(e.button===0){aim=getPoint(e);wantsFire=true;}});cv.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const key=e.key.toLowerCase();if('wasdarrowuparrowdownarrowleftarrowright '.includes(key))e.preventDefault();if(key==='w'||key==='arrowup')keys.up=true;if(key==='s'||key==='arrowdown')keys.down=true;if(key==='a'||key==='arrowleft')keys.left=true;if(key==='d'||key==='arrowright')keys.right=true;if(key===' '){wantsFire=true;}if(key==='shift')wantsDash=true;if(key==='f')wantsCatch=true;});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.up=false;if(k==='s'||k==='arrowdown')keys.down=false;if(k==='a'||k==='arrowleft')keys.left=false;if(k==='d'||k==='arrowright')keys.right=false;});
function stopInput(){keys={up:false,down:false,left:false,right:false};wantsFire=wantsDash=wantsCatch=false;emit({t:'input',keys});}window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInput();});
for(const b of document.querySelectorAll('[data-move]')){const d=b.dataset.move;const down=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[d]=true;b.classList.add('pressed')};const up=e=>{e.preventDefault();keys[d]=false;b.classList.remove('pressed')};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);}
for(const b of document.querySelectorAll('[data-touch]')){b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.touch;if(a==='fire'){wantsFire=true;const me=state?.units?.find(u=>u.id===myId);if(me)aim={x:me.team==='A'?905:265,y:me.y-40};}if(a==='dash')wantsDash=true;if(a==='catch')wantsCatch=true;});}

setInterval(()=>{if(myId&&state?.phase==='active'){emit({t:'input',keys,aim,fire:wantsFire,dash:wantsDash,catch:wantsCatch});}wantsFire=false;wantsDash=false;wantsCatch=false;},50);
// Original Xpedition World art: intact 8 x 5 frames, 40 authored poses per cast member.
let CAST=[];
const art=new Map();
function image(id,src){const im=new Image();art.set(id,im);im.src=src;return im;}
const portraitIndices={};image('portraits','/juegos/shared/ice-breaker/art/portraits/atlas.webp');
image('amphitheatre','/assets/maps/apocalypse/anfiteatro.webp');
const ready=id=>{const im=art.get(id);return im&&im.complete&&im.naturalWidth>0?im:null;};
function renderPortrait(canvas,id){const im=art.get('portraits');if(!im||!canvas)return;if(!im.complete||!im.naturalWidth){if(!canvas.dataset.pending){canvas.dataset.pending='1';im.addEventListener('load',()=>{delete canvas.dataset.pending;renderPortrait(canvas,id);},{once:true});}return;}const i=portraitIndices[id]??0,c=canvas.getContext('2d'),tw=im.naturalWidth/10,th=im.naturalHeight/5;c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(im,i%10*tw,Math.floor(i/10)*th,tw,th,0,0,canvas.width,canvas.height);}
function initGallery(){const el=$('characterGallery');for(const [id,name] of CAST){const b=document.createElement('button');b.type='button';b.className='cast-card'+(id===prefs.characterId?' selected':'');b.dataset.character=id;b.setAttribute('role','radio');b.setAttribute('aria-checked',id===prefs.characterId?'true':'false');b.setAttribute('aria-label','Elegir '+name);const c=document.createElement('canvas');c.width=72;c.height=91;const label=document.createElement('span');label.textContent=name;b.append(c,label);el.append(b);b.addEventListener('click',()=>{prefs.characterId=id;el.querySelectorAll('button').forEach(k=>{const selected=k.dataset.character===id;k.classList.toggle('selected',selected);k.setAttribute('aria-checked',String(selected));});});renderPortrait(c,id);}}
const PI=Math.PI,TAU=PI*2;
const grad=(x,y,w,h,a,b)=>{const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;};
function polygon(points,fill,stroke=null,lw=1){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();}
function txt(value,x,y,size=18,color='#fff',align='center'){ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`900 ${size}px 'Barlow Condensed',Impact,sans-serif`;ctx.fillText(value,x,y);}
function decal(id,x,y,w,h){const im=ready(id);if(!im)return;ctx.drawImage(im,x,y,w,h);}
function focalSnow(x,y,r){ctx.save();ellipse(x,y,r,r*.17,'#f2faff');ctx.globalAlpha=.4;ellipse(x-3,y,r*.69,r*.07,'#86b2ce');ctx.restore();}
function railing(x1,y1,x2,y2,step){line([[x1,y1],[x2,y2]],'#654934',6);line([[x1,y1-28],[x2,y2-28]],'#875b3b',5);for(let i=0;i<=step;i++){const q=i/step,x=x1+(x2-x1)*q,y=y1+(y2-y1)*q;ctx.fillStyle='#68452f';ctx.fillRect(x-6,y-40,12,54);ellipse(x,y-39,10,6,'#e7f2f8');} }
const treePositions=[[18,283,84],[106,210,66],[1049,220,72],[1148,287,95],[-21,430,126],[1185,445,124],[19,660,112],[1164,660,104]];
function background(time){
 // Same amphitheatre as the world. The playable court matches the server bounds.
 ctx.fillStyle='#332719';ctx.fillRect(0,0,W,H);const backdrop=ready('amphitheatre');
 if(backdrop){const scale=W/backdrop.naturalWidth;ctx.drawImage(backdrop,0,0,W,backdrop.naturalHeight*scale);}
 polygon([[38,256],[1142,256],[1160,635],[20,635]],'#766047','#211b16',7);
 polygon([[20,635],[1160,635],[1132,666],[46,666]],'#4b3c2c','#211b16',4);
 ctx.save();ctx.beginPath();ctx.rect(54,267,1072,355);ctx.clip();
 ctx.fillStyle='#917452';ctx.fillRect(54,267,1072,355);
 for(let y=284;y<622;y+=43){line([[56,y],[1124,y]],'#614e3944',2);}
 for(let i=0;i<32;i++){const x=78+i*233%1010,y=287+i*109%316;line([[x,y],[x+8,y+2],[x+21,y-1]],'#ba96713d',1);}
 ctx.fillStyle='#394c4533';ctx.fillRect(54,267,536,355);ctx.fillStyle='#893d2830';ctx.fillRect(590,267,536,355);
 ctx.strokeStyle='#ecdfb6';ctx.lineWidth=5;ctx.strokeRect(61,275,1058,341);ctx.setLineDash([15,13]);line([[590,279],[590,613]],'#ecdfb6',5);ctx.setLineDash([]);
 ctx.strokeStyle='#ecdfb6';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(590,448,87,76,0,0,TAU);ctx.stroke();ctx.globalAlpha=.14;txt('A',290,478,145,'#e9e4c6');txt('B',882,478,145,'#f1c7a4');ctx.restore();
}
function foreground(time){
 // Dust stays in the border and never conceals the player's feet.
 ctx.save();ctx.fillStyle='#2f261c';ctx.fillRect(0,672,W,18);for(let i=0;i<12;i++){const x=(i*143+time*.009)%W,y=660+(i*13%26);ellipse(x,y,2,1,'#ba9a6450');}ctx.restore();
}
const lastLocations=new Map();
function character(u,t){
 if(!art.has('character:'+u.characterId))image('character:'+u.characterId,'/juegos/sprites/'+u.characterId+'.webp');const img=ready('character:'+u.characterId);if(!img)return;
 const prev=lastLocations.get(u.id),changed=prev?Math.hypot(u.x-prev.x,u.y-prev.y)>1:false;
 const motionAt=changed?t:(prev?.motionAt||0),moving=t-motionAt<130;lastLocations.set(u.id,{x:u.x,y:u.y,motionAt});
 let frame=8;
 if(u.hitAnim>0)frame=17;else if(moving)frame=Math.floor(u.run*1.4)%8;
 const fw=img.naturalWidth/8,fh=img.naturalHeight/5,size=132;const scale=size/180;
 ctx.save();ctx.globalAlpha=u.alive?1:.3;if(u.invuln>0 && Math.sin(t/55)>0)ctx.globalAlpha*=.55;
 ellipse(u.x,u.y+2,22,7,'#173b5b45');
 if(u.id===myId){ellipse(u.x,u.y+2,29,9,'#f4cc638a');ctx.strokeStyle='#fceaa1';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(u.x,u.y+2,30,10,0,0,TAU);ctx.stroke();}
 ctx.translate(u.x,u.y);if(u.dir<0)ctx.scale(-1,1);
 const bounce=moving?Math.abs(Math.sin(u.run*1.4))*2.5:0;
 ctx.drawImage(img,frame%8*fw,Math.floor(frame/8)*fh,fw,fh,-48*scale,-194*scale-bounce,96*scale,200*scale);
 // Ball location approximates character's forward hand without modifying authored anatomy.
 if(u.ammo&&u.alive){ctx.fillStyle=u.team==='A'?'#64d4fa':'#fa7a84';ctx.beginPath();ctx.arc(18*scale,-62*scale,10,0,TAU);ctx.fill();ctx.strokeStyle='#173450';ctx.lineWidth=2;ctx.stroke();}
 ctx.restore();
 ctx.save();ctx.textAlign='center';ctx.font="900 17px 'Barlow Condensed',Impact,sans-serif";
 const name=u.name+(u.id===myId?' ★':'');const sw=Math.max(73,ctx.measureText(name).width+22);
 ctx.fillStyle=u.id===myId?'#f8ce77':'#072942e8';ctx.strokeStyle=u.id===myId?'#fff3c1':u.team==='A'?'#6cd7ff':'#ff9a98';ctx.lineWidth=1.7;
 ctx.beginPath();ctx.roundRect(u.x-sw/2,u.y-188,sw,28,5);ctx.fill();ctx.stroke();
 txt(name,u.x,u.y-169,17,u.id===myId?'#1c3346':'#e8f7ff');
 if(u.alive){ctx.fillStyle='#163a57';ctx.fillRect(u.x-22,u.y-157,44,6);ctx.fillStyle=u.team==='A'?'#59d2f2':'#ed8493';ctx.fillRect(u.x-22,u.y-157,44*u.hp/2,6);}
 ctx.restore();
}
function ballDraw(b,t){ctx.save();ctx.translate(b.x,b.y);ellipse(0,12,b.ground?13:10,4,'#112a4d6e');if(!b.ground)ctx.translate(0,-7-Math.sin(t/100)*2);
 const g=ctx.createRadialGradient(-5,-7,1,0,0,13);g.addColorStop(0,'#ffffff');g.addColorStop(.2,b.team==='A'?'#8be2ff':'#ffb8af');g.addColorStop(1,b.team==='A'?'#2294ca':'#df526c');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,b.ground?9:12,0,TAU);ctx.fill();ctx.strokeStyle='#183651';ctx.lineWidth=2.5;ctx.stroke();ctx.strokeStyle='#ffffff8f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,b.ground?6:8,.3,2.6);ctx.stroke();
 if(b.ground){ctx.fillStyle='#fff1b9';ellipse(0,-16,2.7+Math.sin(t/170),2.7+Math.sin(t/170),'#ffef9c');}ctx.restore();}
function paint(t){raf=requestAnimationFrame(paint);ambient=t;ctx.clearRect(0,0,W,H);const signature=[...art].filter(([id])=>!id.startsWith('character:')).map(([,im])=>Number(im.complete&&im.naturalWidth>0)).join('');if(!backgroundLayer||signature!==backgroundKey){backgroundKey=signature;backgroundLayer=document.createElement('canvas');backgroundLayer.width=W;backgroundLayer.height=H;const main=ctx;ctx=backgroundLayer.getContext('2d');background(t);ctx=main;}ctx.drawImage(backgroundLayer,0,0);const alpha=Math.min(1,(t-stateAt)/67),oldUnits=new Map((previousState?.units||[]).map(u=>[u.id,u])),oldBalls=new Map((previousState?.balls||[]).map(b=>[b.id,b])),smooth=(u,prev)=>prev?{...u,x:prev.x+(u.x-prev.x)*alpha,y:prev.y+(u.y-prev.y)*alpha}:u;for(const b of state?.balls||[])ballDraw(smooth(b,oldBalls.get(b.id)),t);for(const u of [...(state?.units||[])].map(u=>smooth(u,oldUnits.get(u.id))).sort((a,b)=>a.y-b.y))character(u,t);
 if(myId && state?.phase==='active'){
  const me=state.units.find(u=>u.id===myId);
  if(me?.alive){ctx.save();ctx.strokeStyle=me.ammo?'#ffdc85c9':'#67d4ffad';ctx.lineWidth=2;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(me.x,me.y-42);ctx.lineTo(aim.x,aim.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#ffe9ab';ctx.lineWidth=2;ctx.beginPath();ctx.arc(aim.x,aim.y,10,0,TAU);ctx.moveTo(aim.x-16,aim.y);ctx.lineTo(aim.x+16,aim.y);ctx.moveTo(aim.x,aim.y-16);ctx.lineTo(aim.x,aim.y+16);ctx.stroke();ctx.restore();}
 }
 foreground(t);
}
requestAnimationFrame(paint);

// Room tools stay out of the arena until explicitly opened.
$('arenaMenu').onclick=()=>{const panel=$('arenaSidebar');panel.hidden=!panel.hidden;$('arenaMenu').setAttribute('aria-expanded',String(!panel.hidden));};
for(const b of document.querySelectorAll('[data-arena-tab]'))b.onclick=()=>{const tab=b.dataset.arenaTab;document.querySelectorAll('[data-arena-tab]').forEach(el=>el.classList.toggle('active',el===b));for(const [cls,key]of [['roster-panel','roster'],['chat-panel','chat'],['staff-panel','staff']]){const el=document.querySelector('.'+cls);el.hidden=key!==tab;}};
document.querySelector('.chat-panel').hidden=true;document.querySelector('.staff-panel').hidden=true;
$('joinForm').querySelector('button[type=submit]').disabled=true;
Promise.all([fetch('/api/world/bootstrap',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error('Entra primero con tu cuenta de World.');return r.json();}),fetch('/juegos/reto-pelotas/cast.json').then(async r=>{if(!r.ok)throw Error('No se pudo cargar la selección de participantes.');return r.json();})]).then(([d,cast])=>{CAST=cast.map(c=>[c.id,c.name]);cast.forEach(c=>portraitIndices[c.id]=c.portraitIndex);initGallery();prefs.name=d.user.name;$('playerName').value=d.user.name;const id=d.profile.characterId;if(CAST.some(c=>c[0]===id))document.querySelector('[data-character="'+id+'"]').click();$('joinForm').querySelector('button[type=submit]').disabled=false;}).catch(e=>{toast(e.message);});
