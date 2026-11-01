import {COUNCIL_BANKS,COUNCIL_PRESENTER} from './council-layout.mjs';
const prop=(id,type,x,y,w,h,height,extra={})=>({id,type,x,y,w,h,height,solid:true,blockJump:true,...extra});
export function composeDestinations(maps){
 const cave=maps.find(m=>m.id==='cueva'),council=maps.find(m=>m.id==='eliminacion');
 Object.assign(cave,{width:4800,height:3600,bounds:[110,220,4690,3500],spawn:[2400,3260],avatarHeight:150,
  floors:[[[1830,3470],[1280,3100],[1480,2690],[680,2500],[260,2020],[430,1120],[1110,790],[1610,900],[1740,420],[2390,210],[3000,430],[3200,820],[4000,720],[4510,1300],[4600,1930],[4140,2530],[3430,2540],[3370,2870],[2940,3450]]],
  paths:[[[2400,3330],[2400,2850],[2350,2400],[2400,1900],[2400,1400],[2400,990],[2400,600]],[[2350,2400],[1500,2380],[1040,2030],[900,1440],[1500,1150],[2400,990]],[[2400,1900],[3200,2220],[3850,2080],[4010,1380],[3450,1120],[2400,990]]],
  districts:[{name:'Entrada de las galerías',x:2400,y:3000},{name:'Galería de cristales',x:1000,y:1750},{name:'Catedral de hielo',x:2400,y:1150},{name:'Lago subterráneo',x:3900,y:1650}],previewFocus:{x:2400,y:1160,zoom:.22}});
 cave.props=[
  prop('cave-arch','platform',2400,2760,720,90,320,{art:'iceArch',artWidth:860,solid:false,platform:false}),
  prop('cave-pillar-left','crystal',2020,2760,70,85,260),prop('cave-pillar-right','crystal',2780,2760,70,85,260),
  prop('cave-route-map','workbench',2050,3080,170,75,100,{discovery:'caveEntry'}),
  prop('cave-west-arch','platform',1430,2250,500,90,220,{art:'iceArch',artWidth:640,solid:false,platform:false}),
  prop('cave-west-desk','workbench',790,1880,180,80,105,{discovery:'caveArchive'}),
  prop('cave-main-crystal','crystal',2400,560,270,150,420,{discovery:'caveEcho',label:'CATEDRAL DE HIELO'}),
  prop('cave-lake','frozenPool',3880,1700,610,360,60,{art:'frozenLake',artWidth:790,description:'El hielo se abre sobre un lago subterráneo. El sendero rodea sus dos orillas y vuelve a la galería central.'}),
  prop('cave-east-arch','platform',3400,2240,520,90,220,{art:'iceArch',artWidth:630,solid:false,platform:false}),
  prop('cave-cache','crate',3370,1170,110,80,65,{description:'Suministros de la patrulla de exploración: cuerdas, linternas y material para medir el glaciar.'}),
  ...[[520,1660],[690,1170],[1180,970],[1650,1390],[1660,1920],[2860,880],[3060,1550],[4300,1430],[4420,2090],[3450,2440]].map(([x,y],i)=>prop('gallery-crystal-'+i,'crystal',x,y,100+i%3*25,75,230+i%4*45,{artWidth:115+i%3*40})),
  ...[[1640,2970],[2970,2980],[640,2220],[530,1400],[1570,850],[3220,840],[4220,1130],[4470,2340],[3150,2780]].map(([x,y],i)=>prop('gallery-wall-'+i,'rock',x,y,160+i%3*50,110,120+i%2*70,{art:'iceWall',artWidth:300+i%3*80})),
  ...[[2170,2930],[2690,2930],[1350,2450],[860,1610],[2250,1480],[2620,1480],[3410,2110],[4060,2120],[3150,1110]].map(([x,y],i)=>prop('gallery-light-'+i,'pole',x,y,22,22,145)),
  prop('exit','sign',2400,3400,60,30,100,{solid:false,label:'CAMPAMENTO',portal:{zone:'base',x:2400,y:3340}})
 ];
 Object.assign(council,{width:3600,height:3200,bounds:[100,280,3500,3110],spawn:[1800,2910],avatarHeight:153,presenter:COUNCIL_PRESENTER,
  floors:[[[260,520],[840,340],[1510,300],[2110,300],[2910,340],[3330,590],[3440,1390],[3370,2270],[3010,2680],[2450,2920],[2280,3100],[1320,3100],[1160,2910],[610,2670],[210,2200],[160,1360]]],
  paths:[[[1800,3010],[1800,2580],[1500,2280],[1460,1910],[1440,1170]],[[1800,2580],[2110,2270],[2150,1910],[2160,1170]]],previewFocus:{x:1800,y:1070,zoom:.32}});
 council.props=[
  prop('center-dais','platform',1800,1460,510,330,35,{art:'councilDais',artWidth:640,platform:true,blockJump:false}),
  ...COUNCIL_BANKS.map(bank=>prop(bank.id,'grandstand',bank.x,1500,170,1300,100,{seats:bank.seats,seatFacing:bank.facing,art:'chairSide'})),
  prop('ceremony-backdrop','challenge',1800,660,500,80,390,{art:'arenaGate',artWidth:740}),
  prop('ceremony-fire','firepit',1800,2140,170,100,60),
  ...[[450,800],[3150,800],[450,2290],[3150,2290],[1390,1160],[2210,1160],[1420,2590],[2180,2590]].map(([x,y],i)=>prop('council-torch-'+i,'torch',x,y,30,30,190)),
  prop('banner1','flag',1440,610,22,22,280,{solid:false}),prop('banner2','flag',2160,610,22,22,280,{solid:false}),
  ...[[180,1250],[3400,1250],[290,2400],[3300,2450]].map(([x,y],i)=>prop('council-framing-'+i,'pine',x,y,40,30,340,{flipX:i%2===1})),
  prop('exit','sign',1800,3060,60,30,100,{solid:false,label:'CAMPAMENTO',portal:{zone:'base',x:1800,y:3040}})
 ];
 return maps;
}
