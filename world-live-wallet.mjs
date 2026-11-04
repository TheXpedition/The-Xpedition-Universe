// Only presentation snapshots are cached. Stakes and purchases always validate
// and debit the real profile balance inside the database transaction.
export function createLiveWallet(db,{now=Date.now,ttl=2000}={}){
 const entries=new Map();
 function invalidate(id){entries.delete(id);}
 async function get(id){
  const previous=entries.get(id);if(previous&&previous.until>now())return previous.promise;
  if(entries.size>=256)entries.delete(entries.keys().next().value);
  const entry={until:now()+ttl};entry.promise=db.one('SELECT coins FROM user_progression WHERE user_id=?',id).then(row=>({coins:Number(row?.coins||0)})).catch(error=>{if(entries.get(id)===entry)entries.delete(id);throw error;});entries.set(id,entry);return entry.promise;
 }
 async function getMany(ids){
  ids=[...new Set(ids)];const missing=ids.filter(id=>!entries.has(id)||entries.get(id).until<=now());
  if(missing.length){const batch=db.all('SELECT user_id,coins FROM user_progression WHERE user_id IN ('+missing.map(()=>'?').join(',')+')',...missing).then(rows=>new Map(rows.map(row=>[row.user_id,Number(row.coins||0)])));
   for(const id of missing){if(entries.size>=256)entries.delete(entries.keys().next().value);const entry={until:now()+ttl};entry.promise=batch.then(rows=>({coins:rows.get(id)||0})).catch(error=>{if(entries.get(id)===entry)entries.delete(id);throw error;});entries.set(id,entry);}
  }
  return new Map(await Promise.all(ids.map(async id=>[id,await get(id)])));
 }
 return {get,getMany,invalidate};
}
