const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const isRecentChatMessage=(created,serverTime,elapsed=0)=>Number.isFinite(Number(created))&&serverTime+Math.max(0,elapsed)-Number(created)<=15000;
export function bubblePlacement(anchor,viewport,size){
 if(!anchor||!Number.isFinite(anchor.x)||!Number.isFinite(anchor.y))return null;
 const headX=anchor.x*viewport.width,headY=anchor.y*viewport.height;
 const left=clamp(headX-size.width/2,6,Math.max(6,viewport.width-size.width-6));
 const top=Math.max(6,headY-size.height-15);
 return {left,top,tail:headX-left};
}
export function mountChatBubbles(layer,canvas){
 const entries=new Map();
 function update(anchors){if(!entries.size)return;const area=canvas.getBoundingClientRect(),box=layer.getBoundingClientRect();for(const [id,b]of entries){if(!b.isConnected){entries.delete(id);continue;}const a=anchors[id];b.hidden=!a;if(!a)continue;const p=bubblePlacement(a,{width:area.width,height:area.height},{width:b.offsetWidth,height:b.offsetHeight});if(!p){b.hidden=true;continue;}b.style.left=area.left-box.left+p.left+'px';b.style.top=area.top-box.top+p.top+'px';b.style.setProperty('--bubble-tail',p.tail+'px');}}
 return {update,show(id,name,text,anchors){entries.get(id)?.remove();const b=document.createElement('div'),label=document.createElement('strong');b.className='bubble';b.dataset.speaker=id;label.textContent=name;b.append(label,document.createTextNode(text));layer.append(b);entries.set(id,b);while(entries.size>3){const key=entries.keys().next().value;entries.get(key).remove();entries.delete(key);}update(anchors);setTimeout(()=>{b.remove();if(entries.get(id)===b)entries.delete(id);},Math.max(5000,Math.min(15000,text.length*70)));}};
}
