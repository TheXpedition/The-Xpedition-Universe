// Fictional gameplay timelines and efficacy values, never real treatment schedules.
export const INFECTIOUS_CONDITIONS = [
 ['smoke-irritation','Irritación por humo','exposición acumulada al tabaco','respiratory',.12,['salbutamol','pulmonary-rehab']],
 ['copd','EPOC · seguimiento respiratorio','exposición acumulada al tabaco','respiratory',.28,['salbutamol','tiotropium','pulmonary-rehab']],
 ['hiv-1','VIH-1','exposición a una persona portadora; diagnóstico privado','infection',0,['emtricitabine-tenofovir','dolutegravir','hiv-screen']],
 ['hiv-2','VIH-2','exposición a una persona portadora; diagnóstico privado','infection',0,['emtricitabine-tenofovir','dolutegravir','hiv-screen']],
 ['aids','SIDA · fase avanzada','progresión de una infección por VIH sin controlar','infection',.35,['emtricitabine-tenofovir','dolutegravir']],
 ['opportunistic-pneumonia','Neumonía oportunista','complicación de una infección avanzada','infection',.55,['cotrimoxazole']],
 ['oral-candidiasis','Candidiasis oral','complicación de una infección avanzada','infection',.18,['fluconazole']]
];
export const INFECTIOUS_MEDICINES = [
 ['emtricitabine-tenofovir','Emtricitabina / tenofovir · Truvada','Componente antirretroviral combinado. En esta simulación se necesita además dolutegravir para controlar el VIH. Por sí solo no es un tratamiento completo. Seguimiento en Enfermería.',0,0,['hiv-1','hiv-2','aids']],
 ['dolutegravir','Dolutegravir · comprimidos','Componente del plan antirretroviral junto a emtricitabina / tenofovir. Controla la infección con seguimiento; no elimina el VIH.',0,0,['hiv-1','hiv-2','aids']],
 ['cotrimoxazole','Cotrimoxazol · comprimidos','Tratamiento del catálogo para la neumonía oportunista. Atiende la complicación, no sustituye el plan antirretroviral.',38,0,['opportunistic-pneumonia']],
 ['fluconazole','Fluconazol · cápsulas','Antifúngico del catálogo para candidiasis oral. No trata el VIH.',35,0,['oral-candidiasis']],
 ['salbutamol','Salbutamol · inhalador','Alivio respiratorio de corta duración en la simulación. Reduce síntomas; no cura la EPOC.',20,0,['smoke-irritation','copd']],
 ['tiotropium','Tiotropio · inhalador','Mantenimiento respiratorio con efecto gradual. Requiere seguimiento y no elimina la EPOC.',24,0,['copd']],
 ['pulmonary-rehab','Rehabilitación respiratoria','Sesión de respiración, descanso y apoyo para dejar el tabaco. Alivia síntomas con seguimiento, sin eliminar una condición crónica.',18,0,['smoke-irritation','copd']],
 ['hiv-screen','Prueba de VIH · análisis clínico','Diagnóstico privado del personaje en consulta. Distingue los dos tipos representados en el juego; no se publica en el chat.',0,0,[]]
];
export const INFECTIOUS_METADATA = {
 'emtricitabine-tenofovir':{kind:'antiretroviral',group:'physical',icon:'pills'},
 dolutegravir:{kind:'antiretroviral',group:'physical',icon:'pills'},
 cotrimoxazole:{kind:'treatment',group:'physical',icon:'pills',gradual:true,duration:600},
 fluconazole:{kind:'treatment',group:'physical',icon:'pills',gradual:true,duration:480},
 salbutamol:{kind:'treatment',group:'physical',icon:'inhaler'},
 tiotropium:{kind:'treatment',group:'physical',icon:'inhaler',gradual:true,duration:600},
 'pulmonary-rehab':{kind:'therapy',group:'physical',icon:'lungs',gradual:true,duration:480},
 'hiv-screen':{kind:'diagnostic',group:'equipment',icon:'test',usableWithoutCondition:true}
};
const bound=(v,lo=0,hi=1e9)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:lo));
export function infectionState(seed={}) {
 return {type:['hiv-1','hiv-2'].includes(seed.type)?seed.type:null,
  progression:bound(seed.progression,0,100),acquired:bound(seed.acquired),
  components:{backboneUntil:bound(seed.components?.backboneUntil),integraseUntil:bound(seed.components?.integraseUntil)}};
}
function add(body,id,severity=20) {
 if(!body.conditions.some(c=>c.id===id)&&body.conditions.length<16)
  body.conditions.push({id,severity,age:0,treatment:0});
}
export function setInfection(body,type) {
 if(!['hiv-1','hiv-2'].includes(type))throw Error('Tipo de infección no válido.');
 if(body.infection?.type===type)return body;
 body.infection=infectionState({type,acquired:body.elapsed});add(body,type,5);return body;
}
export function isSuppressed(body) {
 const i=body.infection;return Boolean(i?.type&&i.components.backboneUntil>body.elapsed&&i.components.integraseUntil>body.elapsed);
}
export function applyInfectiousCare(body,medicineId,outcome) {
 body.infection=infectionState(body.infection);if(outcome!=='effective')return body;
 if(medicineId==='hiv-screen')body.clinical.known=[...new Set([...body.clinical.known,'hiv-screen',...body.conditions.filter(c=>['hiv-1','hiv-2','aids'].includes(c.id)).map(c=>c.id)])];
 if(body.infection.type) {
  if(medicineId==='emtricitabine-tenofovir')body.infection.components.backboneUntil=body.elapsed+3600;
  if(medicineId==='dolutegravir')body.infection.components.integraseUntil=body.elapsed+3600;
 }
 return body;
}
export function advanceInfection(body,seconds) {
 body.infection=infectionState(body.infection);const i=body.infection;if(!i.type)return body;
 add(body,i.type,5);const controlled=isSuppressed(body);
 i.progression=bound(i.progression+seconds*(controlled?-100/21600:100/(i.type==='hiv-2'?86400:43200)),0,100);
 if(i.progression>=80) {add(body,'aids',35);add(body,'opportunistic-pneumonia',24);add(body,'oral-candidiasis',20);}
 for(const c of body.conditions.filter(c=>c.id===i.type||c.id==='aids')) {
  c.severity=c.id===i.type?Math.max(5,i.progression*.6):Math.max(5,i.progression-45);
  // Components do not individually behave as a cure.
  c.treatment=controlled?5:0;c.careRate=0;
 }
 return body;
}
export function infectiousSnapshot(body) {
 const known=body.clinical.known.includes('hiv-screen'),i=body.infection;
 return {respiratory:{exposure:body.smoking?.total||0,needsReview:body.conditions.some(c=>['smoke-irritation','copd'].includes(c.id))},
  infection:known?{status:i.type?'positive':'negative',type:i.type,controlled:isSuppressed(body),advanced:body.conditions.some(c=>c.id==='aids')}: {status:'unknown'}};
}
export const CLINICAL_REFERENCE_LINKS = Object.freeze([
 'https://www.cdc.gov/hiv/causes/index.html',
 'https://clinicalinfo.hiv.gov/en/guidelines/hiv-clinical-guidelines-adult-and-adolescent-arv/special-populations-hiv-2-infection',
 'https://www.nhs.uk/conditions/chronic-obstructive-pulmonary-disease-copd/treatment/'
]);
