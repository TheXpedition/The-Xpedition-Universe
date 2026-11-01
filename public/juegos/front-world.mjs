export const FRONT_Y=.62,ART_SCALE=1.5;
export function frontPoint(map,x,y){return {x:x*map.width,y:y*map.height};}
export function frontCameraTarget(map,w,h,actor,shot){const wide=map.id==='eliminacion'&&w/h>1.25&&!shot?.close,zoom=(wide?Math.min(w/map.width,h/map.illustration.height):h/map.illustration.height)*(shot?.close?1.18:1),hx=w/(2*zoom),x=map.width>hx*2?Math.max(hx,Math.min(map.width-hx,shot?.x??actor?.x??map.spawn[0])):map.width/2;return {x,y:map.illustration.height-h/(2*zoom),zoom};}
export function createFrontScene({id,asset,name,description,walk=[.746,.946],spawn=[.28,.85],artScale=ART_SCALE,...extra}){
 const width=asset.width*artScale,height=asset.height*artScale/FRONT_Y,top=height*walk[0],bottom=height*walk[1];
 return {id,name,short:name.toUpperCase(),description,width,height,bounds:[12,top-1,width-12,bottom+1],spawn:[width*spawn[0],height*spawn[1]],spawns:{},ground:'ash',sky:'apocalypse',projection:'front',boundedFloor:true,avatarHeight:186,walkBand:walk,illustration:{...asset,width,height:height*FRONT_Y},floors:[[[14,top],[width-14,top],[width-14,bottom],[14,bottom]]],paths:[],props:[],...extra};
}
export function portalDistance(actor,portal){if(portal.trigger){const [l,t,r,b]=portal.trigger;return Math.hypot(Math.max(l-actor.x,0,actor.x-r),Math.max(t-actor.y,0,actor.y-b));}return Math.hypot(actor.x-portal.x,actor.y-portal.y);}
export function routeBetween(maps,from,to){const queue=[[from]],seen=new Set([from]);while(queue.length){const route=queue.shift(),at=route.at(-1);if(at===to)return route;for(const p of maps[at]?.props||[]){const next=p.portal?.zone;if(p.portal?.eventBlocked||!maps[next]||seen.has(next))continue;seen.add(next);queue.push([...route,next]);}}return null;}
