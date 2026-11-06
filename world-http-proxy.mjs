import http from 'node:http';
import {roomData,roomText} from './world-room-paths.mjs';

export function proxyWorldHTTP(req,res,{port,path=req.url,prefix=''}){
 return new Promise(resolve=>{
  const upstream=http.request({host:'127.0.0.1',port,path,method:req.method,headers:{...req.headers,host:req.headers.host,'accept-encoding':'identity'}},response=>{
   const headers={...response.headers};delete headers['transfer-encoding'];
   if(prefix&&String(headers['content-type']||'').includes('text/html')){delete headers['x-frame-options'];let universe='';try{universe=new URL(process.env.UNIVERSE_URL).origin;}catch{}headers['content-security-policy']="frame-ancestors 'self'"+(universe?' '+universe:'');}
   if(prefix&&headers.location)headers.location=roomData(headers.location,prefix);
   const type=String(headers['content-type']||''),rewrite=!!prefix&&/json|javascript|text\/|svg\+xml/.test(type)&&![206,304].includes(response.statusCode)&&req.method!=='HEAD';
   if(prefix&&req.method==='HEAD'&&/json|javascript|text\/|svg\+xml/.test(type)){delete headers['content-length'];delete headers.etag;}
   if(!rewrite){res.writeHead(response.statusCode,headers);response.pipe(res);response.on('end',resolve);response.on('close',resolve);response.on('error',()=>{res.destroy();resolve();});return;}
   const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size>16*1024*1024){response.destroy();res.destroy();resolve();}else chunks.push(chunk);});
   response.on('end',()=>{try{const original=Buffer.concat(chunks).toString('utf8'),content=/json/.test(type)?JSON.stringify(roomData(JSON.parse(original),prefix)):roomText(original,prefix);delete headers.etag;delete headers['content-encoding'];headers['cache-control']='private, no-cache';headers['content-length']=Buffer.byteLength(content);res.writeHead(response.statusCode,headers);res.end(content);}catch{res.destroy();}resolve();});
  });
  upstream.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'El servidor se está preparando. Vuelve a intentar en unos segundos.'}));}else res.destroy();resolve();});
  req.on('aborted',()=>upstream.destroy());res.once('close',()=>{if(!res.writableEnded){upstream.destroy();resolve();}});req.pipe(upstream);
 });
}
export function proxyWorldSocket(req,socket,head,{port,path=req.url,onClose=()=>{}}){
 let finished=false;const finish=()=>{if(!finished){finished=true;onClose();}};
 const upstream=http.request({host:'127.0.0.1',port,path,method:'GET',headers:req.headers});
 socket.on('error',()=>{upstream.destroy();finish();});
 upstream.on('upgrade',(response,peer,peerHead)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(v=>key+': '+v)).join('\r\n')+'\r\n\r\n');if(peerHead.length)socket.write(peerHead);if(head.length)peer.write(head);socket.pipe(peer);peer.pipe(socket);peer.on('error',()=>socket.destroy());peer.on('close',()=>{socket.destroy();finish();});socket.on('close',()=>{peer.destroy();finish();});});
 upstream.on('response',response=>{socket.end('HTTP/1.1 '+response.statusCode+' Forbidden\r\nConnection: close\r\n\r\n');response.resume();finish();});
 upstream.on('error',error=>{console.warn('World socket proxy upstream error:',error.code||'unknown','originPort='+port);socket.destroy();finish();});upstream.end();
}
