export async function hasApocalypseStyle(db,id){
 if(!id)return false;
 const row=await db.one('SELECT style_override,audition_slot FROM apocalypse_cast WHERE user_id=?',id);
 if(row?.style_override!==null&&row?.style_override!==undefined)return Number(row.style_override)===1;
 return !!row?.audition_slot||!!await db.one('SELECT user_id FROM casting_entries WHERE season=? AND user_id=? AND direct_slot IS NOT NULL','apocalypse-ii',id);
}
