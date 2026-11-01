import {playWorldIntro} from './world-intro.mjs';
import {BootProgress,createBootDisplay,loadBootImage,clearBootWallpaper,showBootWallpaper} from './world-boot.mjs';
let generation=0;
export async function startWorld(){
 const turn=++generation,universe=window.XpeditionUniverseURL||'',gate=document.querySelector('#loading');document.body.classList.add('is-booting');
 for(const a of document.querySelectorAll('a[href="/#inicio"]')){a.href=universe+'/#inicio';if(window.parent!==window)a.target='_top';}
 if(window.XpeditionWorldServer){document.title=window.XpeditionWorldServer.name+' · World';const footer=document.querySelector('.games-footer>span');if(footer)footer.textContent='THE XPEDITION WORLD · '+window.XpeditionWorldServer.name;}
 clearBootWallpaper(gate);const display=createBootDisplay(gate),progress=new BootProgress((n,id)=>{if(turn===generation)display.update(n,id);});
 try{
  const bootstrap=progress.track('account',(async()=>{const r=await fetch('/api/world/bootstrap',{credentials:'same-origin',cache:'no-store'}),data=await r.json();if(!r.ok){if(data.diagnostic)console.error('World bootstrap:',data.diagnostic.code,data.diagnostic.message);throw Object.assign(Error(data.error||'No se pudo entrar a World.'),{status:r.status});}return data;})());
  const work=[
   progress.track('art',bootstrap.then(data=>{const equipped=data.shop?.equipped.wallpaper,chosen=data.shop?.catalog.wallpapers.find(w=>w.id===equipped);return showBootWallpaper(gate,chosen?.image||'/assets/branding/apocalypse/portada-reparto.webp?v=30f0948cae6a',{isCurrent:()=>turn===generation});})),
   progress.track('logo',loadBootImage('/assets/branding/apocalypse/apocalypse-ii-logo.webp')),
   progress.track('fonts',document.fonts?.ready?.catch(()=>{})||Promise.resolve()),
   progress.track('module',import('./world-ui.mjs'))
  ];
  const [data,...loaded]=await Promise.all([bootstrap,...work]);if(turn!==generation)return;
  const {WORLD_MAPS}=await import('./world-maps.mjs'),{preloadWorldArt}=await import('./cartoon-world.mjs'),{applyWorldBeds}=await import('./world-beds.mjs');if(data.beds)applyWorldBeds(WORLD_MAPS,data.beds);const {buildSurvivalProps}=await import('./world-survival-catalog.mjs');buildSurvivalProps(WORLD_MAPS,data.survival?.shared);const scene=WORLD_MAPS[data.profile.lastZone]||WORLD_MAPS.base;
  await Promise.all([
   progress.track('scene',Promise.all([...new Set([WORLD_MAPS.base,scene])].map(preloadWorldArt))),
   progress.track('character',loadBootImage('/juegos/sprites/'+encodeURIComponent(data.profile.characterId)+(window.XpeditionPerformance?.lite?'-lite':'')+'.webp'))
  ]);
  const module=loaded.at(-1);
  let worldApp;await progress.track('interface',(async()=>{worldApp=await module.bootWorld({...data,deferNetwork:!!data.intro});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})());
  document.querySelector('#world-main').setAttribute('aria-busy','false');await display.finish();await playWorldIntro(data.intro);if(data.protocolInvite){location.replace(data.protocolInvite);return;}worldApp?.startNetwork();
 }catch(error){
  if(turn!==generation)return;
  const message=error.status===401?'Entra con tu cuenta de The Xpedition para continuar.':error.status===403?'World sigue en pruebas privadas. Tu cuenta necesita acceso autorizado.':error.message||'No se pudo preparar el mundo.';
  gate.hidden=false;display.error(message);const actions=gate.querySelector('#boot-actions');actions.replaceChildren();
  if(error.status===401){const login=document.createElement('a');login.href=universe+'/#world';login.textContent='ENTRAR A MI CUENTA';actions.append(login);}
  const retry=document.createElement('button');retry.type='button';retry.textContent='VOLVER A INTENTAR';retry.onclick=()=>location.reload();actions.append(retry);
 }
}
