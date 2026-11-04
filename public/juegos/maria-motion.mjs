import {CharacterMotion} from './character-motion.mjs';
export const MARIA_MOTION_ART=Object.freeze({image:'/juegos/outfits/maria-motion-v1/atlas.webp',lite:'/juegos/outfits/maria-motion-v1/atlas-lite.webp',preview:'/juegos/outfits/maria-motion-v1/idle.webp',columns:4,rows:4,frameWidth:320,frameHeight:420,basis:1});
// These are registered full-body sprites, not a complete separated-parts rig.
export class MariaMotion {
 constructor(){this.actors=new Map();this.images=new Map();this.failed=new Set();}
 getArt(lite,clothing='pajamas'){const src=clothing==='pajamas'?(lite?MARIA_MOTION_ART.lite:MARIA_MOTION_ART.image):'/juegos/outfits/maria-motion-v1/'+(clothing==='cold'?'thermal':'habitual')+'-atlas'+(lite?'-lite':'')+'.webp';if(this.images.has(src))return this.images.get(src);if(this.failed.has(src))return null;const im=new Image();this.images.set(src,null);im.onload=()=>this.images.set(src,im);im.onerror=()=>{this.failed.add(src);this.images.delete(src);};im.src=src;return null;}
 sample(p,time){const key=p.userId||p.id||'preview';let a=this.actors.get(key);if(!a||a.clothing!==p.clothing){a={clothing:p.clothing,motion:new CharacterMotion()};this.actors.set(key,a);}if(this.actors.size>64)this.actors.delete(this.actors.keys().next().value);return a.motion.sample(p,time);}
 draw(c,p,height,time,{atlas,lite=false,reduced=false}={}){
  if(p.characterId!=='maria-villegas'||p.state==='sit'||p.swimming||p.activity||p.life?.status==='dead'||p.life?.status==='fainted'||p.life?.vomitUntil>time*1000)return false;
  const m=this.sample(p,time),pajamas=p.clothing==='pajamas',prepared=this.getArt(lite,p.clothing),im=prepared||atlas;if(!im)return false;
  // Preserve existing talking/reaction frames for habitual and thermal outfits.
  if(!pajamas&&(!p.moving&&p.grounded!==false&&(p.talking||p.reaction&&time*1000-p.reactionAt<3500)||['sit','stand'].includes(p.action)&&time*1000-p.actionAt<550))return false;
  const columns=prepared?4:8,rows=prepared?4:5,fw=im.width/columns,fh=im.height/rows;
  const frame=prepared?m.frame:m.stage==='takeoff'?12:m.stage==='air'?13:m.stage==='landing'?12:m.frame;
  c.save();c.translate(p.x,p.y*.62-(p.z||0));c.scale(pajamas?(m.facing===1?1:-1):(m.facing===-1?1:-1),1);
  if(!reduced){c.transform(1,0,-m.lean,1+ m.breath,0,0);}
  const scale=height/180;
  if(prepared){const h=height*420/376,w=h*fw/fh;c.drawImage(im,frame%4*fw,Math.floor(frame/4)*fh,fw,fh,-w/2,-h*400/420,w,h);}
  else c.drawImage(im,frame%8*fw,Math.floor(frame/8)*fh,fw,fh,-100*fw/fh*scale,-194*scale,200*fw/fh*scale,200*scale);
  c.restore();return true;
 }
}
