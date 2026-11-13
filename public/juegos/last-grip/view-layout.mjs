// The scene uses contain on every screen. Keep input, TV video and contextual
// interactions on the same transform instead of mixing cover/contain maths.
export function sceneLayout(rect){const scale=Math.min(rect.width/1672,rect.height/941);return {scale,left:rect.left+(rect.width-1672*scale)/2,top:rect.top+(rect.height-941*scale)/2,width:1672*scale,height:941*scale};}
export function scenePoint(rect,x,y){const v=sceneLayout(rect);return {x:(x-v.left)/v.scale,y:(y-v.top)/v.scale};}
export const paintSceneryForMedia=video=>video.hidden||video.dataset.frameReady==='false'||video.dataset.placement==='monitor';
