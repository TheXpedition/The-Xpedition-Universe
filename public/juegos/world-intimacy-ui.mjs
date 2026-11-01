const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bedMenuMarkup(bed,adult,page='main') {
 const id=escape(bed.id),choice=(action,label,icon,extra='')=>`<button type="button" class="bed-bubble" data-action="${action}" data-bed="${id}" ${bed.occupied?'disabled':''} ${extra}><span aria-hidden="true">${icon}</span>${label}</button>`;
 if(page==='private')return `<section class="bed-bubble-menu bed-submenu"><div class="bed-bubble-center">Momento privado<small>Solo personajes adultos · sin escenas gráficas</small></div>${choice('bed-private','Comenzar','♡')}${choice('bed-back','Volver','←')}</section>`;
 return `<section class="bed-bubble-menu" aria-label="Interacciones con la cama"><div class="bed-bubble-center">Cama individual<small>${bed.occupied?'Ocupada':'Limpieza · '+Math.round(bed.cleanliness??100)+' %'}</small></div>${choice('bed-sleep','Dormir','☾')}${choice('bed-nap','Siesta','Zz')}${choice('bed-clean','Limpiar','✧')}${adult?choice('bed-private-menu','Tocarme 😈','♡')+choice('bed-invite','Hacer Ñiqui Ñiqui 😈','♥'):''}</section>`;
}
export function invitationMarkup(bedId,{people=[],hasProtection=false}={}) {
 return `<form class="bed-invite-form"><p class="eyebrow">INVITACIÓN PRIVADA</p><h2>Ñiqui Ñiqui 😈</h2><p>Elige a alguien cercano. Podrá aceptar o rechazar. Ambos podrán cancelar con cualquier movimiento.</p><label>Persona<select name="target" required><option value="">Seleccionar…</option>${people.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('')}</select></label>${!people.length?'<p>No hay otros personajes adultos disponibles cerca de esta cama.</p>':''}<label class="bed-check"><input type="checkbox" name="protected" ${hasProtection?'checked':''} ${hasProtection?'':'disabled'}> Usar un preservativo de mi inventario${hasProtection?'':' · no tienes uno'}</label><label class="bed-check"><input name="acknowledged" type="checkbox" required> Acepto el encuentro privado y sus posibles consecuencias simuladas de salud y embarazo.</label><input type="hidden" name="bedId" value="${escape(bedId)}"><button class="yellow-button" type="submit" ${people.length?'':'disabled'}>Enviar invitación</button><p class="bed-note">La protección reduce riesgos. Un diagnóstico solo se conoce en consulta. No hay escenas gráficas.</p></form>`;
}
export function mountIntimacyUI(parent,{api,toast,onSoloCancel,onPrivateStart,onPrivateEnd,clock=Date.now}={}) {
 const doc=parent.ownerDocument,notice=doc.createElement('aside'),curtain=doc.createElement('div');notice.className='intimacy-invitation';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');curtain.className='intimacy-curtain';curtain.hidden=true;parent.append(notice,curtain);let pending=null,session=null,timer=null,busy=false;
 function clear(id){if(id&&pending?.id!==id)return;pending=null;clearTimeout(timer);notice.hidden=true;notice.replaceChildren();busy=false;}
 function show(request) {
  clear();if(!request?.id||request.expiresAt<=clock())return;pending=request;
  notice.innerHTML=`<p class="eyebrow">INVITACIÓN PRIVADA</p><strong>${escape(request.from?.name)}</strong><p>Te está invitando a hacer Ñiqui Ñiqui 😈.</p><p>${request.protectedEncounter?'Usará un preservativo de su inventario.':'La invitación es sin protección.'}</p><label class="bed-check"><input type="checkbox" data-consent> Acepto el encuentro y las posibles consecuencias simuladas de salud${request.pregnancyConsent?' y embarazo':''}.</label><div><button type="button" data-answer="accept">Aceptar</button><button type="button" data-answer="decline">Rechazar</button></div>`;notice.hidden=false;timer=setTimeout(()=>clear(request.id),Math.max(0,request.expiresAt-clock()));
 }
 function update(value) {
  const changed=session?.id!==value.id||session?.phase!==value.phase;session=value;clear();curtain.hidden=value.phase!=='private';if(changed&&value.phase==='private'){curtain.classList.remove('private-start');void curtain.offsetWidth;curtain.classList.add('private-start');onPrivateStart?.();}else if(value.phase!=='private')onPrivateEnd?.();
  curtain.innerHTML='<div><span aria-hidden="true">♥</span><h2>Momento privado</h2><p>Encuentro consensuado · sin escenas gráficas</p><button type="button" data-cancel-private>Cancelar y levantarse</button></div>';
  if(value.phase==='approach'){notice.innerHTML='<p class="eyebrow">EN CAMINO A LA CAMA</p><p>El encuentro se cancela en cuanto indiques otro movimiento.</p><button type="button" data-cancel-private>Cancelar</button>';notice.hidden=false;}
 }
 async function click(event) {
  const answer=event.target.closest('[data-answer]'),cancel=event.target.closest('[data-cancel-private]');if(busy||!answer&&!cancel)return;
  if(answer?.dataset.answer==='accept'&&!notice.querySelector('[data-consent]')?.checked){toast?.('Confirma las condiciones antes de aceptar.');return;}
  busy=true;try{if(cancel){if(session?.solo)await onSoloCancel?.();else await api('/world/intimacy/cancel',{});return;}const id=pending?.id;if(!id)return;await api('/world/intimacy/'+answer.dataset.answer,{requestId:id,acknowledged:true});clear(id);}catch(error){toast?.(error.message);}finally{busy=false;}
 }
 notice.addEventListener('click',click);curtain.addEventListener('click',click);
 return {show,update,clear,close(value={}){if(value.sessionId&&session?.id!==value.sessionId)return;session=null;curtain.hidden=true;onPrivateEnd?.();clear();if(value.message)toast?.(value.message);},destroy(){onPrivateEnd?.();clear();notice.remove();curtain.remove();}};
}
