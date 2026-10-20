// The reference model faces left. All coordinates use its 512 × 1024 space.
// Place the feet first; solve the knees without scaling either bone.
export const RIG={upperLeg:202,lowerLeg:214,upperArm:116,lowerArm:119,cycleDistance:200*(206.04/980)/.6};
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const pointMix=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
export function solveLimb(root,target,a,b,bend=1){
 const dx=target.x-root.x,dy=target.y-root.y,raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(a-b)+.001,a+b-.001),ux=dx/(raw||1),uy=dy/(raw||1);
 const along=(a*a-b*b+d*d)/(2*d),side=Math.sqrt(Math.max(0,a*a-along*along))*bend;
 return {root:{...root},joint:{x:root.x+ux*along-uy*side,y:root.y+uy*along+ux*side},end:{x:root.x+ux*d,y:root.y+uy*d}};
}
export function walkFoot(cycle,near=false){
 const s=((cycle/TAU+(near?.5:0))%1+1)%1,base=near?288:220;
 if(s<.6)return {x:base-100+200*s/.6,y:near?965:960,contact:true};
 const u=(s-.6)/.4,u2=u*u,u3=u2*u;
 // Match horizontal speed at lift-off and contact rather than snapping a foot.
 const x=(2*u3-3*u2+1)*100+(u3-2*u2+u)*133.333+(-2*u3+3*u2)*-100+(u3-u2)*133.333;
 return {x:base+x,y:(near?965:960)-Math.pow(Math.sin(Math.PI*u),1.45)*58,contact:false};
}
function arm(root,upper,lower){
 const joint={x:root.x+Math.sin(upper)*RIG.upperArm,y:root.y+Math.cos(upper)*RIG.upperArm};
 return {root,joint,end:{x:joint.x+Math.sin(lower)*RIG.lowerArm,y:joint.y+Math.cos(lower)*RIG.lowerArm},angle:lower};
}
export function sampleDaniPose({time=0,phase='idle',phaseTime=0,stride=0,walkBlend=phase==='walk'?1:0,jumpProgress=0,takeoffBlend=0,takeoffStride=stride,reduced=false}={}){
 const walking=clamp(walkBlend),air=phase==='jump'||phase==='fall',prep=phase==='crouch',landing=phase==='land';
 let cycle=stride,bodyY=(12+9*Math.cos(stride*2))*walking,bodyX=-4*walking,tilt=-.018*walking;
 let farFoot=pointMix({x:220,y:960},walkFoot(stride),walking),nearFoot=pointMix({x:310,y:965},walkFoot(stride,true),walking);
 let farUpper=mix(-.12,.32*Math.cos(cycle),walking),farLower=mix(-.06,.32*Math.cos(cycle)-.19,walking);
 let nearUpper=mix(.94,-.32*Math.cos(cycle),walking),nearLower=mix(-.84,-.32*Math.cos(cycle)-.19,walking);
 if(prep||air){
  const fromFar=pointMix({x:220,y:960},walkFoot(takeoffStride),takeoffBlend),fromNear=pointMix({x:310,y:965},walkFoot(takeoffStride,true),takeoffBlend);
  const u=clamp(jumpProgress),lift=Math.pow(Math.sin(Math.PI*u),1.3),leave=smooth(u/.18),anticipation=prep?smooth(phaseTime/.1):1;
  farFoot=prep?fromFar:pointMix(fromFar,{x:220-62*lift,y:960-112*lift},leave);
  nearFoot=prep?fromNear:pointMix(fromNear,{x:310+34*lift,y:965-88*lift},leave);
  bodyY=prep?mix((12+9*Math.cos(takeoffStride*2))*takeoffBlend,24,anticipation):24*(1-smooth(u/.12));bodyX=prep?-4*takeoffBlend*(1-anticipation):-5*lift;tilt=prep?-.018*takeoffBlend*(1-anticipation):-.035*lift;
  const startFU=mix(-.12,.32*Math.cos(takeoffStride),takeoffBlend),startFL=mix(-.06,.32*Math.cos(takeoffStride)-.19,takeoffBlend);
  const startNU=mix(.94,-.32*Math.cos(takeoffStride),takeoffBlend),startNL=mix(-.84,-.32*Math.cos(takeoffStride)-.19,takeoffBlend);
  const blend=prep?anticipation*.15:.15+.85*leave;
  farUpper=mix(startFU,-.12+.62*lift,blend);farLower=mix(startFL,-.06-.38*lift,blend);
  nearUpper=mix(startNU,.94-1.95*lift,blend);nearLower=mix(startNL,-.84-.68*lift,blend);
 }
 if(landing)bodyY=24*Math.sin(Math.PI*smooth(phaseTime/.18));
 if(!walking&&!air&&!prep&&!landing&&!reduced)bodyY=Math.sin(time*2.1)*1.2;
 const anchor=(x,y)=>({x:260+bodyX+(x-260)*Math.cos(tilt)-(y-550)*Math.sin(tilt),y:550+bodyY+(x-260)*Math.sin(tilt)+(y-550)*Math.cos(tilt)});
 return {bodyX,bodyY,tilt,farLeg:solveLimb(anchor(226,549),farFoot,RIG.upperLeg,RIG.lowerLeg),nearLeg:solveLimb(anchor(285,550),nearFoot,RIG.upperLeg,RIG.lowerLeg),farArm:arm(anchor(196,345),farUpper-tilt,farLower-tilt),nearArm:arm(anchor(319,346),nearUpper-tilt,nearLower-tilt)};
}
