export const SCAN_SPOTS=Object.freeze([{x:.30,y:.49},{x:.35,y:.52},{x:.40,y:.50}]);
export const scanSpot=v=>SCAN_SPOTS[Math.min(2,v.hits||0)];
export const incubatorTemperature=(setting,at)=>35+Math.max(0,Math.min(100,setting))*.04+Math.sin(at/1200)*.18;
const advance=(v,phase,at)=>{v.phase=phase;v.hits=0;v.lastCycle=-1;v.stepAt=at;v.scan=null;v.breathAt=null;};
// Time is supplied by the server. Repeated or accelerated requests cannot add
// more elapsed time than the previous successful observation allows.
export function maternityTask(v,input,at){
 if(input.action==='scan'&&v.phase==='monitor'){
  if(!Number.isFinite(input.x)||!Number.isFinite(input.y)||input.x<0||input.x>1||input.y<0||input.y>1)return {invalid:true};
  const spot=scanSpot(v),near=Math.hypot(input.x-spot.x,input.y-spot.y)<=.024,last=v.scan,dt=last?Math.max(0,Math.min(350,at-last.at)):0;
  v.scan={x:input.x,y:input.y,at,near,locked:near?Math.min(1200,(last?.near?last.locked:0)+dt):Math.max(0,(last?.locked||0)-dt*2)};
  v.feedback=near?'Señal encontrada · mantén el sensor estable':'Mueve el sensor hasta el punto marcado';
  if(v.scan.locked>=1200){v.hits=(v.hits||0)+1;v.scan=null;v.feedback='Lectura registrada';if(v.hits>=3){advance(v,'birth',at);v.feedback='Revisión completada. Acompaña ahora a la paciente.';}}
  return {handled:true};
 }
 if(input.action==='breathe'&&v.phase==='birth'){
  if(input.stage==='start'){v.breathAt=at;v.feedback='Acompaña el ritmo · suelta dentro de la zona marcada';}
  else if(input.stage==='finish'){
   const duration=v.breathAt==null?0:at-v.breathAt;v.breathAt=null;
   if(duration>=1600&&duration<=3000){v.hits=(v.hits||0)+1;v.feedback='Buen ritmo · '+v.hits+'/3';if(v.hits>=3){advance(v,'stabilize',at);v.feedback='Es momento de preparar el entorno del bebé.';}}
   else v.feedback=duration<1600?'Un poco más despacio. Mantén antes de soltar.':'Repite con un ritmo más suave.';
  }else return {invalid:true};
  return {handled:true};
 }
 if(input.action==='temperature'&&v.phase==='stabilize'){
  if(!Number.isFinite(input.setting)||input.setting<0||input.setting>100)return {invalid:true};
  const temperature=incubatorTemperature(input.setting,at),previous=v.incubator,stable=temperature>=36.5&&temperature<=37.5,dt=previous?Math.max(0,Math.min(350,at-previous.at)):0;
  v.incubator={setting:input.setting,temperature,at,stableMs:stable&&previous?.stableMs!=null?previous.stableMs+dt:0};
  v.feedback=stable?'Entorno estable · mantén el control':'Ajusta el regulador hasta la zona verde';
  if(v.incubator.stableMs>=5000){advance(v,'selection',at);v.feedback='Todo listo. La familia puede elegir los datos del bebé.';}
  return {handled:true};
 }
 return {handled:false};
}
