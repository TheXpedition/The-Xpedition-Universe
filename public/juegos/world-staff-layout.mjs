import {worldIcon} from './world-icons.mjs';
const tabs=[['scene','Campamento','explore','Hora, clima, camas y anuncios'],['players','Participantes','people','Fallecidos y refugios'],['medical','Enfermería','health','Profesionales y atención clínica'],['council','Ceremonias','trophy','Episodio, guion y votación'],['access','Accesos','lock','Zonas, desafíos y permisos']];
const groups={scene:['dir-environment','dir-events','dir-host'],players:['dir-roster','dir-shelters'],medical:['dir-clinic'],council:['dir-setup','dir-bonju','dir-floor','dir-voting'],access:['dir-access','dir-permissions']};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function staffShelterMarkup(view){
 const members=view?.housing||[],shelters=view?.shelters||[];
 if(!members.length)return '<p>La lista de refugios aparecerá al conectar con World.</p>';
 const options=members.map(({characterId,name,home})=>`<option value="${esc(characterId)}">${esc(name)} · ${esc(shelters.find(s=>s.id===home)?.name||'Sin refugio')}</option>`).join('');
 const capacities=shelters.map(s=>`${esc(s.name)}: ${s.members.length}/${s.required} plazas`).join(' · ');
 return `<div class="staff-field staff-field-wide"><label for="staff-shelter-character">Participante y refugio actual</label><select id="staff-shelter-character"><option value="">Elige un participante</option>${options}</select></div><p>${capacities}</p><div class="actions"><button class="small-button" data-action="shelter-assign" data-home="left">Cambiar a Refugio 1</button><button class="small-button" data-action="shelter-assign" data-home="right">Cambiar a Refugio 2</button><button class="small-button" data-action="shelter-assign" data-home="none">Quitar del refugio</button></div>`;
}
export function organizeStaffPanel(root,selected='scene'){
 const doc=root.ownerDocument,active=tabs.find(t=>t[0]===selected)||tabs[0];root.dataset.tab=active[0];
 const close=root.querySelector('[data-action=staff-close]');if(close){close.removeAttribute('style');close.className='staff-dismiss';close.setAttribute('aria-label','Cerrar Dirección');}
 const header=doc.createElement('header');header.className='staff-shell-header';header.innerHTML='<div><p class="eyebrow">THE WORLD · DIRECCIÓN</p><h2>Centro de control</h2></div>';if(close)header.append(close);
 const title=root.querySelector('h2');let item=root.firstElementChild;while(item&&item!==root.querySelector('details')){const next=item.nextElementSibling;if(item.classList.contains('staff-stats'))header.append(item);else if(item.matches('.vote-count'))break;else item.remove();item=next;}
 root.prepend(header);
 const picker=doc.createElement('div');picker.className='staff-participant-picker';const select=root.querySelector('#staff-target');if(select){const label=root.querySelector('label[for=staff-target]');if(label){label.textContent='Participante seleccionado';picker.append(label);}picker.append(select);}picker.hidden=active[0]!=='medical'||!select;
 const medical=doc.createElement('details');medical.id='dir-clinic';medical.innerHTML='<summary>Equipo de enfermería</summary><p class="staff-help">Asigna profesionales y consulta su libreta. Cada paciente debe aceptar su cita y los cobros adicionales.</p><div class="actions"><button class="small-button dark" data-action="notebook">Abrir libreta y citas</button><button class="small-button dark" data-action="hospital-supplies">Administrar suministros</button></div>';
 const nurse=root.querySelector('[data-action=nurse-assign]')?.closest('.actions'),traits=root.querySelector('#staff-trait-autism')?.closest('fieldset');if(nurse)medical.append(nurse);if(traits)medical.append(traits);root.append(medical);
 root.querySelector('#staff-medical-controls')?.remove();
 const pause=root.querySelector('[data-ceremony=pause], [data-ceremony=resume]')?.closest('.actions');if(pause&&root.querySelector('#dir-voting'))root.querySelector('#dir-voting').append(pause);
 const nav=doc.createElement('nav');nav.className='staff-tabs';nav.setAttribute('aria-label','Secciones de Dirección');nav.innerHTML=tabs.map(([id,name,icon,description])=>'<button data-staff-tab="'+id+'" class="'+(id===active[0]?'active':'')+'" aria-pressed="'+(id===active[0])+'">'+worldIcon(icon)+'<span><strong>'+name+'</strong><small>'+description+'</small></span></button>').join('');
 const workspace=doc.createElement('div');workspace.className='staff-workspace';const heading=doc.createElement('div');heading.className='staff-section-heading';heading.innerHTML='<p class="eyebrow">'+active[1].toUpperCase()+'</p><h3>'+active[3]+'</h3>';workspace.append(heading,picker);
 const vote=root.querySelector('.vote-count');if(vote){vote.hidden=active[0]!=='council';workspace.append(vote);}
 for(const detail of [...root.querySelectorAll('details')]){detail.hidden=!groups[active[0]].includes(detail.id);detail.open=true;const summary=detail.querySelector('summary'),body=doc.createElement('div');body.className='staff-card-body';for(const child of [...detail.children])if(child!==summary)body.append(child);detail.append(body);
  for(const label of [...body.children].filter(n=>n.matches('label[for]'))){const control=label.nextElementSibling;if(control?.matches('input,select,textarea')&&control.id===label.htmlFor){const field=doc.createElement('div');field.className='staff-field';label.before(field);field.append(label,control);if(control.matches('textarea'))field.classList.add('staff-field-wide');}}
  workspace.append(detail);
 }
 const layout=doc.createElement('div');layout.className='staff-layout';layout.append(nav,workspace);root.append(layout);
 const footer=doc.createElement('footer');footer.className='staff-shell-footer';footer.innerHTML='<span><i></i> Control en vivo</span><small>Los cambios se aplican al mundo compartido.</small>';root.append(footer);return active[0];
}
