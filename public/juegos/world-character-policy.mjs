// World season access rules are independent of the legacy minigame character catalog.
import {APOCALYPSE_CAST} from './world-characters.mjs';
export const CURRENT_CAST_IDS=Object.freeze(APOCALYPSE_CAST.map(c=>c.id));
export const STAFF_CHARACTER_IDS=Object.freeze(['maria-villegas']);
export const NURSE_CHARACTER_IDS=Object.freeze(['isabel']);
export function characterPolicy(id,{staff=false,nurse=false,owned=[],participant=true}={}){
 const legacy=!CURRENT_CAST_IDS.includes(id),staffOnly=STAFF_CHARACTER_IDS.includes(id),nurseOnly=NURSE_CHARACTER_IDS.includes(id);
 const participantOnly=!['maria-villegas','dani','dua-lingo','isabel'].includes(id)&&CURRENT_CAST_IDS.includes(id)&&!participant&&!staff;
 const locked=legacy||participantOnly||!staff&&(staffOnly||nurseOnly&&!nurse&&!owned.includes(id));
 return {legacy,staffOnly,nurseOnly,locked,reason:!locked?'':participantOnly?'Reservado para participantes confirmados de Apocalypse II':staffOnly?'Exclusivo del STAFF':nurseOnly?'Requiere el rol de Enfermería':'No disponible para participantes en esta temporada'};
}
