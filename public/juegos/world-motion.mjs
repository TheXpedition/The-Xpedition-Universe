import {WORLD_MAPS} from './world-maps.mjs';
import {portalDistance} from './front-world.mjs';
export function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
export const hasFloor=(map,x,y)=>map.floors.some(p=>pointInPolygon(x,y,p));
const inProp=(p,x,y,pad=0)=>p.circular?((x-p.x)/(p.w/2+pad))**2+((y-p.y)/(p.h/2+pad))**2<1:x>p.x-p.w/2-pad&&x<p.x+p.w/2+pad&&y>p.y-p.h/2-pad&&y<p.y+p.h/2+pad;
export function clearPoint(map,x,y,z=0,radius=11){const b=map.bounds;if(x<b[0]+radius||x>b[2]-radius||y<b[1]+radius||y>b[3]-radius)return false;return !map.props.some(p=>p.solid&&(p.blockJump||p.height>z+7)&&inProp(p,x,y,radius));}
export function createWorldPlayer(zone='base',point){const map=WORLD_MAPS[zone];return {x:point?.x??map.spawn[0],y:point?.y??map.spawn[1],z:0,vz:0,facing:-1,moving:false,walk:0,jumpAt:0,falling:0,path:[],grounded:true};}
export function jumpWorld(player,time,{quick=false}={}){if(!player.grounded||player.falling)return false;player.vz=quick?430:410;player.jumpGravity=quick?1600:900;player.grounded=false;player.jumpAt=time;return true;}
function support(map,p,previousZ){let ground=hasFloor(map,p.x,p.y)?0:-Infinity;for(const prop of map.props)if(prop.platform&&inProp(prop,p.x,p.y,-2)&&previousZ>=prop.height-8)ground=Math.max(ground,prop.height);return ground;}
export function stepWorld(player,input,dt,zone){
 const map=typeof zone==='string'?WORLD_MAPS[zone]:zone;dt=Math.min(.05,Math.max(0,dt));
 if(player.falling){player.falling+=dt;player.z-=dt*200;if(player.falling>.8)Object.assign(player,createWorldPlayer(map.id));return;}
 let x=Number(input.x)||0,y=Number(input.y)||0;
 if(player.path.length&&!x&&!y){while(player.path.length&&Math.hypot(player.path[0].x-player.x,player.path[0].y-player.y)<9)player.path.shift();if(player.path.length){const target=player.path[0],dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);x=dx/d;y=dy/d;}}
 if(map.projection==='front')y*=.72;
 const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}const speed=(input.ceremony?105:input.run===true?330:205)*Math.max(.35,Math.min(1,Number(input.speedFactor)||1)),previousZ=player.z;
 const wasGrounded=player.grounded;
 if(!player.grounded){const gravity=player.jumpGravity||900;if(gravity===1600){player.z+=player.vz*dt-gravity*dt*dt*.5;player.vz-=gravity*dt;}else{player.vz-=gravity*dt;player.z+=player.vz*dt;}}
 const beforeX=player.x,beforeY=player.y;
 if(clearPoint(map,player.x+x*speed*dt,player.y,player.z)&&(!map.boundedFloor||hasFloor(map,player.x+x*speed*dt,player.y)))player.x+=x*speed*dt;
 if(clearPoint(map,player.x,player.y+y*speed*dt,player.z)&&(!map.boundedFloor||hasFloor(map,player.x,player.y+y*speed*dt)))player.y+=y*speed*dt;
 player.moving=Math.hypot(player.x-beforeX,player.y-beforeY)>.01;if(Math.abs(x)>.01)player.facing=x>0?1:-1;if(player.moving)player.walk+=dt*8*(speed/205);
 const ground=support(map,player,previousZ);
 if(player.vz<=0&&player.z<=ground){player.z=ground;player.vz=0;player.grounded=true;if(!wasGrounded)player.landAt=Number(input.now)||0;}
 else if(player.grounded&&player.z>ground+1){player.grounded=false;player.vz=0;}
 if(ground===-Infinity&&player.z<=-5){player.falling=.001;player.grounded=false;player.path=[];}
 if(!player.moving&&player.path.length){const next=player.path[0];if(Math.hypot(next.x-player.x,next.y-player.y)>15)player.path=[];}
}
export function nearestPortal(player,zone){const map=typeof zone==='string'?WORLD_MAPS[zone]:zone;return map.props.filter(p=>p.portal&&!p.portal.eventBlocked).map(p=>({...p.portal,id:p.id,distance:portalDistance(player,p.portal)})).filter(p=>p.distance<(p.range||115)).sort((a,b)=>a.distance-b.distance)[0]||null;}
const grids=new WeakMap(),CELL=34;
class MinHeap{constructor(){this.a=[];}push(id,f){const a=this.a;let i=a.length;a.push({id,f});while(i){const p=(i-1)>>1;if(a[p].f<=f)break;a[i]=a[p];i=p;}a[i]={id,f};}pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first.id;}get length(){return this.a.length;}}
function grid(map){const cached=grids.get(map);if(cached&&cached.revision===(map.interactionRevision||0)&&cached.props===map.props)return cached;const width=Math.ceil(map.width/CELL),height=Math.ceil(map.height/CELL),cells=new Uint8Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const px=x*CELL+CELL/2,py=y*CELL+CELL/2;cells[y*width+x]=hasFloor(map,px,py)&&clearPoint(map,px,py,0,17)?1:0;}const result={width,height,cells,revision:map.interactionRevision||0,props:map.props};grids.set(map,result);return result;}
export function worldPath(zone,from,target){
 const map=typeof zone==='string'?WORLD_MAPS[zone]:zone,g=grid(map),cell=(x,y)=>Math.floor(y/CELL)*g.width+Math.floor(x/CELL),start=cell(from.x,from.y);let end=cell(target.x,target.y);
 if(target.x<0||target.y<0||target.x>=map.width||target.y>=map.height)return [];
 if(!g.cells[end]){let best=Infinity,chosen=-1;const gx=Math.floor(target.x/CELL),gy=Math.floor(target.y/CELL);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=gx+dx,y=gy+dy,key=y*g.width+x,d=Math.hypot(x*CELL+CELL/2-target.x,y*CELL+CELL/2-target.y);if(x>=0&&y>=0&&x<g.width&&y<g.height&&g.cells[key]&&d<best){best=d;chosen=key;}}if(chosen<0)return [];end=chosen;}
 const open=new MinHeap(),closed=new Set(),came=new Map(),score=new Map([[start,0]]),goalX=end%g.width,goalY=Math.floor(end/g.width),estimate=i=>Math.hypot(i%g.width-goalX,Math.floor(i/g.width)-goalY);let examined=0;open.push(start,estimate(start));
 while(open.length&&examined++<30000){const current=open.pop();if(closed.has(current))continue;closed.add(current);if(current===end){const path=[];let key=end;while(key!==start){path.push({x:key%g.width*CELL+CELL/2,y:Math.floor(key/g.width)*CELL+CELL/2});key=came.get(key);if(key===undefined)return [];}return path.reverse();}
  const cx=current%g.width,cy=Math.floor(current/g.width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=cx+dx,ny=cy+dy,next=ny*g.width+nx;if(nx<0||ny<0||nx>=g.width||ny>=g.height||!g.cells[next])continue;if(dx&&dy&&(!g.cells[cy*g.width+nx]||!g.cells[ny*g.width+cx]))continue;const cost=(score.get(current)||0)+(dx&&dy?1.414:1);if(cost<(score.get(next)??Infinity)){came.set(next,current);score.set(next,cost);open.push(next,cost+estimate(next));}}
 }return [];
}
