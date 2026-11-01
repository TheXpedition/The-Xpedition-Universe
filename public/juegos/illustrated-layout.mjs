// Coordinates are authored against the actual illustration, in source pixels.
// The same walkable polygons and object footprints are used by client and server.
import {composeIllustratedCave} from './illustrated-cave.mjs';
const SX=4,SY=4/.62;
const point=([x,y])=>[x*SX,y*SY];
const corridor=(a,b,r=24)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),nx=-dy/d*r,ny=dx/d*r;return [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];};
const circle=(x,y,rx,ry)=>Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*rx,y+Math.sin(i*Math.PI/12)*ry]);
const portalSpecs=[
 ['refugio-1','REFUGIO 1',287,430,285,396,125,53],
 ['refugio-2','REFUGIO 2',612,387,607,340,130,54],
 ['montana','MONTAÑA',866,150,875,111,90,40],
 ['comida','COMEDOR',1252,368,1244,322,145,55],
 ['eliminacion','CONSEJO',1517,448,1520,388,180,55],
 ['confesionario','CONFESIONARIO',1139,618,1142,581,95,44],
 ['muelle','MUELLE',215,733,241,668,85,28],
 ['desafios','RETOS',548,710,552,643,110,40],
 ['cueva','CUEVA',1467,734,1478,668,95,40],
 ['mirador','MIRADOR AURORA',268,269,262,216,56,38],
 ['termales','AGUAS TERMALES',1333,811,1341,797,150,56],
 ['taller','TALLER',1070,474,1090,432,90,38],
 ['bosque','BOSQUE HELADO',1252,580,1259,542,60,30]
];
export const ATLAS_POINTS=Object.freeze(Object.fromEntries([['base',[865/1672,548/941]],...portalSpecs.map(([id,,x,y])=>[id,[x/1672,y/941]])]));
function object(id,type,x,y,w,h,extra={}){return {id,type,x:x*SX,y:y*SY,w:w*SX,h:h*SY,height:100,solid:true,blockJump:true,painted:true,...extra};}
function route(floors,vertices,r=25){for(let i=1;i<vertices.length;i++)floors.push(corridor(vertices[i-1],vertices[i],r));for(const [x,y]of vertices)floors.push(circle(x,y,r,r));}
export function composeIllustratedWorld(maps){
 const base=maps.find(m=>m.id==='base'),floors=[
  [[620,432],[736,417],[808,438],[965,441],[1082,478],[1063,551],[962,579],[788,582],[666,553],[610,499]],
  [[113,402],[184,374],[331,375],[419,421],[402,461],[242,472],[137,454]],
  [[489,356],[573,340],[666,348],[706,383],[664,415],[532,416],[484,388]],
  [[149,247],[236,236],[332,246],[374,272],[346,297],[212,291]],
  [[1115,353],[1201,340],[1348,349],[1386,374],[1310,397],[1176,397]],
  circle(1519,418,118,65),
  [[367,632],[462,599],[628,603],[755,659],[722,733],[521,749],[404,717]],
  [[112,645],[245,614],[358,637],[377,684],[296,733],[227,787],[146,804],[85,775]],
  [[1324,710],[1392,687],[1548,697],[1598,741],[1548,775],[1412,783],[1327,759]],
  [[1058,588],[1130,566],[1221,584],[1248,617],[1187,652],[1105,647]],
  circle(1335,807,135,54),circle(866,145,75,38)
 ];
 route(floors,[[645,500],[560,496],[478,477],[402,457],[310,442]],32);
 route(floors,[[555,496],[536,445],[565,408],[613,389]],27);
 route(floors,[[611,380],[541,366],[468,356],[407,331],[365,284],[270,270]],24);
 route(floors,[[800,451],[789,407],[761,368],[773,322],[817,287],[816,244],[850,203],[866,151]],25);
 route(floors,[[1005,504],[1102,470],[1194,452],[1245,417],[1252,368]],28);
 route(floors,[[1189,454],[1300,445],[1395,446],[1483,450],[1517,448]],25);
 route(floors,[[797,571],[801,620],[861,641],[921,622],[991,594],[1081,610],[1139,618]],26);
 route(floors,[[710,716],[803,724],[871,712],[930,678],[1005,649],[1084,630]],26);
 route(floors,[[403,702],[357,706],[299,733],[215,733]],28);
 route(floors,[[1140,631],[1213,663],[1309,688],[1384,719],[1467,734]],28);
 route(floors,[[1382,766],[1346,791],[1333,811]],26);
 route(floors,[[1182,612],[1221,591],[1252,580]],25);
 const props=portalSpecs.map(([zone,label,px,py,x,y,w,h])=>object('destination-'+zone,'cabin',x,y,w,h,{label,portal:{zone,x:px*SX,y:py*SY},labelPoint:point([px,py-18])}));
 // Water at the thermal pool remains blocked; its landing is on the western deck.
 const thermal=props.find(p=>p.portal.zone==='termales');thermal.portal.x=1230*SX;thermal.portal.y=820*SY;
 props.push(object('fire','firepit',867,501,63,27,{circular:true}),
  object('plaza-a-bench1','bench',763,513,51,13,{seatFacing:1}),object('plaza-a-bench2','bench',977,535,53,13,{seatFacing:-1}),
  object('plaza-b-bench1','bench',813,548,51,13),object('plaza-b-bench2','bench',934,485,49,13),
  object('supplies','crate',687,480,33,20,{discovery:'compass'}),object('plaza-field-log','workbench',997,487,32,14,{discovery:'map'}),
  object('plaza-b-lamp','pole',1021,521,7,7),object('plaza-a-lamp','pole',717,487,7,7));
 Object.assign(base,{width:1672*SX,height:941*SY,bounds:[0,0,1672*SX,941*SY],spawn:point([865,558]),avatarHeight:138,defaultZoom:.43,
  floors:floors.map(f=>f.map(point)),props,paths:[],illustration:{id:'illustratedAtlas',width:1672*SX,height:941*SX},previewFocus:{x:865*SX,y:505*SX,zoom:.25}});
 const council=maps.find(m=>m.id==='eliminacion');council.illustration={id:'councilTerrain',width:3600,height:3200*.62};council.defaultZoom=.54;
 council.props=council.props.filter(p=>!p.id.startsWith('council-framing')).map(p=>p.seats?p:{...p,painted:true});
 composeIllustratedCave(maps.find(m=>m.id==='cueva'));return maps;
}
