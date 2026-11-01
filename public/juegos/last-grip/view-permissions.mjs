export function canSeeGripTiming(state,characterId){return !!state?.roster?.some(p=>p.id===state.selfId)||['maria-villegas','isabel'].includes(characterId);}
