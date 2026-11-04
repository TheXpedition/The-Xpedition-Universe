import {CAST_HEIGHTS} from '../world-cast-proportions.mjs';
// These anchors are measured on the illustrated sets, in the 1920×1080 space.
export const STAGE={width:1920,height:1080,judgeSeats:[430,960,1490],judgeWaist:800,deskBack:725,deskName:808,walkHeight:205,fridge:{x:490,y:735,height:280},counterHeightRatio:.49};
export const visualHeight=(id,height)=>height*(CAST_HEIGHTS[id]||200)/200;
export function groupLayout(count){const cols=count>9?9:Math.max(1,count),rows=Math.ceil(count/cols),pitch=cols===1?0:1560/(cols-1);return Array.from({length:count},(_,i)=>{const row=Math.floor(i/cols),n=Math.min(cols,count-row*cols),height=rows===1?450:row===0?250:270,y=rows===1?850:row===0?650:990,tableY=y-height*STAGE.counterHeightRatio;return {x:960-(n-1)*pitch/2+(i%cols)*pitch,y,height,tableY,labelY:tableY+84,row};});}
export function shelfSlots(ingredients){const cold=ingredients.filter(i=>['protein','dairy','vegetable','fruit'].includes(i.category)),dry=ingredients.filter(i=>!cold.includes(i));return [...cold.map((i,n)=>({...i,bank:'cold',col:n%6,row:Math.floor(n/6)})),...dry.map((i,n)=>({...i,bank:'dry',col:n%4,row:Math.floor(n/4)}))];}
