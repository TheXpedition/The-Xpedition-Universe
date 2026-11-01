// Decorative foreground framing sits outside the playable paths. Colliders and
// doors remain the authoritative entities in world-maps, unchanged by scenery.
const prop=(id,type,x,y,w,h,height)=>({id,type,x,y,w,h,height,solid:false});
export const POLAR_DECOR=Object.freeze({
 muelle:[prop('pier-lantern-a','pole',700,450,20,20,135),prop('pier-lantern-b','pole',1480,450,20,20,135),prop('pier-lantern-c','pole',350,1000,20,20,145),prop('pier-lantern-d','pole',1730,1000,20,20,145),prop('pier-bench','bench',1340,400,155,42,34),prop('pier-supply','crate',760,350,65,50,45)],
 montana:[prop('summit-pine-a','pine',175,1040,60,30,295),prop('summit-pine-b','pine',2140,1240,60,30,320),prop('summit-pine-c','pine',620,1440,60,30,250),prop('summit-pine-d','pine',1710,1450,60,30,270)],
 desafios:[prop('challenge-banner-a','flag',130,580,20,20,180),prop('challenge-banner-b','flag',1900,980,20,20,180),prop('challenge-lantern','pole',1100,380,20,20,145)],
 eliminacion:[prop('council-tree-a','pine',60,900,60,30,380),prop('council-tree-b','pine',1740,940,60,30,390),prop('council-tree-c','pine',370,1770,60,30,330),prop('council-tree-d','pine',1470,1800,60,30,350)]
});
