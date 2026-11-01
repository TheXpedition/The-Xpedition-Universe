// Values come from the server. Missing measurements are never presented as invented numbers.
const definitions=Object.freeze([
  {id:'health',name:'Salud',help:'Estado físico. Un valor alto indica buena salud.',icon:'<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5Z"/>'},
  {id:'hunger',name:'Hambre',help:'Reserva de saciedad. Un valor alto significa que has comido; comer la recupera.',icon:'<path d="M4 2v6c0 3 5 3 5 0V2M6.5 2v20M16 2v8h4V2M20 2v20"/>'},
  {id:'energy',name:'Energía',help:'Reserva de energía. Un valor alto permite mantener la actividad; descansar la recupera.',icon:'<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>'},
  {id:'sleep',name:'Sueño',help:'Reserva de descanso. Un valor alto significa que estás descansado; dormir la recupera.',icon:'<path d="M3 4v18M21 12v10M3 18h18M3 10h6v8M9 12h9l3 3v3M5 7h3v3H5Z"/>'},
  {id:'stress',name:'Estrés',help:'Un valor alto indica más estrés. Cero significa calma.',icon:'<path d="M9 22v-4l-4-3V9l3-6 7-1 5 4v7l-4 5v4M9 7l3-2 4 2-2 3-4-1 1 5 4-1M6 11H3l2 3"/>'}
]);
const records=new WeakMap(),mounts=new WeakMap();let instance=0;
const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const setAttribute=(node,name,value)=>{if(value===null){if(node.hasAttribute(name))node.removeAttribute(name);}else if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));};
export function normalizeVitalValue(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):null;}

export function updateWorldVitals(element,values={}){
  const record=records.get(element);if(!record)throw new TypeError('Mount the vitals panel before updating it.');
  const next=values&&typeof values==='object'&&!Array.isArray(values)?values:{};
  for(const definition of definitions){
    const cell=record.cells.get(definition.id);if(!Object.hasOwn(next,definition.id))continue;
    const value=normalizeVitalValue(next[definition.id]);record.values[definition.id]=value;
    const level=value===null?'unknown':definition.id==='stress'?(value>=70?'high':'normal'):(value<=25?'low':'normal');
    const levelText=level==='unknown'?'Sin medición disponible.':level==='low'?'Reserva baja.':level==='high'?'Estrés alto.':definition.id==='stress'?'Nivel de estrés.':'Reserva disponible.';
    setText(cell.value,value===null?'—':value+'/100');
    setAttribute(cell.root,'data-level',level);
    setAttribute(cell.meter,'aria-valuenow',value);
    setAttribute(cell.meter,'aria-valuetext',value===null?'Sin medición disponible':`${value} de 100. ${levelText}`);
    const width=(value??0)+'%';if(cell.fill.style.width!==width)cell.fill.style.width=width;
  }
  if(Object.hasOwn(next,'status')){record.values.status=typeof next.status==='string'?next.status.slice(0,48):'';setAttribute(element,'data-status',record.values.status);}
  if(Object.hasOwn(next,'label')){record.values.label=typeof next.label==='string'?next.label.slice(0,140):'';setText(record.summary,record.values.label);if(element.title!==record.values.label)element.title=record.values.label;}
  return {...record.values};
}

export function mountWorldVitals(header,values={}){
  if(!header?.ownerDocument)throw new TypeError('A header element is required.');
  const mounted=mounts.get(header);if(mounted){mounted.update(values);return mounted;}
  const document=header.ownerDocument,prefix='world-vitals-'+(++instance),element=document.createElement('section');
  element.className='world-vitals';element.dataset.worldVitals='';element.setAttribute('role','group');element.setAttribute('aria-label','Estado de tu personaje');
  const cells=new Map(),initial={};
  for(const definition of definitions){
    const root=document.createElement('div');root.className='world-vital';root.dataset.vital=definition.id;root.dataset.level='unknown';root.title=definition.help;
    root.innerHTML=`<span class="vital-icon">${icon(definition.icon)}</span><div class="vital-caption"><span class="vital-name" id="${prefix}-${definition.id}-name">${definition.name}</span><span class="vital-value">—</span></div><div class="vital-meter" role="progressbar" aria-labelledby="${prefix}-${definition.id}-name" aria-describedby="${prefix}-${definition.id}-help" aria-valuemin="0" aria-valuemax="100" aria-valuetext="Sin medición disponible"><span class="vital-fill" style="width:0%"></span></div><span class="vital-help" id="${prefix}-${definition.id}-help">${definition.help}</span>`;
    cells.set(definition.id,{root,value:root.querySelector('.vital-value'),meter:root.querySelector('.vital-meter'),fill:root.querySelector('.vital-fill')});initial[definition.id]=null;element.append(root);
  }
  const summary=document.createElement('span');summary.className='vitals-state';summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');element.append(summary);
  records.set(element,{cells,summary,values:initial});
  const passport=header.querySelector('#expedition-pass');if(passport?.parentElement===header)passport.after(element);else header.append(element);
  document.body.classList.add('has-vitals');
  const controller={element,update:next=>updateWorldVitals(element,next),destroy(){element.remove();records.delete(element);mounts.delete(header);if(!document.querySelector('[data-world-vitals]'))document.body.classList.remove('has-vitals');}};
  mounts.set(header,controller);controller.update(values);return controller;
}
