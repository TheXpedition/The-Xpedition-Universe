import {beginWorldVisit} from './world-entry-session.mjs';
beginWorldVisit();
const ticket=new URLSearchParams(location.hash.slice(1)).get('ticket');history.replaceState(null,'','/auth');
async function currentSession(){try{const r=await fetch('/api/world/access',{credentials:'same-origin',cache:'no-store'});return r.ok&&(await r.json()).canPlay===true;}catch{return false;}}
try{if(await currentSession())location.replace('/juegos/');else{const r=await fetch('/api/world/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket})});const d=await r.json();if(!r.ok&&!await currentSession())throw Error(d.error||'No se pudo entrar a World.');location.replace('/juegos/');}}catch(e){document.querySelector('#status').textContent=e.message;const a=document.querySelector('#return');a.href=(window.XpeditionUniverseURL||'')+'/#world';a.hidden=false;}
