// Server-owned reserves. Hunger and sleep are food/rest reserves: higher is better.
// No random values, offline penalties, health damage or client-provided deltas.
export const VITAL_KEYS=Object.freeze(['health','hunger','energy','sleep','stress']);
export const EAT_COOLDOWN_MS=20000;
const defaults=Object.freeze({health:100,hunger:100,energy:100,sleep:100,stress:0});
const bounded=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):fallback;
export function createVitals(seed={}){if(!seed||typeof seed!=='object'||Array.isArray(seed))seed={};const state=Object.fromEntries(VITAL_KEYS.map(key=>[key,bounded(seed[key],defaults[key])]));state.lastEatAt=Number.isSafeInteger(seed.lastEatAt)&&seed.lastEatAt>=0?seed.lastEatAt:-1;return state;}
export function stepVitals(value,{seconds=0,online=true,moving=false,running=false,seated=false}={}){
 const v=createVitals(value);if(!online||!Number.isFinite(seconds)||seconds<=0)return v;const minutes=seconds/60,rest=seated===true,run=!rest&&moving===true&&running===true,walk=!rest&&moving===true;
 // Gentle real-time rates per minute. Only the online simulation invokes this.
 v.hunger-=minutes*(run?.8:walk?.6:.45);
 v.energy+=minutes*(rest?2.2:run?-1.7:walk?-.55:-.15);
 v.sleep+=minutes*(rest?.9:run?-.35:walk?-.3:-.25);
 v.stress+=minutes*(rest?-1.6:run?.45:walk?.12:-.1);
 return createVitals(v);
}
export function recoverVitals(value,action,{now=Date.now()}={}){
 const v=createVitals(value);if(action!=='eat')return {vitals:v,applied:false,retryAt:0,reason:'unsupported'};
 if(!Number.isSafeInteger(now)||now<0)return {vitals:v,applied:false,retryAt:0,reason:'invalid-time'};
 const retryAt=v.lastEatAt<0?0:v.lastEatAt+EAT_COOLDOWN_MS;
 if(now<retryAt)return {vitals:v,applied:false,retryAt,reason:'cooldown'};
 if(v.hunger>=100)return {vitals:v,applied:false,retryAt:0,reason:'full'};
 v.hunger=Math.min(100,v.hunger+28);v.lastEatAt=now;return {vitals:v,applied:true,retryAt:now+EAT_COOLDOWN_MS,reason:'recovered'};
}
export function vitalsSnapshot(value){const v=createVitals(value),status=v.health<30?'Necesita atención':v.hunger<25?'Necesita comer':v.sleep<25?'Necesita descansar':v.energy<25?'Con poca energía':v.stress>=70?'Con estrés':'Estable';return {...Object.fromEntries(VITAL_KEYS.map(key=>[key,Math.round(v[key])])),status};}
