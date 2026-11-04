import {CLINIC_PROCEDURES,CLINIC_PATIENT_IDS} from './clinic-procedures.mjs';
import {CLINICAL_BY_ID} from './clinic-identities.mjs';
export function clinicalActorSource(id){const src=CLINICAL_BY_ID[id]?.image||CLINICAL_BY_ID[id]?.portrait||CLINICAL_BY_ID.dani.image;return src.startsWith('/')?src:'/juegos/shared/ice-breaker/'+src.replace(/^\.\//,'');}
export function paintClinicalName(c,name,{x,top,maxWidth=210,fontSize=22}={}){
 if(!name)return null;c.save();c.font='700 '+fontSize+'px "World Condensed", Arial, sans-serif';c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#17100b';c.fillStyle='#fff0cc';
 const words=String(name).split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&(c.measureText?.(next)?.width??next.length*fontSize*.5)>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 const y=Math.max(fontSize*lines.length+5,top-12);for(let i=0;i<lines.length;i++){const ly=y-(lines.length-1-i)*(fontSize+2);c.strokeText?.(lines[i],x,ly,maxWidth);c.fillText(lines[i],x,ly,maxWidth);}c.restore();return {x,y,lines};
}
export function clinicActorAsset(characterId,care={}){const nurse=care.role==='nurse';if(care.kind==='psychology')return characterId==='isabel'?'/juegos/clinic/art/isabel-psychology-v1.webp':CLINIC_PATIENT_IDS.includes(characterId)?'/juegos/clinic/art/'+characterId+'-ready-v1.webp':null;if(nurse?characterId!=='isabel':!CLINIC_PATIENT_IDS.includes(characterId))return null;const pose=nurse?(care.step===0?(care.kind==='injection'?'prepare':'clipboard'):CLINIC_PROCEDURES[care.kind]?.pose||'clipboard'):care.kind==='pills'&&care.step>0?'drink':'ready';return '/juegos/clinic/art/'+characterId+'-'+pose+'-v1.webp';}
export function paintClinicChair(c,image,{x,floor,height}){if(!image)return false;const h=height*.8,w=h*image.width/image.height;c.drawImage(image,x+height*.1-w/2,floor+2-h,w,h);return true;}
// Registration is shared by all 63 extracted sprites. The head is centered and
// the feet contact the same floor; animation never scales characters arbitrarily.
export function paintClinicActor(c,image,{x,floor,height,nurse=false,time=0,reduced=false,performing=false}){
 if(!image)return false;const scale=height/710,W=nurse?640:900,H=768,left=x-W/2*scale,top=floor-744*scale,breath=reduced?0:Math.sin(time*1.7)*.0018,move=reduced?0:Math.sin(time*(performing?4.2:1.2))*(performing?.018:.004);
 c.save();c.translate(x,floor);c.scale(1+breath,1+breath);c.translate(-x,-floor);
 // An isolated outer hand/equipment layer moves around its attachment. The
 // torso is painted with the exact same hole so there is no doubled hand.
 const region=nurse?{x:W*.65,y:190,w:W*.35,h:260}:{x:0,y:210,w:W*.38,h:180},rx=left+region.x*scale,ry=top+region.y*scale,rw=region.w*scale,rh=region.h*scale;
 c.save();c.beginPath();c.rect(left-2,top-2,W*scale+4,H*scale+4);c.rect(rx,ry,rw,rh);c.clip('evenodd');c.drawImage(image,left,top,W*scale,H*scale);c.restore();
 c.save();const pivotX=nurse?rx:rx+rw,pivotY=ry+rh*.58;c.translate(pivotX,pivotY);c.rotate(move);c.drawImage(image,region.x,region.y,region.w,region.h,rx-pivotX,ry-pivotY,rw,rh);c.restore();c.restore();return true;
}
