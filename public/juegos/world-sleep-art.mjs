import {SLEEP_ART_BOUNDS} from './world-sleep-framing.mjs';
// Measure visible artwork, not the transparent canvas around each drawing.
// Uniform scaling keeps heads, clothing and boots at their supplied proportions.
export const SLEEP_WIDTH_RATIOS=Object.freeze({
 'maria-villegas':.88,andromeda:.91,arisantana:.93,bayron:.93,bruno:.94,
 carmine:.91,daelly:.86,eduard:.94,guillermo:.97,isabel:.90,ivy:.87,
 alice:.87,gabrielsab:.92,joseserna:.93,kareli:.88,leandro:.96,marianito:1.02,peggy:.90,roger:.98,
 sallua:.90,vita:1.02,vitany:.88,dani:.90,'dua-lingo':.88
});
export function sleepSourceBounds(id,image){
 if(image.worldSleepBounds)return image.worldSleepBounds;const b=SLEEP_ART_BOUNDS[id];
 return b&&b.canvasWidth===image.width&&b.canvasHeight===image.height?b:{x:0,y:0,width:image.width,height:image.height};
}
export function sleepPoseBounds(player,height,image,bed){
 const bedWidth=bed?.artWidth||height*1.12;
 const source=sleepSourceBounds(player.characterId,image);
 const rotated=source.rotated||{x:0,y:0,width:source.width,height:source.height};
 const width=Math.min(height*(SLEEP_WIDTH_RATIOS[player.characterId]||.90),bedWidth*.88),scale=width/rotated.width,h=scale*rotated.height;
 const flip=bed?.flipX===true;
 const x=(bed?.x??player.x)-width/2;
 const bottom=bed?bed.y*.62-bedWidth*.145:player.y*.62+height*.06;
 const offset=player.activity==='private-rest'?Math.max(-1,Math.min(1,Number(player.privateBedOffset)||0)):0;
 const shiftX=offset*bedWidth*.028,shiftY=offset*bedWidth*.06;
 return {x:x+shiftX,y:bottom-h+shiftY,width,height:h,bottom:bottom+shiftY,flip,source,rotated,scale};
}
export function paintSleepingPose(context,player,height,image,bed,time,reduced=false){
 const b=sleepPoseBounds(player,height,image,bed),breath=reduced?0:Math.sin(time*1.7)*height*.001;
 context.save();context.translate(b.x+b.width/2,b.y+breath);if(b.flip)context.scale(-1,1);
 context.translate(-b.width/2-b.rotated.x*b.scale,-b.rotated.y*b.scale);
 if(b.source.angle)context.rotate(b.source.angle);
 context.drawImage(image,b.source.x,b.source.y,b.source.width,b.source.height,0,0,b.source.width*b.scale,b.source.height*b.scale);context.restore();return b;
}
