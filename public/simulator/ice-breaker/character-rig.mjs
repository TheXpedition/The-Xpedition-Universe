import {sampleDaniPose,solveLimb} from './dani-rig.mjs';
const v=(x,y)=>({x,y}),len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Joints are measured on each supplied model, never stretched onto Dani's body.
export const MODELS={
 bayron:{width:410,ground:741,top:16,center:235,hipY:456,shoulderY:275,headBottom:252,head:[112,8,247,246],torso:'M172 247 Q211 230 244 239 L288 263 L310 315 L291 346 L296 454 Q239 471 171 453 L177 341 L146 331 L161 277 Z',hips:[v(198,455),v(265,455)],knees:[v(188,572),v(285,574)],ankles:[v(177,704),v(287,704)],shoulders:[v(170,276),v(288,279)],elbows:[v(160,392),v(314,398)],wrists:[v(155,476),v(320,478)],skin:'#f8ab89',pants:'#4d6269',upperWidths:[28,29],lowerWidths:[29,30],armWidths:[14,16],sleeves:true,
  feet:[[119,686,104,58],[249,687,106,56]],hands:[[124,462,57,70],[294,464,58,68]],mouth:{x:210,y:171,rx:19,ry:6},worldHeight:185,headMask:'M100 0 H370 V218 H257 V254 H210 V218 H100 Z'},
 felix:{width:765,ground:1012,top:14,center:396,hipY:568,shoulderY:343,headBottom:309,head:[268,8,264,304],torso:'M356 277 L426 275 L433 299 L480 311 L530 330 L502 376 L472 411 L458 509 L427 530 L374 513 L351 528 L306 511 L288 412 L258 333 L317 309 L354 299 Z',hips:[v(351,568),v(430,568)],knees:[v(332,718),v(461,727)],ankles:[v(343,875),v(467,878)],shoulders:[v(286,345),v(497,349)],elbows:[v(266,505),v(512,507)],wrists:[v(263,621),v(518,621)],skin:'#efa24f',pants:'#96949e',upperWidths:[31,34],lowerWidths:[26,29],armWidths:[23,24],glitter:true,
  feet:[[247,833,134,179],[438,834,135,179]],hands:[[219,604,81,87],[477,606,81,84]],mouth:{x:365,y:212,rx:30,ry:7},worldHeight:214,headMask:'M250 0 H550 V274 H435 V312 H357 V274 H250 Z'},
 andromeda:{width:572,ground:1000,top:43,center:294,hipY:547,shoulderY:348,headBottom:322,head:[148,37,312,322],torso:'M235 300 Q272 322 329 310 L350 345 L367 375 L377 435 L409 531 L172 533 L186 467 L177 410 L184 376 L208 333 Z',hips:[v(233,546),v(348,546)],knees:[v(257,725),v(342,728)],ankles:[v(263,926),v(351,927)],shoulders:[v(204,348),v(384,350)],elbows:[v(166,492),v(421,488)],wrists:[v(151,619),v(432,621)],skin:'#f0b778',pants:'#292c34',upperWidths:[64,65],lowerWidths:[35,38],armWidths:[27,29],capri:true,
  feet:[[179,906,126,94],[319,905,90,96]],hands:[[105,600,83,88],[407,602,82,83]],mouth:{x:277,y:215,rx:21,ry:8},worldHeight:202,headMask:'M148 37 H460 V307 H415 L414 319 L439 348 L419 355 L403 326 L366 307 H220 L212 339 L184 359 L155 359 L163 308 H148 Z'}
};
function rotatePoint(root,angle,length){return {x:root.x+Math.sin(angle)*length,y:root.y+Math.cos(angle)*length};}
export function sampleCharacterPose(id,options={}){
 if(id==='dani')return sampleDaniPose(options);const m=MODELS[id];if(!m)throw Error('Unknown character');const driver=sampleDaniPose(options),scale=(m.ground-m.top)/980,bodyX=driver.bodyX*scale,bodyY=driver.bodyY*scale,tilt=driver.tilt;
 const anchor=p=>({x:m.center+bodyX+(p.x-m.center)*Math.cos(tilt)-(p.y-m.hipY)*Math.sin(tilt),y:m.hipY+bodyY+(p.x-m.center)*Math.sin(tilt)+(p.y-m.hipY)*Math.cos(tilt)});
 const output={bodyX,bodyY,tilt};
 for(let side=0;side<2;side++){
  const near=side===1,name=near?'near':'far',src=driver[name+'Leg'],restX=near?310:220,restY=near?965:960;
  const target={x:m.ankles[side].x+(src.end.x-restX)*scale,y:m.ankles[side].y+(src.end.y-restY)*scale};
  output[name+'Leg']=solveLimb(anchor(m.hips[side]),target,len(m.hips[side],m.knees[side]),len(m.knees[side],m.ankles[side]));
  const a=driver[name+'Arm'],upper=Math.atan2(a.joint.x-a.root.x,a.joint.y-a.root.y),lower=Math.atan2(a.end.x-a.joint.x,a.end.y-a.joint.y),root=anchor(m.shoulders[side]),joint=rotatePoint(root,upper,len(m.shoulders[side],m.elbows[side]));
  output[name+'Arm']={root,joint,end:rotatePoint(joint,lower,len(m.elbows[side],m.wrists[side])),angle:lower};
 }
 return output;
}
