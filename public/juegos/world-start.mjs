import {playWorldIntro,needsWorldIntro} from './world-intro.mjs';
import {BootProgress,createBootDisplay,loadBootImage,clearBootWallpaper,showBootWallpaper,optionalBootResource} from './world-boot.mjs';
let generation=0;
export async function startWorld(){
 const turn=++generation,universe=window.XpeditionUniverseURL||'',gate=document.querySelector('#loading');document.body.classList.add('is-booting');
 for(const a of document.querySelectorAll('a[href="/#inicio"]')){a.href=universe+'/#inicio';if(window.parent!==window)a.target='_top';}
 if(window.XpeditionWorldServer){document.title=window.XpeditionWorldServer.name+' · World';const footer=document.querySelector('.games-footer>span');if(footer)footer.textContent='THE XPEDITION WORLD · '+window.XpeditionWorldServer.name;}
 clearBootWallpaper(gate);const display=createBootDisplay(gate),progress=new BootProgress((n,id)=>{if(turn===generation)display.update(n,id);});
 try{
  const bootstrap=progress.track('account',(async()=>{const r=await fetch('/api/world/bootstrap',{credentials:'same-origin',cache:'no-store'}),data=await r.json();if(!r.ok){if(data.diagnostic)console.error('World bootstrap:',data.diagnostic.code,data.diagnostic.message);throw Object.assign(Error(data.error||'No se pudo entrar a World.'),{status:r.status});}return data;})());
  const work=[
   progress.track('art',optionalBootResource(async()=>{const data=await bootstrap;const equipped=data.shop?.equipped.wallpaper,chosen=data.shop?.catalog.wallpapers.find(w=>w.id===equipped);return showBootWallpaper(gate,chosen?.image||'/assets/branding/apocalypse/portada-reparto.webp?v=30f0948cae6a',{isCurrent:()=>turn===generation});},{name:'wallpaper',timeoutMs:5000})),
   progress.track('logo',optionalBootResource(()=>loadBootImage('/assets/branding/apocalypse/apocalypse-ii-logo.webp'),{name:'logo',timeoutMs:5000})),
   progress.track('fonts',optionalBootResource(()=>document.fonts?.ready||Promise.resolve(),{name:'fonts',timeoutMs:4000})),
   progress.track('module',import('./world-ui.mjs'))
  ];
  const [data,...loaded]=await Promise.all([bootstrap,...work]);if(turn!==generation)return;
  const {WORLD_MAPS}=await import('./world-maps.mjs'),{preloadWorldArt}=await import('./cartoon-world.mjs'),{applyWorldBeds}=await import('./world-beds.mjs');if(data.beds)applyWorldBeds(WORLD_MAPS,data.beds);const {buildSurvivalProps}=await import('./world-survival-catalog.mjs');buildSurvivalProps(WORLD_MAPS,data.survival?.shared);const scene=WORLD_MAPS[data.profile.lastZone]||WORLD_MAPS.base;
  await Promise.all([
   progress.track('scene',optionalBootResource(()=>Promise.all([...new Set([WORLD_MAPS.base,scene])].map(preloadWorldArt)),{name:'map artwork',timeoutMs:6500})),
   progress.track('character',optionalBootResource(()=>loadBootImage('/juegos/sprites/'+encodeURIComponent(data.profile.characterId)+(window.XpeditionPerformance?.lite?'-lite':'')+'.webp'),{name:'character artwork',timeoutMs:6500}))
  ]);
  const module=loaded.at(-1),introOptions={userId:data.user.id},introPending=needsWorldIntro(data.intro,introOptions);
  let worldApp;await progress.track('interface',(async()=>{worldApp=await module.bootWorld({...data,deferNetwork:introPending});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})());
  document.querySelector('#world-main').setAttribute('aria-busy','false');if(introPending)document.body.classList.add('is-intro-pending');await display.finish();try{if(introPending)await playWorldIntro(data.intro,introOptions);}finally{document.body.classList.remove('is-intro-pending');}if(data.protocolInvite){location.replace(data.protocolInvite);return;}worldApp?.startNetwork();
 }catch(error){
  if(turn!==generation)return;
  const message=error.status===401?'Entra con tu cuenta de The Xpedition para continuar.':error.status===403?'World sigue en pruebas privadas. Tu cuenta necesita acceso autorizado.':error.message||'No se pudo preparar el mundo.';
  gate.hidden=false;display.error(message);const actions=gate.querySelector('#boot-actions');actions.replaceChildren();
  if(error.status===401){const login=document.createElement('a');login.href=universe+'/#world';login.textContent='ENTRAR A MI CUENTA';actions.append(login);}
  const retry=document.createElement('button');retry.type='button';retry.textContent='VOLVER A INTENTAR';retry.onclick=()=>location.reload();actions.append(retry);
 }
}
