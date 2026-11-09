export function watchClinicNotifications({notice,fetchPending,onProcedure,onPsychology,enabled=()=>true,win=window}){
 const doc=win.document;
 const shownConsent=new Set();
 let revision=0,request=null,destroyed=false;

 function care(value,update,recovered=false){
  if(!value)return;
  if(recovered&&(!value.canConsent||value.status!=='consent'||shownConsent.has(value.id)))return;
  shownConsent.add(value.id);
  update(value);
 }

 function handle(packet){
  switch(packet.type){
   case 'clinic-invitation':
   case 'clinic-request':
    revision++;
    notice.show({type:'appointment',appointment:packet.appointment});
    break;
   case 'clinic-invoice':
    revision++;
    notice.show({type:'invoice',invoice:packet.invoice});
    break;
   case 'clinic-appointment':
    revision++;
    notice.close(packet.appointment.id);
    break;
   case 'clinic-payment':
    if(packet.invoice){revision++;notice.close(packet.invoice.id);}
    break;
   case 'clinic-procedure':
    care(packet.procedure,onProcedure);
    break;
   case 'clinic-psychology':
    care(packet.session,onPsychology);
    break;
  }
 }

 function refresh(){
  if(destroyed||request||doc.hidden||!enabled())return;
  const startedAt=revision;
  request=new win.AbortController();
  const timer=win.setTimeout(()=>request?.abort(),6000);
  void (async()=>{
   try{
    const data=await fetchPending(request.signal);
    if(destroyed||!enabled()||doc.hidden)return;
    if(startedAt===revision){
     notice.sync([
      ...data.appointments.map(appointment=>({type:'appointment',appointment})),
      ...data.invoices.map(invoice=>({type:'invoice',invoice}))
     ]);
    }
    care(data.procedure,onProcedure,true);
    care(data.psychology,onPsychology,true);
   }catch{
    // The next refresh reads the pending state again.
   }finally{
    win.clearTimeout(timer);
    request=null;
   }
  })();
 }

 const poll=win.setInterval(refresh,10000);
 doc.addEventListener('visibilitychange',refresh);
 win.addEventListener('online',refresh);
 return {handle,refresh,invalidate(){revision++;},destroy(){
  destroyed=true;
  request?.abort();
  win.clearInterval(poll);
  doc.removeEventListener('visibilitychange',refresh);
  win.removeEventListener('online',refresh);
 }};
}
