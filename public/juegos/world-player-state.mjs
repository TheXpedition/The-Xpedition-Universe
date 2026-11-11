export function interpolateWorldPlayer(player, now){
 const previous=player.previous;
 if(!previous||!Number.isFinite(previous.x))return player;
 const progress=Math.max(0,Math.min(1,(now-previous.at)/100));
 if(progress===1)return player;
 const z=previous.z+(player.z-previous.z)*progress;
 return {...player,
  x:previous.x+(player.x-previous.x)*progress,
  y:previous.y+(player.y-previous.y)*progress,
  z,
  ...(player.characterId==='maria-villegas'&&z>.5?{grounded:false}:{}),
  walk:previous.walk+(player.walk-previous.walk)*progress
 };
}

// Movement records describe the current state; standing cannot retain an old seat.
export function normalizeWorldPlayer(player){const seated=player.state==='sit'||player.state==='sleep';return {...player,clothing:['cold','pajamas'].includes(player.clothing)?player.clothing:'heat',sleeping:player.state==='sleep',moving:seated?false:!!player.moving,seatId:seated?(player.seatId??null):null,seatSlot:seated?(player.seatSlot??null):null};}
export function mergeWorldPlayer(previous,incoming,now){const snapshot=normalizeWorldPlayer({...previous,...incoming});return {...snapshot,previous:{x:previous.x,y:previous.y,z:previous.z,walk:previous.walk,at:now}};}
