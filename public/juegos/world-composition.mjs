import {composeIllustratedWorld} from './illustrated-layout.mjs';
import {composeValley} from './world-valley.mjs';
import {composeDestinations} from './world-districts.mjs';
// Authored arrangements preserve zone IDs and server-owned interactions.
export function composeWorld(maps){
 const by=Object.fromEntries(maps.map(m=>[m.id,m])),patch=(map,id,change)=>Object.assign(by[map].props.find(p=>p.id===id),change);
 for(const m of maps){m.avatarHeight=['interior','studio'].includes(m.sky)?152:m.id==='base'?110:m.avatarHeight;}
 const base=by.base;
 patch('base','cabin-one',{art:'bunkhouse',artWidth:620,w:420});patch('base','cabin-two',{art:'bunkhouse',artWidth:580,w:410});patch('base','tent',{art:'canteen',artWidth:760,w:530});patch('base','council',{art:'councilHall',artWidth:560});patch('base','challenge',{art:'arenaGate',artWidth:480});patch('base','pier',{art:'harborStation',artWidth:520});
 patch('base','central-fire',{x:2580,y:2080,w:200,h:115});
 patch('base','plaza-a-bench1',{x:2370,y:2260,w:215});patch('base','plaza-a-bench2',{x:2790,y:2260,w:215});patch('base','plaza-b-bench1',{x:2350,y:1990,w:195});patch('base','plaza-b-bench2',{x:2810,y:1990,w:195});
 patch('base','supplies',{x:3030,y:2380,w:210,h:80});patch('base','plaza-table',{x:3170,y:2550,w:170,h:90});patch('base','plaza-chair',{x:3330,y:2530,w:80,h:65});
 // Headquarters forms the eastern edge of the social clearing, away from all doors.
 base.props.push({id:'expedition-hq',type:'cabin',art:'headquarters',artWidth:720,x:3110,y:1900,w:470,h:130,height:360,solid:true,blockJump:true,description:'La dirección de la expedición prepara aquí sus rutas y suministros.'});
 // Beds are sized against standing cast members and grouped along the back wall.
 patch('refugio-2','bed1',{x:340,y:480,w:265,h:135});patch('refugio-2','bed2',{x:1160,y:480,w:265,h:135});patch('refugio-2','desk',{x:750,y:500,w:150,h:75});patch('refugio-2','rug',{x:750,y:760,w:410,h:185});
 patch('refugio-1','sofa1',{x:365,y:480,w:290,h:95});patch('refugio-1','sofa2',{x:1110,y:650,w:110,h:220});patch('refugio-1','fire',{x:1180,y:390,w:155,h:85});patch('refugio-1','table',{x:660,y:650,w:190,h:105});patch('refugio-1','rug',{x:650,y:660,w:460,h:250});
 patch('comida','kitchen',{x:950,y:470,w:560,h:105});for(let i=0;i<4;i++)patch('comida','table'+i,{w:285,h:115});
 patch('eliminacion','stage',{art:'councilHall',artWidth:700});
 patch('desafios','start',{art:'arenaGate',artWidth:390});patch('desafios','dodgeball-gate',{art:'arenaGate',artWidth:460});
 patch('desafios','platform',{x:1490,y:870});
 // Clear the social deck and keep the supply station at its eastern service edge.
 patch('base','plaza-field-log',{x:3210,y:2250,w:180,h:75});patch('base','plaza-a-lamp',{x:2180,y:2240});patch('base','plaza-b-lamp',{x:2980,y:1990});
 by['refugio-1'].wall='wallLounge';by['refugio-2'].wall='wallDorm';by.comida.wall='wallKitchen';by.confesionario.wall='wallChart';by.taller.wall='wallChart';
 // Vary district details deliberately: a harbour workstation, a ceremonial approach,
 // a compact dormitory and two distinct challenge entrances replace repeated props.
 composeValley(base);return composeIllustratedWorld(composeDestinations(maps));
}
