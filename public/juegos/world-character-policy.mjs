// World season access rules are independent of the legacy minigame character catalog.
export const CURRENT_CAST_IDS=Object.freeze(['maria-villegas','sallua','carmine','bruno','daelly','bayron','arisantana','marianito','leandro','vitany','kareli','vita','eduard','joseserna','guillermo','peggy','andromeda','ivy','roger','dani','dua-lingo','isabel']);
export const STAFF_CHARACTER_IDS=Object.freeze(['maria-villegas']);
export const NURSE_CHARACTER_IDS=Object.freeze(['isabel']);
export function characterPolicy(id,{staff=false,nurse=false,owned=[],participant=true}={}){
 const legacy=!CURRENT_CAST_IDS.includes(id),staffOnly=STAFF_CHARACTER_IDS.includes(id),nurseOnly=NURSE_CHARACTER_IDS.includes(id);
 const participantOnly=!['maria-villegas','dani','dua-lingo','isabel'].includes(id)&&CURRENT_CAST_IDS.includes(id)&&!participant&&!staff;
 const locked=participantOnly||legacy&&!owned.includes(id)||!staff&&(staffOnly||nurseOnly&&!nurse);
 return {legacy,staffOnly,nurseOnly,locked,reason:!locked?'':participantOnly?'Reservado para participantes confirmados de Apocalypse II':staffOnly?'Exclusivo del STAFF':nurseOnly?'Requiere el rol de Enfermería':'No disponible para participantes en esta temporada'};
}
