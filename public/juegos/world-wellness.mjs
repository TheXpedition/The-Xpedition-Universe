import {INFECTIOUS_CONDITIONS,INFECTIOUS_MEDICINES,INFECTIOUS_METADATA,infectionState,advanceInfection,applyInfectiousCare,infectiousSnapshot} from './world-infectious-health.mjs';
import {smokingState,advanceSmoking} from './world-smoking.mjs';
import {PRIVATE_CLINICAL_IDS,CHRONIC_CONDITION_IDS} from './world-character-health.mjs';
import {EXTRA_CONDITIONS,EXTRA_MEDICINES,MEDICAL_METADATA,createHealthSystems,advanceHealthSystems,publicSystems} from './world-health-systems.mjs';
import {createVitals} from './world-vitals.mjs';
import {outdoorExposure} from './world-environment.mjs';
// Fictional game conditions and treatments. Values are game units, never real doses.
const definitions=[
 ['dehydration','Deshidratación','calor','heat',.55,['rehydration','water']],
 ['heat-exhaustion','Agotamiento por calor','calor','heat',.7,['cool-pack','rehydration']],
 ['sun-irritation','Irritación por exposición','calor','heat',.25,['skin-gel','cool-pack']],
 ['heatstroke','Golpe de calor','calor','heat',1.1,['cool-pack','clinical-care']],
 ['chill','Enfriamiento','frío','cold',.35,['thermal-blanket','warm-drink']],
 ['hypothermia','Hipotermia','frío','cold',.9,['thermal-blanket','clinical-care']],
 ['wet-chill','Malestar por ropa mojada','lluvia','wet',.35,['dry-kit','thermal-blanket']],
 ['respiratory-irritation','Irritación respiratoria','exposición prolongada','cold',.4,['respiratory-care','warm-drink']],
 ['fatigue','Fatiga intensa','falta de descanso','fatigue',.25,['rest-kit','recovery-meal']],
 ['sleep-debt','Agotamiento por falta de sueño','falta de descanso','fatigue',.35,['rest-kit']],
 ['scratch','Corte superficial','escombros','injury',.35,['antiseptic','dressing']],
 ['bruise','Contusión','terreno irregular','injury',.3,['cool-pack','pain-care']],
 ['sprain','Esguince','correr por escombros','injury',.55,['support-wrap','pain-care']],
 ['wound-infection','Herida contaminada','corte sin atender','infection',.8,['wound-care','clinical-care']],
 ['indigestion','Indigestión','demasiadas porciones seguidas','food',.25,['digestive-care','rehydration']],
 ['food-sickness','Malestar alimentario','alimentos sensibles expuestos al calor','food',.6,['digestive-care','rehydration','clinical-care']],
 ['nausea','Náuseas','alimentación pesada','food',.3,['digestive-care']],
 ['fever','Estado febril','complicación de una herida','infection',.65,['clinical-care','hydration-care']]
];
definitions.push(...EXTRA_CONDITIONS,...INFECTIOUS_CONDITIONS);
export const CONDITIONS=Object.freeze(definitions.map(([id,name,cause,group,drain,treatments])=>Object.freeze({id,name,cause,group,drain,treatments,chronic:CHRONIC_CONDITION_IDS.includes(id)})));
export const CONDITION_BY_ID=Object.freeze(Object.fromEntries(CONDITIONS.map(c=>[c.id,c])));
export const CLOTHING=Object.freeze([{id:'heat',name:'Ropa ligera',description:'Ventilada para calor. Protege poco del frío y de la lluvia.',icon:'sun'},{id:'cold',name:'Abrigo térmico',description:'Reduce la exposición al frío y la lluvia. Da calor en días cálidos.',icon:'snow'}]);
const meds=[
 ['water','Agua de campaña','Rehidrata al personaje.',32,3,['dehydration']],
 ['rehydration','Sales de recuperación','Recuperación por calor o malestar alimentario.',45,4,['dehydration','heat-exhaustion','indigestion','food-sickness']],
 ['cool-pack','Compresa fría','Alivia exposición al calor y contusiones.',40,3,['heat-exhaustion','sun-irritation','heatstroke','bruise']],
 ['skin-gel','Gel protector','Cuidado de la piel irritada.',55,2,['sun-irritation']],
 ['thermal-blanket','Manta de emergencia','Recupera temperatura tras exposición al frío.',45,3,['chill','hypothermia','wet-chill']],
 ['warm-drink','Bebida caliente','Recuperación suave del frío.',32,2,['chill','respiratory-irritation']],
 ['dry-kit','Kit de secado','Retira humedad acumulada de la ropa.',55,2,['wet-chill']],
 ['respiratory-care','Cuidado respiratorio','Tratamiento de campaña para irritación respiratoria.',45,3,['respiratory-irritation']],
 ['rest-kit','Kit de descanso','Ayuda a recuperarse del agotamiento.',45,2,['fatigue','sleep-debt']],
 ['recovery-meal','Ración de recuperación','Alimento del puesto de atención.',30,4,['fatigue']],
 ['antiseptic','Kit antiséptico','Limpieza de cortes recientes.',45,3,['scratch']],
 ['dressing','Apósitos y gasas','Cubre cortes superficiales.',45,3,['scratch']],
 ['support-wrap','Venda de soporte','Recuperación de un esguince.',45,3,['sprain']],
 ['pain-care','Paracetamol · comprimidos','Alivia contusiones y esguinces.',30,2,['bruise','sprain']],
 ['wound-care','Amoxicilina · cápsulas','Tratamiento de heridas contaminadas.',45,4,['wound-infection']],
 ['digestive-care','Metoclopramida · comprimidos','Tratamiento de malestar tras comer.',45,3,['indigestion','nausea','food-sickness']],
 ['clinical-care','Tratamiento clínico','Atención del hospital para complicaciones.',55,5,['hypothermia','heatstroke','wound-infection','food-sickness','fever']],
 ['hydration-care','Suero de campaña','Recuperación de deshidratación y estado febril.',40,4,['dehydration','fever']]
];
meds.push(...EXTRA_MEDICINES,...INFECTIOUS_MEDICINES);
export const MEDICINES=Object.freeze(meds.map(([id,name,description,power,health,treats])=>Object.freeze({id,name,description,power,health,treats:[...new Set([...treats,...CONDITIONS.filter(c=>c.treatments.includes(id)).map(c=>c.id)])],kind:'treatment',prescription:true,...MEDICAL_METADATA[id],...INFECTIOUS_METADATA[id]})));
export const MEDICINE_BY_ID=Object.freeze(Object.fromEntries(MEDICINES.map(m=>[m.id,m])));
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export function createWellness(seed={}){return {...createHealthSystems(seed),infection:infectionState(seed.infection),smoking:smokingState(seed.smoking),privateRestAt:clamp(seed.privateRestAt??0,0,1e15),baseClothingCondition:clamp(seed.baseClothingCondition??100),clothingCondition:clamp(seed.clothingCondition??100),clothingOptions:seed.clothingOptions,clothing:CLOTHING.some(c=>c.id===seed.clothing)?seed.clothing:'heat',elapsed:clamp(seed.elapsed,0,1e9),wetness:clamp(seed.wetness),exposure:Object.fromEntries(['heat','cold','wet','injury','fatigue','food'].map(k=>[k,clamp(seed.exposure?.[k],0,3600)])),conditions:(Array.isArray(seed.conditions)?seed.conditions:[]).filter(c=>CONDITION_BY_ID[c.id]).slice(0,16).map(c=>({id:c.id,severity:clamp(c.severity,1),age:clamp(c.age,0,1e7),treatment:clamp(c.treatment,0,600),careRate:clamp(c.careRate,0,1),castCharacter:typeof c.castCharacter==='string'?c.castCharacter:undefined})),medicines:Object.fromEntries(MEDICINES.map(m=>[m.id,Math.floor(clamp(seed.medicines?.[m.id],0,30))])),meals:(Array.isArray(seed.meals)?seed.meals:[]).filter(m=>Number.isFinite(m.at)&&typeof m.category==='string').slice(-8),foodWarmth:clamp(seed.foodWarmth,0,1800),lastTreatment:clamp(seed.lastTreatment??-1,-1,1e9)};}
function add(body,id,severity=24){if(!body.conditions.some(c=>c.id===id)&&body.conditions.length<16)body.conditions.push({id,severity,age:0,treatment:0});}
export function stepWellness(value,vitalsValue,{seconds=0,environment,zone='base',moving=false,running=false,hazard=false,hospitalRest=false,hasPerishable=false,sleeping=false,napping=false,bedCleanliness=100,now=Date.now()}={}){
 const body=createWellness(value),vitals=createVitals(vitalsValue);if(!environment||!Number.isFinite(seconds)||seconds<=0)return {body,vitals};const dt=Math.min(5,seconds),outside=outdoorExposure(zone),sheltered=outside<.5,cold=body.clothing==='cold'&&body.clothingCondition>0;if(body.life.status==='dead')return {body,vitals};body.elapsed+=dt;advanceSmoking(body,vitals,dt);
 body.wetness=clamp(body.wetness+dt*(['rain','storm'].includes(environment.weather)&&outside>0?(cold?.1:.3)*outside*(environment.weather==='storm'?1.4:1):sheltered?-.45:-.12));
 const hot=outside>0&&environment.temperature>25?(environment.temperature-25)*(cold?1.1:.25)*outside:0;
 const chill=outside>0&&environment.temperature<(cold?0:16)?((cold?0:16)-environment.temperature)/5*outside:0;
 const pressure={heat:hot,cold:chill+body.wetness/90,wet:body.wetness>55?outside:0,injury:hazard&&running&&moving?1:0,fatigue:vitals.sleep<25||vitals.energy<20?1:0,food:0};
 for(const k of Object.keys(body.exposure))body.exposure[k]=clamp(body.exposure[k]+dt*(pressure[k]||-(hospitalRest?3:.45)),0,3600);
 if(hasPerishable&&outside>0&&environment.temperature>=27)body.foodWarmth=clamp(body.foodWarmth+dt,0,1800);else if(sheltered||environment.temperature<20)body.foodWarmth=clamp(body.foodWarmth-dt*.4,0,1800);
 for(const [key,threshold,id]of [['heat',150,'dehydration'],['heat',300,'heat-exhaustion'],['heat',500,'sun-irritation'],['heat',800,'heatstroke'],['cold',180,'chill'],['cold',700,'hypothermia'],['wet',180,'wet-chill'],['cold',400,'respiratory-irritation'],['fatigue',200,'fatigue'],['fatigue',500,'sleep-debt'],['injury',100,'scratch'],['injury',210,'bruise'],['injury',330,'sprain']])if(body.exposure[key]>=threshold)add(body,id);
 const scratch=body.conditions.find(c=>c.id==='scratch');if(scratch?.age>480&&scratch.severity>30)add(body,'wound-infection');const infected=body.conditions.find(c=>c.id==='wound-infection');if(infected?.age>480&&infected.severity>45)add(body,'fever');
 let damage=0;for(const condition of body.conditions){const definition=CONDITION_BY_ID[condition.id];condition.age+=dt;const treated=condition.treatment>0;condition.treatment=Math.max(0,condition.treatment-dt);const safe=(definition.group==='cold'&&sheltered)||(definition.group==='heat'&&(!hot||sheltered))||definition.group==='fatigue'&&hospitalRest;condition.severity=clamp(condition.severity+dt*(treated?-(condition.careRate||.42):definition.chronic?(hospitalRest?-.003:.001):hospitalRest?-.10:safe?-.045:.025),definition.chronic?5:0,100);damage+=definition.drain*(condition.severity/100);}
 body.conditions=body.conditions.filter(c=>c.severity>.5);
 const discomfort=Math.min(2,hot*.15+chill*.12+body.wetness/180);vitals.stress=clamp(vitals.stress+dt/60*(discomfort+body.conditions.length*.12-(hospitalRest?3:0)));vitals.health=clamp(vitals.health-dt/60*Math.min(2.5,damage)+(hospitalRest?dt/30:0),0,100);if(hospitalRest){vitals.energy=clamp(vitals.energy+dt/12);vitals.sleep=clamp(vitals.sleep+dt/18);body.wetness=clamp(body.wetness-dt*.4);}
 advanceInfection(body,dt);return advanceHealthSystems(body,vitals,{seconds:dt,environment,zone,moving,running,hospitalRest,sleeping,napping,bedCleanliness,now});
}
export function registerMeal(value,food){const body=createWellness(value);if(food.raw)add(body,'food-sickness',30);body.meals=body.meals.filter(m=>body.elapsed-m.at<180);if(body.meals.length>=3)add(body,'indigestion',28);if(['protein','meal','dairy'].includes(food.category)&&body.foodWarmth>=480){add(body,'food-sickness',38);add(body,'nausea',22);}else if(body.meals.filter(m=>['meal','protein'].includes(m.category)).length>=3&&['meal','protein'].includes(food.category))add(body,'nausea',24);if(body.clinical.allergies.includes(food.category==='dairy'?'dairy':food.id?.includes('fish')||food.id?.includes('salmon')?'fish':''))add(body,'allergic-reaction',35);body.meals.push({category:food.category,at:body.elapsed});return body;}
export function treatCondition(value,vitalsValue,medicineId,{dose='standard',bodyPart,random=()=>.5}={}){
 const body=createWellness(value),vitals=createVitals(vitalsValue),medicine=MEDICINE_BY_ID[medicineId];if(!medicine)throw Error('Selecciona un tratamiento válido.');if(body.medicines[medicineId]<1)throw Error('No tienes ese tratamiento en tu botiquín.');if(body.life.status==='dead')throw Error('El personaje ha fallecido.');if(body.elapsed-body.lastTreatment<30&&body.lastTreatment>=0)throw Error('Espera a que actúe el tratamiento anterior.');if(!['low','standard','high'].includes(dose))throw Error('Selecciona una intensidad de juego válida.');
 const matches=body.conditions.filter(c=>medicine.treats.includes(c.id));if(!matches.length&&!medicine.usableWithoutCondition)throw Error('Ese tratamiento no corresponde a tus condiciones actuales.');
 if(['pad','tampon','contraceptive','pregnancy-test','reproductive-care'].includes(medicineId)&&!body.reproductive.enabled)throw Error('Este producto requiere un perfil reproductivo habilitado.');
 if(medicineId==='reproductive-care'&&(!body.reproductive.pregnant||!body.reproductive.tested||!body.reproductive.procedureConsent))throw Error('El procedimiento necesita un embarazo confirmado y la confirmación del paciente.');
 if(medicineId==='plaster'&&!body.clinical.injuries.some(i=>i.part===bodyPart&&['sprain','fracture'].includes(i.condition)))throw Error('Selecciona la extremidad lesionada registrada en la evaluación.');
 if(medicineId==='down-support'&&!body.clinical.traits.downSyndrome)throw Error('Este plan corresponde a un antecedente de síndrome de Down registrado.');
 if(medicineId==='toothbrush'&&body.medicines.toothpaste<1)throw Error('Necesitas pasta dental para el cepillado.');
 const roll=random(),medical=medicine.kind==='treatment'||medicine.kind==='mental'||medicine.kind==='antiretroviral',adverse=medical&&(roll<.025+(dose==='high'?.055:0)+(body.clinical.allergies.includes('medication')?.25:0)),ineffective=medical&&!adverse&&roll>.88-(1-body.clinical.response)*.12;let outcome=adverse?'adverse':ineffective?'ineffective':'effective';
 if(!medicine.reusable&&medicineId!=='blood-pressure-monitor'&&medicineId!=='toothbrush')body.medicines[medicineId]--;body.lastTreatment=body.elapsed;body.clinical.lastOutcome={medicineId,outcome,at:body.elapsed};
 if(adverse){add(body,'adverse-reaction',32);vitals.stress=clamp(vitals.stress+4);vitals.health=clamp(vitals.health-1);}
 else if(!ineffective){for(const condition of matches){const power=medicine.power*({low:.7,standard:1,high:1.2}[dose])*(.7+body.clinical.response*.4);if(medicine.gradual){condition.treatment=medicine.duration||480;condition.careRate=power/condition.treatment;}else{condition.severity=Math.max(CONDITION_BY_ID[condition.id]?.chronic?5:0,condition.severity-power);condition.treatment=90;condition.careRate=.42;}}body.conditions=body.conditions.filter(c=>c.severity>.5);if(medicineId==='dry-kit')body.wetness=0;if(['water','rehydration','hydration-care'].includes(medicineId))body.exposure.heat=Math.max(0,body.exposure.heat-180);vitals.health=clamp(vitals.health+medicine.health);
  if(medicineId==='soap'){body.hygiene.body=100;body.hygiene.feet=90;}if(medicineId==='shampoo')body.hygiene.hair=100;if(medicineId==='foot-powder')body.hygiene.feet=95;if(medicineId==='deodorant')body.hygiene.body=Math.max(body.hygiene.body,60);if(['toothbrush','toothpaste'].includes(medicineId)){body.hygiene.oral=100;if(medicineId==='toothbrush')body.medicines.toothpaste--;}
  if(['pad','tampon'].includes(medicineId))body.reproductive.careUntil=body.elapsed+1200;if(medicineId==='pregnancy-test')body.reproductive.tested=true;if(medicineId==='contraceptive')body.reproductive.contraception=true;if(medicineId==='reproductive-care'){body.reproductive.pregnant=false;body.reproductive.tested=true;body.reproductive.procedureConsent=false;}if(medicineId==='plaster')body.clinical.casts[bodyPart]=body.elapsed+1200;if(medicineId==='counselling')vitals.stress=clamp(vitals.stress-5);if(medicineId==='down-support'){body.clinical.supportPlan='Apoyos individuales y controles clínicos';vitals.stress=clamp(vitals.stress-5);}
 }applyInfectiousCare(body,medicineId,outcome);return {body,vitals,outcome,result:outcome,details:{medicineId,dose,bodyPart:bodyPart||null}};
}
export function wellnessSnapshot(value){const b=createWellness(value),conditions=b.conditions.filter(c=>!PRIVATE_CLINICAL_IDS.includes(c.id)||b.clinical.known.includes(c.id)).map(c=>({...c,name:CONDITION_BY_ID[c.id].name,cause:CONDITION_BY_ID[c.id].cause,stage:c.treatment>0?'En tratamiento':c.severity>=65?'Requiere atención':c.severity>=35?'Activa':'Leve',severity:Math.round(c.severity),treatments:CONDITION_BY_ID[c.id].treatments}));return {...publicSystems(b),...infectiousSnapshot(b),clothing:b.clothing,baseClothingCondition:b.baseClothingCondition,clothingCondition:Math.round(b.clothingCondition),clothingOptions:b.clothingOptions,clothingName:CLOTHING.find(c=>c.id===b.clothing).name,wetness:Math.round(b.wetness),conditions,medicines:b.medicines,foodRisk:b.foodWarmth>=480,warning:conditions.some(c=>c.severity>=65)?'Acude al hospital':b.wetness>65?'Ropa empapada':b.exposure.heat>100?'Busca sombra y ropa ligera':b.exposure.cold>100?'Busca refugio y abrigo':'Sin alertas',speedFactor:conditions.some(c=>['copd','opportunistic-pneumonia','aids'].includes(c.id)&&c.severity>=40)?.75:conditions.some(c=>c.id==='sprain'&&c.severity>=45)?.85:1};}
