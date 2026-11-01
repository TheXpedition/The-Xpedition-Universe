import {SHELTER_PARTICIPANTS,SHELTER_MATERIALS} from '../../public/juegos/world-shelters.mjs';
// Existing bed/chest scenarios start after a fully completed construction stage.
// Fresh-world construction tests deliberately do not install this history.
export async function seedConstructedShelters(db,actors=[]){
 const at=Date.now(),state={version:1,revision:1,owners:{},assignments:{},collected:{},delivered:{},completed:{left:{at,contributors:[]},right:{at,contributors:[]}},audit:[]};
 for(const id of SHELTER_PARTICIPANTS){const actor=actors.find(a=>a.character===id);if(actor){state.owners[id]=actor.id;state.assignments[id]=actor.home||'left';}}
 for(const id of SHELTER_PARTICIPANTS){if(!state.owners[id]){state.owners[id]='offline-fixture-'+id;state.assignments[id]=Object.values(state.assignments).filter(h=>h==='left').length<9?'left':'right';}state.collected[id]=Object.fromEntries(SHELTER_MATERIALS.map(m=>[m.id,at]));state.delivered[id]={...state.collected[id]};state.completed[state.assignments[id]].contributors.push(id);}
 await db.run('INSERT INTO world_environment(id,state,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,updated=excluded.updated','shelters',JSON.stringify(state),at);
}
