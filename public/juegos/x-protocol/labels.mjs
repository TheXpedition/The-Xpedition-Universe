import {worldCharacter} from '../world-characters.mjs';
export const isFemale=p=>worldCharacter(typeof p==='string'?p:p?.characterId)?.gender==='female';
export const nomineeLabel=p=>isFemale(p)?'NOMINADA':'NOMINADO';
export const eliminatedLabel=p=>isFemale(p)?'ELIMINADA':'ELIMINADO';
export const duelWinnerLabel=p=>isFemale(p)?'GANADORA DEL DUELO':'GANADOR DEL DUELO';
