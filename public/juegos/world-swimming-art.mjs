import {spriteMirror} from './world-cast-proportions.mjs';

const Y=.62;
// The actor position is the water contact, not an invisible pair of feet.
// Keep the original drawing's scale; the chest and legs remain below the surface.
export function swimmingPose(player,height,time=0,reducedMotion=false){
 const moving=player.moving===true,facing=player.facing===-1?-1:1;
 const cycle=reducedMotion?0:time*(moving?3.4:1.8),bob=reducedMotion?0:Math.sin(cycle)*height*.009;
 const roll=reducedMotion?0:Math.sin(cycle)*.018+(moving?facing*.045:0);
 const x=player.x,y=player.y*Y,visibleHeight=height*.40-bob;
 return {x,y,facing,moving,bob,roll,visibleHeight,top:y-visibleHeight-height*.025,
  left:x-height*.30,right:x+height*.30,bottom:y+height*.045,
  originY:y+height*.60+bob,radius:height*(moving?.24:.21),phase:cycle};
}

function surface(context,b,height,above){
 const amplitude=height*.004;
 context.beginPath();context.moveTo(b.x-height,b.y+(above?-height:height*.05));
 context.lineTo(b.x-height,b.y);
 for(let i=0;i<=24;i++){const x=b.x-height+i*height/12;context.lineTo(x,b.y+Math.sin(i*.8+b.phase)*amplitude);}
 context.lineTo(b.x+height,b.y+(above?-height:height*.05));context.closePath();context.clip();
}

export function paintSwimmingPose(context,player,height,image,time=0,reducedMotion=false){
 const b=swimmingPose(player,height,time,reducedMotion),fw=image.width/8,fh=image.height/5,scale=height/180;
 // Always use the intact neutral illustration (frame 8), never walking or sitting.
 const drawBody=()=>{context.translate(b.x,b.originY);context.rotate(b.roll);context.scale(spriteMirror(b.facing),1);context.drawImage(image,0,fh,fw,fh,-100*fw/fh*scale,-194*scale,200*fw/fh*scale,200*scale);};
 context.save();context.fillStyle='#173b3824';context.beginPath();context.ellipse(b.x,b.y+height*.015,b.radius,height*.025,0,0,Math.PI*2);context.fill();context.restore();
 // A narrow, faint glimpse below the water joins the drawing to the surface.
 context.save();surface(context,b,height,false);context.globalAlpha*=.12;drawBody();context.restore();
 context.save();surface(context,b,height,true);drawBody();context.restore();
 context.save();context.lineWidth=Math.max(.9,height*.006);context.lineCap='round';
 for(let i=0;i<3;i++){
  const phase=reducedMotion?i/3:(time*.55+i/3)%1;
  context.strokeStyle=`rgba(219,228,199,${(.65*(1-phase)).toFixed(3)})`;
  context.beginPath();context.ellipse(b.x-b.facing*(b.moving?phase*height*.18:0),b.y+height*.009, b.radius+phase*height*.12,height*(.023+phase*.025),0,.08,Math.PI-.08);context.stroke();
 }
 if(b.moving&&!reducedMotion){
  for(let i=0;i<4;i++){const phase=(time*.9+i/4)%1;context.globalAlpha=.5*(1-phase);context.fillStyle='#d8e4cf';context.beginPath();context.ellipse(b.x-b.facing*height*(.16+phase*.38),b.y+Math.sin(i*4)*height*.025,height*.012*(1-phase),height*.006,0,0,Math.PI*2);context.fill();}
 }
 context.restore();return b;
}
