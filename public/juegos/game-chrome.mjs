import {worldIcon} from './world-icons.mjs';
import {installLandscapeMode} from '../world-landscape.mjs';
function polishButtons(root){for(const button of root.querySelectorAll('button')){
 if(button.closest('#touch-controls,.game-touch-controls')||button.classList.contains('game-icon-button'))continue;
 const label=button.textContent.trim(),close=/^[×✕✖xX]$/.test(label),icon=!label&&button.querySelector('[data-icon]');
 if(close){button.innerHTML=worldIcon('close');button.classList.add('game-close-button');if(!button.getAttribute('aria-label'))button.setAttribute('aria-label','Cerrar');}
 if(close||icon||label==='?'&&button.closest('header'))button.classList.add('game-icon-button');
}}
if(location.pathname.includes('/juegos/')){
 const mount=()=>{polishButtons(document);const observer=new MutationObserver(records=>{for(const record of records){const root=record.target.nodeType===1?record.target:record.target.parentElement;if(root?.closest?.('button.game-icon-button'))continue;if(root)polishButtons(root.closest('button')?.parentElement||root);}});observer.observe(document.body,{childList:true,subtree:true});installLandscapeMode();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
