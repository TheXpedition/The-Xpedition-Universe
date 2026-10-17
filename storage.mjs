import fs from 'node:fs/promises';
import path from 'node:path';

const storageError = (message,status=503)=>Object.assign(new Error(message),{status});
export async function openStorage(dataDir,remote) {
  if (!remote) {
    const dir=path.join(dataDir,'uploads'); await fs.mkdir(dir,{recursive:true});
    return {
      kind:'local',
      put:(id,buffer)=>fs.writeFile(path.join(dir,id),buffer,{flag:'wx'}),
      get:async id=>{try{return await fs.readFile(path.join(dir,id));}catch(e){if(e.code==='ENOENT')throw storageError('Archivo no disponible.',404);throw e;}},
      remove:async id=>{if(id)await fs.rm(path.join(dir,id),{force:true});}
    };
  }
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !secret) throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY. No se guardarán adjuntos en un disco temporal.');
  const endpoint = new URL(process.env.SUPABASE_URL);
  if(endpoint.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(endpoint.hostname))throw new Error('SUPABASE_URL debe usar HTTPS.');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(endpoint.origin,secret,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(25000)})}
  });
  const name=process.env.SUPABASE_STORAGE_BUCKET||'xpedition-private';
  let {data:bucket,error}=await supabase.storage.getBucket(name);
  if(error && ['404','400'].includes(String(error.status||error.statusCode))) {
    const created=await supabase.storage.createBucket(name,{public:false,fileSizeLimit:6*1024*1024,
      allowedMimeTypes:['image/png','image/jpeg','image/gif','image/webp','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']});
    if(created.error)throw new Error('No se pudo crear el depósito privado de Supabase. Revisa la clave del servidor.');
    ({data:bucket,error}=await supabase.storage.getBucket(name));
  }
  if(error||!bucket)throw new Error('No se pudo consultar el almacenamiento de Supabase.');
  if(bucket.public)throw new Error('El depósito de adjuntos debe ser privado. Desactiva Public bucket en Supabase.');
  const objects=supabase.storage.from(name);
  return {
    kind:'supabase',
    put:async(id,buffer,mime)=>{
      const {error}=await objects.upload(id,buffer,{contentType:mime,upsert:false,cacheControl:'0'});
      if(error)throw storageError('No se pudo guardar el archivo. Revisa la cuota de almacenamiento de Supabase.');
    },
    get:async id=>{
      const {data,error}=await objects.download(id);
      if(error)throw storageError('Archivo no disponible.',String(error.status||error.statusCode)==='404'?404:503);
      return Buffer.from(await data.arrayBuffer());
    },
    remove:async id=>{
      if(!id)return;
      const {error}=await objects.remove([id]);
      if(error)throw storageError('El archivo se ocultó, pero su borrado en Supabase no pudo completarse.');
    }
  };
}
