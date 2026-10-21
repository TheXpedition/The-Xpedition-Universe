import {FALL_LINES,AMBIENT_LINES} from './dani-lines.mjs';
const line=(id,spoken,text=spoken)=>({id,spoken,text});
export const CHARACTERS=Object.freeze([
 {id:'dani',name:'Dani',image:'./art/dani.png',portrait:'/personajes/dani.png',height:206.04,voice:'Sarcástica',fall:FALL_LINES,ambient:AMBIENT_LINES},
 {id:'bayron',name:'Bayron',image:'./art/bayron-reference.png',height:185,voice:'Infantil',portraitPosition:'50% 15%',fall:[
  line('bayron-babay','¡Me dejaron toda Babay!'),
  line('bayron-panales','¡Me cagué los pañales encima!','¡Me c*gué los pañales encima!'),
  line('bayron-verguenza','Pasé vergüenza como de costumbre.')
 ],ambient:[]},
 {id:'felix',name:'Felix',image:'./art/felix-reference.png',height:214,voice:'Segura y grave',portraitPosition:'50% 9%',fall:[
  line('felix-vitany','¡Pasé la Vitany Glambert!'),
  line('felix-chiok','¡Qué día de la Gargajo Chiok!'),
  line('felix-denuncia','Si sigo perdiendo te voy a denunciar tus cuentas.')
 ],ambient:[]},
 {id:'andromeda',name:'Andromeda',image:'./art/andromeda-reference.png',height:202,voice:'Femenina y relajada',portraitPosition:'50% 13%',fall:[
  line('andromeda-dia','¡Qué día de la Andromierda!','¡Qué día de la Androm**rda!'),
  line('andromeda-churriaria','Esto debe ser culpa de Churriaria Villegas.'),
  line('andromeda-genshit','En Genshit Impact esto es más fácil.','En Gensh*t Impact esto es más fácil.'),
  line('andromeda-peggy','Esto me pasa por traicionar a Peggy.')
 ],ambient:[]}
]);
export const characterConfig=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
