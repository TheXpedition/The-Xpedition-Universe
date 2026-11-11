import {hasFloor,clearPoint} from './world-motion.mjs';

export const SHELTER_SIZE=9;
export const SHELTER_ROSTERS=Object.freeze({
 left:Object.freeze(['roger','andromeda','daelly','bruno','carmine','guillermo','ivy','marianito','vita']),
 right:Object.freeze(['arisantana','bayron','eduard','gabrielsab','kareli','leandro','alice','sallua','vitany'])
});
export const SHELTER_PARTICIPANTS=Object.freeze([...SHELTER_ROSTERS.left,...SHELTER_ROSTERS.right]);
export const shelterForCharacter=characterId=>SHELTER_ROSTERS.left.includes(characterId)?'left':SHELTER_ROSTERS.right.includes(characterId)?'right':null;
export const SHELTERS=Object.freeze([
 {id:'left',name:'Refugio 1',outside:'base',inside:'refugio-1'},
 {id:'right',name:'Refugio 2',outside:'refugio-2',inside:'dormitorio-2'}
]);
export const shelterForZone=zone=>SHELTERS.find(s=>s.inside===zone);
export const shelterAt=zone=>SHELTERS.find(s=>s.outside===zone);
export const SHELTER_MATERIALS=Object.freeze([
 {id:'nails',name:'Clavos',resource:'scrap',zone:'gasolinera-interior',place:'Tienda de la gasolinera',x:.65,detail:'Un lote de clavos para fijar la estructura.'},
 {id:'planks',name:'Tablones',resource:'plank',zone:'muelle-ruinas',place:'Muelle de las ruinas',x:.73,detail:'En el camino de piedra, frente a la lancha encallada.'},
 {id:'foundation',name:'Piedras de cimiento',resource:'stone',zone:'poza-cascada',place:'Poza de la cascada',x:.66,detail:'Piedras para estabilizar la base.'},
 {id:'brackets',name:'Herrajes',resource:'toolkit',zone:'cocina',place:'Cocina',x:.59,detail:'Escuadras y bisagras para uniones y puertas.'},
 {id:'roofing',name:'Láminas de techo',resource:'scrap',zone:'avion-interior',place:'Interior del avión',x:.62,detail:'Láminas recuperadas para cubrir el refugio.'},
 {id:'cement',name:'Sacos de cemento',resource:'compost',zone:'cementerio-interior',place:'Cementerio · sala memorial',x:.56,detail:'Cemento conservado para asegurar los cimientos.'},
 {id:'tarp',name:'Lona impermeable',resource:'cloth',zone:'iglesia-interior',place:'Interior de la iglesia',x:.61,detail:'Lona resistente para sellar el techo.'},
 {id:'wiring',name:'Cableado',resource:'wire',zone:'comisaria-interior',place:'Comisaría · interior',x:.64,detail:'Cable para la instalación del refugio.'},
 {id:'beams',name:'Vigas de madera',resource:'wood',zone:'caseta-montana',place:'Caseta de montaña',x:.62,detail:'Vigas para levantar la estructura.'},
 {id:'rope',name:'Cuerda de sujeción',resource:'rope',zone:'montana-cima',place:'Montaña · cima',x:.60,detail:'Cuerda de rescate para sujetar la cubierta.'}
].map(Object.freeze));

// Place supplies on the existing walkable floor, reachable from that room's spawn.
export function shelterSupplyProp(material,map){
 const planks=material.id==='planks',halfWidth=planks?66:43;
 const wanted=material.x*map.width,ys=[.5,.35,.65,.2,.8].map(f=>(map.walkBand[0]+(map.walkBand[1]-map.walkBand[0])*f)*map.height);
 let point;
 for(const dx of [0,-50,50,-100,100,-180,180]){for(const y of ys){const x=wanted+dx;if(hasFloor(map,x,y)&&clearPoint(map,x,y)){point={x,y};break;}}if(point)break;}
 if(!point)throw Error('No hay suelo para el material de construcción: '+material.id);
 return {id:'shelter-supply-'+material.id,type:'shelter-supply',shelterSupply:material.id,shelterMaterialName:material.name,...point,w:76,h:0,solid:false,approach:{...point},contextAnchor:{x:point.x,y:point.y-35},hitRect:[point.x-halfWidth,point.y-145,point.x+halfWidth,point.y+15]};
}
export function buildShelterProps(maps,view){
 for(const map of Object.values(maps)){map.props=map.props.filter(p=>!p.shelterSupply);map.interactionRevision=(map.interactionRevision||0)+1;}
 for(const item of SHELTER_MATERIALS){if(view&&!view.available?.includes(item.id))continue;const map=maps[item.zone];if(map)map.props.push(shelterSupplyProp(item,map));}
}
export function shelterPortalContext(context,portal,view){
 const definition=shelterForZone(portal?.zone),s=definition&&view?.shelters.find(s=>s.id===definition.id);
 if(!context||!s)return context;
 return {...context,key:context.key+':shelter',label:s.built?'Entrar':'Construir',detail:s.name+(s.built?' · '+(view.home===s.id?'Tu refugio':'Solo integrantes'):' · '+s.percent+' %'),icon:s.built?'door':'build'};
}
