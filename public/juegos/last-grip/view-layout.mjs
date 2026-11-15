const WIDTH=1672,HEIGHT=941;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function sceneLayout(rect,{x=WIDTH/2,y=HEIGHT/2}={}){
 const scale=Math.max(rect.width/WIDTH,rect.height/HEIGHT)||1;
 const width=WIDTH*scale,height=HEIGHT*scale;
 const overflowX=Math.max(0,width-rect.width),overflowY=Math.max(0,height-rect.height);
 const cropX=clamp(x*scale-rect.width/2,0,overflowX);
 const cropY=clamp(y*scale-rect.height/2,0,overflowY);
 return {scale,width,height,left:rect.left-cropX,top:rect.top-cropY,
  positionX:overflowX?100*cropX/overflowX:50,positionY:overflowY?100*cropY/overflowY:50};
}
export function scenePoint(rect,x,y,view=sceneLayout(rect)){
 return {x:(x-view.left)/view.scale,y:(y-view.top)/view.scale};
}
export const paintSceneryForMedia=video=>video.hidden||video.dataset.placement==='monitor';
