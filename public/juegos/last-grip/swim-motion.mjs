import {spriteMirror} from '../world-cast-proportions.mjs';
export const swimFrame=p=>p.moving?((Math.floor((p.walk||0)/(Math.PI*2)*8)%8)+8)%8:8;
// These atlases use the same measured skeleton, phase and stride as World.
export class SwimwearMotion{
 constructor(){this.images=new Map();this.pending=new Map();}
 async load(id){if(this.images.has(id))return this.images.get(id);if(this.pending.has(id))return this.pending.get(id);const promise=(async()=>{const image=new Image();image.src='/juegos/last-grip/media/walk/'+id+'.webp?v=walk-1';try{await image.decode();this.images.set(id,image);return image;}catch{return null;}finally{this.pending.delete(id);}})();this.pending.set(id,promise);return promise;}
 draw(c,p,height){const image=this.images.get(p.characterId);if(!image){void this.load(p.characterId);return false;}const scale=height/180,frame=swimFrame(p);c.save();c.translate(p.x,p.y);c.scale(spriteMirror(p.facing),1);c.drawImage(image,frame*160,0,160,200,-80*scale,-194*scale,160*scale,200*scale);c.restore();return true;}
}
