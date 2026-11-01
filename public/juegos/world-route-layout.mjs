// One physical west-to-east road. Optional destinations branch off this route.
export const MAIN_WALK_ROUTE=Object.freeze(['estacion','gasolinera','desguace','cuarentena','acceso-bosque','base','sendero-bosque','refugio-2','ruta-refugio-oriental','carretera-patrulla','comisaria','cruce-comunicaciones','hospital','iglesia','cementerio','cueva']);
export const PRODUCTION_WALK_ROUTE=Object.freeze(['comunicaciones','pista-aerodromo','avion','desafios','eliminacion']);
export function roadDirections(map,maps){return map.props.filter(p=>p.portal&&!p.portal.eventBlocked).map(p=>({id:p.id,zone:p.portal.zone,name:maps[p.portal.zone].name,direction:p.id==='road-west'?'OESTE':p.id==='road-east'?'ESTE':p.label?.startsWith('Salir')?'SALIDA':'DESVÍO',manual:!p.portal.auto}));}
