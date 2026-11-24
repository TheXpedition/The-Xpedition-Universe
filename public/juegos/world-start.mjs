import {BootProgress,createBootDisplay,loadBootImage,showBootWallpaper,optionalBootResource} from './world-boot.mjs';
let generation=0;
export async function startWorld(){
 const turn=++generation,universe=window.XpeditionUniverseURL||'',gate=document.querySelector('#loading');document.body.classList.add('is-booting');
 for(const a of document.querySelectorAll('a[href="/#inicio"]')){a.href=universe+'/#inicio';if(window.parent!==window)a.target='_top';}
 if(window.XpeditionWorldServer){document.title=window.XpeditionWorldServer.name+' · World';const footer=document.querySelector('.games-footer>span');if(footer)footer.textContent='THE XPEDITION WORLD · '+window.XpeditionWorldServer.name;}
 const display=createBootDisplay(gate),progress=new BootProgress((n,id)=>{if(turn===generation)display.update(n,id);});
 const art=gate.querySelector('.boot-art');
 void progress.track('art',optionalBootResource(()=>art.decode?.(),{name:'cover'}));
 try{
  const bootstrap=progress.track('account',(async()=>{const r=await fetch('/api/world/bootstrap',{credentials:'same-origin',cache:'no-store'}),data=await r.json();if(!r.ok){if(data.diagnostic)console.error('World bootstrap:',data.diagnostic.code,data.diagnostic.message);throw Object.assign(Error(data.error||'No se pudo entrar a World.'),{status:r.status});}return data;})());
  const showEquippedCover=async()=>{
   const data=await bootstrap.catch(()=>null);
   const equipped=data?.shop?.equipped?.wallpaper;
   const wallpaper=data?.shop?.catalog?.wallpapers?.find(w=>w.id===equipped)?.image;
   const isCurrent=()=>turn===generation&&!gate.hidden&&!gate.classList.contains('boot-leaving');
   if(!wallpaper||!isCurrent()||new URL(wallpaper,location.href).href===art.src)return;
   return showBootWallpaper(gate,wallpaper,{isCurrent});
  };
  void optionalBootResource(showEquippedCover,{name:'equipped wallpaper'});
  const module=progress.track('module',import('./world-ui.mjs'));
  const [data,worldUI]=await Promise.all([bootstrap,module]);if(turn!==generation)return;
  if(data.protocolInvite){location.replace(data.protocolInvite);return;}
  const worldApp=await progress.track('interface',worldUI.bootWorld({...data,deferNetwork:true}));
  if(turn!==generation)return;
  document.querySelector('#world-main').setAttribute('aria-busy','false');
  worldApp?.startNetwork();
  await display.finish();
 }catch(error){
  if(turn!==generation)return;
  const message=error.status===401?'Entra con tu cuenta de The Xpedition para continuar.':error.status===403?'World sigue en pruebas privadas. Tu cuenta necesita acceso autorizado.':error.message||'No se pudo preparar el mundo.';
  gate.hidden=false;display.error(message);const actions=gate.querySelector('#boot-actions');actions.replaceChildren();
  if(error.status===401){const login=document.createElement('a');login.href=universe+'/#world';login.textContent='ENTRAR A MI CUENTA';actions.append(login);}
  const retry=document.createElement('button');retry.type='button';retry.textContent='VOLVER A INTENTAR';retry.onclick=()=>location.reload();actions.append(retry);
 }
}
