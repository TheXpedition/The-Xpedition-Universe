import {drawWorldMinimap as drawLegacy} from './world-minimap.mjs';
const cache=new Map();
export function drawWorldMinimap(canvas,map,players,selfId){
 if(!map.illustration)return drawLegacy(canvas,map,players,selfId);
 let im=cache.get(map.illustration.id);if(!im){im=new Image();im.src=map.illustration.url+'?v='+map.illustration.revision;cache.set(map.illustration.id,im);}
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=7,s=Math.min((w-pad*2)/map.width,(h-27)/(map.height*.62)),ox=(w-map.width*s)/2,oy=(h-24-map.height*.62*s)/2;
 c.fillStyle='#211d14';c.fillRect(0,0,w,h);if(im.complete&&im.naturalWidth)c.drawImage(im,ox,oy,map.width*s,map.height*.62*s);
 for(const p of map.props.filter(p=>p.portal)){c.beginPath();c.arc(ox+p.portal.x*s,oy+p.portal.y*.62*s,2,0,Math.PI*2);c.fillStyle='#efa445';c.fill();}
 for(const p of players){const x=ox+p.x*s,y=oy+p.y*.62*s;c.save();c.translate(x,y);c.beginPath();if(p.userId===selfId){c.rotate(p.facing===-1?-Math.PI/2:Math.PI/2);c.moveTo(0,-6);c.lineTo(4,5);c.lineTo(0,2);c.lineTo(-4,5);c.closePath();c.fillStyle='#efa445';}else {c.arc(0,0,2.5,0,Math.PI*2);c.fillStyle='#c8c183';}c.strokeStyle='#211d14';c.lineWidth=1.5;c.fill();c.stroke();c.restore();}
 c.fillStyle='#8f9bb0';c.font='700 11px Manrope,sans-serif';c.textAlign='center';c.fillText(map.short,w/2,h-7);
}
