import {drawDani as drawCharacter} from './dani-renderer.mjs';
import {newRun,stepRun,jumpTo,walkTo,reachable,hazardActive,hazardWarning,WORLD_END} from './engine.mjs';
import {LEVELS,DIFFICULTIES,levelConfig} from './levels.mjs';
import {drawExpeditionFlag,drawGem} from './props-renderer.mjs';
import {DaniDialogue} from './dialogue.mjs';
import {ArcadeRecorder,loadProgress} from './rewards.mjs';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false}),shell=$('#gameShell');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,keys=new Set();
let run=newRun(),scene='intro',paused=false,ready=false,revoked=false,camera=0,W=1280,H=720,last=0,accumulator=0,hover=null,pointer=null,toastTimer=0,particles=[],muted=false,audio=null,lastHud='',accessBusy=false,offline=false,actionDirection={x:1,y:0};
let selectedLevel=1,selectedDifficulty='normal',userId=null,completedLevels=new Set(),recorder=null,beginBusy=false;
const walletChannel='BroadcastChannel' in window?new BroadcastChannel('xpedition-economy'):null;
const dialogue=new DaniDialogue({caption:$('#daniCaption'),line:$('#daniLine'),audioContext:()=>audio});
function acceptProgress(value){if(value.completed)completedLevels=new Set(value.completed);if(value.wallet){$('#ticketBalance').textContent='▰ '+value.wallet.tickets+' tickets';walletChannel?.postMessage({type:'wallet',user:userId,wallet:value.wallet});}renderLevelChoices();}
function renderLevelChoices(){if(!$('#levelChoices'))return;$('#levelChoices').innerHTML=LEVELS.map(l=>{const unlocked=l.id===1||completedLevels.has(l.id-1);return '<button type="button" data-level="'+l.id+'" aria-pressed="'+(selectedLevel===l.id)+'" '+(!unlocked?'disabled':'')+'><span>0'+l.id+' '+(!unlocked?' · 🔒':'')+'</span><strong>'+l.name+'</strong><small>'+l.count+' témpanos</small><b>+'+l.tickets+' tickets</b></button>';}).join('');}
$('#levelChoices').onclick=event=>{const button=event.target.closest('[data-level]');if(!button||button.disabled)return;selectedLevel=Number(button.dataset.level);run=newRun({level:selectedLevel,difficulty:selectedDifficulty});camera=0;lastHud='';renderLevelChoices();updateHud();};
$('#difficultyChoice').onchange=event=>{selectedDifficulty=event.target.value;const rule=DIFFICULTIES[selectedDifficulty];$('#difficultyNote').textContent=rule.lives+' vidas · hielo frágil: '+String(rule.fragile).replace('.',',')+' s';run=newRun({level:selectedLevel,difficulty:selectedDifficulty});lastHud='';updateHud();};
$('#voiceChoice').onchange=event=>dialogue.enabled=event.target.checked;
renderLevelChoices();
let best=0;try{best=Number(localStorage.getItem('xp-ice-breaker-best-v1'))||0;}catch{}
const background=new Image(),dani=new Image(),iceA=new Image(),iceB=new Image(),iceFragile=new Image(),sealCalm=new Image(),sealAlert=new Image(),sealWarn=new Image();
background.src='/arcade/ice-breaker-cover.webp?v=2';dani.src='./art/dani.png';iceA.src='./art/ice-safe-a.png';iceB.src='./art/ice-safe-b.png';iceFragile.src='./art/ice-fragile.png';sealCalm.src='./art/seal-calm.png';sealAlert.src='./art/seal-alert.png';sealWarn.src='./art/seal-warn.png';
function shape(points,fill,stroke='#183c50',line=3){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin='round';ctx.stroke();}}
function path(d,fill,stroke='#101619',line=2.5){const p=new Path2D(d);ctx.fillStyle=fill;ctx.fill(p);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin='round';ctx.stroke(p);}}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function line(points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
function resize(){const r=canvas.getBoundingClientRect();W=Math.round(H*r.width/r.height);canvas.width=W;canvas.height=H;}
new ResizeObserver(resize).observe(shell);resize();
function playTone(type){if(muted||!audio)return;const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=type==='splash'?'triangle':'sine';const notes={jump:[260,480,.1],coin:[750,1330,.17],land:[135,100,.07],checkpoint:[520,1040,.26],splash:[160,45,.3],win:[660,1320,.6]};const [a,b,d]=notes[type]||notes.land;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);g.gain.setValueAtTime(type==='land'?.022:.06,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.start(t);o.stop(t+d);}
function audioStart(){if(!muted){try{audio??=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();}catch{muted=true;}}}
function toast(message){$('#gameToast').textContent=message;$('#gameToast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#gameToast').classList.remove('show'),3200);}
function spawn(x,y,type,n=14){for(let i=0;i<n;i++){const angle=i/n*Math.PI*2;particles.push({x,y,vx:Math.cos(angle)*(25+Math.random()*90),vy:Math.sin(angle)*45-45,life:1,max:1,type});}}
function drawWater(t){
 const ocean=ctx.createLinearGradient(0,400,0,H);ocean.addColorStop(0,'#296b8100');ocean.addColorStop(.32,'#235f79');ocean.addColorStop(1,'#173e60');ctx.fillStyle=ocean;ctx.fillRect(0,400,W,H-400);
 for(let i=0;i<27;i++){const x=((i*193-camera*.35+t*(i%2?7:-5))%(W+250)+W+250)%(W+250)-125,y=290+(i*73)%415;line([[x,y],[x+29+(i%4)*15,y-1],[x+65+(i%4)*15,y+1]],i%3?'#c0e4d124':'#afd5df2b',i%3?2:4);}
 // Submerged ice and long, offset reflection planes give the water depth.
 for(let i=0;i<7;i++){const x=((i*431-camera*.19)%(W+400)+W+400)%(W+400)-200,y=540+i%3*65;shape([[x,y],[x+90,y-15],[x+142,y+4],[x+80,y+20]],'#83babe0b',null);}
}
function floeGeometry(f){const r=f.rx,h=f.ry;return [[-r*.96,-h*.1],[-r*.66,-h*.81],[-r*.17,-h],[r*.56,-h*.77],[r,-h*.12],[r*.86,h*.62],[r*.25,h*.96],[-r*.54,h*.76]];}
function drawFloe(f,t){
 const bob=reduced?0:Math.sin(t*1.45+f.x*.013)*2.4,x=f.x-camera,y=f.y+bob;if(x<-180||x>W+180)return;
 ctx.save();ctx.translate(x,y);ellipse(4,34,f.rx*1.12,f.ry*.6,'#102e4f2e');
 if(f.broken){ctx.globalAlpha=.4;shape([[-f.rx*.7,5],[-20,-12],[14,7],[-30,20]],'#b5e6e1','#387f99',2);shape([[32,-2],[f.rx*.8,-8],[f.rx*.6,12],[28,19]],'#b5e6e1','#387f99',2);ctx.restore();return;}
 const art=f.kind==='fragile'?iceFragile:Number(f.id.replace(/\D/g,''))%2?iceB:iceA,iw=f.rx*2.3,ih=iw*art.naturalHeight/art.naturalWidth*.68;
 ctx.strokeStyle='#a9dcd557';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(2,39,f.rx*1.3,12,0,0,Math.PI*2);ctx.stroke();
 if(art.complete&&art.naturalWidth)ctx.drawImage(art,-iw/2,-f.ry*1.05,iw,ih);
 if(f.kind==='fragile'&&f.id===run.player.floe&&!run.jump){const warning=f.spent/run.fragileTime;ctx.strokeStyle=warning>.65?'#f0a880':'#a1d8d0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-3,f.rx+3,f.ry+2,0,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-warning));ctx.stroke();}
 if(f.kind==='start'||f.kind==='checkpoint'||f.kind==='finish')drawFlag(f.kind,t);
 if(f.coin)drawCrystal(f.rx*.22,-f.ry*.5-20,t+f.x,f.rare);
 if(f.hazard)drawCreature(f,t);
 if(scene==='playing'&&!paused&&reachable(run,f)){const selected=hover===f.id;ctx.strokeStyle=hazardActive(f,run.time)?'#f0b49b':selected?'#fff1bc':'#b5e2dc80';ctx.lineWidth=selected?3:1.5;ctx.setLineDash(selected?[]:[5,6]);ctx.beginPath();ctx.ellipse(0,-3,f.rx+6,f.ry+5,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(selected){ctx.fillStyle=hazardActive(f,run.time)?'#f7b69c':'#fff2c8';ctx.font='700 11px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillText(hazardActive(f,run.time)?'¡PELIGRO!':'SALTAR AQUÍ',0,ih-f.ry*1.05+23);}}
 ctx.restore();
}
function drawFlag(kind,t){drawExpeditionFlag(ctx,kind,t,{reduced});}
function drawCrystal(x,y,t,rare=false){drawGem(ctx,x,y,t,{rare,reduced});}
function drawCreature(f,t){
 const active=hazardActive(f,t),warn=hazardWarning(f,t),art=active?sealAlert:warn?sealWarn:sealCalm,w=142,h=w*art.naturalHeight/art.naturalWidth;
 if(art.complete&&art.naturalWidth){ctx.save();if(!active&&!warn)ctx.translate(0,Math.sin(t*2)*.6);ctx.drawImage(art,-w/2,-h+8,w,h);ctx.restore();}
 if(warn){ctx.fillStyle='#f5cf91';ctx.strokeStyle='#263e55';ctx.lineWidth=3;ctx.font='900 24px sans-serif';ctx.textAlign='center';ctx.strokeText('!',-10,-h-4);ctx.fillText('!',-10,-h-4);}
}
function drawDani(x,y,t,scale=1,preview=false){const p=run.player;drawCharacter(ctx,dani,{...p,x,y,time:t,phase:preview?'idle':p.phase,walkBlend:preview?0:p.walkBlend,stride:p.walk,facing:preview?-1:p.facing,height:202*scale,reduced,mouthOpen:preview?0:dialogue.mouth});}
function render(t){
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#23627b';ctx.fillRect(0,0,W,H);
 if(background.complete&&background.naturalWidth){const bw=Math.max(W+500,1600);ctx.drawImage(background,-camera*.09-40,-180,bw,900);}
 drawWater(t);
 const ordered=run.floes.slice().sort((a,b)=>a.y-b.y),p=run.player;let playerDrawn=false;
 for(const f of ordered){if(!playerDrawn&&f.y>p.y+25){drawPlayer();playerDrawn=true;}drawFloe(f,t);}if(!playerDrawn)drawPlayer();
 function drawPlayer(){const x=p.x-camera,y=p.y;ellipse(x,y+6,24*(1-p.z/450),7,'#173f5545');if(run.deathTimer)ctx.globalAlpha=Math.max(.12,1-p.phaseTime);drawDani(x,y-p.z,t,1.02);ctx.globalAlpha=1;}
 for(const pt of particles){ctx.globalAlpha=Math.max(0,pt.life);if(pt.type==='coin')shape([[pt.x-camera,pt.y-4],[pt.x-camera+3,pt.y],[pt.x-camera,pt.y+4],[pt.x-camera-3,pt.y]],'#ffe8a1',null);else ellipse(pt.x-camera,pt.y,3,2,'#c5ede7');ctx.globalAlpha=1;}
 if(scene==='intro'){const x=Math.min(W-160,W*.74);drawDani(x,570,t,2.05,true);}
 if(pointer&&scene==='playing'&&!paused){const f=run.floes.find(f=>f.id===hover);if(f&&reachable(run,f)&&!reduced){ctx.save();ctx.setLineDash([3,8]);ctx.strokeStyle='#eef0cb5c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-camera,p.y-30);ctx.quadraticCurveTo((p.x+f.x)/2-camera,Math.min(p.y,f.y)-140,f.x-camera,f.y-8);ctx.stroke();ctx.restore();}}
 // Drifting snow never obscures platforms or the character.
 if(!reduced)for(let i=0;i<28;i++){const x=((i*71+t*12-camera*.07)%(W+25)+W+25)%(W+25),y=(i*97+t*16)%H;ellipse(x,y,1.2,1.2,'#ebf5df66');}
 const vig=ctx.createLinearGradient(0,H-115,0,H);vig.addColorStop(0,'#102b4300');vig.addColorStop(1,'#102b435c');ctx.fillStyle=vig;ctx.fillRect(0,H-115,W,115);
}
function updateHud(){
 const sector=levelConfig(run.level).name.toUpperCase();
 const signature=[run.lives,run.score,run.collected,Math.floor(run.time),Math.floor(run.furthest/20),sector].join();if(signature===lastHud)return;lastHud=signature;
 $('#expeditionLabel').textContent='EXPEDICIÓN 0'+run.level;$('#hearts').innerHTML=Array.from({length:run.maxLives},(_,i)=>`<span class="${i>=run.lives?'spent':''}">♥</span>`).join(' ');$('#hearts').setAttribute('aria-label',run.lives+' vidas');$('#score').textContent=String(run.score).padStart(5,'0');$('#crystals').textContent=run.collected;$('#totalCrystals').textContent='/ '+run.total;$('#clock').textContent=formatTime(run.time);$('#sector').textContent=sector;$('#routeProgress').style.width=Math.min(100,(run.furthest-160)/(run.end-160)*100)+'%';$('#routeText').textContent='BASE A '+Math.max(0,Math.round(run.end-run.furthest)).toLocaleString('es-CO')+' M';
 const f=run.floes.find(f=>f.id===run.player.floe);$('#contextHint').lastChild.textContent=f?.kind==='fragile'?' El hielo se está rompiendo. ¡Salta!':' Elige tu siguiente témpano.';
}
function events(){for(const e of run.events){playTone(e.type);if(e.type==='coin'){spawn(e.x,e.y-38,'coin');if(run.combo===4)toast('¡Buen ritmo! +25 por salto encadenado');}if(e.type==='land')spawn(run.player.x,run.player.y,'snow',7);if(e.type==='checkpoint')toast('Refugio alcanzado. Reaparecerás aquí.');if(e.type==='splash'){spawn(run.player.x,run.player.y,'snow',30);dialogue.say('fall');}if(e.type==='win'||e.type==='lose')finish(e.type==='win');}run.events.length=0;}
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;
 if(scene==='playing'&&!paused&&!revoked&&!offline){accumulator+=dt;while(accumulator>=1/120){const x=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),y=(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);if(x||y)actionDirection={x,y};const input={x,y,jump:keys.has('JumpOnce')};stepRun(run,input,1/120);recorder?.tick(input);if(run.jump||run.player.land<=0)keys.delete('JumpOnce');accumulator-=1/120;events();}
  const desired=Math.max(0,Math.min(run.end-W+220,run.player.x-W*.3));camera+=(desired-camera)*(1-Math.exp(-dt*5));for(const pt of particles){pt.life-=dt*1.7;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=90*dt;}particles=particles.filter(p=>p.life>0);updateHud();
 }
 dialogue.update({dt,player:run.player,camera,width:W,height:H,playing:scene==='playing',paused:paused||offline||revoked,muted});
 render(scene==='intro'?now/1000:run.time);requestAnimationFrame(frame);
}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
async function begin(){if(!ready||revoked||offline||beginBusy)return;beginBusy=true;audioStart();const start=$('#startButton');if(start){start.disabled=true;start.textContent='Preparando la expedición…';}try{recorder=userId?await ArcadeRecorder.start({level:selectedLevel,difficulty:selectedDifficulty},acceptProgress):null;run=newRun({level:selectedLevel,difficulty:selectedDifficulty});particles=[];camera=0;accumulator=0;lastHud='';hover=null;dialogue.reset();scene='playing';paused=false;$('#overlay').hidden=true;shell.classList.add('playing');$('#touchControls').classList.add('active');keys.clear();canvas.focus({preventScroll:true});updateHud();toast('Nivel '+run.level+' · '+levelConfig(run.level).name);}catch(error){toast(error.message);if(start){start.disabled=false;start.innerHTML='Empezar expedición <span>↗</span>';}}finally{beginBusy=false;}}
function reset(){void begin();}
function pause(){if(scene!=='playing'||paused)return;paused=true;keys.clear();$('#pauseButton').setAttribute('aria-label','Reanudar juego');const o=$('#overlay');o.className='overlay result';o.hidden=false;o.innerHTML='<div class="intro-panel"><span class="panel-tag">TÓMATE UN RESPIRO</span><h2>El hielo<br><em>puede esperar.</em></h2><p>La expedición está en pausa.</p><button class="play-button" id="resumeButton">Continuar expedición <span>→</span></button><div class="result-subactions"><button class="text-button" id="restartButton">Empezar de nuevo</button><a class="text-button" href="/#simuladores">Volver a Simuladores</a></div></div>';const options=document.createElement('div');options.className='pause-options';options.innerHTML='<label><input type="checkbox" id="pauseVoice" '+(dialogue.enabled?'checked':'')+'> Voz de Dani</label><label><input type="checkbox" id="pauseSound" '+(!muted?'checked':'')+'> Sonido</label>';o.querySelector('.intro-panel').append(options);$('#pauseVoice').onchange=e=>dialogue.enabled=e.target.checked;$('#pauseSound').onchange=e=>setSound(!e.target.checked);$('#resumeButton').onclick=resume;$('#restartButton').onclick=reset;$('#resumeButton').focus({preventScroll:true});}
function resume(){if(revoked||offline)return;paused=false;$('#overlay').hidden=true;$('#pauseButton').setAttribute('aria-label','Pausar juego');canvas.focus({preventScroll:true});}
function finish(won){scene='finished';shell.classList.remove('playing');$('#touchControls').classList.remove('active');keys.clear();const record=won&&run.score>best;if(record){best=run.score;try{localStorage.setItem('xp-ice-breaker-best-v1',String(best));}catch{}}
 const level=run.level,session=recorder,config=levelConfig(level);const o=$('#overlay');o.className='overlay result';o.hidden=false;o.innerHTML='<div class="intro-panel"><span class="panel-tag">'+(won?'NIVEL '+level+' COMPLETADO':'EXPEDICIÓN INTERRUMPIDA')+'</span><h2>'+(won?'Frío: 0.<br><em>Dani: 1.</em>':'El hielo ganó.<br><em>Por ahora.</em>')+'</h2><p>'+config.name+' · '+DIFFICULTIES[run.difficulty].name+'</p><div class="result-score">'+String(run.score).padStart(5,'0')+'</div><div class="result-stats"><span>✧ '+run.collected+' / '+run.total+' cristales</span><span>◷ '+formatTime(run.time)+'</span><span>♥ '+run.lives+' vidas</span></div><p id="ticketReward" class="ticket-reward">'+(won?(userId?'Guardando tus '+config.tickets+' tickets…':'Inicia sesión para guardar tickets en tu cuenta.'):'Cada intento te acerca a la base.')+'</p>'+(won&&level<3?'<button class="play-button" id="nextLevelButton" '+(userId?'disabled':'')+'>Siguiente nivel <span>↗</span></button>':'')+'<button class="'+(won&&level<3?'text-button':'play-button')+'" id="retryButton">'+(won?'Repetir nivel':'Intentar de nuevo')+'</button><div class="result-subactions"><button class="text-button" id="chooseLevelButton">Elegir nivel</button><a href="/#simuladores">Volver a Simuladores</a></div></div>';$('#retryButton').onclick=reset;$('#chooseLevelButton').onclick=()=>location.reload();if($('#nextLevelButton'))$('#nextLevelButton').onclick=()=>{selectedLevel=level+1;void begin();};
 if(won&&!userId){completedLevels.add(level);renderLevelChoices();}
 if(session)void session.flush(true).then(result=>{if(recorder!==session||scene!=='finished')return;if(won){$('#ticketReward').textContent=result?.reward?.tickets?'+'+result.reward.tickets+' tickets guardados en tu cuenta':result?.reward?.alreadyClaimed?'Nivel completado. Ya recibiste sus tickets de hoy.':'No pudimos confirmar la recompensa.';if($('#nextLevelButton'))$('#nextLevelButton').disabled=!completedLevels.has(level);}}).catch(error=>{if(recorder===session&&$('#ticketReward'))$('#ticketReward').textContent='Tickets pendientes: '+error.message;});
 $('#retryButton').focus({preventScroll:true});updateHud();}
function point(event){const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*W/rect.width+camera,y:(event.clientY-rect.top)*H/rect.height};}
function hit(point){return run.floes.filter(f=>!f.broken&&((point.x-f.x)/f.rx)**2+((point.y-f.y)/(f.ry+16))**2<=1).sort((a,b)=>b.y-a.y)[0];}
canvas.addEventListener('pointermove',e=>{pointer=point(e);hover=hit(pointer)?.id||null;canvas.style.cursor=hover&&reachable(run,run.floes.find(f=>f.id===hover))?'pointer':'default';});canvas.addEventListener('pointerleave',()=>{hover=null;pointer=null;});
canvas.addEventListener('pointerdown',e=>{if(scene!=='playing'||paused||revoked||offline)return;e.preventDefault();audioStart();canvas.focus({preventScroll:true});const pt=point(e),f=hit(pt);if(!f)return;if(f.id===run.player.floe){if(walkTo(run,pt))recorder?.action({op:'walk',x:pt.x,y:pt.y});return;}if(!jumpTo(run,f.id))toast(run.jump?'Termina este salto primero.':'Ese témpano está demasiado lejos. Busca uno más cercano.');else{recorder?.action({op:'jump',id:f.id});events();}});
const gameKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space']);
window.addEventListener('keydown',e=>{if(['Escape','KeyP'].includes(e.code)&&scene==='playing'){e.preventDefault();paused?resume():pause();return;}if(!gameKeys.has(e.code)||scene!=='playing'||paused)return;e.preventDefault();keys.add(e.code);if(run.walkTarget){recorder?.action({op:'cancel'});run.walkTarget=null;}if(e.code==='Space'&&!e.repeat)keys.add('JumpOnce');});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else void checkAccess();});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();if(scene!=='playing'||paused)return;b.setPointerCapture(e.pointerId);if(run.walkTarget){recorder?.action({op:'cancel'});run.walkTarget=null;}keys.add(b.dataset.key);if(b.dataset.key==='Space')keys.add('JumpOnce');audioStart();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
$('#startButton').onclick=begin;$('#pauseButton').onclick=()=>paused?resume():pause();$('#soundButton').onclick=()=>setSound(!muted);
function setSound(value){muted=value;audioStart();$('#soundButton').setAttribute('aria-pressed',String(!muted));$('#soundButton').setAttribute('aria-label',muted?'Activar sonido':'Silenciar sonido');$('#soundButton').innerHTML=muted?'♪<span class="sound-off">/</span>':'♪';if(!muted)playTone('coin');}
$('#fullButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else toast('Usa la pantalla horizontal para ampliar el juego.');}catch{toast('No se pudo activar la pantalla completa.');}};
async function checkAccess(){if(accessBusy||revoked)return;accessBusy=true;try{const r=await fetch('/api/arcade/games/ice-breaker',{cache:'no-store'});if(!r.ok)throw Error('No se pudo verificar el acceso.');const {game}=await r.json();if(!game?.canPlay){revoked=true;paused=true;keys.clear();$('#touchControls').classList.remove('active');const o=$('#overlay');o.className='overlay result';o.hidden=false;o.innerHTML='<div class="intro-panel"><span class="panel-tag">ACCESO CERRADO</span><h2>La expedición<br><em>está bajo llave.</em></h2><p>El staff cerró el juego al público o tu sesión terminó.</p><a class="text-button" href="/#simuladores">Volver a Simuladores</a></div>';return;}$('#accessLabel').textContent=game.staffPreview?'PRUEBA PRIVADA · STAFF':'EXPEDICIÓN ABIERTA';offline=false;$('#connectionError').hidden=true;}catch{offline=true;pause();$('#connectionError').hidden=false;$('#connectionError').textContent='Se perdió la conexión. La expedición queda en pausa hasta verificar el acceso.';}finally{accessBusy=false;}}
setInterval(()=>void checkAccess(),15000);
setInterval(()=>{if(recorder&&scene==='playing')void recorder.flush().catch(()=>{});},3000);
try{await checkAccess();if(!revoked){await Promise.all([background,dani,iceA,iceB,iceFragile,sealCalm,sealAlert,sealWarn].map(image=>image.decode()));const progress=await loadProgress();userId=progress.userId;acceptProgress(progress);ready=true;$('#startButton').disabled=false;$('#startButton').innerHTML='Empezar expedición <span>↗</span>';}}catch{const b=$('#startButton');b.textContent='Reintentar carga';b.disabled=false;b.onclick=()=>location.reload();$('#connectionError').hidden=false;$('#connectionError').textContent='No pudimos cargar el arte de la expedición. Vuelve a intentar.';}
updateHud();requestAnimationFrame(frame);
