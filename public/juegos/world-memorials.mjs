// Display-only fictional memorials requested for this season; never user accounts.
export const MEMORIAL_NAMES=Object.freeze(['Plastique Doll','Alexandro Martin','P.Diddy Donnovan','Luciano Funes','Louis Pivovarov','Trani ComeGalletas','Marcos Trump','Emanuel Bagundo','Lucas Maximoff','Nahuee Jugaremos Muevete Tilin','Eduardo Buñuelo','Poncho Motolov','Santi Etchenause','Tco Bignon','Matias Romina','Oscar Barajas','Dave Fonsé','Ima Ima Ame']);
export const SEED_MEMORIALS=Object.freeze(MEMORIAL_NAMES.map((name,i)=>({id:'season-memorial-'+i,name,seed:true})));
const rowX=[[.276,.378,.48,.59,.696,.8],[.246,.366,.479,.60,.72,.84],[.215,.35,.48,.615,.748,.878]],rowY=[.382,.477,.577];
export function buildMemorialProps(maps,entries=SEED_MEMORIALS){
 const map=maps['cementerio-interior'];if(!map)return;
 map.props=map.props.filter(p=>!p.memorial);map.interactionRevision=(map.interactionRevision||0)+1;
 for(const [i,m]of entries.filter(m=>m.seed).slice(0,18).entries()){const row=Math.floor(i/6),x=rowX[row][i%6]*map.width,y=rowY[row]*map.height;map.props.push({id:'grave-'+m.id,type:'memorial',memorial:{id:m.id,name:m.name},painted:true,solid:false,x,y,w:100,h:20,contextAnchor:{x,y:y-12},approach:{x,y:.80*map.height},hitRect:[x-48,y-20,x+48,y+55]});}
 const added=entries.filter(m=>!m.seed),rows=Math.ceil(added.length/6);
 const pitch=Math.min(.122,.28/Math.max(1,rows));
 const artWidth=Math.min(map.width*.087,map.height*.62*pitch*1.32);
 for(const [i,m]of added.entries()){
  const x=rowX[2][i%6]*map.width,y=(.69+pitch*(Math.floor(i/6)+1))*map.height;
  const top=y-artWidth*.70/.62;
  map.props.push({id:'grave-'+m.id,type:'memorial',memorial:{id:m.id,name:m.name},painted:false,artWidth,solid:false,x,y,w:artWidth,h:0,contextAnchor:{x,y:top},approach:{x,y:Math.min(.91*map.height,y+.055*map.height)},hitRect:[x-artWidth/2,top,x+artWidth/2,y]});
 }
 map.memorials=entries.map(m=>({id:m.id,name:m.name,seed:!!m.seed}));
}
