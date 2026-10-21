import {sampleDaniPose,solveLimb} from './dani-rig.mjs';
const v=(x,y)=>({x,y}),len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Joints are measured on each supplied model, never stretched onto Dani's body.
export const MODELS={
 bayron:{width:410,ground:741,top:16,center:235,hipY:456,shoulderY:275,headBottom:252,head:[112,8,247,246],torso:'M172 247 Q211 230 244 239 L288 263 L310 315 L291 346 L296 454 Q239 471 171 453 L177 341 L146 331 L161 277 Z',hips:[v(198,455),v(265,455)],knees:[v(188,572),v(285,574)],ankles:[v(177,704),v(287,704)],shoulders:[v(170,276),v(288,279)],elbows:[v(160,392),v(314,398)],wrists:[v(155,476),v(320,478)],skin:'#f8ab89',pants:'#4d6269',upperWidths:[28,29],lowerWidths:[29,30],armWidths:[14,16],sleeves:true,
  feet:[[119,686,104,58],[249,687,106,56]],hands:[[124,462,57,70],[294,464,58,68]],mouth:{x:210,y:171,rx:19,ry:6},worldHeight:185,headMask:'M100 0 H370 V218 H257 V254 H210 V218 H100 Z'},
 felix:{width:765,ground:1012,top:14,center:396,hipY:568,shoulderY:343,headBottom:309,head:[268,8,264,304],torso:'M356 277 L426 275 L433 299 L480 311 L530 330 L502 376 L472 411 L458 509 L427 530 L374 513 L351 528 L306 511 L288 412 L258 333 L317 309 L354 299 Z',hips:[v(351,568),v(430,568)],knees:[v(332,718),v(461,727)],ankles:[v(343,875),v(467,878)],shoulders:[v(286,345),v(497,349)],elbows:[v(266,505),v(512,507)],wrists:[v(263,621),v(518,621)],skin:'#efa24f',pants:'#96949e',upperWidths:[31,34],lowerWidths:[26,29],armWidths:[23,24],glitter:true,
  feet:[[247,833,134,179],[438,834,135,179]],hands:[[219,604,81,87],[477,606,81,84]],mouth:{x:365,y:212,rx:30,ry:7},worldHeight:214,headMask:'M250 0 H550 V274 H435 V312 H357 V274 H250 Z'},
 andromeda:{width:572,ground:1000,top:43,center:294,hipY:547,shoulderY:348,headBottom:322,head:[148,37,312,322],torso:'M235 300 Q272 322 329 310 L350 345 L367 375 L377 435 L409 531 L172 533 L186 467 L177 410 L184 376 L208 333 Z',hips:[v(233,546),v(348,546)],knees:[v(257,725),v(342,728)],ankles:[v(263,926),v(351,927)],shoulders:[v(204,348),v(384,350)],elbows:[v(166,492),v(421,488)],wrists:[v(151,619),v(432,621)],skin:'#f0b778',pants:'#292c34',upperWidths:[64,65],lowerWidths:[35,38],armWidths:[27,29],capri:true,
  feet:[[179,906,126,94],[319,905,90,96]],hands:[[105,600,83,88],[407,602,82,83]],mouth:{x:277,y:215,rx:21,ry:8},worldHeight:202,headMask:'M148 37 H460 V307 H415 L414 319 L439 348 L419 355 L403 326 L366 307 H220 L212 339 L184 359 L155 359 L163 308 H148 Z'},
 isabel:{width:641,ground:999,top:47,center:324,hipY:610,shoulderY:339,head:[160,42,348,293],
  torso:'M280 310 L349 310 L363 329 L405 341 L382 405 L370 484 L399 522 L244 522 L273 483 L264 411 L243 342 Z',
  hips:[v(285,608),v(360,608)],knees:[v(283,739),v(366,741)],ankles:[v(284,874),v(366,874)],shoulders:[v(245,344),v(405,344)],elbows:[v(230,462),v(425,462)],wrists:[v(211,606),v(443,606)],skin:'#eec291',pants:'#33363a',upperWidths:[27,29],lowerWidths:[23,25],armWidths:[18,19],handScale:1.06,
  sleeve:{from:.48,color:'#37393b',stripe:'#121517',spacing:37},stockings:{stripe:'#111516',spacing:42},
  skirt:'M271 487 L370 487 L400 529 L431 637 Q327 682 207 635 L243 533 Z',
  backHair:'M208 279 L242 293 L235 366 L237 435 L256 477 Q210 478 176 438 L204 441 L183 410 Q214 403 209 358 Z M393 269 L429 265 L456 365 L471 413 L500 410 L474 438 L497 444 Q452 477 408 470 L411 386 Z',
  feet:[[221,811,107,190],[326,811,109,190]],mouth:{x:313,y:244,rx:30,ry:10},worldHeight:201,
  headMask:'M155 35 H512 V312 L382 321 L353 309 L349 333 H283 V310 H155 Z'},
 peggy:{width:462,ground:751,top:21,center:264,hipY:379,shoulderY:253,head:[151,15,224,266],
  torso:'M230 207 L281 198 L284 222 L303 242 L302 282 L284 332 L298 351 L266 368 L215 350 L224 319 L206 283 L200 247 L226 228 Z',
  hips:[v(234,380),v(284,380)],knees:[v(237,529),v(285,529)],ankles:[v(236,701),v(286,701)],shoulders:[v(201,257),v(307,257)],elbows:[v(184,348),v(331,348)],wrists:[v(175,432),v(344,432)],skin:'#7a3c1f',pants:'#e5e5e2',upperWidths:[23,24],lowerWidths:[15,16],armWidths:[14,15],handScale:.73,
  gown:{waist:350,hem:736,path:'M216 345 L296 345 Q330 384 317 477 Q326 633 407 730 Q344 744 283 728 Q224 744 161 730 Q210 665 207 481 Q195 393 216 345 Z'},
  backHair:'M163 174 L201 170 L214 219 L204 258 L193 280 L158 272 L168 249 L150 240 L163 225 L153 208 Z M298 171 L355 170 L365 205 L352 221 L307 224 Z',
  feet:[[202,692,64,59],[266,695,45,57]],mouth:{x:243,y:156,rx:15,ry:5},worldHeight:214,
  headMask:'M149 10 H378 V185 Q368 218 333 230 L312 224 L291 209 L281 200 L284 222 L296 235 L230 245 L228 215 L209 235 L199 269 Q175 287 149 270 Z'},
 eris:{width:462,ground:742,top:27,center:237,hipY:438,shoulderY:239,head:[170,22,145,183],
  torso:'M216 185 L260 184 L268 204 L292 216 L306 245 L291 335 L302 436 L173 440 L182 331 L170 247 L194 218 L213 205 Z',
  hips:[v(213,440),v(269,440)],knees:[v(222,577),v(279,577)],ankles:[v(220,698),v(280,699)],shoulders:[v(178,243),v(301,243)],elbows:[v(151,335),v(322,335)],wrists:[v(151,433),v(323,433)],skin:'#79532e',pants:'#182a36',upperWidths:[22,23],lowerWidths:[19,20],armWidths:[22,23],handScale:.75,
  sleeve:{from:0,color:'#30211d',stripe:'#675047',spacing:9,longitudinal:true,cuff:'#c76b5e'},
  feet:[[134,689,108,54],[251,688,106,55]],mouth:{x:224,y:157,rx:17,ry:5},worldHeight:207,headMask:'M168 20 H318 V182 H265 V208 H215 V188 H168 Z'},
 ximena:{width:462,ground:744,top:35,center:259,hipY:365,shoulderY:233,head:[165,29,215,240],
  torso:'M246 177 L290 173 L293 201 L318 199 L327 225 L313 254 L313 309 L326 342 L302 356 L220 357 L184 345 L212 313 L211 269 L189 257 L199 233 L238 212 Z',
  hips:[v(225,366),v(289,366)],knees:[v(230,530),v(291,530)],ankles:[v(240,703),v(292,703)],shoulders:[v(198,243),v(324,236)],elbows:[v(182,345),v(345,339)],wrists:[v(176,431),v(349,429)],skin:'#c97c50',pants:'#4f7889',upperWidths:[37,38],lowerWidths:[27,28],armWidths:[17,18],capri:true,capriLength:.55,handScale:.77,
  backHair:'M174 164 L211 159 L238 193 L221 234 L207 256 L171 256 L181 238 L171 223 Z M305 164 L350 174 L353 229 L377 224 Q378 269 338 270 L322 244 Z',
  feet:[[186,694,70,51],[258,693,57,52]],mouth:{x:256,y:148,rx:16,ry:5},worldHeight:205,headMask:'M163 28 H374 V200 L319 207 L293 201 L290 224 L239 230 L245 193 H211 L205 257 H163 Z'},
 vita:{width:462,ground:748,top:21,center:255,hipY:433,shoulderY:238,head:[166,15,180,189],
  torso:'M229 184 L276 182 L281 201 L311 208 L344 231 L317 269 L316 345 L329 426 L279 441 L197 432 L185 415 L191 315 L171 248 L190 212 L226 202 Z',
  hips:[v(221,435),v(280,435)],knees:[v(225,576),v(284,576)],ankles:[v(220,703),v(287,703)],shoulders:[v(189,246),v(322,245)],elbows:[v(173,341),v(332,341)],wrists:[v(179,429),v(324,429)],skin:'#e99561',pants:'#393e4b',upperWidths:[26,27],lowerWidths:[22,23],armWidths:[28,29],handScale:.83,
  sleeve:{from:0,color:'#252d30',cuff:'#161d20'},
  feet:[[165,698,85,51],[258,697,94,52]],mouth:{x:244,y:148,rx:17,ry:6},worldHeight:208,headMask:'M163 13 H348 V183 H282 V208 H229 V184 H163 Z'},
 inaella:{width:324,ground:741,top:37,center:168,hipY:374,shoulderY:238,head:[56,30,225,239],
  torso:'M132 190 L187 182 L204 203 L225 228 L230 270 L219 320 L213 351 L230 402 L199 421 L137 421 L104 404 L112 349 L111 285 L102 247 L115 220 Z',
  hips:[v(136,374),v(198,374)],knees:[v(145,533),v(186,533)],ankles:[v(145,682),v(186,682)],shoulders:[v(99,239),v(239,239)],elbows:[v(71,328),v(264,328)],wrists:[v(75,415),v(254,415)],skin:'#d7a16c',pants:'#202223',upperWidths:[30,31],lowerWidths:[18,19],armWidths:[23,25],handScale:.75,
  sleeve:{from:0,color:'#eaa1bd',fur:'#b56888',cuff:'#d894b3'},
  backHair:'M72 137 L112 161 L113 220 L106 258 L79 271 L57 254 L66 218 L57 204 Z M211 121 L251 129 L263 176 L279 210 L269 239 L251 251 L229 227 Z',
  feet:[[103,670,65,73],[169,670,70,73]],mouth:{x:156,y:158,rx:16,ry:5},worldHeight:203,headMask:'M54 28 H282 V188 L263 220 L239 230 L215 213 L192 190 V218 H139 V204 L116 225 L109 254 L87 257 L71 241 L64 218 L54 213 Z'},
 daelly:{width:441,ground:750,top:17,center:225,hipY:433,shoulderY:280,head:[90,12,277,280],
  torso:'M200 220 L264 215 L285 241 L307 260 L309 312 L296 373 L311 439 L264 455 L188 455 L132 440 L144 376 L151 313 L143 270 L169 247 L194 238 Z',
  hips:[v(192,433),v(263,433)],knees:[v(216,563),v(268,563)],ankles:[v(211,695),v(265,695)],shoulders:[v(148,278),v(310,278)],elbows:[v(123,365),v(333,365)],wrists:[v(121,445),v(325,445)],skin:'#bd8259',pants:'#38505c',upperWidths:[37,39],lowerWidths:[24,25],armWidths:[25,26],handScale:.77,
  sleeve:{from:0,color:'#f7f4e9',cuff:'#e6b3c8',bows:true},
  backHair:'M110 166 L148 177 L144 206 L131 245 L138 274 L113 287 L101 257 L97 221 Z M294 161 L324 151 L347 202 L350 263 L368 266 L351 287 L333 293 L321 251 Z',
  feet:[[158,681,76,70],[235,681,71,70]],mouth:{x:198,y:178,rx:16,ry:6},worldHeight:198,headMask:'M88 10 H368 V199 L339 223 L325 239 L303 233 L283 210 L266 214 L264 245 H201 V224 L177 212 L160 243 L133 239 L107 255 L88 244 Z'},
 coronel:{width:444,ground:740,top:22,center:255,hipY:450,shoulderY:251,head:[153,16,185,213],
  torso:'M235 199 L284 179 L308 201 L344 225 L350 282 L315 326 L302 437 L270 456 L253 443 L216 458 L202 438 L211 329 L181 291 L172 247 L200 223 L225 218 Z',
  hips:[v(230,450),v(286,450)],knees:[v(229,581),v(289,581)],ankles:[v(228,706),v(290,706)],shoulders:[v(181,250),v(344,250)],elbows:[v(166,353),v(355,353)],wrists:[v(167,455),v(343,455)],skin:'#f1c990',pants:'#656e48',upperWidths:[27,28],lowerWidths:[27,28],armWidths:[23,24],handScale:.85,cargo:'#535f40',
  sleeve:{from:0,to:.45,color:'#f8f9e9',cuff:'#e3e8d4'},pelvis:'M218 435 L293 434 L303 491 L209 491 Z',
  feet:[[149,697,106,45],[255,697,107,45]],mouth:{x:240,y:164,rx:17,ry:4},worldHeight:218,headMask:'M150 14 H341 V197 H287 V230 H238 V205 H150 Z'},
 julian:{width:447,ground:740,top:25,center:261,hipY:436,shoulderY:251,head:[184,20,151,211],
  torso:'M241 196 L293 194 L300 212 L338 230 L352 276 L315 305 L301 336 L300 431 L221 431 L220 337 L199 307 L176 290 L177 252 L198 229 L234 212 Z',
  hips:[v(239,438),v(282,438)],knees:[v(240,565),v(281,565)],ankles:[v(245,689),v(280,689)],shoulders:[v(188,250),v(341,250)],elbows:[v(171,353),v(351,353)],wrists:[v(177,455),v(350,455)],skin:'#cf8d55',pants:'#333f53',upperWidths:[24,25],lowerWidths:[17,18],armWidths:[22,23],handScale:.85,shorts:.82,
  sleeve:{from:0,to:.55,color:'#fafafa'},
  feet:[[162,678,94,63],[257,678,95,63]],mouth:{x:246,y:151,rx:17,ry:4},worldHeight:208,headMask:'M181 17 H338 V198 H300 V230 H239 V207 H181 Z'},
 alexandro:{width:424,ground:741,top:17,center:250,hipY:451,shoulderY:249,head:[163,11,166,213],
  torso:'M221 195 L272 192 L279 210 L309 222 L333 243 L312 324 L314 434 L292 451 L198 452 L185 433 L188 323 L169 254 L178 230 L217 211 Z',
  hips:[v(222,451),v(279,451)],knees:[v(226,585),v(281,585)],ankles:[v(224,706),v(284,706)],shoulders:[v(179,248),v(325,248)],elbows:[v(160,340),v(338,340)],wrists:[v(166,442),v(332,442)],skin:'#ecb96b',pants:'#3c5e6c',upperWidths:[25,26],lowerWidths:[24,25],armWidths:[24,25],handScale:.8,cargo:'#2e4b57',
  sleeve:{from:0,color:'#981d2d',cuff:'#711e2b'},pelvis:'M198 434 H303 L301 492 H201 Z',
  feet:[[151,698,100,45],[252,698,103,45]],mouth:{x:232,y:152,rx:17,ry:4},worldHeight:210,headMask:'M160 9 H331 V197 H277 V225 H222 V208 H160 Z'},
 catalina:{width:424,ground:745,top:31,center:254,hipY:447,shoulderY:252,head:[132,25,252,237],
  torso:'M224 218 L279 215 L302 237 L312 274 L296 329 L301 367 L320 409 L294 434 L221 434 L191 406 L206 367 L216 325 L204 280 L205 246 Z',
  hips:[v(216,447),v(281,447)],knees:[v(232,574),v(282,574)],ankles:[v(246,690),v(282,690)],shoulders:[v(191,251),v(326,251)],elbows:[v(177,360),v(339,360)],wrists:[v(168,434),v(340,434)],skin:'#f4cc91',pants:['#bc283b','#3857aa'],upperWidths:[23,25],lowerWidths:[16,18],armWidths:[13,14],handScale:.77,handColors:['#b82b40','#395aac'],
  puff:{colors:['#3c5cae','#c83b46'],contrast:['#c73d49','#3d5caf'],cuff:'#ead18b'},
  skirt:'M207 368 Q224 410 252 424 L292 369 L313 388 Q340 434 321 474 L280 489 L207 483 L171 463 Q159 428 179 400 Z',
  backHair:'M162 155 L202 166 L212 216 L192 241 L156 257 L150 240 L158 211 Z M296 133 L341 145 L351 209 L368 238 L348 262 L319 238 L305 202 Z',
  feet:[[169,665,89,81],[259,665,85,81]],mouth:{x:236,y:180,rx:18,ry:5},worldHeight:204,headMask:'M130 22 H386 V210 L361 243 L331 236 L309 218 L279 212 V238 H224 V226 L201 223 L181 247 L148 247 Z'},
 luciano:{width:441,ground:740,top:19,center:237,hipY:454,shoulderY:249,head:[141,13,174,217],
  torso:'M211 193 L272 187 L283 214 L320 231 L325 266 L288 337 L289 448 L244 464 L198 465 L173 445 L181 335 L151 275 L159 239 L192 217 L208 207 Z',
  hips:[v(209,454),v(264,454)],knees:[v(216,587),v(274,587)],ankles:[v(213,705),v(280,705)],shoulders:[v(165,249),v(312,249)],elbows:[v(148,347),v(329,347)],wrists:[v(147,444),v(321,444)],skin:'#eac797',pants:'#4b6069',upperWidths:[24,25],lowerWidths:[24,25],armWidths:[22,23],handScale:.82,
  sleeve:{from:0,color:'#263c3b',pattern:'floral',cuff:'#213c3e'},
  feet:[[123,698,113,43],[237,698,108,43]],mouth:{x:227,y:161,rx:17,ry:4},worldHeight:209,headMask:'M139 10 H317 V197 H276 V232 H208 V207 H139 Z'}
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
