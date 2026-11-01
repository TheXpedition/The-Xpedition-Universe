import {WORLD_MAPS} from './world-maps.mjs';
import {canonicalZone} from './apocalypse-scenes.mjs';
export const WORLD_ZONES=Object.freeze(Object.values(WORLD_MAPS).map(map=>({id:map.id,name:map.name,short:map.short,description:map.description,private:!!map.private,icon:map.icon,width:map.width,height:map.height,floor:map.bounds,spawn:map.spawn,avatarHeight:map.avatarHeight,background:map.illustration.url,pin:[50,50]})));
export const zoneById=id=>WORLD_ZONES.find(z=>z.id===canonicalZone(id));
export {canonicalZone};
export function worldPoint(zone,x,y){const [l,t,r,b]=zone.floor;return {x:Math.max(l,Math.min(r,x)),y:Math.max(t,Math.min(b,y))};}
