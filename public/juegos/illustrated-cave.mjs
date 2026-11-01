// The drawn ledges and bridges define the walkable space of the cave.
const SX=4800/1846,SY=3600/852;
const pt=([x,y])=>[x*SX,y*SY];
const ring=(x,y,r)=>Array.from({length:16},(_,i)=>[x+Math.cos(i*Math.PI/8)*r,y+Math.sin(i*Math.PI/8)*r]);
function path(floors,vertices,r){for(const [x,y]of vertices)floors.push(ring(x,y,r));for(let i=1;i<vertices.length;i++){const a=vertices[i-1],b=vertices[i],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),nx=-dy/d*r,ny=dx/d*r;floors.push([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]]);}}
export function composeIllustratedCave(map){
 const floors=[];
 path(floors,[[900,780],[926,696],[1018,622],[1020,583],[955,528],[859,481],[810,439],[842,385],[904,349],[1040,345]],40);
 path(floors,[[861,480],[689,433],[540,395],[411,370],[307,327],[320,289],[363,265]],36);
 path(floors,[[1020,583],[1255,635],[1498,644],[1715,575],[1758,473],[1707,392],[1697,294],[1585,243],[1460,227],[1260,241],[1145,316],[1040,345]],36);
 const placements={exit:[900,785], 'cave-route-map':[961,713],'cave-west-desk':[365,299],'cave-main-crystal':[1010,316],'cave-cache':[1569,253], 'cave-lake':[1440,460]};
 map.props=map.props.filter(p=>placements[p.id]).map(p=>{const [x,y]=pt(placements[p.id]);if(p.id==='exit')return {...p,x,y,painted:true,portal:{zone:'base',x,y:y-30}};
  return {...p,x,y,painted:true,solid:p.id==='cave-lake',w:p.id==='cave-lake'?750:90,h:p.id==='cave-lake'?460:50,labelPoint:pt([placements[p.id][0],placements[p.id][1]-18])};});
 Object.assign(map,{floors:floors.map(f=>f.map(pt)),paths:[],spawn:pt([900,765]),illustration:{id:'caveBackdrop',width:4800,height:3600*.62},defaultZoom:.48,previewFocus:{x:2400,y:1116,zoom:.26}});
 return map;
}
