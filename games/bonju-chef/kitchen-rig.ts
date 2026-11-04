import Phaser from 'phaser';
import {WORK_MOTION,workFrame} from '../../public/juegos/bonju-chef/work-motion.mjs';
import {visualHeight} from '../../public/juegos/bonju-chef/visual-layout.mjs';

/** One continuous illustrated forearm, with the utensil between the palm and fingers. */
export class KitchenRig{
 body:Phaser.GameObjects.Sprite;arm:Phaser.GameObjects.Sprite;hand:Phaser.GameObjects.Sprite;tool:Phaser.GameObjects.Image;
 armMask:Phaser.GameObjects.Graphics;handMask:Phaser.GameObjects.Graphics;
 meta:any;scale:number;x:number;y:number;stage:string;lastFrame=-1;
 constructor(scene:Phaser.Scene,id:string,stage:string,cold=false){
  this.stage=stage;this.meta=WORK_MOTION[id];const start=this.meta.frames[stage==='prep'?0:8];
  const target=stage==='blend'?{x:1080,y:310}:stage==='prep'?{x:755,y:700}:stage==='mix'?{x:835,y:650}:cold?{x:970,y:700}:{x:1000,y:700};
  this.scale=visualHeight(id,580)/384;this.x=target.x-(start.grip.x-192)*this.scale;this.y=target.y+(384-start.grip.y)*this.scale;
  const texture='motion-'+id;
  this.body=scene.add.sprite(this.x,this.y,texture,0).setOrigin(.5,1).setScale(this.scale).setDepth(300);
  this.arm=scene.add.sprite(this.x,this.y,texture,0).setOrigin(.5,1).setScale(this.scale).setDepth(500);
  this.hand=scene.add.sprite(this.x,this.y,texture,0).setOrigin(.5,1).setScale(this.scale).setDepth(550);
  this.armMask=scene.make.graphics({x:0,y:0},false);this.handMask=scene.make.graphics({x:0,y:0},false);
  this.arm.setMask(this.armMask.createGeometryMask());this.hand.setMask(this.handMask.createGeometryMask());
  this.tool=scene.add.image(target.x,target.y,stage==='prep'?'knife-v3':'spoon-v3').setOrigin(.2,.5).setDepth(530);
  this.tool.setScale((stage==='prep'?180:148)/this.tool.frame.realWidth);if(stage==='blend')this.tool.setVisible(false);
  this.update(0,{stage,lastResult:null},0);
  scene.events.once('shutdown',()=>{this.armMask.destroy();this.handMask.destroy();});
 }
 point(p:any){return {x:this.x+(p.x-192)*this.scale,y:this.y+(p.y-384)*this.scale};}
 update(time:number,station:any,clock:number){
  const age=station?.lastResult?.type==='cut'?clock-station.lastResult.at:1000,frame=workFrame(this.stage,time,age);
  if(frame===this.lastFrame)return;this.lastFrame=frame;const pose=this.meta.frames[frame],grip=this.point(pose.grip),elbow=this.point(pose.elbow),radius=25*this.scale;
  this.body.setFrame(frame);this.arm.setFrame(frame);this.hand.setFrame(frame);
  this.armMask.clear().lineStyle(radius*2,0xffffff,1).lineBetween(elbow.x,elbow.y,grip.x,grip.y).fillStyle(0xffffff).fillCircle(elbow.x,elbow.y,radius).fillCircle(grip.x,grip.y,radius);
  this.handMask.clear().fillStyle(0xffffff).fillEllipse(grip.x,grip.y,43*this.scale,50*this.scale);
  this.tool.setPosition(grip.x,grip.y).setRotation(pose.angle);
 }
}

/** Reuse the illustrated front rim, so spoon tips enter the vessel rather than float over it. */
export function occludeKitchen(scene:Phaser.Scene,table:Phaser.GameObjects.Image,stage:string,cold:boolean){
 const scale=table.scaleX,left=table.x-table.displayWidth/2,top=table.y,w=table.frame.realWidth,h=table.frame.realHeight;
 const line=stage==='mix'?[[.075,.24],[.16,.285],[.255,.24]]:cold?[[.65,.15],[.76,.2],[.87,.15]]:[[.72,.145],[.825,.185],[.94,.145]];
 const mask=scene.make.graphics({x:0,y:0},false),points=line.map(([x,y])=>({x:left+x*w*scale,y:top+y*h*scale}));
 const minX=points[0].x,maxX=points[2].x,bottom=top+h*scale;
 mask.fillStyle(0xffffff).fillPoints([...points,{x:maxX,y:bottom},{x:minX,y:bottom}],true);
 const front=scene.add.image(table.x,table.y,table.texture.key).setOrigin(.5,0).setScale(scale).setDepth(600);front.setMask(mask.createGeometryMask());
 const deskMask=scene.make.graphics({x:0,y:0},false);deskMask.fillStyle(0xffffff).fillRect(left,top+h*(cold?.42:.435)*scale,w*scale,h*scale);
 scene.add.image(table.x,table.y,table.texture.key).setOrigin(.5,0).setScale(scale).setDepth(700).setMask(deskMask.createGeometryMask());
 scene.events.once('shutdown',()=>{mask.destroy();deskMask.destroy();});
}
