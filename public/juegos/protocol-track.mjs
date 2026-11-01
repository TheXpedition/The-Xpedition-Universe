const priority={WIN:0,HIGH:1,SAFE:2,SAFE_ADV:2,IDOL:2,ELIM_CANCELLED:2,LOW:3,BTM2:4,QUIT:5,DISQ:5,OUT:5,DEAD:5,ELIM:6};

export function orderTrackCast({cast=[],episodes=[],final=null}){
 const rows=cast.map((person,index)=>{
  let entry=null,episodeIndex=-1,episode=null;
  for(let i=episodes.length-1;i>=0;i--){
   const found=episodes[i].cast.find(p=>p.characterId===person.characterId);
   if(found){entry=found;episode=episodes[i];episodeIndex=i;break;}
  }
  const code=entry?.result,order=final?.winner===person.characterId?-2:final?.runners?.includes(person.characterId)?-1:priority[code]??5;
  const rank=episode?.ranking?.find(r=>r.id===entry?.id)?.rank??Number.MAX_SAFE_INTEGER;
  return {person,index,order,rank,episodeIndex};
 });
 return rows.sort((a,b)=>a.order-b.order||(a.order>=5?b.episodeIndex-a.episodeIndex:0)||a.rank-b.rank||a.index-b.index).map(row=>row.person);
}
