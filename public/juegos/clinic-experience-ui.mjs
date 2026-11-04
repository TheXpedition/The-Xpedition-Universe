import {ensureClinicTheme} from './clinic-theme.mjs';
import {MEDICINES} from './world-wellness.mjs';
import {PSYCHOLOGY_STEPS,PSYCHOLOGY_GUIDE} from './clinic-psychology.mjs';
import {worldIcon} from './world-icons.mjs';
import {clinicalSymbol} from './world-medical-art.mjs';
import {castHeightRatio} from './world-cast-proportions.mjs';
import {paintClinicActor,paintClinicChair,clinicActorAsset,clinicalActorSource,paintClinicalName} from './clinic-motion.mjs';
import {drawCastRig} from './apocalypse-cast-rig.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function careChatMarkup(messages=[],selfId,{readOnly=false}={}){return '<section class="care-chat" aria-label="Chat de la consulta"><h4>Chat de la consulta</h4><div class="care-chat-history" aria-live="polite">'+messages.map(m=>'<p class="'+(m.userId===selfId?'own':'')+'"><strong>'+esc(m.name)+'</strong><span>'+esc(m.text)+'</span></p>').join('')+'</div>'+(!readOnly?'<form data-care-chat><input name="text" maxlength="300" autocomplete="off" placeholder="Escribe un mensaje…" aria-label="Mensaje de la consulta"><button aria-label="Enviar mensaje">'+worldIcon('arrow')+'</button></form>':'')+'</section>';}
export function mountClinicGuide(parent){ensureClinicTheme(parent);const doc=parent.ownerDocument,dialog=doc.createElement('dialog'),seen=new Set();dialog.className='clinic-guide';dialog.innerHTML='<header>'+clinicalSymbol('kit')+'<div><small>ENFERMERÍA DE CAMPAÑA</small><h2>Tu consulta, paso a paso</h2></div></header><p>La cita ya está aceptada. Abre el historial del paciente y elige cómo empezar.</p><ol>'+[['Explorar','Lo desconocido aparece con ?. Revisa al paciente para registrar sus signos y síntomas.'],['Preparar','Selecciona material y tratamiento. El paciente confirma antes de comenzar.'],['Atender','Completa los controles. En los comprimidos, el paciente decide cuándo tomarlos.'],['Comprobar','Revisa la respuesta, guarda notas y acuerda seguimiento. Un tratamiento incorrecto puede empeorar su estado.']].map(([a,b])=>'<li><b>'+a+'</b><span>'+b+'</span></li>').join('')+'</ol><button data-guide-close>Entendido · abrir la consulta</button>';parent.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();return {show(appointment,selfId){if(!appointment||appointment.status!=='accepted'||appointment.nurseId!==selfId||seen.has(appointment.id))return;seen.add(appointment.id);dialog.showModal();},destroy:()=>dialog.remove()};}
export function mountPsychologyPlayer(parent,{api,onTreatment=()=>{}}={}){ensureClinicTheme(parent);const doc=parent.ownerDocument,w=doc.defaultView,dialog=doc.createElement('dialog');dialog.className='psychology-player';let s=null,busy=false,frame=0,destroyed=false;const images=new Map(),seatedFallbacks=new Map();parent.append(dialog);
 const image=src=>{if(images.has(src))return images.get(src);images.set(src,null);const im=new w.Image();im.onload=()=>images.set(src,im);im.src=src;return null;};
 function show(){if(!dialog.open)dialog.showModal();if(!frame)frame=w.requestAnimationFrame(draw);}
 function draw(t){
  frame=0;if(!s||!dialog.open||destroyed)return;
  const c=dialog.querySelector('canvas')?.getContext('2d');
  if(c){
   c.clearRect(0,0,960,600);
   const room=image('/juegos/clinic/art/consultation-room-v1.webp'),chair=image('/juegos/clinic/art/patient-chair-v1.webp');
   if(room)c.drawImage(room,0,0,960,600);
   for(const [id,x,nurse]of [[s.nurseCharacter,305,true],[s.patientCharacter,665,false]]){
    const height=335*castHeightRatio(id),src=clinicActorAsset(id,{kind:'psychology',role:nurse?'nurse':'patient'}),im=image(src||clinicalActorSource(id));
    paintClinicChair(c,chair,{x,floor:550,height});
    if(!im)continue;
    if(src)paintClinicActor(c,im,{x,floor:550,height,time:t/1000,nurse:id==='isabel',performing:false});
    else{
     let seated=seatedFallbacks.get(id);
     if(!seated){seated=doc.createElement('canvas');seated.width=800;seated.height=900;drawCastRig(seated.getContext('2d'),im,{id,x:400,y:800,height:620,seated:1,time:0});seatedFallbacks.set(id,seated);}
     const scale=height/620;c.drawImage(seated,x-400*scale,550-800*scale,800*scale,900*scale);
    }
    paintClinicalName(c,nurse?s.nurseName:s.patientName,{x,top:550-height});
   }
  }
  frame=w.requestAnimationFrame(draw);
 }
 function render(){if(!s)return;const step=PSYCHOLOGY_STEPS[s.step],control=s.canControl,active=s.status==='active';dialog.innerHTML='<header><div>'+clinicalSymbol('mind')+'<h2>Consulta psicológica</h2></div><button data-psych="cancel" aria-label="Cerrar sesión">'+worldIcon('close')+'</button></header><div class="psychology-layout"><div class="psychology-scene"><canvas width="960" height="600"></canvas><span>'+esc(s.nurseName)+' · '+esc(s.patientName)+'</span></div><section class="psychology-console"><ol class="psychology-steps">'+PSYCHOLOGY_STEPS.map((p,i)=>'<li class="'+(s.step===i?'current':'')+'">'+(i+1)+'. '+p.name+'</li>').join('')+'</ol>'+(s.status==='consent'?'<h3>Un espacio para hablar</h3><p>'+PSYCHOLOGY_GUIDE.intro+'</p>'+(control?'<ul class="psychology-guide">'+PSYCHOLOGY_GUIDE.steps.map(v=>'<li>'+v+'</li>').join('')+'</ul><p>Esperando la confirmación del paciente.</p>':'<button class="care-primary" data-psych="ready">Estoy listx</button>'):active?'<h3>'+esc(step.name)+'</h3><p>'+esc(s.question|| (s.answered?'Respuesta recibida.':step.help))+'</p>'+(control?'<button data-psych="'+(s.answered?'next':'ask')+'" '+(s.question?'disabled':'')+'>'+(s.answered?s.step===2?'Guardar seguimiento':'Continuar':'Hacer la pregunta')+'</button>':s.question?'<div class="psychology-answers">'+step.answers.map(([id,label])=>'<button data-answer="'+id+'">'+label+'</button>').join('')+'</div>':'<p>Tu profesional está preparando la siguiente parte.</p>'):'<h3>'+esc(s.message||'Sesión completada')+'</h3>'+(control&&s.status==='completed'?'<p>Prepara el cuidado de seguimiento indicado en el historial.</p><select class="psychology-treatment" aria-label="Cuidado de seguimiento">'+MEDICINES.filter(m=>m.group==='mental'||['counselling','cbt-session','erp-session','trauma-therapy','emdr-session','perinatal-support','fluoxetine','risperidone'].includes(m.id)).map(m=>'<option value="'+m.id+'">'+m.name+'</option>').join('')+'</select><button data-psych="treatment">Preparar tratamiento</button><button data-psych="done">Volver al historial</button>':'<button data-psych="done">Volver</button>'))+careChatMarkup(s.messages,s.selfId,{readOnly:!['consent','active'].includes(s.status)})+'</section></div><p class="psychology-error" role="status"></p>';
 }
 async function send(input){if(busy||!s)return;busy=true;try{const value=await api('/psychology/action',{sessionId:s.id,...input});if(value.psychology)update(value.psychology);return true;}catch(e){dialog.querySelector('.psychology-error').textContent=e.message;}finally{busy=false;}}
 function update(value){if(destroyed||!value)return;s=value;const draft=dialog.querySelector('input[name=text]')?.value;render();if(draft&&dialog.querySelector('input[name=text]'))dialog.querySelector('input[name=text]').value=draft;show();}
 dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.psych==='done'){dialog.close();return;}if(b.dataset.psych==='treatment'){const medicineId=dialog.querySelector('.psychology-treatment').value;dialog.close();void Promise.resolve(onTreatment({appointmentId:s.appointmentId,medicineId,dose:'standard'})).catch(e=>{show();dialog.querySelector('.psychology-error').textContent=e.message;});return;}if(b.dataset.psych)void send({action:b.dataset.psych});if(b.dataset.answer)void send({action:'answer',value:b.dataset.answer});});dialog.addEventListener('submit',e=>{if(!e.target.matches('[data-care-chat]'))return;e.preventDefault();const text=e.target.elements.text.value;void send({action:'chat',text}).then(ok=>{const current=dialog.querySelector('[data-care-chat] input');if(ok&&current?.value===text)current.value='';});});dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('cancel',e=>{e.preventDefault();void send({action:'cancel'});});
 const poll=w.setInterval(async()=>{if(!s||!['consent','active'].includes(s.status))return;try{const data=await api('',undefined,'GET');if(data.psychology)update(data.psychology);}catch{}},2500);
 return {update,async start(input){const value=await api('/psychology/start',input);update(value.psychology);return value;},destroy(){destroyed=true;w.clearInterval(poll);w.cancelAnimationFrame?.(frame);dialog.remove();}};
}
