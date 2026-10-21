import {drawDani} from './dani-renderer.mjs';
import {MODELS,sampleCharacterPose} from './character-rig.mjs';
const INK='#161718';
// Runtime sprite matting leaves the supplied files untouched. Flood only the
// connected paper around the inked silhouette, preserving enclosed skin/fabric.
export function prepareReference(image,makeCanvas){
 const canvas=makeCanvas?makeCanvas(image.width||image.naturalWidth,image.height||image.naturalHeight):document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,canvas.width,canvas.height),a=pixels.data,w=canvas.width,h=canvas.height,bg=[a[0],a[1],a[2]],seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let tail=0,head=0;
 const add=i=>{if(i<0||i>=w*h||seen[i])return;seen[i]=1;const p=i*4,d=Math.hypot(a[p]-bg[0],a[p+1]-bg[1],a[p+2]-bg[2]);if(d<69){queue[tail++]=i;a[p+3]=0;}};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const i=queue[head++],x=i%w;add(i-w);add(i+w);if(x)add(i-1);if(x<w-1)add(i+1);}
 c.putImageData(pixels,0,0);
 const tile=makeCanvas?makeCanvas(48,48):document.createElement('canvas');tile.width=48;tile.height=48;const t=tile.getContext('2d');t.fillStyle='#8e8b91';t.fillRect(0,0,48,48);for(let i=0;i<290;i++){t.fillStyle=['#ece7e5','#4d4b53','#c8c4c7','#faf7ef'][i%4];const size=1+i%3;t.fillRect((i*17.13)%48,(i*29.71)%48,size,size);}canvas.glitterTile=tile;return canvas;
}
function fillPath(ctx,d,fill,stroke=INK,width=3){const path=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(path);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(path);}return path;}
function tubePath(a,b,c,r0,r1,r2){const u={x:b.x-a.x,y:b.y-a.y},v={x:c.x-b.x,y:c.y-b.y},ul=Math.hypot(u.x,u.y)||1,vl=Math.hypot(v.x,v.y)||1;u.x/=ul;u.y/=ul;v.x/=vl;v.y/=vl;const n={x:-(u.y+v.y),y:u.x+v.x},nl=Math.hypot(n.x,n.y)||1;n.x/=nl;n.y/=nl;return 'M'+(a.x-u.y*r0)+' '+(a.y+u.x*r0)+' Q'+(b.x+n.x*r1)+' '+(b.y+n.y*r1)+' '+(b.x+n.x*r1)+' '+(b.y+n.y*r1)+' Q'+((b.x+c.x)/2+n.x*r1)+' '+((b.y+c.y)/2+n.y*r1)+' '+(c.x-v.y*r2)+' '+(c.y+v.x*r2)+' L'+(c.x+v.y*r2)+' '+(c.y-v.x*r2)+' Q'+((b.x+c.x)/2-n.x*r1)+' '+((b.y+c.y)/2-n.y*r1)+' '+(b.x-n.x*r1)+' '+(b.y-n.y*r1)+' Q'+((a.x+b.x)/2+u.y*r0)+' '+((a.y+b.y)/2-u.x*r0)+' '+(a.x+u.y*r0)+' '+(a.y-u.x*r0)+' Z';}
const glitterPatterns=new WeakMap();
function glitter(ctx,path,image){ctx.save();ctx.clip(path);let pattern=glitterPatterns.get(ctx);if(!pattern){pattern=ctx.createPattern(image.glitterTile,'repeat');glitterPatterns.set(ctx,pattern);}ctx.fillStyle=pattern;ctx.fill(path);ctx.globalAlpha=.9;ctx.strokeStyle='#fff';ctx.lineWidth=1;for(let i=0;i<14;i++){const x=270+(i*87.13)%255,y=440+(i*71.17)%470;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}ctx.restore();}
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function leg(ctx,image,m,limb,side){
 let end=limb.end;const upper=m.upperWidths[side],lower=m.lowerWidths[side];
 if(m.capri){const cuff=mix(limb.joint,end,.81);fillPath(ctx,tubePath(cuff,mix(cuff,end,.5),end,lower*.65,lower*.55,lower*.51),m.skin);end=cuff;}
 const p=fillPath(ctx,tubePath(limb.root,limb.joint,end,upper,upper*.85,lower),m.pants);if(m.glitter)glitter(ctx,p,image);
 if(m.sleeves){ctx.save();ctx.translate(limb.root.x,limb.root.y);ctx.rotate(Math.atan2(limb.joint.y-limb.root.y,limb.joint.x-limb.root.x)-Math.PI/2);ctx.translate((side?1:-1)*upper*.7,Math.hypot(limb.joint.x-limb.root.x,limb.joint.y-limb.root.y)*.32);fillPath(ctx,'M-12 -5 L12 -5 L12 39 Q0 46 -12 39 Z','#43545c',INK,2.6);ctx.restore();}
 if(m.capri){ctx.strokeStyle='#111619';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(end.x-lower,end.y-8);ctx.lineTo(end.x+lower,end.y-8);ctx.stroke();}
 const rect=m.feet[side],source=m.ankles[side];ctx.save();ctx.translate(limb.end.x-source.x,limb.end.y-source.y);ctx.drawImage(image,...rect,...rect);ctx.restore();
}
function arm(ctx,image,m,limb,side){
 const radius=m.armWidths[side];fillPath(ctx,tubePath(limb.root,limb.joint,limb.end,radius,radius*.88,radius*.65),m.skin);
 if(m.sleeves){const cuff=mix(limb.root,limb.joint,.52);fillPath(ctx,tubePath(limb.root,mix(limb.root,cuff,.5),cuff,radius*1.42,radius*1.48,radius*1.6),'#ecb1b8');}
 if(m.glitter){const start=mix(limb.joint,limb.end,.12),path=fillPath(ctx,tubePath(start,mix(start,limb.end,.5),limb.end,radius*1.04,radius*.83,radius*.81),'#a4a0a3');glitter(ctx,path,image);}
 ctx.fillStyle=m.glitter?'#a4a0a3':m.skin;ctx.beginPath();ctx.ellipse(limb.end.x,limb.end.y,radius*.67,radius*.67,0,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(limb.end.x,limb.end.y);ctx.rotate(-limb.angle);const scale=m.sleeves?1.05:m.glitter?1.25:1.3;ctx.scale(scale,scale);
 const palm=fillPath(ctx,'M-14 -5 L13 -5 L19 17 Q19 27 13 43 L4 60 L-3 49 L-8 62 L-15 49 L-19 54 Q-24 32 -17 15 L-23 27 L-29 22 Q-23 4 -14 -5 Z',m.glitter?'#aaa3a1':m.skin,INK,2.6);
 if(m.glitter){ctx.save();ctx.clip(palm);ctx.strokeStyle='#5b5156';ctx.lineWidth=.7;for(let y=-15;y<80;y+=7){ctx.beginPath();ctx.moveTo(-40,y);ctx.lineTo(35,y+38);ctx.moveTo(35,y);ctx.lineTo(-40,y+38);ctx.stroke();}ctx.restore();}
 ctx.strokeStyle='#4e3631';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-9,24);ctx.lineTo(-15,49);ctx.moveTo(0,27);ctx.lineTo(-3,49);ctx.moveTo(8,29);ctx.lineTo(4,47);ctx.stroke();ctx.restore();
}
function body(ctx,image,m,pose,mouth){
 ctx.save();ctx.translate(pose.bodyX,pose.bodyY);ctx.translate(m.center,m.hipY);ctx.rotate(pose.tilt);ctx.translate(-m.center,-m.hipY);
 if(m.sleeves){fillPath(ctx,'M165 278 L195 245 L253 239 L297 279 L291 344 L295 453 L174 453 L179 343 Z','#ecb1b8',null);fillPath(ctx,'M173 445 L295 445 L293 479 L173 479 Z',m.pants,null);}
 if(m.glitter)fillPath(ctx,'M360 274 L430 274 L449 350 L438 493 L453 553 L343 553 L356 488 L348 344 Z',m.skin,null);
 if(m.capri)fillPath(ctx,'M240 295 L323 295 Q369 312 403 358 L368 390 L217 391 L187 354 Q207 317 240 295 Z',m.skin,null);
 const left=m.hips[0].x-m.upperWidths[0]-3,right=m.hips[1].x+m.upperWidths[1]+3;ctx.save();ctx.beginPath();ctx.rect(left,m.hipY-30,right-left,70);ctx.clip();ctx.drawImage(image,0,0);ctx.restore();
 ctx.save();ctx.clip(new Path2D(m.torso));ctx.drawImage(image,0,0);ctx.restore();
 ctx.save();if(m.headMask)ctx.clip(new Path2D(m.headMask));ctx.drawImage(image,...m.head,...m.head);ctx.restore();
 if(mouth>.12){const p=m.mouth;ctx.save();ctx.translate(p.x,p.y);fillPath(ctx,'M'+(-p.rx)+' -2 Q0 -9 '+p.rx+' -2 Q'+(p.rx*.7)+' '+(4+mouth*16)+' 0 '+(4+mouth*13)+' Q'+(-p.rx*.65)+' '+(5+mouth*8)+' '+(-p.rx)+' -2 Z','#55292b',INK,2);ctx.strokeStyle='#f5e3cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.rx*.6,-1);ctx.quadraticCurveTo(0,2,p.rx*.6,-1);ctx.stroke();ctx.restore();}
 ctx.restore();
}
export function drawCharacter(ctx,image,{character='dani',...options}){
 if(character==='dani')return drawDani(ctx,image,options);const m=MODELS[character];if(!m||!image)return;const pose=sampleCharacterPose(character,options),s=(options.height||206)/(m.ground-m.top);
 ctx.save();ctx.translate(options.x||0,options.y||0);ctx.scale(-(options.facing||1)*s,s);ctx.translate(-m.center,-m.ground);
 leg(ctx,image,m,pose.farLeg,0);arm(ctx,image,m,pose.farArm,0);leg(ctx,image,m,pose.nearLeg,1);body(ctx,image,m,pose,options.mouthOpen||0);arm(ctx,image,m,pose.nearArm,1);ctx.restore();
}
