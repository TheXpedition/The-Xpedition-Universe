import {BONJU_PRESENTER_ART} from './bonju-presenter-art.mjs';
export class BonjuApocalypsePresenter{
 constructor(){this.image=null;this.pending=null;}
 async load(){
  if(this.image)return true;if(this.pending)return this.pending;if(typeof Image==='undefined')return false;
  this.pending=(async()=>{const image=new Image();image.src=BONJU_PRESENTER_ART.url;if(image.decode)await image.decode();else if(!image.complete)await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});this.image=image;return true;})().catch(()=>false).finally(()=>{this.pending=null;});return this.pending;
 }
 draw(context,{x,y,height}={}){
  if(!this.image){void this.load();return false;}
  const [left,top,width,sourceHeight]=BONJU_PRESENTER_ART.bounds,displayWidth=height*width/sourceHeight;
  context.save();context.translate(x,y);context.drawImage(this.image,left,top,width,sourceHeight,-displayWidth/2,-height,displayWidth,height);context.restore();return true;
 }
}
