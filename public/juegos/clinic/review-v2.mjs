import {mountClinicPlayer} from '../clinic-player.mjs';
import {mountClinicGuide,mountPsychologyPlayer} from '../clinic-experience-ui.mjs';
import {mountFamilyPlayer} from '../world-family-ui.mjs';
import {mountClinicPanel,mountClinicNotice} from '../world-clinic-ui.mjs';
import {clinicalRecordMarkup} from '../clinic-record-ui.mjs';
import {clinicalIdentity} from '../clinic-identities.mjs';
import {clinicalSymbol} from '../world-medical-art.mjs';
import {CLINIC_PROCEDURES} from '../clinic-procedures.mjs';
import {applyClinicalGesture} from '../clinic-gestures.mjs';
import {maternityTask} from '../maternity-tasks.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const REVIEW_SCENES=[
 ['appointments','Consulta','Citas y solicitudes','kit','Acepta una solicitud y abre el historial para empezar.'],
 ['directory','Consulta','Pedir cita','support','La vista del paciente, con profesionales y coste de la consulta.'],
 ['invitation','Consulta','Invitación médica','dialogue','El paciente acepta o rechaza la invitación del profesional.'],
 ['history-unknown','Historial','Antes de explorar','notebook','Los datos clínicos que todavía no se conocen aparecen con ?.'],
 ['history-known','Historial','Historial y evolución','notebook','Resumen, signos, tratamiento y notas del paciente.'],
 ['treatments','Historial','Preparar tratamiento','pills','Selecciona el cuidado, revisa sus efectos y prepara la atención.'],
 ['guide','Atención','Guía de Enfermería','kit','La guía que recibe el profesional al aceptar una consulta.'],
 ['consent','Atención','Confirmar atención','support','El paciente confirma que está listo antes de comenzar.'],
 ...Object.entries(CLINIC_PROCEDURES).map(([id,p])=>['procedure-'+id,'Atención',p.name,p.icon,'Prueba los controles compartidos de '+p.name.toLowerCase()+'.']),
 ['medicine-patient','Atención','Tomar medicamento','pills','El medicamento preparado lo toma el paciente por decisión propia.'],
 ['psychology-guide','Psicología','Preparar la sesión','mind','Consentimiento y orientación para empezar la entrevista.'],
 ['psychology','Psicología','Entrevista','dialogue','Enfermería pregunta; cambia a Paciente para responder.'],
 ['psychology-followup','Psicología','Seguimiento','notebook','Revisa el plan y prepara el cuidado después de la conversación.'],
 ['pregnancy','Maternidad','Resultado positivo','reproductive','Confirmación del test y progreso de la gestación.'],
 ['pregnancy-negative','Maternidad','Resultado negativo','reproductive','Resultado de una prueba sin gestación detectada.'],
 ['birth-admission','Maternidad','Preparar el nacimiento','bed','Enfermería revisa la llegada antes de empezar.'],
 ['birth-monitor','Maternidad','Ecografía','monitor','Mueve el sensor por el vientre y registra tres lecturas.'],
 ['birth-birth','Maternidad','Acompañamiento','support','Mantén y suelta para acompañar el ritmo.'],
 ['birth-patient','Maternidad','Vista de la paciente','bed','La paciente permanece en la cama y puede conversar.'],
 ['birth-stabilize','Maternidad','Incubadora','monitor','Ajusta la temperatura y mantén el entorno estable.'],
 ['birth-selection','Maternidad','Elegir al bebé','reproductive','La madre elige la apariencia, el nombre y el género.'],
 ['birth-care','Maternidad','Primeros cuidados','cup','Alimenta, cambia el pañal y calma al bebé.'],
 ['birth-completed','Maternidad','Regreso al refugio','support','El nacimiento queda registrado antes del regreso.'],
 ['sanitation','Refugios','Zona de necesidades','soap','Limpia, usada y sucia: los tres estados de la canasta.']
].map(([id,group,title,icon,description])=>({id,group,title,icon,description}));
const messages=()=>[{id:'intro',userId:'m',name:'Vita',text:'Me he sentido cansada desde el último reto.'},{id:'reply',userId:'n',name:'Isabel',text:'Vamos a revisar cómo estás antes de preparar el cuidado.'}];
const birthBase=()=>({id:'visual-birth',selfId:'n',motherId:'m',fatherId:'f',nurseId:'n',motherName:'Vita',fatherName:'Leandro',nurseName:'Isabel',characterId:'vita',fatherCharacter:'leandro',nurseCharacter:'isabel',phase:'admission',stepAt:Date.now(),serverTime:Date.now(),canControl:true,canChoose:false,messages:messages(),care:{feed:false,change:false,soothe:false},hits:0});
const procedureBase=(kind='pressure')=>({id:'visual-care',appointmentId:'sample-visit',selfId:'n',nurseId:'n',patientId:'m',nurseName:'Isabel',patientName:'Vita',nurseCharacter:'isabel',patientCharacter:'vita',kind,material:CLINIC_PROCEDURES[kind].material,status:'active',step:1,hits:1,canControl:true,canConsent:false,stepAt:Date.now(),serverTime:Date.now(),messages:messages()});
const appointment=()=>({id:'sample-visit',nurseId:'n',patientId:'m',nurseName:'Isabel',patientName:'Vita',cost:100,status:'requested',created:Date.now()});
function sampleRecord(known=true){return {patient:{userId:'m',name:'Vita'},canWrite:true,appointments:[{...appointment(),status:'accepted'}],dossier:{profile:{...clinicalIdentity('vita',2),refuge:'Refugio 1',recordId:'PX-07C123AF'},known,status:known?'En seguimiento':'?',examinedAt:Date.now(),vitals:known?{temperature:'36.8 °C',pulse:'78 lpm',pressure:'118 / 76',oxygen:'97 %'}:null,symptoms:known?[{name:'Cansancio',severity:38,stage:'En seguimiento'},{name:'Estrés elevado',severity:46,stage:'En seguimiento'}]:null,treatments:known?[{name:'Plan de descanso',result:'effective'}]:null,progress:known?{health:4,stress:-8}:null},analysis:known?{examinedAt:Date.now(),body:{conditions:[{id:'anxiety',name:'Ansiedad',severity:46}]},vitals:{health:82,hunger:74,energy:65,sleep:68,stress:46}}:null,notes:known?[{text:'Revisar descanso y evolución después del reto.',created:Date.now(),nurseName:'Isabel'}]:[],history:[]};}
export function mountClinicReview(doc,{preload=true}={}){
 const w=doc.defaultView,q=s=>doc.querySelector(s),host=q('#review-content'),loading=q('#review-loading');let active=null,sceneId=null,epoch=0,destroyed=false,role='nurse';
 const groupNames=[...new Set(REVIEW_SCENES.map(s=>s.group))];
 q('#review-scenes').innerHTML=groupNames.map(group=>'<section class="review-scene-group"><h2>'+group+'</h2>'+REVIEW_SCENES.filter(s=>s.group===group).map(s=>'<button data-scene="'+s.id+'">'+clinicalSymbol(s.icon)+'<span>'+esc(s.title)+'</span></button>').join('')+'</section>').join('');
 function embedded(){for(const d of host.querySelectorAll('dialog')){d.classList.add('review-embedded');d.showModal=()=>{if(!d.open)d.setAttribute('open','');};d.addEventListener('close',()=>{if(!destroyed&&d===host.querySelector('dialog')&&!host.querySelector('dialog[open]'))empty();});}}
 function empty(){if(destroyed||host.querySelector('.review-empty'))return;host.insertAdjacentHTML('beforeend','<div class="review-empty">Vista cerrada.<button data-review-reopen>Volver a abrir esta pantalla</button></div>');}
 function clear(){active?.destroy?.();active=null;host.replaceChildren();q('#review-roles').replaceChildren();q('#review-status').textContent='';}
 function roles(setRole,choices=['nurse','patient']){const labels={nurse:'Enfermería',patient:'Paciente',father:'Acompañante'};q('#review-roles').innerHTML=choices.map(id=>'<button data-review-role="'+id+'" aria-pressed="'+(role===id)+'">'+labels[id]+'</button>').join('');q('#review-roles').onclick=e=>{const b=e.target.closest('[data-review-role]');if(!b)return;role=b.dataset.reviewRole;for(const button of q('#review-roles').children)button.setAttribute('aria-pressed',String(button===b));setRole(role);};}
 function criticalImages(id){if(id.startsWith('procedure-')||['consent','medicine-patient','psychology','psychology-guide','psychology-followup'].includes(id))return ['/juegos/clinic/art/consultation-room-v1.webp','/juegos/clinic/art/patient-chair-v1.webp','/juegos/clinic/art/vita-ready-v1.webp'];if(id.startsWith('birth-'))return ['/juegos/clinic/family/maternity-room-v1.webp','/juegos/clinic/family/maternity-bed-v1.webp','/juegos/clinic/family/vita-reclined.webp','/juegos/clinic/art/isabel-ultrasound-body-v2.webp','/juegos/clinic/art/isabel-ultrasound-arm-v2.webp'];return [];}
 async function loadImages(id){if(!preload)return;const all=await Promise.allSettled(criticalImages(id).map(src=>new Promise((resolve,reject)=>{const im=new w.Image(),timer=w.setTimeout(()=>reject(Error(src)),7000);im.onload=()=>{w.clearTimeout(timer);resolve();};im.onerror=()=>{w.clearTimeout(timer);reject(Error(src));};im.src=src;})));return all.some(r=>r.status==='rejected');}
 async function open(id,{keepRole=false}={}){
  const scene=REVIEW_SCENES.find(s=>s.id===id)||REVIEW_SCENES[0],ticket=++epoch;sceneId=scene.id;clear();if(!keepRole)role=['consent','medicine-patient','birth-patient','birth-selection'].includes(scene.id)?'patient':'nurse';
  q('#review-title').textContent=scene.title;q('#review-category').textContent=scene.group.toUpperCase();q('#review-description').textContent=scene.description;const index=REVIEW_SCENES.indexOf(scene);q('#review-position').textContent=(index+1)+' / '+REVIEW_SCENES.length;q('#review-prev').disabled=index===0;q('#review-next').disabled=index===REVIEW_SCENES.length-1;
  for(const button of doc.querySelectorAll('[data-scene]')){if(button.dataset.scene===scene.id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  loading.hidden=false;const missing=await loadImages(scene.id);if(destroyed||ticket!==epoch)return;loading.hidden=true;if(missing)q('#review-status').textContent='Un recurso tardó en cargar. Puedes cambiar de vista o volver a abrirla.';
  const key=scene.id;
  if(key.startsWith('history')){const record=sampleRecord(key==='history-known'),dialog=doc.createElement('dialog');dialog.className='review-record';host.append(dialog);embedded();const render=tab=>{dialog.innerHTML=clinicalRecordMarkup(record,{tab});};dialog.onclick=e=>{const b=e.target.closest('[data-clinic-record-tab]');if(b)render(b.dataset.clinicRecordTab);};render('summary');dialog.showModal();return;}
  if(['appointments','directory','treatments'].includes(key)){
   const root=doc.createElement('section');host.append(root);const data={selfId:key==='directory'?'m':'n',nurse:key!=='directory',wallet:{coins:2400},appointments:[appointment()],nurses:[{userId:'n',name:'Isabel',available:true,online:true,site:'Enfermería de campaña'}],patients:[{userId:'m',name:'Vita',lastVisit:Date.now()}]};
   const ui=mountClinicPanel(root,{mode:key==='directory'?'directory':'notebook',data,onRequest:async()=>({appointments:[appointment()]}),onAccept:async()=>({appointments:[{...appointment(),status:'accepted'}]}),onDecline:async()=>({appointments:[{...appointment(),status:'rejected'}]}),onPatient:async()=>({record:sampleRecord()}),onProcedure:async input=>{await open('procedure-'+(input.kind||'pills'));return {};},onPsychology:async()=>{await open('psychology');return {};},onNote:async input=>{const r=sampleRecord();r.notes.push({text:input.text,nurseName:'Isabel',created:Date.now()});return {record:r};},onFinish:async()=>({appointments:[{...appointment(),status:'finished'}]})});active=ui;if(key==='appointments')root.querySelector('[data-clinic-tab=appointments]').click();if(key==='treatments')ui.openRecord(sampleRecord());return;
  }
  if(key==='invitation'){const ui=mountClinicNotice(host,{onRespond:async()=>{q('#review-status').textContent='Respuesta registrada en esta vista de muestra.';}});active=ui;ui.show({type:'appointment',appointment:{...appointment(),status:'invited'}});return;}
  if(key==='guide'){const ui=mountClinicGuide(host);active=ui;embedded();ui.show({id:'guide-'+ticket,nurseId:'n',status:'accepted'},'n');return;}
  if(key.startsWith('procedure-')||['consent','medicine-patient'].includes(key)){
   let state=procedureBase(key.startsWith('procedure-')?key.slice(10):'pills');if(key==='consent')state.status='consent';if(key==='medicine-patient'){state.step=2;state.stepAt=Date.now()-5000;}
   const present=()=>({...structuredClone(state),selfId:role==='nurse'?'n':'m',canControl:role==='nurse',canConsent:role!=='nurse'&&state.status==='consent',serverTime:Date.now()});
   const ui=mountClinicPlayer(host,{api:async(path,input)=>{if(input){if(input.action==='chat')state.messages.push({userId:role==='nurse'?'n':'m',name:role==='nurse'?'Isabel':'Vita',text:input.text});else if(input.action==='gesture')applyClinicalGesture(state,input,Date.now());else if(input.action==='cancel')state.status='cancelled';else if(path.endsWith('/respond'))state.status=input.accept?'active':'cancelled';else if(input.action==='comfort')state.comfort=input.value;else if(input.action==='consume'||state.step===2){state.status='completed';state.result='effective';state.message='Atención registrada en el historial.';}else if(state.step===0)state.step=1;else if(++state.hits>=3)state.step=2;state.stepAt=Date.now()-3000;}return {procedure:present()};}});active=ui;embedded();roles(()=>ui.update(present()));ui.update(present());return;
  }
  if(key.startsWith('psychology')){
   let state={...procedureBase(),id:'psychology',status:key==='psychology-guide'?'consent':key==='psychology-followup'?'completed':'active',step:key==='psychology-followup'?2:0,answers:[],question:null};
   const present=()=>({...structuredClone(state),selfId:role==='nurse'?'n':'m',canControl:role==='nurse'});
   const ui=mountPsychologyPlayer(host,{api:async(path,input)=>{if(input){if(input.action==='ready')state.status='active';if(input.action==='ask')state.question='¿Cómo te has sentido desde la última revisión?';if(input.action==='answer'){state.question=null;state.answered=true;}if(input.action==='next'){if(state.step<2){state.step++;state.answered=false;}else{state.status='completed';state.message='Seguimiento registrado.';}}if(input.action==='cancel')state.status='cancelled';if(input.action==='chat')state.messages.push({userId:role==='nurse'?'n':'m',name:role==='nurse'?'Isabel':'Vita',text:input.text});}return {psychology:present()};},onTreatment:()=>open('procedure-pills')});active=ui;embedded();roles(()=>ui.update(present()));ui.update(present());return;
  }
  if(key.startsWith('pregnancy')||key.startsWith('birth-')){
   let state=birthBase();state.phase=key==='birth-patient'?'birth':key.replace('birth-','');if(['care','completed'].includes(state.phase))state.baby={name:'Lía',appearance:'baby-3',gender:'female'};if(state.phase==='completed')state.returnAt=Date.now()+15000;
   if(key.startsWith('pregnancy'))state=null;
   const present=()=>state?({...structuredClone(state),selfId:role==='nurse'?'n':role==='father'?'f':'m',canControl:role==='nurse',canChoose:role==='patient'&&state.phase==='selection',serverTime:Date.now()}):null;
   const ui=mountFamilyPlayer(host,{api:async(path,input)=>{if(input&&state){if(input.action==='return'){state=null;return {visit:null};}if(input.action==='cancel'){state.phase='cancelled';state.message='Atención interrumpida.';}if(input.action==='next'){state.phase='monitor';state.stepAt=Date.now();}if(input.action==='chat')state.messages.push({userId:role==='nurse'?'n':role==='father'?'f':'m',name:role==='nurse'?'Isabel':role==='father'?'Leandro':'Vita',text:input.text});if(['scan','breathe','temperature'].includes(input.action))maternityTask(state,input,Date.now());if(input.action==='choose'){state.baby={name:input.name,appearance:input.appearance,gender:input.gender};state.phase='care';}if(input.action==='care'){const old=state.hold;if(input.kind==='change')state.care.change=true;else if(!old||old.kind!==input.kind)state.hold={kind:input.kind,last:Date.now(),elapsed:0};else{old.elapsed+=Math.min(400,Date.now()-old.last);old.last=Date.now();if(old.elapsed>=2800){state.care[input.kind]=true;state.hold=null;}}if(Object.values(state.care).every(Boolean)){state.phase='completed';state.returnAt=Date.now()+15000;}}}return {visit:present()};},clinicApi:async()=>({nurses:[]}),onReturn:()=>{q('#review-status').textContent='Regreso completado en la vista de muestra.';empty();}});active=ui;embedded();
   if(key.startsWith('pregnancy'))ui.pregnancyResult({positive:key==='pregnancy',pregnancy:{days:10}});else{roles(()=>ui.visit(present()),['nurse','patient','father']);ui.visit(present());}return;
  }
  if(key==='sanitation')host.innerHTML='<section class="review-sanitation">'+[['clean','Limpia','Disponible para una persona.'],['urine','Usada','Se puede limpiar para dejarla lista.'],['dirty','Sucia','Necesita limpieza antes del siguiente uso.']].map(([id,title,text])=>'<article><img src="/juegos/clinic/art/basket-'+id+'-v1.webp" alt="Canasta '+title.toLowerCase()+'"><h2>'+title+'</h2><p>'+text+'</p></article>').join('')+'</section>';
 }
 q('#review-scenes').onclick=e=>{const b=e.target.closest('[data-scene]');if(b)void open(b.dataset.scene);};host.onclick=e=>{if(e.target.closest('[data-review-reopen]'))void open(sceneId);};
 q('#review-prev').onclick=()=>{const i=REVIEW_SCENES.findIndex(s=>s.id===sceneId);if(i>0)void open(REVIEW_SCENES[i-1].id);};q('#review-next').onclick=()=>{const i=REVIEW_SCENES.findIndex(s=>s.id===sceneId);if(i<REVIEW_SCENES.length-1)void open(REVIEW_SCENES[i+1].id);};
 q('#review-expand').onclick=()=>{const stage=q('#review-stage');if(doc.fullscreenElement)void doc.exitFullscreen?.();else void stage.requestFullscreen?.();};
 const cleanup=()=>{destroyed=true;epoch++;clear();};w.addEventListener('pagehide',cleanup,{once:true});const initial=new URL(w.location.href).searchParams.get('scene')||'appointments';void open(initial);
 return {open,get sceneId(){return sceneId;},destroy(){cleanup();w.removeEventListener('pagehide',cleanup);}};
}
if(typeof document!=='undefined'&&document.getElementById('clinic-review'))mountClinicReview(document);
