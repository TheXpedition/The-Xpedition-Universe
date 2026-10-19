import {createHash} from 'node:crypto';
// One requested, idempotent account adjustment. No public administrative endpoint.
export const requestedAdjustment={emailHash:'d0b4d27a6ac152ca229e3726ce7f596e564f322c5238c2a2254e5c13bbe78492',key:'requested-account-adjustment:20261019',xp:43300,coins:10000};
export const requestedCoinBonus={emailHash:requestedAdjustment.emailHash,key:'requested-account-adjustment:20261019:extra5000',xp:0,coins:5000};
export async function applyRequestedAccountAdjustment(db,adjustment=requestedAdjustment){
 const users=await db.all('SELECT id,email FROM users');
 const user=users.find(u=>createHash('sha256').update(u.email.trim().toLowerCase()).digest('hex')===adjustment.emailHash);
 if(!user)return false;
 return db.transaction(async()=>{
  await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,0,0,0) ON CONFLICT DO NOTHING',user.id);
  const current=await db.one('SELECT xp FROM user_progression WHERE user_id=?',user.id);
  const xp=Math.max(0,adjustment.xp-Number(current.xp));
  const added=await db.run('INSERT INTO economy_rewards(user_id,event_key,tickets,coins,xp,label,created) VALUES(?,?,0,?,?,?,?) ON CONFLICT DO NOTHING',user.id,adjustment.key,adjustment.coins,xp,'Ajuste de cuenta solicitado',Date.now());
  if(!added.changes)return false;
  await db.run('UPDATE user_progression SET coins=coins+?,xp=xp+? WHERE user_id=?',adjustment.coins,xp,user.id);
  return true;
 });
}
