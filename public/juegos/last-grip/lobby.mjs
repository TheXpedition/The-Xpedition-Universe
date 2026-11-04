import {worldCharacter} from '../world-characters.mjs';
import {worldIcon} from '../world-icons.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function updateGripLobby(state,profile){
 const q=s=>document.querySelector(s),p=[...state.roster,...(state.visitors||[])].find(p=>p.id===state.selfId),competitor=state.roster.some(p=>p.id===state.selfId),open=state.phase==='lobby';
 q('#lobby').hidden=!['closed','lobby','finished'].includes(state.phase);if(q('#lobby').hidden)return;
 q('#join').hidden=competitor||state.staff||worldCharacter(profile?.characterId)?.role!=='participant';q('#join').disabled=!open;
 q('#visit').hidden=!!p||state.staff;q('#visit').disabled=!open;
 q('#ready').hidden=!competitor||!open;q('#ready').textContent=p?.ready?'CANCELAR LISTO':'ESTOY LISTO';
 q('#leave').hidden=!p||!open;q('[data-lobby-action="open"]').hidden=!state.staff||open;
 q('#lobby-controls').hidden=!state.staff||!open;q('[data-lobby-action="start"]').disabled=state.roster.length<6;
 q('#seats').innerHTML=state.roster.length+'<small> / 18</small>';
 q('#lobby-note').textContent=state.phase==='finished'?'Episodio terminado. El resultado sigue guardado.':!open?'El lobby todavía está cerrado.':competitor?'Ya tienes tu plaza. Confirma cuando estés listo.':state.staff?'Prepara las plazas y comienza cuando estén todos.':'Entra al lobby o acompaña el reto como espectador.';
 q('#slots').innerHTML=Array.from({length:18},(_,i)=>{const p=state.roster[i];return p?`<article class="slot occupied ${p.id===state.selfId?'self':''} ${p.ready?'ready':''}"><img src="/juegos/x-protocol/art/portraits/${esc(p.characterId)}-face.webp" alt=""><strong>${esc(p.name)}</strong><small>${p.bot?'BOT':p.id===state.selfId?'TÚ':p.connected?'PARTICIPANTE':'RECONECTANDO'}${p.ready?' · LISTO':''}</small>${state.staff&&open?`<button type="button" class="slot-remove" title="Quitar de este lobby" data-kick="${esc(p.id)}" aria-label="Quitar a ${esc(p.name)}">${worldIcon('close')}</button>`:''}</article>`:`<article class="slot empty"><span>${String(i+1).padStart(2,'0')}</span><small>PLAZA DISPONIBLE</small></article>`;}).join('');
}
