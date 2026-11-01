// Server rolls a single catch. Crafting improves odds, never guarantees fish.
export const FISHING_ODDS=Object.freeze({basic:{fish:.14,empty:.12},improved:{fish:.64,empty:.10}});
const salvage=Object.freeze([
 {id:'empty-bottle',name:'Botella recuperada'},
 {id:'scrap',name:'Chatarra del fondo'},
 {id:'cloth',name:'Retal enganchado'},
 {id:'rope',name:'Cuerda enredada'},
 {id:'wood',name:'Madera arrastrada por el agua'}
]);
export function fishingCatch(improved,random=Math.random){
 const odds=FISHING_ODDS[improved?'improved':'basic'],roll=random();
 if(roll<odds.fish)return {kind:'food',id:'river-fish',quantity:1,name:'Pescado de río'};
 if(roll<odds.fish+odds.empty)return null;
 return {kind:'resource',...salvage[Math.min(salvage.length-1,Math.floor(random()*salvage.length))],quantity:1};
}
