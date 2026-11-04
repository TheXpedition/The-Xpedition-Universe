import {measuredSkeleton} from './apocalypse-cast-pivots.mjs';
// Texture skinning of the supplied illustration. No replacement faces or flat-color limbs.
// Source-space pivots are measured per character, rather than centered on cropped PNGs.
const p=(x,y)=>({x,y}),lerp=(a,b,t)=>a+(b-a)*t,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function castSkeleton(id,w,h){return measuredSkeleton(id,w,h);}
const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),add=(a,b)=>p(a.x+b.x,a.y+b.y),rotate=(root,angle,n)=>p(root.x+Math.cos(angle)*n,root.y+Math.sin(angle)*n);
function solve(root,end,a,b,sourceRoot,sourceKnee,sourceEnd){const distance=clamp(length(root,end),Math.abs(a-b)+.01,a+b-.01),theta=Math.atan2(end.y-root.y,end.x-root.x),cross=(sourceKnee.x-sourceRoot.x)*(sourceEnd.y-sourceRoot.y)-(sourceKnee.y-sourceRoot.y)*(sourceEnd.x-sourceRoot.x),delta=Math.acos(clamp((a*a+distance*distance-b*b)/(2*a*distance),-1,1)),joint=rotate(root,theta+(cross>0?-1:1)*delta,a);return {root,joint,end:rotate(root,theta,distance)};}
const matrix=(a,b,x,y)=>{const angle=Math.atan2(y.y-x.y,y.x-x.x)-Math.atan2(b.y-a.y,b.x-a.x),c=Math.cos(angle),s=Math.sin(angle);return {a:c,b:s,c:-s,d:c,e:x.x-c*a.x+s*a.y,f:x.y-s*a.x-c*a.y};};
const apply=(v,m)=>p(m.a*v.x+m.c*v.y+m.e,m.b*v.x+m.d*v.y+m.f);
export function castPose(m,{phase=0,moving=false,seated=0,reaction='',time=0,chair=false}={}){
 const stride=moving?Math.sin(phase)*m.h*.016:0,bob=moving?-Math.abs(Math.sin(phase))*m.h*.005:Math.sin(time*1.4)*m.h*.001,seatDrop=chair?m.knees[0].y-m.hips[0].y:m.h*.08,offset=p(0,bob+seated*seatDrop),body={a:1,b:0,c:0,d:1,e:0,f:offset.y},bones=[],legs=[],arms=[];
 for(let i=0;i<2;i++){const srcRoot=m.hips[i],srcKnee=m.knees[i],srcEnd=m.ankles[i],root=add(srcRoot,offset),step=i?stride:-stride,lift=moving?Math.max(0,Math.cos(phase+(i?0:Math.PI)))*m.h*.008:0,end=p(srcEnd.x+step+seated*m.h*.12,srcEnd.y-lift-seated*m.h*.025),upper=length(srcRoot,srcKnee),shinLength=length(srcKnee,srcEnd),chairKnee=p(srcRoot.x+upper,srcRoot.y+seatDrop),leg=chair&&seated?{root,joint:p(lerp(srcKnee.x,chairKnee.x,seated),lerp(srcKnee.y+bob,chairKnee.y+bob,seated)),end:p(lerp(srcEnd.x,chairKnee.x,seated),lerp(srcEnd.y+bob,chairKnee.y+shinLength+bob,seated))}:solve(root,end,upper,shinLength,srcRoot,srcKnee,srcEnd);legs.push(leg);bones.push({kind:'leg',side:i,from:srcRoot,to:srcKnee,transform:matrix(srcRoot,srcKnee,leg.root,leg.joint)},{kind:'leg',side:i,from:srcKnee,to:srcEnd,transform:matrix(srcKnee,srcEnd,leg.joint,leg.end)});
 const shoulder=m.shoulders[i],elbow=m.elbows[i],wrist=m.wrists[i],armRoot=add(shoulder,offset),swing=moving?Math.sin(phase+(i?Math.PI:0))*.055:0,raised=['celebrate','farewell','surprise'].includes(reaction)?(i?-1:1)*.65:0,angle=Math.atan2(elbow.y-shoulder.y,elbow.x-shoulder.x)+swing+raised,joint=rotate(armRoot,angle,length(shoulder,elbow)),lower=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x)+swing*.65+(['clap','angry'].includes(reaction)?(i?.35:-.35):0),armEnd=rotate(joint,lower,length(elbow,wrist)),arm={root:armRoot,joint,end:armEnd};arms.push(arm);bones.push({kind:'arm',side:i,from:shoulder,to:elbow,transform:matrix(shoulder,elbow,armRoot,joint)},{kind:'arm',side:i,from:elbow,to:wrist,transform:matrix(elbow,wrist,joint,armEnd)});
 }return {body,bones,legs,arms,seated};
}
function distance(v,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((v.x-a.x)*dx+(v.y-a.y)*dy)/(dx*dx+dy*dy));return Math.hypot(v.x-a.x-dx*t,v.y-a.y-dy*t);}
function skin(v,m,pose){
 const base=apply(v,pose.body),t=clamp((v.y-m.shoulderY)/(m.hipY-m.shoulderY)),left=lerp(m.shoulders[0].x,m.hips[0].x,t)-m.w*.06,right=lerp(m.shoulders[1].x,m.hips[1].x,t)+m.w*.06;
 let kind='';if(v.y>m.shoulderY&&v.y<Math.max(...m.wrists.map(q=>q.y))+m.h*.13&&(v.x<left||v.x>right))kind='arm';else if(v.y>m.hipY-m.h*.008)kind='leg';if(!kind)return base;
 const centerAt=side=>{const roots=kind==='leg'?m.hips:m.shoulders,joints=kind==='leg'?m.knees:m.elbows,ends=kind==='leg'?m.ankles:m.wrists;const a=v.y<joints[side].y?roots[side]:joints[side],b=v.y<joints[side].y?joints[side]:ends[side];return lerp(a.x,b.x,clamp((v.y-a.y)/(b.y-a.y)));};
 const middle=(centerAt(0)+centerAt(1))/2,blend=clamp((v.x-middle+m.w*.015)/(m.w*.03)),point=side=>{const chain=pose.bones.filter(b=>b.kind===kind&&b.side===side),joint=chain[0].to,j=clamp((v.y-joint.y+m.h*.018)/(m.h*.036)),a=apply(v,chain[0].transform),b=apply(v,chain[1].transform);return p(lerp(a.x,b.x,j),lerp(a.y,b.y,j));},a=point(0),b=point(1),weight=kind==='leg'?clamp((v.y-m.hipY+m.h*.008)/(m.h*.035)):clamp((v.y-m.shoulderY)/(m.h*.04));
 return p(lerp(base.x,lerp(a.x,b.x,blend),weight),lerp(base.y,lerp(a.y,b.y,blend),weight));
}

function triangle(ctx,image,a,b,c,x,y,z,offset={x:0,y:0}){const den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(den)<.0001)return;const A=((y.x-x.x)*(c.y-a.y)-(z.x-x.x)*(b.y-a.y))/den,C=((z.x-x.x)*(b.x-a.x)-(y.x-x.x)*(c.x-a.x))/den,B=((y.y-x.y)*(c.y-a.y)-(z.y-x.y)*(b.y-a.y))/den,D=((z.y-x.y)*(b.x-a.x)-(y.y-x.y)*(c.x-a.x))/den;if(Math.abs(A*D-B*C)<.01)return;ctx.save();ctx.beginPath();const center=p((x.x+y.x+z.x)/3,(x.y+y.y+z.y)/3);for(const [i,q]of [x,y,z].entries()){const d=length(center,q)||1,ex=q.x+(q.x-center.x)/d*2.0,ey=q.y+(q.y-center.y)/d*2.0;i?ctx.lineTo(ex,ey):ctx.moveTo(ex,ey);}ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,x.x-A*a.x-C*a.y,x.y-B*a.x-D*a.y);ctx.drawImage(image,offset.x,offset.y);ctx.restore();}
function drawContinuousSkin(ctx,image,m,pose){
 const columns=24,rows=64,source=[],target=[];
 for(let j=0;j<=rows;j++){const a=[],b=[];for(let i=0;i<=columns;i++){const v=p(i*m.w/columns,j*m.h/rows);a.push(v);b.push(skin(v,m,pose));}source.push(a);target.push(b);}
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){triangle(ctx,image,source[j][i],source[j][i+1],source[j+1][i],target[j][i],target[j][i+1],target[j+1][i]);triangle(ctx,image,source[j][i+1],source[j+1][i+1],source[j+1][i],target[j][i+1],target[j+1][i+1],target[j+1][i]);}
}
export function drawCastRig(ctx,image,{id,x=0,y=0,height=200,phase=0,moving=false,seated=0,reaction='',time=0,bones=false,staticPose=false,skeleton=null,chair=false}={}){
 const m=skeleton||castSkeleton(id,image.width,image.height),scale=height/(m.ground-m.top),pose=castPose(m,{phase,moving,seated,reaction,time,chair});ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.translate(-m.center,-m.ground);
 if(staticPose||!moving&&!seated&&!reaction&&!time)ctx.drawImage(image,0,0);else if(!moving&&!seated&&!reaction){ctx.translate(0,pose.body.f);ctx.drawImage(image,0,0);}else drawContinuousSkin(ctx,image,m,pose);
 if(bones){ctx.strokeStyle='#71f3df';ctx.fillStyle='#ffad42';ctx.lineWidth=m.h/350;for(const limb of [...pose.legs,...pose.arms]){ctx.beginPath();ctx.moveTo(limb.root.x,limb.root.y);ctx.lineTo(limb.joint.x,limb.joint.y);ctx.lineTo(limb.end.x,limb.end.y);ctx.stroke();for(const v of [limb.root,limb.joint,limb.end]){ctx.beginPath();ctx.arc(v.x,v.y,m.h/180,0,Math.PI*2);ctx.fill();}}}ctx.restore();return m;
}
