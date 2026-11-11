import {PAJAMA_OUTFITS} from './world-pajamas.mjs';
// Reserved roles keep their wardrobe entitlements independently of shop outfits.
export const RESERVED_WARDROBE=Object.freeze(['maria-villegas','isabel','dua-lingo','bonju']);
export const reservedWardrobe=id=>RESERVED_WARDROBE.includes(id);
export const freePajamas=id=>id!=='isabel'&&reservedWardrobe(id);
// Publish an outfit only when its playable assets exist.
export const PAJAMA_ART=Object.freeze({...PAJAMA_OUTFITS,'maria-villegas':Object.freeze({image:'/juegos/outfits/maria-motion-v1/idle.webp',sleep:'/juegos/outfits/maria-motion-v1/sleep.webp',atlas:'/juegos/outfits/maria-motion-v1/rest-atlas.webp',lite:'/juegos/outfits/maria-motion-v1/rest-atlas-lite.webp'})});
export const pajamaArt=id=>Object.hasOwn(PAJAMA_ART,id)?PAJAMA_ART[id]:null;
export const ownsPajamas=body=>!!pajamaArt(body?.clinical?.castCharacter)&&(freePajamas(body?.clinical?.castCharacter)||body?.pajamasOwned?.includes(body.clinical.castCharacter)===true);
export const sleepClothingFactor=body=>body.clothing==='pajamas'?1.4:.28;
