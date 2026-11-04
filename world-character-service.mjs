import {characterPolicy} from './public/juegos/world-character-policy.mjs';

export function createWorldCharacters({db,catalog,now=Date.now,fail=(status,message)=>{throw Object.assign(Error(message),{status});},onChange=async()=>{}}){
 let tail=Promise.resolve();
 const serial=fn=>{const operation=tail.then(()=>db.transaction(fn));tail=operation.catch(()=>{});return operation;};
 const definitions=()=>typeof catalog==='function'?catalog():catalog;
 const valid=id=>typeof id==='string'&&definitions().some(c=>c.id===id);
 async function ownership(userId){return db.one('SELECT character_id,user_id,updated FROM world_character_reservations WHERE user_id=?',userId);}
 async function snapshot(user,context={},preferredId){
  const rows=await db.all('SELECT r.character_id,r.user_id,u.name FROM world_character_reservations r JOIN users u ON u.id=r.user_id ORDER BY r.character_id'),reserved=new Map(rows.map(r=>[r.character_id,r])),own=context.audience?{character_id:preferredId||'dani'}:rows.find(r=>r.user_id===user.id),characters={};
  for(const character of definitions()){
   const policy=characterPolicy(character.id,context),owner=reserved.get(character.id),self=context.audience?own?.character_id===character.id:owner?.user_id===user.id,occupied=!context.audience&&!!owner&&!self,notOwned=Array.isArray(context.owned)&&!context.owned.includes(character.id),locked=policy.locked||occupied||notOwned;
   characters[character.id]={...policy,selectable:!locked,locked,occupied,self,reason:policy.reason||(occupied?'Elegido por '+owner.name:notOwned?'Disponible en la tienda por 500 monedas':''),...(owner?{ownerName:owner.name}:{})};
  }
  return {selectedId:own?.character_id||null,needsSelection:!own||!characters[own.character_id]||!!characters[own.character_id]?.locked||preferredId!==undefined&&preferredId!==own.character_id,characters};
 }
 async function claim(user,id,context={},save=async()=>{}){
  if(!valid(id))fail(400,'Personaje inválido.');if(Array.isArray(context.owned)&&!context.owned.includes(id))fail(403,'Compra este personaje en la tienda antes de seleccionarlo.');const policy=characterPolicy(id,context);if(policy.locked)fail(403,policy.reason+'.');
  if(context.audience){await save(id);return snapshot(user,context,id);}
  await serial(async()=>{
   if(db.kind==='postgres')await db.one('SELECT id FROM users WHERE id=? FOR UPDATE',user.id);
   const other=await db.one('SELECT user_id FROM world_character_reservations WHERE character_id=?',id);if(other&&other.user_id!==user.id)fail(409,'Este personaje ya fue elegido por otra persona. Selecciona uno disponible.');
   await db.run('DELETE FROM world_character_reservations WHERE user_id=? AND character_id<>?',user.id,id);
   await db.run('INSERT INTO world_character_reservations(character_id,user_id,updated) VALUES(?,?,?) ON CONFLICT(character_id) DO NOTHING',id,user.id,now());
   const owned=await ownership(user.id);if(owned?.character_id!==id)fail(409,'Otra persona acaba de elegir este personaje. Tu selección anterior se conserva.');
   await save(id);
  });
  await onChange();return snapshot(user,context,id);
 }
 async function requireSelection(user,id,context={}){
  const policy=characterPolicy(id,context);if(!valid(id)||policy.locked)fail(403,policy.reason||'Selecciona un personaje disponible para esta temporada.');
  if(Array.isArray(context.owned)&&!context.owned.includes(id))fail(403,'Compra este personaje en la tienda antes de entrar al campamento.');
  if(context.audience)return {character_id:id,user_id:user.id,audience:true};const own=await ownership(user.id);if(own?.character_id!==id)fail(409,'Elige y confirma un personaje disponible antes de entrar al campamento.');return own;
 }
 async function release(userId){await serial(async()=>{if(db.kind==='postgres')await db.one('SELECT id FROM users WHERE id=? FOR UPDATE',userId);await db.run('DELETE FROM world_character_reservations WHERE user_id=?',userId);});await onChange();return {ok:true};}
 return {snapshot,claim,requireSelection,release,ownership};
}
