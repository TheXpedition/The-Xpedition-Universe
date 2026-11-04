import {createHash} from 'node:crypto';
// Read-only art downloads often arrive in a burst of hundreds. Share the same
// authorization check briefly; never cache API/HTML/socket permission decisions.
export function createWorldAssetAccess(authorize,{now=Date.now,ttl=2000,max=512}={}){
 const entries=new Map();
 return async(req,id)=>{
  const key=id+':'+createHash('sha256').update(req.headers.cookie||'').digest('hex'),at=now(),old=entries.get(key);
  if(old&&old.until>at)return old.promise;
  if(entries.size>=max)entries.delete(entries.keys().next().value);
  const entry={until:at+ttl};entry.promise=Promise.resolve().then(()=>authorize(req,id)).catch(error=>{if(entries.get(key)===entry)entries.delete(key);throw error;});entries.set(key,entry);return entry.promise;
 };
}
