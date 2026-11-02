import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const mediaRoot=new URL('./public/',import.meta.url);
const mime={mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav'};
// Shared preset media is streamed after room authorization, without a simulation worker.
export function serveWorldMedia(req,res,relative){
 let pathname;try{pathname=decodeURIComponent(new URL(relative,'http://world.invalid').pathname);}catch{return false;}
 const match=/^\/juegos\/(?:x-protocol|last-grip)\/media\/[a-zA-Z0-9_/-]+\.(mp4|webm|mp3|ogg|wav)$/.exec(pathname);
 if(!match||!['GET','HEAD'].includes(req.method))return false;
 const root=path.resolve(fileURLToPath(mediaRoot)),filename=path.resolve(root,'.'+pathname);
 if(!filename.startsWith(root+path.sep))return false;
 let stat;try{stat=fs.statSync(filename);if(!stat.isFile())return false;}catch{return false;}
 let start=0,end=stat.size-1,status=200;
 const headers={'Content-Type':mime[match[1]],'Content-Length':stat.size,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'};
 if(req.headers.range){const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!range||!range[1]&&!range[2]){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return true;}
  start=range[1]?Number(range[1]):Math.max(0,stat.size-Number(range[2]));end=range[1]&&range[2]?Math.min(stat.size-1,Number(range[2])):stat.size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=stat.size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return true;}
  status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;headers['Content-Length']=end-start+1;
 }
 res.writeHead(status,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(filename,{start,end}).on('error',()=>res.destroy()).pipe(res);return true;
}
export async function reclaimIdleWorlds(records,stop,underPressure){
 const idle=[...records].filter(record=>!record.stopping&&!record.booting&&record.connections===0&&!record.requests).sort((a,b)=>a.used-b.used);
 for(const record of idle){if(!underPressure())break;await stop(record);}
}
