export const SHELTER_ROOMS=Object.freeze([
 {kind:'patio',name:'Patio central',description:'Punto de encuentro del refugio. Los letreros llevan a cada espacio.'},
 {kind:'cocina',name:'Cocina y comedor',description:'Prepara comida en el fogón, guarda raciones y siéntate a la mesa con tu equipo.',doorX:.25},
 {kind:'corral',name:'Corral y aseo',description:'Cuida las gallinas, recoge huevos y usa la zona de aseo.',doorX:.42},
 {kind:'taller',name:'Taller',description:'Fabrica herramientas, aporta a las mejoras y comparte materiales en el baúl.',doorX:.58},
 {kind:'huerto',name:'Huerto e invernadero',description:'Siembra, riega y cosecha en los bancales de tu equipo.',doorX:.75},
 {kind:'dormitorio',name:'Dormitorio',description:'Camas y espacio de descanso reservado al equipo.',doorX:.92}
]);
export const SHELTERS=Object.freeze([['left','base','refugio-1'],['right','refugio-2','dormitorio-2']].map(([id,outside,inside],index)=>{
 const n=index+1;
 const rooms=Object.freeze(Object.fromEntries(SHELTER_ROOMS.map(({kind})=>[kind,kind==='dormitorio'?inside:kind+'-refugio-'+n])));
 return Object.freeze({id,name:'Refugio '+n,outside,inside,entry:rooms.patio,rooms});
}));
const shelterByRoom=new Map(SHELTERS.flatMap(s=>Object.values(s.rooms).map(zone=>[zone,s])));
export const shelterForZone=zone=>shelterByRoom.get(zone);
