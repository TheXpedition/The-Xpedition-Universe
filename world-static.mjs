import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {roomText} from './world-room-paths.mjs';
const root=path.join(import.meta.dirname,'public');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
// Called only AFTER the hub authorizes this account and room. Challenge review
// pages and gated minigames keep their additional checks in the game instance.
export function serveWorldStatic(req,res,{relative,prefix,room,universeURL=''}){
 if(!['GET','HEAD'].includes(req.method))return false;
 let pathname;try{pathname=decodeURIComponent(new URL(relative,'http://world.invalid').pathname);}catch{return false;}
 if(pathname==='/world-config.js'){
  const text='globalThis.XpeditionUniverseURL='+JSON.stringify(universeURL)+';globalThis.XpeditionWorldServer='+JSON.stringify(room)+';';
  res.writeHead(200,{'Content-Type':mime['.js'],'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:text);return true;
 }
 const aliases={'/auth':'/juegos/auth.html','/juegos':'/juegos/index.html','/juegos/':'/juegos/index.html'};
 for(const name of ['x-protocol','last-grip','bonju-chef'])for(const suffix of ['', '/'])aliases['/juegos/'+name+suffix]='/juegos/'+name+'/index.html';
 pathname=aliases[pathname]||pathname;
 if(/\/(?:review[^/]*|recorrido-visual)(?:\/|\.|$)/.test(pathname)||pathname.startsWith('/juegos/reto-pelotas/'))return false;
 if(!/^\/(?:juegos\/|assets\/(?:maps|branding)\/apocalypse\/|brand\/|performance\.(?:js|mjs|css)$|world-(?:intro-player|landscape)\.(?:mjs|css)$)/.test(pathname))return false;
 const file=path.resolve(root,'.'+pathname),ext=path.extname(file);
 if(!file.startsWith(root+path.sep)||!mime[ext])return false;
 let stat;try{stat=fs.statSync(file);if(!stat.isFile())return false;}catch{return false;}
 const text=/^\.(?:html|mjs|js|css|json|svg)$/.test(ext),tag='W/"'+stat.size.toString(16)+'-'+stat.mtimeMs.toString(16)+'-'+createHash('sha256').update(prefix).digest('hex').slice(0,10)+'"';
 const headers={'Content-Type':mime[ext],'Cache-Control':text?'private, no-cache':'private, max-age=86400','ETag':tag,'Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(ext==='.html'){let origin='';try{origin=new URL(universeURL).origin;}catch{}headers['Content-Security-Policy']="frame-ancestors 'self'"+(origin?' '+origin:'');headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()';}
 if(req.headers['if-none-match']===tag){res.writeHead(304,headers);res.end();return true;}
 if(text){const content=roomText(fs.readFileSync(file,'utf8'),prefix);headers['Content-Length']=Buffer.byteLength(content);res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:content);return true;}
 let start=0,end=stat.size-1,status=200;headers['Content-Length']=stat.size;headers['Accept-Ranges']='bytes';
 if(req.headers.range){const r=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);start=r?.[1]?Number(r[1]):Math.max(0,stat.size-Number(r?.[2]));end=r?.[1]&&r[2]?Math.min(stat.size-1,Number(r[2])):stat.size-1;
  if(!r||!r[1]&&!r[2]||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start){res.writeHead(416,{...headers,'Content-Length':0,'Content-Range':'bytes */'+stat.size});res.end();return true;}
  status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;headers['Content-Length']=end-start+1;
 }
 res.writeHead(status,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);return true;
}
