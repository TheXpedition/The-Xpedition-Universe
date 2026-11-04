export const GESTATION_DAYS=30;
export const BABY_APPEARANCES=Object.freeze(Array.from({length:6},(_,i)=>({id:'baby-'+(i+1),image:'/juegos/clinic/family/baby-'+(i+1)+'-newborn.webp',walk:'/juegos/clinic/family/baby-'+(i+1)+'-walk.webp'})));
export const BIRTH_PHASES=Object.freeze({admission:'Preparar la llegada',monitor:'Control del equipo',birth:'Acompañar el nacimiento',stabilize:'Estabilización',selection:'Tu bebé',care:'Cuidados del bebé',completed:'Nacimiento registrado',cancelled:'Atención interrumpida'});
export const maternityProgress=(p,day)=>Math.max(0,Math.min(GESTATION_DAYS,Math.floor(day-p.conceivedDay)));
export const birthActive=s=>s&& !['completed','cancelled'].includes(s.phase);
export function birthTarget(at,start){const elapsed=Math.max(0,at-start),cycle=Math.floor(elapsed/2400);return {cycle,progress:(elapsed%2400)/2400,center:.5+Math.sin(cycle*1.9)*.13,width:.32};}
