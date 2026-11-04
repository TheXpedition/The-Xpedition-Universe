// These interactions use game units and fictional supplies, never real doses.
export const CLINIC_PROCEDURES=Object.freeze({
 test:{name:'Prueba de embarazo',icon:'test',pose:'clipboard',material:'Kit de prueba',steps:['Preparar la prueba','Procesar el control','Registrar el resultado'],tool:'test'},
 exam:{name:'Exploración',icon:'clipboard',pose:'clipboard',material:'Libreta y equipo',steps:['Preparar la exploración','Observar al paciente','Registrar el control'],tool:'notebook'},
 pressure:{name:'Control de presión',icon:'monitor',pose:'pressure',material:'Tensiómetro',steps:['Preparar el equipo','Estabilizar la lectura','Registrar el control'],tool:'monitor'},
 injection:{name:'Aplicación supervisada',icon:'physical',pose:'injection',material:'Equipo de inyección',steps:['Preparar el material','Aplicar con precisión','Observar la respuesta'],tool:'shield'},
 pills:{name:'Administrar tratamiento',icon:'pills',pose:'pills',material:'Tratamiento y agua',steps:['Comprobar la selección','Entregar el tratamiento','Observar la respuesta'],tool:'pills'},
 bandage:{name:'Curación y vendaje',icon:'physical',pose:'bandage',material:'Material de curación',steps:['Preparar el material','Ajustar el cuidado','Observar la respuesta'],tool:'kit'},
 support:{name:'Cuidados y recuperación',icon:'support',pose:'clipboard',material:'Equipo de cuidados',steps:['Preparar el cuidado','Acompañar al paciente','Observar la respuesta'],tool:'support'}
});
export const CLINIC_POSES=['clipboard','pressure','prepare','injection','pills','bandage'];
export const CLINIC_PATIENT_IDS=Object.freeze(['sallua','carmine','bruno','daelly','bayron','arisantana','marianito','leandro','vitany','kareli','vita','eduard','joseserna','guillermo','peggy','andromeda','ivy','roger','maria-villegas']);
export const PROCEDURE_TTL=90000,OBSERVE_MS=2400,TARGET_CYCLE=2400;
export const procedureActive=s=>!!s&&['consent','active'].includes(s.status);
export function procedureKind(medicine){if(!medicine)return 'exam';if(medicine.id==='pregnancy-test')return 'test';if(medicine.id==='blood-pressure-monitor')return 'pressure';if(medicine.id==='emergency-injection')return 'injection';if(['antiseptic','dressing','support-wrap','plaster','skin-gel','cool-pack','disinfectant-alcohol'].includes(medicine.id))return 'bandage';if(['therapy','support','hygiene','procedure','prevention','reproductive'].includes(medicine.kind)||['rest-kit','recovery-meal','thermal-blanket','dry-kit','water','warm-drink','rehydration'].includes(medicine.id))return 'support';return 'pills';}
export function procedureTarget(s,at){const elapsed=Math.max(0,at-s.stepAt),cycle=Math.floor(elapsed/TARGET_CYCLE),progress=(elapsed%TARGET_CYCLE)/TARGET_CYCLE;return {cycle,progress,center:.5+Math.sin(cycle*2.17)*.16,width:.3};}
export function clinicPose(s,role='nurse'){if(!procedureActive(s))return null;const kind=CLINIC_PROCEDURES[s.kind];return {kind:s.kind,role,pose:s.step===0||s.status==='consent'?(s.kind==='injection'?'prepare':'clipboard'):kind.pose,step:s.step,at:s.stepAt};}
export function clinicReadings(analysis={}){const v=analysis.vitals||{},conditions=analysis.body?.conditions||analysis.conditions||[],stress=Number(v.stress||0),energy=Number(v.energy??100),sleep=Number(v.sleep??100);return {pressure:stress>70?'Alterada':'Estable',pulse:stress>60||energy<30?'Agitado':'Tranquilo',reserves:energy<35||sleep<35?'Bajas':'Conservadas',needsFollowUp:stress>70||energy<35||sleep<35||conditions.some(c=>Number(c.severity)>65)};}
