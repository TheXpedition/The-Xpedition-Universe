import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {monetizationConfig,adsText,publicContactEmail,registeredPublisher} from '../monetization.mjs';

test('anuncios apagados sin editor, aprobación, unidad y consentimiento; el editor real sirve solo para verificar',()=>{
 assert.equal(monetizationConfig({}).adsense.enabled,false);assert.equal(monetizationConfig({}).adsense.publisher,registeredPublisher);assert.equal(adsText(monetizationConfig({ADSENSE_PUBLISHER_ID:''})),null);
 const ready={ADSENSE_PUBLISHER_ID:'ca-pub-1234567890123456',ADSENSE_DISPLAY_SLOT:'1234567890',ADSENSE_ENABLED:'true',ADSENSE_SITE_APPROVED:'true',ADSENSE_CONSENT_READY:'true'};
 assert.equal(monetizationConfig(ready).adsense.enabled,true);for(const missing of Object.keys(ready)){assert.equal(monetizationConfig({...ready,[missing]:''}).adsense.enabled,false);}
 const c=monetizationConfig(ready);assert.equal(c.contactEmail,publicContactEmail);assert.equal(adsText(c),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
});

test('la verificación sirve metatag y ads.txt con el ID configurado sin activar anuncios',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'xp-ad-verification-')),root=new URL('../',import.meta.url),child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATABASE_URL:'',PERSISTENCE_MODE:'local',DATA_DIR:data,HOST:'127.0.0.1',PORT:'0',ADSENSE_PUBLISHER_ID:'ca-pub-1234567890123456',ADSENSE_ENABLED:'false',ADSENSE_SITE_APPROVED:'false',ADSENSE_CONSENT_READY:'false'},stdio:['ignore','pipe','pipe']});
 try{const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('No inició la prueba aislada')),20000);child.stdout.on('data',chunk=>{out+=chunk;const port=out.match(/localhost:(\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});child.once('error',reject);});
  const config=await(await fetch(base+'/api/config')).json();assert.equal(config.monetization.adsense.enabled,false);const htmlResponse=await fetch(base+'/'),html=await htmlResponse.text();assert(html.includes('name="google-adsense-account" content="ca-pub-1234567890123456"'));assert.equal(Number(htmlResponse.headers.get('content-length')),Buffer.byteLength(html));const head=await fetch(base+'/',{method:'HEAD'});assert.equal(Number(head.headers.get('content-length')),Buffer.byteLength(html));assert.equal(await(await fetch(base+'/ads.txt')).text(),'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));}
});

test('privacidad muestra contacto real y no carga publicidad sin aprobación ni incluye colaboraciones',async()=>{
 const dom=new JSDOM('<main id="main"></main>',{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 try{w.state={route:'inicio',config:{monetization:monetizationConfig({})}};w.$=(s,root=w.document)=>root.querySelector(s);w.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));w.icon=()=>'<svg></svg>';w.renderAbout=()=>{};
  w.eval(fs.readFileSync(new URL('../public/monetization.js',import.meta.url),'utf8')+'\nwindow.moneyTest={renderPrivacy};');w.moneyTest.renderPrivacy();await new Promise(r=>setTimeout(r,15));assert(w.document.querySelector('a[href^="mailto:"]').href.includes(publicContactEmail));assert.equal(w.document.querySelector('.ad-placement'),null);assert.equal(w.document.querySelector('script[src*="googlesyndication"]'),null);assert(w.document.querySelector('main').textContent.includes('todavía no está activada'));assert(!w.document.querySelector('main').textContent.includes('patrocinios'));
 }finally{w.close();}
});
