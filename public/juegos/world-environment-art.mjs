import {outdoorExposure} from './world-environment.mjs';
const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function paintEnvironment(c,w,h,{environment,map,camera,time=0,lite=false,reducedMotion=false}={}){
 if(!environment||!map)return;const outside=outdoorExposure(map.id),night=environment.phase==='night',afternoon=environment.phase==='afternoon',minute=environment.minute??environment.hour*60,nightAmount=night?(minute>=1200&&minute<1260?.4+(minute-1200)/100:1):afternoon&&minute>=1140?(minute-1140)/60*.4:environment.phase==='day'&&minute<420?(420-minute)/60:0;c.save();
 // Separate sky darkness from ground visibility; keep painted lamps warm instead of washing the world blue.
 if(nightAmount>0){
  const strength=Math.min(1,Math.max(0,nightAmount));c.globalCompositeOperation='color';c.globalAlpha=(outside>.4?.22:.10)*strength;c.fillStyle='#737476';c.fillRect(0,0,w,h);
  c.globalCompositeOperation='multiply';c.globalAlpha=(outside>.4?.68:.34)*strength;c.fillStyle='#62636a';c.fillRect(0,0,w,h);
  if(outside>.4){const horizon=Math.max(h*.42,Math.min(h*.82,camera.project(map.width*.5,map.height*.72,0,w,h).y)),sky=c.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#242636ff');sky.addColorStop(.58,'#33333ce6');sky.addColorStop(1,'#62636a00');c.globalCompositeOperation='color';c.globalAlpha=.90*strength;c.fillStyle=sky;c.fillRect(0,0,w,horizon);c.globalCompositeOperation='multiply';c.globalAlpha=.73*strength;c.fillStyle=sky;c.fillRect(0,0,w,horizon);const shade=c.createRadialGradient(w*.5,h*.65,w*.22,w*.5,h*.55,w*.76);shade.addColorStop(0,'#13111a00');shade.addColorStop(1,'#13111a55');c.globalCompositeOperation='source-over';c.globalAlpha=strength;c.fillStyle=shade;c.fillRect(0,0,w,h);}
 }
 else if(afternoon){c.globalCompositeOperation='soft-light';c.globalAlpha=.10;c.fillStyle='#e6a063';c.fillRect(0,0,w,h);}
 if(environment.weather!=='clear'&&outside>0){c.globalCompositeOperation='source-over';c.globalAlpha=.12*outside;c.fillStyle=night?'#8993b8':'#a6aeb6';c.fillRect(0,0,w,h);}
 c.globalCompositeOperation='source-over';c.globalAlpha=1;
 if(nightAmount>0){const windows={base:[[.465,.62],[.82,.63]],'refugio-2':[[.526,.61]],comunicaciones:[[.586,.664]],hospital:[[.62,.58]],'hospital-interior':[[.25,.18],[.63,.2],[.88,.27]],cocina:[[.37,.12],[.65,.15],[.87,.14]],'refugio-1':[[.52,.35],[.81,.19]],'dormitorio-2':[[.3,.12],[.65,.14]],comida:[[.24,.41],[.50,.43],[.72,.49]],iglesia:[[.60,.52]],eliminacion:[[.42,.54],[.60,.54]]},points=map.id.startsWith('tren-')?[[.24,.10],[.7,.13]]:windows[map.id]||[];c.globalCompositeOperation='screen';for(const [x,y]of points){const p=camera.project(x*map.width,y*map.height,0,w,h),r=(outside>.4?65:100)*Math.min(1.5,camera.zoom||1),g=c.createRadialGradient(p.x,p.y,1,p.x,p.y,r);g.addColorStop(0,'#ffb4574a');g.addColorStop(.35,'#ffd38820');g.addColorStop(1,'#ffd38800');c.fillStyle=g;c.globalAlpha=Math.min(1,nightAmount);c.fillRect(p.x-r,p.y-r,r*2,r*2);}c.globalAlpha=1;c.globalCompositeOperation='source-over';}
 if(outside>0&&environment.weather!=='clear'){
  const rain=['rain','storm'].includes(environment.weather),count=Math.round((lite?38:95)*outside*(environment.weather==='storm'?1.35:1)),seconds=reducedMotion?0:time/1000;
  c.lineWidth=rain?1.1:1;c.strokeStyle=night?'#becce2a6':'#d0dfeba6';c.fillStyle='#eff6ffdb';
  for(let i=0;i<count;i++){const speed=rain?460+noise(i+7)*180:22+noise(i+7)*24,x=((noise(i+1)*w+seconds*(rain?86:12)+Math.sin(seconds*.6+i)*(!rain?12:0))%(w+30))-15,y=(noise(i+99)*(h+60)+seconds*speed)%(h+60)-30;if(rain){c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y-14-noise(i+20)*8);c.stroke();}else {c.globalAlpha=.45+noise(i+30)*.5;c.beginPath();c.arc(x,y,1+noise(i+40)*2,0,Math.PI*2);c.fill();}}
 }
 if(environment.weather==='storm'&&outside>.4&&!reducedMotion){const elapsed=time-environment.weatherSince-2500,flash=elapsed>=0?elapsed%28000:10000;if(flash<180){c.globalCompositeOperation='screen';c.globalAlpha=.075*(1-flash/180);c.fillStyle='#dce5ff';c.fillRect(0,0,w,h);c.globalAlpha=.55*(1-flash/180);c.strokeStyle='#e8edff';c.lineWidth=1.8;c.beginPath();c.moveTo(w*.82,0);c.lineTo(w*.79,h*.07);c.lineTo(w*.81,h*.09);c.lineTo(w*.76,h*.17);c.stroke();}}
 c.restore();
}
