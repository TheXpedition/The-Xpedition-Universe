import {randomUUID} from 'node:crypto';
export function createWorldIntimacy({clientFor,connected,send,bedFor,isAdult,approach,begin,finish,release,occupied,now=Date.now,fail}) {
 const requests=new Map(),sessions=new Map(),byUser=new Map(),beds=new Map(),lastRequest=new Map();
 const client=id=>clientFor({id}),person=c=>({id:c.user.id,name:c.user.name});
 const key=(c,bedId)=>c.zone.id+':'+bedId;
 const active=c=>c&&isAdult(c)&&c.wellness?.life?.status==='alive'&&!c.zone.private&&!c.swimming&&!c.careBusy&&!c.eating&&!c.tradeBusy&&!c.seat;
 const hasRequest=id=>[...requests.values()].some(r=>r.members.includes(id));
 function closeRequest(r,message) {requests.delete(r.id);for(const id of r.members){const c=client(id);if(c)send(c,{type:'intimacy-request-closed',requestId:r.id,message});}}
 function closeSession(s,message) {
  s.cancelled=true;sessions.delete(s.id);beds.delete(s.bedKey);
  for(const id of s.members){byUser.delete(id);const c=client(id);if(c){release(c,s);send(c,{type:'intimacy-closed',sessionId:s.id,message});}}
 }
 function prune() {
  for(const r of requests.values())if(now()>=r.expiresAt||r.members.some(id=>!client(id)))closeRequest(r,'La invitación caducó o la otra persona salió.');
 }
 function context(c,bedId) {
  if(!active(c)||byUser.has(c?.user.id))fail(409,'Debes estar de pie, libre y consciente en la misma zona.');
  const bed=bedFor(c,bedId);if(!bed?.point)fail(400,'Selecciona una cama disponible.');
  if(Math.hypot(c.p.x-bed.point.x,c.p.y-bed.point.y)>800)fail(409,'Acércate a la cama para invitar a alguien.');
  if(beds.has(key(c,bedId))||occupied(c,bedId))fail(409,'Esta cama está ocupada o reservada.');
  return bed;
 }
 function candidates(c,bedId) {
  prune();context(c,bedId);return connected().filter(p=>p!==c&&active(p)&&!byUser.has(p.user.id)&&!hasRequest(p.user.id)&&p.zone.id===c.zone.id&&Math.hypot(p.p.x-c.p.x,p.p.y-c.p.y)<=550).map(person);
 }
 return {
  candidates,
  reserved(zone,bedId){return beds.has(zone+':'+bedId);},
  cancel(userId,message='El encuentro se canceló. Puedes volver a moverte libremente.') {
   for(const r of requests.values())if(r.members.includes(userId))closeRequest(r,message);
   const s=sessions.get(byUser.get(userId));if(s)closeSession(s,message);
  },
  request(c,{bedId,target,protectedEncounter=true,acknowledged=false,pregnancyConsent=false}={}) {
   prune();context(c,bedId);
   if(acknowledged!==true||typeof protectedEncounter!=='boolean'||typeof pregnancyConsent!=='boolean')fail(400,'Confirma las condiciones del encuentro privado.');
   if(hasRequest(c.user.id))fail(409,'Ya tienes una invitación pendiente.');
   if(!candidates(c,bedId).some(p=>p.id===target))fail(409,'La persona debe estar cerca, disponible y en la misma zona.');
   if(now()-(lastRequest.get(c.user.id)??-10000)<5000)fail(429,'Espera unos segundos antes de enviar otra invitación.');
   if(protectedEncounter&&(c.wellness.medicines.condom||0)<1)fail(409,'Necesitas un preservativo en tu inventario para esta invitación protegida.');
   const to=client(target),r={id:randomUUID(),members:[c.user.id,target],zone:c.zone.id,bedId,protectedEncounter,pregnancyConsent,expiresAt:now()+30000};
   requests.set(r.id,r);lastRequest.set(c.user.id,now());
   send(to,{type:'intimacy-request',request:{id:r.id,from:person(c),protectedEncounter,pregnancyConsent,expiresAt:r.expiresAt}});
   send(c,{type:'intimacy-sent',request:{id:r.id,to:person(to),expiresAt:r.expiresAt}});return {ok:true};
  },
  decline(user,requestId) {
   prune();const r=requests.get(requestId);if(!r||!r.members.includes(user.id))fail(403,'No tienes esta invitación.');
   closeRequest(r,'Invitación rechazada o cancelada.');return {ok:true};
  },
  accept(user,{requestId,acknowledged=false}={}) {
   prune();const r=requests.get(requestId);if(!r||r.members[1]!==user.id)fail(403,'No tienes esta invitación.');
   if(acknowledged!==true)fail(400,'Debes aceptar expresamente las condiciones del encuentro.');
   const people=r.members.map(client);
   if(people.some(p=>!active(p)||p.zone.id!==r.zone||byUser.has(p.user.id))||Math.hypot(people[0].p.x-people[1].p.x,people[0].p.y-people[1].p.y)>550)fail(409,'Ambas personas deben seguir disponibles en la misma zona.');
   const bed=context(people[0],r.bedId);
   if(r.protectedEncounter&&(people[0].wellness.medicines.condom||0)<1)fail(409,'La protección ya no está disponible.');
   const s={...r,id:randomUUID(),phase:'approach',bedKey:key(people[0],r.bedId),point:bed.point,expiresAt:now()+60000,cancelled:false};
   requests.delete(r.id);sessions.set(s.id,s);beds.set(s.bedKey,s.id);for(const id of s.members)byUser.set(id,s.id);
   try{for(const p of people)approach(p,s.point,s);}catch(error){closeSession(s,'No hay un camino libre hacia la cama.');throw error;}
   for(const p of people)send(p,{type:'intimacy-session',session:{id:s.id,phase:s.phase,bedId:s.bedId,message:'Camina hacia la cama. Cualquier indicación manual cancela el encuentro.'}});
   return {ok:true};
  },
  tick() {
   prune();for(const s of [...sessions.values()]) {
    const people=s.members.map(client);
    if(now()>=s.expiresAt||people.some(p=>!p||p.zone.id!==s.zone||p.wellness.life.status!=='alive'||p.swimming)||!bedFor(people[0],s.bedId)||occupied(people[0],s.bedId)) {closeSession(s,'El encuentro terminó al cambiar las condiciones de la cama.');continue;}
    if(s.phase==='approach'&&people.every(p=>Math.hypot(p.p.x-s.point.x,p.p.y-s.point.y)<=45)) {
     if(people.some(p=>p.careBusy||p.tradeBusy||p.eating||p.seat)||s.protectedEncounter&&people[0].wellness.medicines.condom<1){closeSession(s,'Una persona dejó de estar disponible.');continue;}
     s.phase='private';s.finishAt=now()+6000;
     for(const p of people){begin(p,s);send(p,{type:'intimacy-session',session:{id:s.id,phase:s.phase,bedId:s.bedId,until:s.finishAt,message:'Momento privado · puedes cancelar en cualquier instante.'}});}
    } else if(s.phase==='private'&&now()>=s.finishAt) {
     s.phase='finishing';
     Promise.resolve().then(()=>finish(people,s,()=>!s.cancelled&&sessions.has(s.id))).then(()=>{if(!s.cancelled)closeSession(s,'El encuentro terminó. Los cambios de salud son privados y se revisan en consulta.');}).catch(error=>{if(!s.cancelled)closeSession(s,error.message||'No se pudo completar el encuentro.');});
    }
   }
  }
 };
}
