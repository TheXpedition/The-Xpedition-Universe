// Deliberately authored scavenging spots on existing containers, rocks and
// fallen timber. Random rounds stay within the identity of each location.
const spots={
 'sendero-bosque':[[.69,.69],[.30,.72],[.85,.70]],
 'acceso-bosque':[[.78,.71],[.24,.66],[.63,.70]],
 'cascada-ribera':[[.72,.69],[.21,.705],[.26,.70]],
 'poza-cascada':[[.87,.805],[.18,.80],[.92,.82]],
 desguace:[[.37,.64],[.69,.68],[.20,.65]],
 gasolinera:[[.35,.63],[.66,.67],[.85,.70]],
 'tren-cabina':[[.55,.63],[.70,.62],[.39,.65]],
 'tren-equipaje':[[.23,.57],[.71,.65],[.85,.68]],
 'comisaria-interior':[[.54,.61],[.79,.64],[.22,.64]],
 'hospital-interior':[[.94,.70],[.88,.66],[.32,.66]],
 'cueva-galeria':[[.47,.73],[.79,.73],[.31,.72]],
 'muelle-ruinas':[[.18,.65],[.29,.71],[.12,.69]],
 cocina:[[.90,.68],[.73,.69],[.22,.68]],
 'pista-aerodromo':[[.24,.59],[.13,.60],[.34,.61]],
 'carretera-patrulla':[[.77,.72],[.31,.72],[.64,.71]],
 puerto:[[.30,.71],[.17,.71],[.43,.73]]
};
const loot={
 'sendero-bosque':['wood','stone','flint'],'acceso-bosque':['seed-carrot','wood','seed-berries'],
 'cascada-ribera':['empty-bottle','seed-wheat','wood'],'poza-cascada':['seed-berries','empty-bottle','stone'],
 desguace:['scrap','wire','toolkit'],gasolinera:['fuel','matches','empty-bottle'],
 'tren-cabina':['battery','fuse','wire'],'tren-equipaje':['cloth','matches','rope'],
 'comisaria-interior':['battery','wire','fuse'],'hospital-interior':['purifier','cloth','empty-bottle'],
 'cueva-galeria':['stone','charcoal','scrap'],'muelle-ruinas':['rope','plank','empty-bottle'],
 cocina:['spoiled-food','empty-bottle','matches'],'pista-aerodromo':['toolkit','scrap','fuse'],
 'carretera-patrulla':['raw-meat','cloth','battery'],puerto:['empty-bottle','rope','plank']
};
export function resolveGatherNode(node,shared={}){
 const state=shared.nodes?.[node.id];return state?.placement?{...node,...state.placement}:node;
}
export function newGatherRound(nodes,previous={},random=Math.random){
 const occupied=new Map(),result={};
 for(const node of nodes){
  const options=spots[node.zone]||[[node.x,node.y]],used=occupied.get(node.zone)||new Set();occupied.set(node.zone,used);
  const old=resolveGatherNode(node,{nodes:previous});let free=options.map((_,i)=>i).filter(i=>!used.has(i));
  const different=free.filter(i=>options[i][0]!==old.x);if(different.length)free=different;
  const slot=free[Math.min(free.length-1,Math.floor(random()*free.length))]??0;used.add(slot);
  const types=loot[node.zone]||Object.keys(node.loot),oldId=Object.keys(old.loot)[0],alternatives=types.filter(id=>id!==oldId),pool=alternatives.length?alternatives:types;
  const id=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  result[node.id]={layout:3,remaining:1,resetsAt:null,placement:{x:options[slot][0],y:options[slot][1],loot:{[id]:1},container:node.container===true,name:node.container?'Revisar suministros recuperables':'Recurso recuperable'}};
 }
 return result;
}
