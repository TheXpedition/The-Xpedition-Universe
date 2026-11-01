// Explicit anatomical pivots in source coordinates; one uniform character scale.
// No centre pivots, limb resizing, synthetic skin shapes or animation shortcuts.
import {drawBonjuStrip,drawBonjuUpper} from './bonju-mesh.mjs';
export function boneTransforms(bones,angles={}){const result={};function bone(id){if(result[id])return result[id];const b=bones[id],parent=b.parent?bone(b.parent):{angle:0,map:([x,y])=>[x,y]},pivot=parent.map(b.pivot),angle=parent.angle+(angles[id]||0),cos=Math.cos(angle),sin=Math.sin(angle);return result[id]={angle,pivot,map:([x,y])=>[pivot[0]+cos*(x-b.pivot[0])-sin*(y-b.pivot[1]),pivot[1]+sin*(x-b.pivot[0])+cos*(y-b.pivot[1])]};}for(const id of Object.keys(bones))bone(id);return result;}
function drawParts(c,atlas,rig,transforms){for(const id of rig.order){const p=rig.parts[id];if(!p)continue;const b=rig.bones[p.bone],t=transforms[p.bone];c.save();c.translate(...t.pivot);c.rotate(t.angle);c.drawImage(atlas,p.x,p.y,p.w,p.h,p.offset[0]-b.pivot[0],p.offset[1]-b.pivot[1],p.w,p.h);c.restore();}}
const staticSurfaces=new WeakMap();
export function composeBonjuStatic(atlas,rig,makeCanvas){const surface=makeCanvas(rig.reference.width,rig.reference.height),c=surface.getContext('2d');c.translate(-rig.reference.origin[0],-rig.reference.origin[1]);drawParts(c,atlas,rig,boneTransforms(rig.bones));return surface;}
export function drawBonjuStatic(c,atlas,rig,{x,y,height,pivots=false,angles={},makeCanvas}){const scale=height/rig.reference.height,transforms=boneTransforms(rig.bones,angles);c.save();c.translate(x,y);c.scale(scale,scale);c.translate(-rig.reference.origin[0]-rig.reference.width/2,-rig.reference.origin[1]-rig.reference.height);
 // Assemble neutral cut-outs at authoring resolution before the single display
 // scale. Sampling adjacent atlas rectangles separately creates hairline seams.
 if(!Object.values(angles).some(Boolean)){
  let surface=staticSurfaces.get(atlas);if(!surface){const create=makeCanvas||(typeof OffscreenCanvas!=='undefined'?((w,h)=>new OffscreenCanvas(w,h)):null);if(create){surface=composeBonjuStatic(atlas,rig,create);staticSurfaces.set(atlas,surface);}}
  if(surface)c.drawImage(surface,...rig.reference.origin);else drawParts(c,atlas,rig,transforms);
 }else drawParts(c,atlas,rig,transforms);
 if(pivots){c.lineWidth=2/scale;c.font=(11/scale)+'px system-ui';c.textAlign='left';for(const [id,b]of Object.entries(rig.bones)){if(['eyes','mouth','hairLeft','hairCentre','hairRight','hairBack','head','neck'].includes(id))continue;const t=transforms[id];if(b.parent){const p=transforms[b.parent].pivot;c.strokeStyle='#0089bd';c.beginPath();c.moveTo(...p);c.lineTo(...t.pivot);c.stroke();}c.fillStyle='#df453e';c.beginPath();c.arc(...t.pivot,4/scale,0,Math.PI*2);c.fill();c.fillStyle='#092b42';c.fillText(id,t.pivot[0]+7/scale,t.pivot[1]);}}
 c.restore();}

const HEAD_PARTS=new Set(['neckCover','head','eyes','mouth','hairLeft','hairCentre','hairRight','hairBack']);
const jointNames={root:'Raíz',pelvis:'Cadera',torso:'Cintura',upperL:'Hombro I',foreL:'Codo I',handL:'Muñeca I',upperR:'Hombro D',foreR:'Codo D',handR:'Muñeca D',thighL:'Cadera I',calfL:'Rodilla I',footL:'Tobillo I',thighR:'Cadera D',calfR:'Rodilla D',footR:'Tobillo D'};
function debugJoints(c,rig,transforms,scale){c.lineWidth=1.5/scale;c.font=(10/scale)+'px system-ui';c.textAlign='left';for(const [id,b]of Object.entries(rig.bones)){if(!jointNames[id])continue;const t=transforms[id];if(b.parent){const parent=transforms[b.parent].pivot;c.strokeStyle='#0089bd';c.beginPath();c.moveTo(...parent);c.lineTo(...t.pivot);c.stroke();}c.fillStyle='#df453e';c.beginPath();c.arc(...t.pivot,3/scale,0,Math.PI*2);c.fill();c.fillStyle='#092b42';c.fillText(jointNames[id],t.pivot[0]+5/scale,t.pivot[1]-3/scale);}}

// One reusable pose surface and one reusable head surface. Every limb remains
// rigid; only its authored bone rotates. Source art supplies all joint underlaps.
export class BonjuAnimator{
 constructor(atlas,rig,makeCanvas=(w,h)=>new OffscreenCanvas(w,h)){this.atlas=atlas;this.rig=rig;this.pad=150;this.surface=makeCanvas(rig.reference.width+this.pad*2,rig.reference.height+this.pad*2);this.headSurface=makeCanvas(rig.reference.width,390);this.headKey=null;this.materials={};const groups={upper:['upperFillLArt','upperFillRArt','upperL','foreL','handL','upperR','foreR','handR','torso','pelvis'],legL:['hipFillLArt','thighL','calfL','footL'],legR:['hipFillRArt','thighR','calfR','footR'],dress:['dress']};for(const [key,ids]of Object.entries(groups)){const material=makeCanvas(rig.reference.width,rig.reference.height),c=material.getContext('2d');c.translate(-rig.reference.origin[0],-rig.reference.origin[1]);for(const id of ids)this.part(c,id);this.materials[key]=material;}}
 part(c,id){const p=this.rig.parts[id];if(p)c.drawImage(this.atlas,p.x,p.y,p.w,p.h,...p.offset,p.w,p.h);}
 head(blink,mouth){const key=Math.round(blink*5)+'-'+mouth;if(this.headKey===key)return this.headSurface;this.headKey=key;const c=this.headSurface.getContext('2d'),r=this.rig.reference,amount=Math.round(blink*5)/5;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.headSurface.width,this.headSurface.height);c.translate(-r.origin[0],-r.origin[1]);for(const id of this.rig.order){if(!HEAD_PARTS.has(id)||id==='eyes'&&amount>0||id==='mouth'&&mouth>0)continue;this.part(c,id);}if(amount>0){this.part(c,'eyesPlate');if(amount<1){c.save();c.beginPath();c.rect(120,190+32*amount,112,32*(1-amount));c.clip();this.part(c,'eyes');c.restore();}if(amount>.4){c.save();c.globalAlpha=(amount-.4)/.6;this.part(c,'closedL');this.part(c,'closedR');c.restore();}}if(mouth>0){this.part(c,'mouthPlate');this.part(c,mouth===1?'talk1':'talk2');}return this.headSurface;}
 draw(c,{x,y,height,pose,pivots=false}){const r=this.rig.reference,scale=height/r.height,transforms=boneTransforms(this.rig.bones,pose.angles),p=this.surface.getContext('2d');p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,this.surface.width,this.surface.height);p.translate(this.pad-r.origin[0],this.pad-r.origin[1]+pose.bob);
  const plane=(material,bone)=>{const b=this.rig.bones[bone],t=transforms[bone];p.save();p.translate(...t.pivot);p.rotate(t.angle);p.drawImage(material,r.origin[0]-b.pivot[0],r.origin[1]-b.pivot[1]);p.restore();};
  plane(this.head(pose.blink,pose.mouth),'head');
  for(const side of pose.legOrder||['L','R'])drawBonjuStrip(p,this.materials['leg'+side],this.rig,transforms,{bones:['thigh'+side,'calf'+side,'foot'+side],bounds:[side==='L'?90:153,510,side==='L'?219:270,1050],joints:[[side==='L'?718:716,24],[932,12]]});
  drawBonjuUpper(p,this.materials.upper,this.rig,transforms);plane(this.materials.dress,'dress');
  c.save();c.translate(x,y);c.scale(scale,scale);c.drawImage(this.surface,-r.width/2-this.pad,-r.height-this.pad);if(pivots){c.translate(-r.width/2-r.origin[0],-r.height-r.origin[1]+pose.bob);debugJoints(c,this.rig,transforms,scale);}c.restore();}
}

// The verified replacement is static until the joint underlaps and subsequent
// animation stages pass review. Live dialogue still uses the ceremony state.
export class BonjuRig{
 constructor(){this.atlas=null;this.rig=null;this.loading=null;this.error=null;}
 load(){if(this.loading)return this.loading;this.loading=(async()=>{const response=await fetch('/juegos/hosts/bonju-v2/rig.json',{cache:'no-cache'});if(!response.ok)throw Error('Bonju rig unavailable');const rig=await response.json(),atlas=new Image();atlas.src='/juegos/hosts/bonju-v2/parts.webp?v='+rig.atlasRevision;await atlas.decode();this.atlas=atlas;this.rig=rig;})().catch(error=>{this.error=error;});return this.loading;}
 draw(c,options){if(!this.rig){void this.load();return false;}drawBonjuStatic(c,this.atlas,this.rig,options);return true;}
}
