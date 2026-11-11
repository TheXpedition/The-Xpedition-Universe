import {SHELTER_MATERIALS} from './world-shelters.mjs';

// Compatibility check: keep clients and servers on the same interaction coordinates.
export function worldMapVersion(maps){
 const supplies=SHELTER_MATERIALS.map(m=>[m.id,m.zone,m.x]);
 const geometry=Object.values(maps).map(map=>[
  map.id,map.width,map.height,map.walkBand,map.bounds,map.floors,map.waterArea,
  map.props.filter(p=>p.activity).map(p=>[p.id,p.approach,p.waterTarget]),
  map.illustration.revision,
  map.props.filter(p=>p.portal).map(p=>[p.id,Object.fromEntries(Object.entries(p.portal).filter(([k])=>k!=='eventBlocked'))])
 ]);
 const text=JSON.stringify([supplies,geometry]);
 let value=2166136261;
 for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
 return (value>>>0).toString(36);
}
