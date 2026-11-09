export function ensureClinicTheme(parent){
 const doc=parent.ownerDocument||parent;
 if(!doc.head||doc.querySelector('[data-clinic-interface]'))return;
 const link=doc.createElement('link');link.rel='stylesheet';link.href='/juegos/clinic-interface-v2.css?v=20261109-1';link.dataset.clinicInterface='v2';doc.head.append(link);
}
