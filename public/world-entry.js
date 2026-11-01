'use strict';
async function renderWorldEntry(){
 const root=document.createElement('section');root.className='world-entry';
 root.innerHTML=`<div class="world-entry-backdrop"></div><div class="world-entry-copy"><span class="eyebrow">UNA NUEVA FORMA DE VIVIR EL UNIVERSO</span><h1>THE XPEDITION<br><em>WORLD</em></h1><img class="world-entry-logo" src="/assets/branding/apocalypse/apocalypse-ii-logo.webp" alt="Campria Presents: Apocalypse II"><p>Recorre el campamento, descubre sus rincones y vive los desafíos y las ceremonias en tiempo real.</p><div class="world-entry-actions"><button class="btn primary" disabled>Entrar ${icon('arrow')}</button><span class="world-entry-status" role="status">Consultando el acceso…</span></div><div class="world-entry-details"><span>UN MUNDO CONECTADO</span><span>DESAFÍOS EN VIVO</span><span>LA CEREMONIA</span></div></div>`;
 $('#main').replaceChildren(root);
 try{
  const gate=await api('/world/access');if(!root.isConnected)return;
  const status=$('.world-entry-status',root),button=$('.world-entry-actions button',root);
  const closed=!gate.publicEnabled&&!gate.staffPreview;
  button.disabled=closed||!gate.configured;
  status.textContent=closed?'Por ahora, reservado al STAFF.':!gate.configured?'Estamos preparando el acceso a World.':!state.user?'Entra con tu cuenta del universo.':gate.role==='staff'?'Acceso de STAFF':gate.role==='participant'?'Tu lugar en Apocalypse II está confirmado.':'Entrarás como espectador.';
  button.onclick=()=>{if(!state.user){openAuth('login');return;}location.assign('/juegos/');};
  if(state.user?.staff){const manage=document.createElement('a');manage.className='world-entry-manage';manage.href='#moderacion/world';manage.textContent='Administrar acceso';$('.world-entry-actions',root).append(manage);}
 }catch(error){if(!root.isConnected)return;$('.world-entry-status',root).textContent='No pudimos consultar el acceso. Vuelve a intentar.';}
}

moderationTabs.push(['world','World']);
const beforeWorldModeration=loadModerationBody;
loadModerationBody=async function(){
 if(moderationView.tab!=='world')return beforeWorldModeration();
 const root=$('#moderationBody');if(!root)return;root.innerHTML='<div class="mod-panel">Consultando World…</div>';
 try{const {access}=await api('/moderation/world');if(!root.isConnected||moderationView.tab!=='world')return;
  root.innerHTML=`<section class="mod-panel world-access-panel"><div><span class="mod-eyebrow">THE XPEDITION WORLD</span><h2>${access.publicEnabled?'World está abierto.':'World está cerrado al público.'}</h2><p>${access.publicEnabled?'Los participantes confirmados de Apocalypse II pueden competir. Las demás cuentas pueden entrar como espectadores.':'Solo el STAFF puede entrar. Puedes revisar el mundo antes de abrirlo a la comunidad.'}</p></div><button class="btn ${access.publicEnabled?'secondary':'primary'}" data-world-access="${!access.publicEnabled}" ${!access.configured&&!access.publicEnabled?'disabled':''}>${access.publicEnabled?'Cerrar World':'Abrir World'}</button>${!access.configured?'<p class="world-entry-status">El servidor de World aún está preparando su acceso.</p>':''}<a href="#world" class="world-entry-manage">Ver la entrada de World ${icon('arrow')}</a></section>`;
 }catch(error){if(root.isConnected)root.textContent=error.message;}
};
const beforeWorldModerationRoute=renderModeration;
renderModeration=function(){if(location.hash==='#moderacion/world')moderationView.tab='world';return beforeWorldModerationRoute();};
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-world-access]');if(!button||button.disabled||!state.user?.staff)return;
 button.disabled=true;try{await api('/moderation/world',{method:'PUT',body:{enabled:button.dataset.worldAccess==='true'}});await loadModerationBody();toast(button.dataset.worldAccess==='true'?'World está abierto.':'World está cerrado al público.');}catch(error){button.disabled=false;toast(error.message,true);}
});
