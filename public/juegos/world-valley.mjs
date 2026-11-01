// A single inhabited valley replaces the disconnected plate layout.
// Every landmark has an approach from the public courtyard; the southern coast is open water.
export function composeValley(m){
 m.width=6800;m.height=4300;m.bounds=[100,300,6700,4210];m.spawn=[3380,3000];m.avatarHeight=122;
 m.floors=[[[230,800],[620,470],[1540,380],[2450,520],[3130,350],[3970,350],[4610,550],[5480,420],[6320,650],[6560,1330],[6470,2130],[6650,2910],[6470,3690],[6010,4110],[5140,4170],[4470,3970],[3820,4160],[3000,4050],[2310,4170],[1470,3990],[700,3850],[230,3350],[360,2550],[180,1810]]];
 m.floorStyles=['snow'];
 const positions={
  'cabin-one':[1540,1510,470,175],'cabin-two':[2470,1460,450,175],tent:[4700,1690,680,190],workshop:[5740,2020,340,135],confessional:[4310,2940,230,110],cave:[6160,3410,350,140],trail:[3510,830,1250,220],pier:[850,3430,430,140],challenge:[2400,3590,340,125],council:[5680,1080,550,170],lookout:[930,970,240,130],'forest-gate':[5350,3020,240,105],springs:[5650,3820,50,30],
  'central-fire':[3390,2670,220,125],sign:[3100,3160,35,25],crate1:[3810,2220,65,50],crate2:[3900,2260,60,50],supplies:[4080,2350,205,80],'plaza-field-log':[5570,2380,190,80],'plaza-table':[4450,2600,170,90],'plaza-chair':[4600,2600,80,65],
  'plaza-a-bench1':[3060,2650,115,230],'plaza-a-bench2':[3715,2650,115,230],'plaza-b-bench1':[3220,2390,220,60],'plaza-b-bench2':[3535,2390,220,60],'plaza-a-lamp':[2970,2840,22,22],'plaza-b-lamp':[3800,2840,22,22],
  'shelter-bench1':[1760,1880,220,60],'shelter-bench2':[2190,1880,220,60],'shelter-lamp':[1980,1750,22,22],
  'refuge-crate':[1160,1770,85,65],'sled-crate':[2670,1790,90,65],'harbor-barrel':[1150,3650,65,50],'harbor-crates':[1370,3600,90,65],'dock-bench':[1450,3400,220,60],
  'forest-rest':[4890,3260,230,60],'ridge-telescope':[3830,1220,90,75],'river-rock':[6180,2680,160,100],'forest-rock':[6020,3900,160,100],
  'expedition-hq':[3970,2060,470,140]
 };
 const art={ 'cabin-one':['bunkhouse',780],'cabin-two':['bunkhouse',740],tent:['canteen',990],council:['councilHall',850],challenge:['arenaGate',550],pier:['harborStation',650],'expedition-hq':['headquarters',820] };
 // Remove the repeated lattice of fencing, lamps and trees. Replant edges in authored groves.
 m.props=m.props.filter(p=>positions[p.id]);
 for(const p of m.props){const point=positions[p.id];if(point){[p.x,p.y,p.w,p.h]=point;if(p.portal)Object.assign(p.portal,{x:p.x,y:p.y+p.h/2+80});}if(art[p.id])[p.art,p.artWidth]=art[p.id];}
 Object.assign(m.props.find(p=>p.id==='trail'),{art:'mountain',artWidth:1900});
 m.props.find(p=>p.id==='challenge').label='ZONA DE RETOS';m.props.find(p=>p.id==='plaza-chair').seatFacing=-1;
 // The fire is approached from the south. Side seats face inward; north seats face the courtyard.
 for(const id of ['plaza-a-bench1','plaza-a-bench2']){const p=m.props.find(p=>p.id===id);p.art='benchSide';p.artWidth=195;p.seatAxis='y';p.seatFacing=id.endsWith('1')?1:-1;p.flipX=p.seatFacing===-1;p.seatInset=45;}
 const groves=[
  [[320,1050,330],[440,1330,290],[310,1620,350],[420,2030,330],[350,2390,310]],
  [[690,520,340],[1160,470,300],[1510,510,260],[2740,650,300],[3060,470,330]],
  [[4320,650,290],[4710,640,310],[5070,590,290],[6210,760,320],[6430,1170,350]],
  [[1080,2280,310],[1430,2230,260],[1730,2410,290],[1300,2660,320],[970,2850,300]],
  [[4840,2800,270],[5110,2660,300],[5550,2720,310],[5880,2860,290],[6270,3010,330],[5090,3480,300],[5420,3520,320],[5910,3570,300]],
  [[4450,3810,300],[4810,3960,330],[6210,3860,310],[2920,3940,300],[1800,3800,290]],
  [[2790,1970,260],[2950,2040,230],[4480,2160,270],[4690,2220,240]]
 ];
 let i=0;for(const group of groves)for(const [x,y,height]of group)m.props.push({id:'valley-pine-'+i++,type:'pine',x,y,w:45,h:32,height,solid:true,blockJump:true});
 for(const [i,x,y]of [[0,2820,3040],[1,2540,2850],[2,2070,2390],[3,1930,2020],[4,3650,1770],[5,3850,1400],[6,4400,1880],[7,4930,2170],[8,4790,2870],[9,5140,3260],[10,3060,3380],[11,2100,3400],[12,1640,3240],[13,1360,2940]])m.props.push({id:'route-lantern-'+i,type:'pole',x,y,w:22,h:22,height:148,solid:true,blockJump:true});
 m.paths=[
  [[3380,3000],[3100,2950],[2730,2690],[2310,2320],[1970,2040],[1980,1780],[1540,1690]],
  [[1980,1780],[2470,1640]],[[1970,2040],[1300,1890],[1090,1560],[930,1120]],
  [[3380,3000],[3400,2340],[3500,1930],[3680,1560],[3830,1360],[3510,1020]],
  [[3400,2340],[3970,2240],[4370,2140],[4630,1940],[4700,1870]],
  [[4630,1940],[5140,1660],[5460,1430],[5680,1260]],[[4630,1940],[5410,2260],[5740,2200]],
  [[3380,3000],[3890,3140],[4310,3090]],[[3890,3140],[4750,3140],[5040,3210],[5350,3190]],
  [[5040,3210],[5590,3390],[6030,3580],[6160,3580]],[[5590,3390],[5650,3950]],
  [[3380,3000],[2960,3310],[2640,3470],[2400,3770]],[[2960,3310],[2090,3190],[1470,3160],[1050,3290],[850,3590]]
 ];
 // Tree groves are kept out of all paths and the clear approaches to buildings.
 const distance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
 let n=0;for(const [cx,cy]of [[600,1500],[930,2500],[1670,2690],[2850,620],[4470,720],[6200,1800],[5960,2750],[5160,3650],[3990,3890],[2460,3900]])for(let j=0;j<10;j++){
  const a=j*2.4,x=Math.round(cx+Math.cos(a)*(80+j*20)),y=Math.round(cy+Math.sin(a)*(80+j*20));
  if(m.props.some(p=>Math.abs(p.x-x)<p.w/2+155&&Math.abs(p.y-y)<p.h/2+140)||m.paths.some(path=>path.slice(1).some((b,i)=>distance(x,y,path[i],b)<145)))continue;
  m.props.push({id:'grove-'+n++,type:'pine',x,y,w:40,h:25,height:245+(j*31%125),solid:true,blockJump:true,flipX:j%2===0});
 }
 m.props.push({id:'spring-pool',type:'hotspring',x:5880,y:3760,w:430,h:180,height:70,solid:true,blockJump:true,description:'Una pequeña poza termal marca el camino hacia las aguas calientes del campamento.'});
 for(const [i,x,y,height]of [[0,2800,2460,370],[1,2810,2240,280],[2,3980,2850,360],[3,4110,3200,380],[4,3110,3390,400],[5,3700,3410,320]])m.props.push({id:'courtyard-tree-'+i,type:'pine',x,y,w:40,h:26,height,solid:true,blockJump:true,flipX:i%2===0});
 for(const [i,x,y,h]of [[0,2050,3540,42],[1,2550,3330,55],[2,2750,3540,36]])m.props.push({id:'practice-'+i,type:'crate',x,y,w:90,h:70,height:h,solid:true,platform:true,description:'Cajas del circuito de práctica. Puedes saltar sobre ellas antes de entrar a los retos.'});
 return m;
}
