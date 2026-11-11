// Anchors use the visible object/contact, not the distant approach on the floor.
export function actionAnchor(prop,slot=0){
 if(prop.contextAnchor)return {...prop.contextAnchor};
 if(prop.lightPoint)return {...prop.lightPoint};
 if(prop.hitRect)return {x:(prop.hitRect[0]+prop.hitRect[2])/2,y:prop.hitRect[3]};
 if(prop.sleepBed)return {x:prop.x,y:prop.y-(prop.artWidth||prop.w)*.145/.62};
 const seat=prop.seats?.[slot];if(seat)return {x:seat.x,y:seat.y};
 return {x:prop.x,y:prop.y+(prop.painted?0:(prop.h||0)*.25)};
}
export function worldContext(player,portal,interaction,maps,sourceMap){
 if(!player)return null;
 if(player.activity==='fish')return {key:'fish-cancel',label:'Cancelar pesca',detail:'Puedes moverte para cancelar',icon:'water',anchor:{x:player.x,y:player.y}};
 if(player.swimming)return {key:'water-return',label:'Volver a la orilla',detail:'Salir del agua',icon:'door',anchor:{x:player.x,y:player.y}};
 if(player.seatId){const seat=sourceMap?.props.find(p=>p.id===player.seatId);return {key:'stand',label:'Levantarse',detail:seat?.sleepBed?'Dejar la cama':'Volver al suelo',icon:'chair',anchor:seat?actionAnchor(seat,player.seatSlot):{x:player.x,y:player.y}};}
 if(portal&&!portal.auto){const target=maps[portal.zone],prop=sourceMap?.props.find(p=>p.id===portal.id),hit=prop?.hitRect;if(target){const label=portal.kind==='bridge'?'Cruzar puente':portal.kind==='trail'?'Seguir':portal.id==='exit'||prop?.label?.startsWith('Salir')?'Salir':prop?.label?.startsWith('Volver')?'Volver':'Entrar';return {key:'door:'+portal.id,label,detail:target.name+(target.private?' · Privado':''),icon:portal.kind==='trail'?'explore':target.private?'lock':'door',anchor:prop?.contextAnchor||(hit?{x:(hit[0]+hit[2])/2,y:hit[3]}:{x:portal.x,y:portal.y})};}}
 if(interaction){const {prop,action,slot}=interaction;if(prop.sleepBed)return null;return {key:prop.id+':'+(slot??''),label:action.label,detail:action.name,icon:action.kind==='surveillance'?'camera':action.kind==='sit'?'chair':action.kind==='light'?'lamp':'search',anchor:actionAnchor(prop,slot)};}
 return null;
}
export function contextMarkup(context,icon){const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<span class="context-key" aria-hidden="true">E</span><span class="context-copy"><strong>${escape(context.label)}</strong><small>${escape(context.detail)}</small></span><span class="context-icon" aria-hidden="true">${icon(context.icon)}</span>`;}
export function contextPosition(context,camera,scene,viewport,size){const point=camera.project(context.anchor.x,context.anchor.y,0,scene.width,scene.height),x=point.x/scene.width*viewport.width,y=point.y/scene.height*viewport.height;const clamp=(n,a,b)=>Math.max(a,Math.min(Math.max(a,b),n));return {left:clamp(x-size.width/2,8,viewport.width-size.width-8),top:clamp(y+4,viewport.safeTop||8,viewport.height-size.height-(viewport.safeBottom??8)),visible:x>=0&&x<=viewport.width&&y>=(viewport.safeTop||0)-20&&y<=viewport.height};}
