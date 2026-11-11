export const WEATHER=Object.freeze({clear:{name:'Calor',icon:'sun'},rain:{name:'Lluvia',icon:'rain'},snow:{name:'Nieve',icon:'snow'},storm:{name:'Tormenta',icon:'storm'}});
const indoors=new Set(['refugio-1','dormitorio-2','cocina','confesionario','hospital-interior','comisaria-interior','gasolinera-interior','avion-interior','caseta-montana','tren-pasajeros','tren-salon','tren-cabina','tren-equipaje','cueva-galeria','cueva-profunda','tunel']);
export function outdoorExposure(zone){return indoors.has(zone)?0:['iglesia-interior','cementerio-interior'].includes(zone)?.3:zone==='comida'?.45:1;}
export function createEnvironment(value={},now=Date.now()){return {anchorMinutes:Number.isFinite(value.anchorMinutes)?Math.max(0,value.anchorMinutes):930,anchorAt:Number.isFinite(value.anchorAt)?value.anchorAt:now,...(Number.isSafeInteger(value.dayOffset)?{dayOffset:value.dayOffset}:{}),rate:[12,24,48].includes(value.rate)?value.rate:24,weather:['auto',...Object.keys(WEATHER)].includes(value.weather)?value.weather:'auto'};}
export function environmentSnapshot(value,now=Date.now()){
 const state=createEnvironment(value,now),total=state.anchorMinutes+Math.max(0,now-state.anchorAt)/60000*state.rate,minute=((total%1440)+1440)%1440,hour=Math.floor(minute/60),phase=hour>=6&&hour<13?'day':hour>=13&&hour<20?'afternoon':'night',phaseName={day:'Día',afternoon:'Tarde',night:'Noche'}[phase],block=Math.floor(total/360),sequence=['clear','rain','clear','snow','clear','storm','clear','clear'],weather=state.weather==='auto'?sequence[block%sequence.length]:state.weather;
 const temperature=weather==='snow'?(phase==='night'?-4:1):weather==='rain'||weather==='storm'?(phase==='night'?11:17):phase==='night'?15:phase==='afternoon'?29:27,weatherSince=state.weather==='auto'?state.anchorAt+(block*360-state.anchorMinutes)/state.rate*60000:state.anchorAt;
 return {totalMinutes:total,day:Math.floor(total/1440)+1+(state.dayOffset??0),minute,hour,time:String(hour).padStart(2,'0')+':'+String(Math.floor(minute%60)).padStart(2,'0'),phase,phaseName,weather,weatherName:WEATHER[weather].name,temperature,rate:state.rate,weatherMode:state.weather,weatherSince,serverTime:now,nextChangeGameMinutes:360-total%360};
}
export function adjustEnvironment(value,input,now=Date.now()){
 const old=environmentSnapshot(value,now),state=createEnvironment({...value,anchorMinutes:old.totalMinutes,anchorAt:now},now);
 if(input.weather!==undefined){if(!['auto',...Object.keys(WEATHER)].includes(input.weather))throw Error('Selecciona Calor, Lluvia, Nieve o clima automático.');state.weather=input.weather;}
 if(input.rate!==undefined){if(![12,24,48].includes(input.rate))throw Error('Elige días de 30, 60 o 120 minutos reales.');state.rate=input.rate;}
 if(input.hour!==undefined){if(!Number.isInteger(input.hour)||input.hour<0||input.hour>23)throw Error('Selecciona una hora del juego entre 0 y 23.');state.anchorMinutes=Math.floor(old.totalMinutes/1440)*1440+input.hour*60;}
 return state;
}
export function environmentalHazard(zone,actor,map){if(!actor||!map)return false;const x=actor.x/map.width,y=actor.y/map.height;return ['desguace','avion','cueva','cueva-profunda','muelle-ruinas'].includes(zone)&&y<map.walkBand[0]+.055&&((x>.15&&x<.38)||(x>.66&&x<.86));}
