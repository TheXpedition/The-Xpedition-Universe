import {CLINICAL_BY_ID} from './clinic-identities.mjs';
import {castHeightRatio} from './world-cast-proportions.mjs';
import {paintClinicalName,clinicalActorSource} from './clinic-motion.mjs';
import {scanSpot,incubatorTemperature} from './maternity-tasks.mjs';
const ROOT='/juegos/clinic/family/',ART='/juegos/clinic/art/';
export function paintMaternityStage(c,v,{image,time=0,reduced=false,probePoint=null,nurseX=317}={}){
 const draw=(src,x,y,width,height)=>{const im=image(src);if(im)c.drawImage(im,x,y,width,height);return im;},early=['admission','monitor','birth'].includes(v.phase),care=['care','completed'].includes(v.phase),breath=reduced?0:Math.sin(time/850)*1.3;
 c.clearRect(0,0,1100,760);draw(ROOT+'maternity-room-v1.webp',0,0,1100,760);
 if(v.fatherCharacter){const im=image(clinicalActorSource(v.fatherCharacter));if(im){const h=330*castHeightRatio(v.fatherCharacter),wid=h*im.width/im.height;c.drawImage(im,110-wid/2,525-h,wid,h);}}
 if(v.nurseCharacter==='isabel'){
  if(early)draw(ART+'isabel-ultrasound-body-v2.webp',nurseX,145+breath,375,450);
  else draw(ART+'isabel-'+(v.phase==='completed'?'newborn':care?(v.hold?.kind==='soothe'?'newborn':'feeding'):'incubator')+'-v1.webp',610,145+breath,375,450);
 }else{const im=image(clinicalActorSource(v.nurseCharacter));if(im){const h=365*castHeightRatio(v.nurseCharacter);c.drawImage(im,800-h*im.width/im.height/2,570-h,h*im.width/im.height,h);}}
 draw(ROOT+'maternity-bed-v1.webp',130,270,600,480);draw(ROOT+v.characterId+'-reclined.webp',140,200+breath,610,388);
 if(early&&v.nurseCharacter==='isabel'){
  const arm=image(ART+'isabel-ultrasound-arm-v2.webp');if(arm){const scale=375/640,pivot={x:nurseX+235*scale,y:145+breath+310*scale},spot=probePoint||scanSpot(v),angle=Math.max(-.25,Math.min(.25,Math.atan2(spot.y*760-pivot.y,spot.x*1100-pivot.x)-2.55));c.save();c.translate(pivot.x,pivot.y);c.rotate(angle);c.drawImage(arm,-235*scale,-310*scale,375,450);c.restore();}
 }
 const machine=v.phase==='stabilize'?'incubator':'ultrasound';draw(ROOT+machine+'-v1.webp',720,360,300,240);
 if(machine==='ultrasound'){c.save();c.fillStyle='#18312b';c.fillRect(819,381,106,64);c.strokeStyle='#9bdfb9';c.lineWidth=2;c.beginPath();for(let i=0;i<=100;i++){const y=413+Math.sin((i+time/70)*.18)*4+(i%34>24&&i%34<28?-14:0);i?c.lineTo(821+i,y):c.moveTo(821+i,y);}c.stroke();c.restore();}
 if(v.phase==='stabilize')draw(ROOT+'baby-1-newborn.webp',805,385,130,130);else if(v.baby&&v.nurseCharacter!=='isabel')draw(ROOT+v.baby.appearance+'-newborn.webp',710,355,130,130);
 if(v.phase==='monitor'&&v.canControl){const spot=scanSpot(v);c.save();c.strokeStyle=v.scan?.near?'#b7dc83':'#ffe9b4';c.lineWidth=3;c.setLineDash?.([5,4]);c.beginPath();c.arc(spot.x*1100,spot.y*760,19,0,Math.PI*2);c.stroke();c.restore();}
 paintClinicalName(c,v.motherName,{x:270,top:214+breath,maxWidth:220});paintClinicalName(c,v.nurseName,{x:early&&v.nurseCharacter==='isabel'?nurseX+180:795,top:160+breath,maxWidth:220});if(v.fatherCharacter)paintClinicalName(c,v.fatherName,{x:110,top:525-330*castHeightRatio(v.fatherCharacter),maxWidth:180});
 return {probe:early?{x:nurseX+68,y:374+breath}:null,temperature:incubatorTemperature(v.incubator?.setting??50,time)};
}
