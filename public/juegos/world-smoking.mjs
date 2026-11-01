// Fictional cumulative gameplay exposure; these are not clinical risk rates.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export function smokingState(seed={}){return {total:Math.floor(clamp(seed.total,0,100000)),lastAt:clamp(seed.lastAt??-30000,-30000,1e15),reliefDebt:clamp(seed.reliefDebt,0,100)};}
function condition(body,id,severity){if(!body.conditions.some(c=>c.id===id)&&body.conditions.length<16)body.conditions.push({id,severity,age:0,treatment:0});}
export function smokeCigarette(body,vitals,{now=Date.now(),adult=false,random=Math.random}={}){
 if(!adult||body?.life?.status!=='alive')throw Error('Esta acción está reservada a los personajes adultos activos.');
 body.smoking=smokingState(body.smoking);if(now-body.smoking.lastAt<30000)throw Error('Espera antes de volver a fumar.');
 body.smoking.total++;body.smoking.lastAt=now;const relief=Math.min(4,vitals.stress);vitals.stress-=relief;body.smoking.reliefDebt=Math.min(100,body.smoking.reliefDebt+relief);
 if(body.smoking.total>=10){vitals.health=Math.max(0,vitals.health-.3);condition(body,'smoke-irritation',18);}
 if(body.smoking.total>=25&&random()<.12)condition(body,'copd',25);
 return 'Consumiste 1 cigarrillo. Alivio temporal del estrés; la exposición acumulada puede causar problemas respiratorios.';
}
export function advanceSmoking(body,vitals,seconds){body.smoking=smokingState(body.smoking);const returned=Math.min(body.smoking.reliefDebt,Math.max(0,seconds)/30);body.smoking.reliefDebt-=returned;vitals.stress=Math.min(100,vitals.stress+returned);return {body,vitals};}
