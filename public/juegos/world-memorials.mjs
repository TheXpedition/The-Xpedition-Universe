// Display-only fictional memorials requested for this season; never user accounts.
export const MEMORIAL_NAMES=Object.freeze(['Plastique Doll','Alexandro Martin','P.Diddy Donnovan','Luciano Funes','Louis Pivovarov','Trani ComeGalletas','Marcos Trump','Emanuel Bagundo','Lucas Maximoff','Nahuee Jugaremos Muevete Tilin','Eduardo Buñuelo','Poncho Motolov','Santi Etchenause','Tco Bignon','Matias Romina','Oscar Barajas','Dave Fonsé','Ima Ima Ame']);
export const SEED_MEMORIALS=Object.freeze(MEMORIAL_NAMES.map((name,i)=>({id:'season-memorial-'+i,name,seed:true})));
const rowX=[[.276,.378,.48,.59,.696,.8],[.246,.366,.479,.60,.72,.84],[.215,.35,.48,.615,.748,.878]],rowY=[.382,.477,.577];
export function buildMemorialProps(maps,entries=SEED_MEMORIALS){
 const map=maps['cementerio-interior'];if(!map)return;
 map.props=map.props.filter(p=>!p.memorial);map.interactionRevision=(map.interactionRevision||0)+1;
 for(const [i,m]of entries.slice(0,18).entries()){const row=Math.floor(i/6),x=rowX[row][i%6]*map.width,y=rowY[row]*map.height;map.props.push({id:'grave-'+m.id,type:'memorial',memorial:{id:m.id,name:m.name},painted:true,solid:false,x,y,w:100,h:20,contextAnchor:{x,y:y-12},approach:{x,y:.80*map.height},hitRect:[x-48,y-20,x+48,y+55]});}
 for(const [i,m]of entries.filter(m=>!m.seed).slice(-6).entries()){const x=(.23+i*.12)*map.width,y=.735*map.height;map.props.push({id:'grave-'+m.id,type:'memorial',memorial:{id:m.id,name:m.name},painted:false,imageUrl:'/assets/maps/apocalypse/memorial-stone.png',artWidth:130,solid:false,x,y,w:130,h:0,contextAnchor:{x,y:y-130},approach:{x,y:.82*map.height},hitRect:[x-65,y-160,x+65,y]});}
 map.memorials=entries.map(m=>({id:m.id,name:m.name,seed:!!m.seed}));
}
