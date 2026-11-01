import {isStaff} from './account-roles.mjs';
import {hasApocalypseStyle} from './world-profile-access.mjs';

export function createWorldParticipation({db,now=Date.now}){
 async function confirmed(id){return hasApocalypseStyle(db,id);}
 async function role(user,{staff=isStaff(user?.id)}={}){
  if(!user)return {role:'spectator',confirmed:false,active:false};
  const accepted=await confirmed(user.id),entry=await db.one('SELECT status FROM world_contestants WHERE season=? AND user_id=?','antarctica-1',user.id);
  const active=!staff&&accepted&&(!entry||!['eliminated','quit','disqualified','injured','dead'].includes(entry.status));
  return {role:staff?'staff':active?'participant':'spectator',confirmed:accepted,active};
 }
 async function synchronize(user,options){const result=await role(user,options);if(result.role==='staff')return result;
  const row=await db.one('SELECT status FROM world_contestants WHERE season=? AND user_id=?','antarctica-1',user.id),status=result.active?'active':'spectator';
  if(!row||['active','spectator'].includes(row.status)&&row.status!==status){await db.run('INSERT INTO world_seasons(id,name,state,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING','antarctica-1','Apocalypse II','{}',now());await db.run('INSERT INTO world_contestants(season,user_id,status,updated) VALUES(?,?,?,?) ON CONFLICT(season,user_id) DO UPDATE SET status=excluded.status,updated=excluded.updated','antarctica-1',user.id,status,now());}
  return result;
 }
 return {confirmed,role,synchronize,async canCompete(user){return !!user&&(isStaff(user.id)||(await role(user)).active);}};
}
