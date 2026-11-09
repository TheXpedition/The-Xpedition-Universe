export const CLINIC_CONTROLS=Object.freeze({
 exam:{mode:'focus',title:'Explora al paciente',help:'Mueve el instrumento sobre el punto de la escena y mantén la lectura estable.',scene:true},
 pressure:{mode:'hold',title:'Estabiliza la lectura',help:'Mantén para preparar el control y suelta dentro de la zona verde.'},
 bandage:{mode:'trace',title:'Ajusta la venda',help:'Mantén pulsado INICIO y sigue los puntos hasta FIN. Suelta cuando la barra se llene.'},
 injection:{mode:'trace',title:'Controla la aplicación',help:'Mantén pulsado INICIO y sigue la línea hasta FIN. Suelta cuando la barra se llene.'},
 pills:{mode:'trace',title:'Prepara la entrega',help:'Arrastra el elemento resaltado por la línea hasta ENTREGA. Suelta cuando la barra se llene y continúa con el siguiente.'},
 test:{mode:'focus',title:'Procesa el kit',help:'Mantén el control sobre cada punto del kit hasta completar la lectura.'},
 support:{mode:'hold',title:'Acompaña al paciente',help:'Mantén y suelta dentro de la zona marcada para seguir un ritmo tranquilo.'}
});
export function clinicalFocus(s){return s.kind==='exam'?[{x:.66,y:.48},{x:.65,y:.55},{x:.56,y:.60}][Math.min(2,s.hits||0)]:[{x:.25,y:.5},{x:.5,y:.5},{x:.75,y:.5}][Math.min(2,s.hits||0)];}
export function clinicalPath(s){if(s.kind==='bandage')return [{x:.15,y:.6},{x:.32,y:.25},{x:.5,y:.7},{x:.68,y:.25},{x:.85,y:.6}];if(s.kind==='injection')return [{x:.15,y:.5},{x:.32,y:.5},{x:.5,y:.5},{x:.68,y:.5},{x:.85,y:.5}];return [{x:.15,y:.25+(s.hits||0)*.25},{x:.4,y:.5},{x:.65,y:.5},{x:.85,y:.5}];}
function hit(s,at){s.hits=(s.hits||0)+1;s.gesture=null;s.feedback='Control completado · '+s.hits+'/3';if(s.hits>=3){s.step=2;s.stepAt=at;s.feedback='Preparación completada. Comprueba la respuesta del paciente.';}}
export function applyClinicalGesture(s,input,at){
 const def=CLINIC_CONTROLS[s.kind];if(!def||s.status!=='active'||s.step!==1)return {handled:false};
 if(input.phase==='cancel'){s.gesture=null;return {handled:true};}
 if(def.mode==='hold'){
  if(input.phase==='start'){s.gesture={started:at,mode:'hold'};s.feedback='Mantén y suelta en verde';}
  else if(input.phase==='end'){const elapsed=s.gesture?at-s.gesture.started:0,min=1400+(s.hits||0)*150;s.gesture=null;if(elapsed>=min&&elapsed<=min+1100)hit(s,at);else s.feedback=elapsed<min?'Mantén un poco más antes de soltar.':'Prueba con un ritmo más suave.';}
  else return {invalid:true};return {handled:true};
 }
 if(!Number.isFinite(input.x)||!Number.isFinite(input.y)||input.x<0||input.x>1||input.y<0||input.y>1)return {invalid:true};
 if(def.mode==='focus'){
  const target=clinicalFocus(s),near=Math.hypot(input.x-target.x,input.y-target.y)<(def.scene?.045:.09),old=s.gesture,dt=old?Math.max(0,Math.min(300,at-old.at)):0;
  s.gesture={mode:'focus',at,near,locked:near?(old?.near?old.locked:0)+dt:0,x:input.x,y:input.y};s.feedback=near?'Lectura estable · mantén el instrumento':'Busca el punto marcado';if(s.gesture.locked>=1000)hit(s,at);return {handled:true};
 }
 const points=clinicalPath(s),near=p=>Math.hypot(input.x-p.x,input.y-p.y)<.14;
 if(input.phase==='start'){s.gesture=near(points[0])?{mode:'trace',started:at,index:1,x:input.x,y:input.y}:null;s.feedback=s.gesture?'Sigue el recorrido con suavidad':'Empieza en el primer punto';}
 else if(input.phase==='move'){if(s.gesture){if(Math.hypot(input.x-s.gesture.x,input.y-s.gesture.y)>.55){s.gesture=null;s.feedback='Repite el recorrido sin saltarte los puntos.';}else{const i=s.gesture.index;if(i<points.length&&near(points[i]))s.gesture.index++;s.gesture.x=input.x;s.gesture.y=input.y;}}}
 else if(input.phase==='end'){if(s.gesture?.index===points.length&&at-s.gesture.started>=1000&&near(points.at(-1)))hit(s,at);else{s.gesture=null;s.feedback='Completa el recorrido de principio a fin, sin apresurarte.';}}
 else return {invalid:true};return {handled:true};
}
