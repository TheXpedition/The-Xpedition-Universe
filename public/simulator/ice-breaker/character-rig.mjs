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
  feet:[[123,698,113,43],[237,698,108,43]],mouth:{x:227,y:161,rx:17,ry:4},worldHeight:209,headMask:'M139 10 H317 V197 H276 V232 H208 V207 H139 Z'},
 ignacio:{width:501,ground:742,top:17,center:267,hipY:565,shoulderY:293,head:[108,10,306,337],portrait:[141,49,235,234],
  torso:'M185 240 L304 240 Q362 248 391 303 L381 395 Q416 476 385 534 L374 568 Q287 592 149 565 L131 510 Q101 447 127 350 L137 290 Z',
  hips:[v(202,565),v(337,565)],knees:[v(207,635),v(335,635)],ankles:[v(204,703),v(335,703)],shoulders:[v(139,293),v(397,293)],elbows:[v(94,389),v(437,389)],wrists:[v(98,492),v(419,492)],skin:'#efa454',pants:'#f5f5f1',upperWidths:[47,49],lowerWidths:[35,37],armWidths:[37,40],handScale:1.08,footMotion:.48,bodyMotion:.72,
  sleeve:{from:0,color:'#fafaf6',cuff:'#e6e8e3'},pelvis:'M145 531 Q257 564 379 530 L380 590 L340 604 H194 L151 590 Z',
  backHair:'M166 191 L205 217 L209 281 L198 316 L174 329 L161 296 Z M321 188 L366 183 L379 264 L368 319 L337 349 L321 327 L329 295 Z',
  feet:[[117,679,126,66],[288,679,126,66]],mouth:{x:239,y:199,rx:20,ry:4},worldHeight:204,headMask:'M106 8 H416 V245 L375 250 L364 318 L335 349 L319 338 L324 310 L302 296 H217 L199 329 L173 331 L160 308 L157 263 H106 Z'},
 lalamila:{width:383,ground:736,top:41,center:183,hipY:375,shoulderY:266,head:[90,33,211,285],
  torso:'M145 211 L194 202 L207 225 L238 232 L250 259 L248 291 L223 318 L210 342 L234 363 L142 365 L124 371 L144 341 L147 292 L126 275 L125 247 Z',
  hips:[v(151,376),v(214,376)],knees:[v(158,548),v(216,548)],ankles:[v(164,663),v(211,663)],shoulders:[v(127,267),v(253,267)],elbows:[v(110,351),v(265,351)],wrists:[v(105,435),v(266,435)],skin:'#e9ac70',pants:'#5a542b',upperWidths:[26,28],lowerWidths:[17,18],armWidths:[16,17],handScale:.76,shorts:.80,cargo:'#47441f',
  sleeve:{from:0,to:.40,color:'#b58b40',cuff:'#9d7832'},pelvis:'M133 359 H231 L245 425 H125 Z',
  backHair:'M103 184 L139 201 L135 262 L141 303 L119 321 L101 287 L93 247 Z M222 148 L269 153 L289 227 L287 259 L300 273 L282 283 L258 274 L237 239 Z',
  feet:[[109,650,85,87],[192,650,80,87]],mouth:{x:159,y:166,rx:17,ry:5},worldHeight:200,headMask:'M88 30 H304 V278 L285 285 L260 273 L232 226 L204 210 L205 236 H146 L147 217 L132 256 L139 304 L119 321 L101 287 L88 271 Z'},
 lucasmendez:{width:431,ground:742,top:24,center:205,hipY:391,shoulderY:247,head:[129,19,155,226],
  torso:'M154 209 L183 225 L231 221 L255 204 L278 221 L274 275 L260 322 L264 372 L223 388 L148 377 L145 323 L134 277 L135 230 Z',
  hips:[v(173,391),v(234,391)],knees:[v(181,548),v(247,548)],ankles:[v(180,667),v(250,667)],shoulders:[v(142,245),v(274,245)],elbows:[v(128,333),v(290,333)],wrists:[v(128,422),v(284,422)],skin:'#eea97d',pants:'#292e2d',upperWidths:[26,28],lowerWidths:[25,27],armWidths:[18,19],handScale:.73,cargo:'#232827',
  sleeve:{from:0,color:'#252722',folds:'#47483c',cuff:'#171c19'},
  feet:[[112,643,95,100],[220,643,84,100]],mouth:{x:179,y:153,rx:13,ry:4},worldHeight:209,headMask:'M127 17 H286 V228 L264 239 L232 231 L201 242 L159 226 L136 206 Z'},
 cocomong:{width:336,ground:457,top:15,center:160,hipY:387,shoulderY:286,head:[21,9,282,253],portrait:[63,73,196,187],
  torso:'M115 247 L181 248 L201 269 L215 284 L219 307 L196 315 L204 384 L180 394 L151 385 L111 385 L105 316 L84 303 L99 270 Z',
  hips:[v(130,387),v(186,387)],knees:[v(131,424),v(190,424)],ankles:[v(128,440),v(190,440)],shoulders:[v(111,286),v(202,286)],elbows:[v(102,321),v(219,321)],wrists:[v(95,347),v(225,347)],skin:'#49331b',pants:'#a9ced1',upperWidths:[20,22],lowerWidths:[8,9],armWidths:[8,9],handScale:.35,shorts:.94,legPattern:'palms',footMotion:.33,bodyMotion:.45,
  sleeve:{from:0,to:.55,color:'#a9ced1',pattern:'palms'},pelvis:'M110 365 L204 366 L205 422 H167 L150 388 L144 422 H108 Z',
  feet:[[99,430,51,28],[165,430,52,28]],mouth:null,worldHeight:142,headMask:'M18 7 H309 V162 L244 164 L239 228 L215 253 L187 260 H116 L77 233 L65 202 L68 172 L21 168 Z'},
 bryan:{width:381,ground:745,top:23,center:181,hipY:462,shoulderY:254,head:[106,16,150,211],
  torso:'M147 186 L215 183 L224 208 L250 225 L250 310 L235 445 L209 465 L169 452 L128 463 L132 320 L114 285 L117 235 L145 210 Z',
  hips:[v(151,462),v(212,462)],knees:[v(157,596),v(216,596)],ankles:[v(152,712),v(219,712)],shoulders:[v(103,254),v(267,254)],elbows:[v(80,365),v(285,365)],wrists:[v(81,465),v(279,465)],skin:'#d09453',pants:'#425b65',upperWidths:[26,28],lowerWidths:[25,26],armWidths:[24,25],handScale:.88,
  sleeve:{from:0,to:.52,color:'#edf4e9',pattern:'plaid'},pelvis:'M131 445 H233 L239 506 H124 Z',
  feet:[[76,699,108,47],[185,699,105,47]],mouth:{x:174,y:150,rx:19,ry:5},worldHeight:216,headMask:'M104 14 H259 V185 H219 V228 H148 V203 H104 Z'},
 beto:{width:460,ground:734,top:17,center:229,hipY:412,shoulderY:242,head:[134,10,173,209],
  torso:'M191 192 L260 179 L273 201 L310 218 L326 246 L311 306 L296 391 Q236 418 145 391 L149 307 L126 288 L133 244 L162 218 L186 207 Z',
  hips:[v(195,412),v(263,412)],knees:[v(207,566),v(269,566)],ankles:[v(203,696),v(271,696)],shoulders:[v(148,242),v(323,242)],elbows:[v(126,341),v(337,341)],wrists:[v(127,452),v(332,452)],skin:'#c98f51',pants:'#c7b88e',upperWidths:[27,28],lowerWidths:[25,26],armWidths:[22,23],handScale:.9,
  sleeve:{from:0,to:.50,color:'#9dbed0',stripe:'#edf3f4',spacing:5,longitudinal:true,cuff:'#bfd4df'},
  feet:[[120,680,107,55],[235,680,100,55]],mouth:{x:222,y:155,rx:19,ry:4},worldHeight:205,headMask:'M132 8 H310 V194 H267 V220 H192 V207 H132 Z'},
 greg:{width:418,ground:748,top:26,center:242,hipY:470,shoulderY:286,head:[122,18,245,271],
  torso:'M178 229 L222 240 L263 226 L273 249 L272 273 L287 291 L273 341 L263 376 L285 405 L232 427 L202 397 L209 376 L201 333 L188 284 L191 257 Z',
  hips:[v(213,470),v(277,470)],knees:[v(218,610),v(276,610)],ankles:[v(216,684),v(271,684)],shoulders:[v(185,286),v(294,286)],elbows:[v(174,371),v(309,371)],wrists:[v(167,458),v(315,458)],skin:'#d49b63',pants:'#d49b63',upperWidths:[18,20],lowerWidths:[12,13],armWidths:[12,13],handScale:.72,
  skirt:'M209 374 L261 374 Q310 398 335 535 Q241 580 140 535 Q150 434 180 399 Z',
  feet:[[160,661,80,88],[242,661,81,88]],mouth:{x:227,y:181,rx:17,ry:4},worldHeight:202,headMask:'M120 16 H370 V283 H275 L267 252 H213 L205 280 H120 Z'},
 sallua:{width:510,ground:752,top:6,center:264,hipY:594,shoulderY:262,head:[170,0,204,229],
  torso:'M211 194 L307 193 Q375 203 401 267 L410 349 Q429 412 412 469 Q362 500 273 505 Q164 514 109 469 Q80 404 108 322 L136 255 Q164 218 211 194 Z',
  hips:[v(179,594),v(338,594)],knees:[v(197,664),v(341,664)],ankles:[v(189,725),v(350,725)],shoulders:[v(151,283),v(385,283)],elbows:[v(89,374),v(440,374)],wrists:[v(75,480),v(447,480)],skin:'#202121',pants:'#2d2821',upperWidths:[49,51],lowerWidths:[35,38],armWidths:[42,45],handScale:1.1,shorts:.38,legPattern:'triangles',footMotion:.40,bodyMotion:.65,shoulderCap:1.25,
  skirt:'M112 474 L410 452 L418 603 Q346 629 267 615 L254 590 L248 616 L102 606 Z',
  feet:[[115,709,121,45],[306,710,85,44]],mouth:{x:232,y:184,rx:20,ry:6},worldHeight:211,headMask:'M167 0 H377 V141 L351 185 L334 213 L304 229 H224 L193 208 L176 186 Z'},
 ivy:{width:514,ground:744,top:16,center:292,hipY:420,head:[210,16,166,211],mouth:{x:278,y:151,rx:16,ry:7,skin:'#e4915f',lip:'#542c37'},worldHeight:208,segmented:true,
  arms:[
   {root:[230,221],joint:[228,324],end:[218,449],mask:'M228 216 Q218 217 218 235 L221 269 L219 317 L221 371 L216 406 L201 422 Q195 433 198 441 L206 435 L201 452 Q201 460 208 454 L217 437 L213 456 Q214 464 220 456 L227 437 L231 453 Q238 458 239 445 L243 427 L237 407 L240 363 L237 314 L242 269 L240 235 Z'},
   {root:[358,373],joint:[364,410],end:[385,451],mask:'M357 369 L374 374 L372 404 Q383 412 389 431 L393 447 L388 455 L375 436 L380 454 Q380 462 374 457 L364 440 L365 458 Q360 464 357 454 L352 436 L345 421 L350 398 Z'}],
  legs:[
   {root:[252,423],joint:[276,524],end:[280,731],mask:'M231 423 L287 423 L294 467 L287 505 L301 549 L305 610 L310 674 L324 704 L314 738 L232 739 L229 729 L258 709 L270 676 L267 620 L264 566 L251 538 L239 505 L231 467 Z'},
   {root:[308,423],joint:[321,525],end:[330,735],mask:'M292 423 L345 423 L340 477 L331 514 L332 549 L343 610 L348 675 L365 709 L351 741 L308 739 L296 719 L307 684 L299 635 L288 591 L291 554 L301 528 L293 504 Z'}]},
 eduard:{width:514,ground:733,top:8,center:256,hipY:575,head:[170,8,184,223],mouth:{x:209,y:184,rx:28,ry:8,skin:'#eba572',lip:'#603b32'},worldHeight:211,segmented:true,
  arms:[
   {root:[160,251],joint:[112,341],end:[104,526],mask:'M158 246 Q141 250 131 272 L113 315 L99 365 L92 430 L95 450 L138 453 L144 420 L153 379 L165 336 L176 298 L173 260 Z M95 450 L89 474 Q78 488 83 505 L98 532 L108 539 L113 518 L121 535 L128 534 L132 515 L139 522 L145 505 L138 450 Z'},
   {root:[353,251],joint:[402,343],end:[418,525],mask:'M356 246 Q373 250 387 272 L405 315 L418 365 L422 430 L419 450 L376 453 L370 420 L361 379 L349 336 L340 298 L343 260 Z M419 450 L425 474 Q437 488 431 505 L416 532 L406 539 L401 518 L393 535 L386 534 L382 515 L376 450 Z'}],
  legs:[
   {root:[210,581],joint:[208,648],end:[188,715],mask:'M170 581 L255 581 L255 626 L244 664 L247 696 L251 711 L237 726 L131 726 L132 706 L164 692 L170 666 L163 641 Z'},
   {root:[307,581],joint:[310,648],end:[318,715],mask:'M256 581 L344 581 L349 638 L339 666 L344 693 L379 707 L379 725 L263 726 L257 711 L264 691 L258 666 L253 634 Z'}]},
 kimcamila:{width:514,ground:744,top:15,center:260,hipY:445,head:[167,13,188,202],mouth:{x:251,y:143,rx:22,ry:10,skin:'#e1aa83',lip:'#4e2027'},worldHeight:211,segmented:true,
  arms:[
   {root:[188,231],joint:[160,319],end:[137,462],mask:'M188 226 Q168 230 160 251 L151 288 L154 326 L148 373 L148 413 L136 427 L130 445 L128 459 L133 465 L140 454 L139 470 L145 466 L153 446 L164 424 L162 399 L170 355 L168 321 L186 278 L201 251 Z'},
   {root:[342,231],joint:[369,319],end:[383,462],mask:'M342 226 Q362 230 370 251 L379 288 L376 326 L382 373 L382 413 L394 427 L400 445 L402 459 L397 465 L390 454 L391 470 L385 466 L377 446 L366 424 L368 399 L360 355 L362 321 L344 278 L329 251 Z'}],
  legs:[
   {root:[219,444],joint:[236,540],end:[198,728],mask:'M182 444 L252 444 L258 485 L249 526 L258 558 L251 617 L245 677 L253 697 L243 729 L222 743 L149 735 L155 720 L181 700 L184 675 L179 620 L181 568 L173 519 Z'},
   {root:[316,444],joint:[320,542],end:[325,728],mask:'M275 444 L345 444 L354 519 L346 568 L348 620 L342 675 L346 700 L375 721 L376 736 L301 743 L282 729 L287 697 L280 677 L274 617 L274 558 L283 526 Z'}]},
 carlosharrington:{width:514,ground:735,top:12,center:257,hipY:427,head:[171,10,173,207],mouth:{x:218,y:154,rx:24,ry:5,skin:'#f5dcbe',lip:'#201d1d'},worldHeight:208,segmented:true,
  arms:[
   {root:[176,231],joint:[154,324],end:[132,486],mask:'M178 226 Q160 230 156 249 L149 280 L143 320 L149 374 L149 435 L137 448 L126 468 L125 482 L131 490 L141 477 L143 492 L150 487 L157 471 L165 456 L164 434 L164 390 L169 347 L179 298 L188 253 Z'},
   {root:[341,231],joint:[363,324],end:[385,486],mask:'M339 226 Q357 230 361 249 L368 280 L374 320 L368 374 L368 435 L380 448 L391 468 L392 482 L386 490 L376 477 L374 492 L367 487 L360 471 L352 456 L353 434 L353 390 L348 347 L338 298 L329 253 Z'}],
  legs:[
   {root:[215,435],joint:[216,555],end:[210,727],mask:'M190 435 L263 435 L262 487 L251 532 L250 581 L239 622 L239 673 L247 698 L237 724 L146 741 L141 731 L175 709 L187 681 L187 626 L190 579 L184 531 Z'},
   {root:[294,435],joint:[292,555],end:[309,727],mask:'M266 435 L321 435 L320 531 L315 579 L315 626 L317 681 L338 710 L374 731 L369 742 L278 741 L269 723 L275 698 L269 673 L269 622 L258 581 L257 532 Z'}]},
 nahuee:{width:514,ground:744,top:8,center:257,hipY:428,head:[159,5,200,244],mouth:{x:261,y:154,rx:39,ry:11,skin:'#965b21',lip:'#2f1712'},worldHeight:209,segmented:true,
  arms:[
   {root:[142,270],joint:[120,348],end:[77,487],mask:'M143 264 Q124 267 120 287 L107 322 L101 362 L102 416 L98 440 L80 452 L64 469 L61 484 L68 498 L78 485 L75 502 L82 506 L97 485 L111 464 L108 438 L113 395 L111 357 L129 310 L154 280 Z'},
   {root:[371,270],joint:[394,348],end:[439,487],mask:'M370 264 Q389 267 393 287 L406 322 L412 362 L411 416 L415 440 L433 452 L449 469 L452 484 L445 498 L435 485 L438 502 L431 506 L416 485 L402 464 L405 438 L400 395 L402 357 L384 310 L359 280 Z'}],
  legs:[
   {root:[187,410],joint:[192,578],end:[203,711],mask:'M123 410 Q178 416 242 410 L258 472 L238 537 L243 593 L231 641 L231 691 L271 705 L272 729 L157 733 L153 710 L163 683 L157 619 L145 552 L129 482 Z'},
   {root:[326,410],joint:[320,578],end:[319,711],mask:'M242 410 Q314 416 387 410 L381 482 L359 553 L345 619 L338 683 L349 710 L344 732 L272 729 L271 705 L303 691 L303 641 L292 593 L288 537 L258 472 Z'}]},
 pier:{width:514,ground:744,top:17,center:257,hipY:468,head:[146,14,180,207],mouth:{x:226,y:156,rx:18,ry:5,skin:'#815c41',lip:'#211515'},worldHeight:208,segmented:true,
  arms:[
   {root:[162,229],joint:[128,344],end:[128,515],mask:'M162 222 L180 228 L170 268 L162 333 L156 400 L159 420 L130 426 L122 402 L121 347 L127 291 L139 248 Z M130 421 L157 425 L157 454 L170 479 L168 499 L157 516 L149 509 L147 490 L138 509 L131 504 L133 482 L122 472 L116 458 L120 438 Z'},
   {root:[352,229],joint:[384,344],end:[385,515],mask:'M352 222 L334 228 L344 268 L352 333 L358 400 L355 420 L384 426 L392 402 L393 347 L387 291 L375 248 Z M384 421 L357 425 L357 454 L344 479 L346 499 L357 516 L365 509 L367 490 L376 509 L383 504 L381 482 L392 472 L398 458 L394 438 Z'}],
  legs:[
   {root:[218,470],joint:[219,579],end:[213,711],mask:'M194 470 L263 470 L263 526 L256 570 L260 624 L258 677 L267 699 L254 730 L145 738 L142 725 L174 706 L188 681 L186 626 L190 577 L184 526 Z'},
   {root:[300,470],joint:[300,579],end:[310,711],mask:'M266 470 L358 470 L359 526 L351 577 L354 626 L352 681 L371 706 L365 730 L261 738 L253 725 L262 699 L260 677 L260 624 L264 570 L258 526 Z'}]},
 esteban:{width:511,ground:738,top:18,center:255,hipY:448,head:[128,16,229,208],mouth:{x:220,y:161,rx:20,ry:4,skin:'#f0954c',lip:'#171719'},worldHeight:208,segmented:true,
  arms:[
   {root:[173,240],joint:[162,339],end:[150,495],mask:'M174 235 Q157 237 153 257 L146 292 L145 337 L150 389 L150 447 L137 458 L123 478 L120 493 L127 500 L139 485 L137 504 L144 505 L157 484 L170 462 L167 440 L167 395 L169 350 L180 300 L184 258 Z'},
   {root:[342,240],joint:[353,339],end:[377,495],mask:'M341 235 Q358 237 362 257 L369 292 L370 337 L365 389 L365 447 L378 458 L392 478 L395 493 L388 500 L376 485 L378 504 L371 505 L358 484 L345 462 L348 440 L348 395 L346 350 L335 300 L331 258 Z'}],
  legs:[
   {root:[218,451],joint:[219,583],end:[215,711],mask:'M188 451 L263 451 L264 511 L253 555 L256 610 L248 667 L246 695 L262 713 L255 735 L142 737 L142 724 L186 706 L197 680 L190 622 L190 565 Z'},
   {root:[293,451],joint:[294,583],end:[301,711],mask:'M265 451 L341 451 L338 565 L337 622 L327 680 L343 706 L359 724 L356 737 L243 735 L236 713 L253 695 L250 667 L245 610 L254 555 L264 511 Z'}]},
 marcos:{width:511,ground:739,top:17,center:255,hipY:460,head:[144,17,166,206],mouth:{x:236,y:153,rx:22,ry:4,skin:'#c5a485',lip:'#161718'},worldHeight:208,segmented:true,
  arms:[
   {root:[157,239],joint:[143,339],end:[142,500],mask:'M157 234 Q140 236 139 255 L134 292 L133 339 L137 395 L137 448 L124 461 L112 483 L112 499 L120 504 L131 489 L130 506 L137 507 L150 484 L166 460 L163 439 L164 393 L168 348 L175 300 L177 258 Z'},
   {root:[350,239],joint:[365,339],end:[366,500],mask:'M349 234 Q366 236 367 255 L372 292 L373 339 L369 395 L369 448 L382 461 L394 483 L394 499 L386 504 L375 489 L376 506 L369 507 L356 484 L340 460 L343 439 L342 393 L338 348 L331 300 L329 258 Z'}],
  legs:[
   {root:[218,467],joint:[219,581],end:[218,712],mask:'M195 467 L267 467 L267 526 L258 575 L264 630 L260 685 L267 705 L250 731 L152 739 L151 725 L188 706 L196 681 L194 630 L191 576 Z'},
   {root:[294,467],joint:[295,581],end:[307,712],mask:'M268 467 L335 467 L331 576 L329 630 L326 681 L346 706 L363 725 L362 739 L265 731 L249 705 L257 685 L253 630 L256 575 L264 526 Z'}]}
};
// Keep the measured landmark fields shared with the original articulated rigs.
for(const model of Object.values(MODELS))if(model.segmented){
 model.hips=model.legs.map(limb=>v(...limb.root));model.knees=model.legs.map(limb=>v(...limb.joint));model.ankles=model.legs.map(limb=>v(...limb.end));
 model.shoulders=model.arms.map(limb=>v(...limb.root));model.elbows=model.arms.map(limb=>v(...limb.joint));model.wrists=model.arms.map(limb=>v(...limb.end));
}
function rotatePoint(root,angle,length){return {x:root.x+Math.sin(angle)*length,y:root.y+Math.cos(angle)*length};}
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const rotateVector=(p,angle)=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)});
const angleBetween=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function sampleCharacterPose(id,options={}){
 if(id==='dani')return sampleDaniPose(options);const m=MODELS[id];if(!m)throw Error('Unknown character');const driver=sampleDaniPose(options),scale=(m.ground-m.top)/980,bodyScale=scale*(m.bodyMotion??1),bodyX=driver.bodyX*bodyScale,bodyY=driver.bodyY*bodyScale,tilt=driver.tilt;
 if(m.segmented){
  const walking=clamp(options.walkBlend??(options.phase==='walk'?1:0)),cycle=options.stride||0,air=options.phase==='jump'||options.phase==='fall',lift=air?Math.sin(Math.PI*clamp(options.jumpProgress||0)):0;
  const poseLimb=(limb,upperAngle,lowerAngle)=>{const root={x:limb.root[0],y:limb.root[1]},joint0={x:limb.joint[0],y:limb.joint[1]},end0={x:limb.end[0],y:limb.end[1]},upper=rotateVector({x:joint0.x-root.x,y:joint0.y-root.y},upperAngle),joint={x:root.x+upper.x,y:root.y+upper.y},lower=rotateVector({x:end0.x-joint0.x,y:end0.y-joint0.y},upperAngle+lowerAngle),end={x:joint.x+lower.x,y:joint.y+lower.y};return {root,joint,end,upperAngle,lowerAngle};};
  const legs=m.legs.map((limb,side)=>{const phase=cycle+side*Math.PI,outward=side?1:-1,upperAngle=Math.sin(phase)*.045*walking+outward*lift*.1,lowerAngle=Math.sin(phase+.45)*.09*walking+outward*lift*.07;return poseLimb(limb,upperAngle,lowerAngle);});
  const arms=m.arms.map((limb,side)=>{const outward=side?-1:1,walk=Math.sin(cycle+side*Math.PI)*.05*walking,idle=options.reduced?0:Math.sin((options.time||0)*2.1)*.008,upperAngle=walk+outward*(idle+lift*.12),lowerAngle=Math.sin(cycle+side*Math.PI+.85)*.055*walking+outward*lift*.05;return poseLimb(limb,upperAngle,lowerAngle);});
  return {bodyX,bodyY,tilt,legs,arms,farLeg:legs[0],nearLeg:legs[1],farArm:arms[0],nearArm:arms[1]};
 }
 const anchor=p=>({x:m.center+bodyX+(p.x-m.center)*Math.cos(tilt)-(p.y-m.hipY)*Math.sin(tilt),y:m.hipY+bodyY+(p.x-m.center)*Math.sin(tilt)+(p.y-m.hipY)*Math.cos(tilt)});
 const output={bodyX,bodyY,tilt};
 for(let side=0;side<2;side++){
  const near=side===1,name=near?'near':'far',src=driver[name+'Leg'],restX=near?310:220,restY=near?965:960;
  const footScale=scale*(m.footMotion??1),target={x:m.ankles[side].x+(src.end.x-restX)*footScale,y:m.ankles[side].y+(src.end.y-restY)*footScale};
  output[name+'Leg']=solveLimb(anchor(m.hips[side]),target,len(m.hips[side],m.knees[side]),len(m.knees[side],m.ankles[side]));
  const a=driver[name+'Arm'],upper=Math.atan2(a.joint.x-a.root.x,a.joint.y-a.root.y),lower=Math.atan2(a.end.x-a.joint.x,a.end.y-a.joint.y),root=anchor(m.shoulders[side]),joint=rotatePoint(root,upper,len(m.shoulders[side],m.elbows[side]));
  output[name+'Arm']={root,joint,end:rotatePoint(joint,lower,len(m.elbows[side],m.wrists[side])),angle:lower};
 }
 return output;
}
