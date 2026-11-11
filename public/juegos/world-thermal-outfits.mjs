import {reservedWardrobe} from './world-wardrobe.mjs';
// Supplied thermal outfits. They use the same 8 x 5 animation layout as the world cast.
export const THERMAL_OUTFITS=Object.freeze(Object.fromEntries([
 ['alice','Alice'],['gabrielsab','Gabriel'],['andromeda','Andromeda'],['arisantana','Ari Santana'],['bayron','Bayron'],['bruno','Bruno'],
 ['carmine','Carmine'],['daelly','Daelly'],['dua-lingo','Dua Lingo'],['eduard','Eduard'],
 ['guillermo','Guillermo'],['isabel','Isabel'],['ivy','Ivy'],['joseserna','Jose Serna'],['kareli','Kareli'],
 ['leandro','Leandro'],['maria-villegas','Maria'],['marianito','Marianito'],['peggy','Peggy'],
 ['roger','Roger'],['sallua','Sal Lua'],['vita','Vita'],['vitany','Vitany Glambert']
].map(([id,source])=>[id,Object.freeze({id,source,image:'/juegos/outfits/thermal-v1/'+id+'.webp',atlas:'/juegos/outfits/thermal-v1/'+id+'-atlas.webp',lite:'/juegos/outfits/thermal-v1/'+id+'-lite.webp'})])));
export const thermalOutfit=(id,clothing)=>clothing==='cold'&&Object.hasOwn(THERMAL_OUTFITS,id)?THERMAL_OUTFITS[id]:null;
// This is a character entitlement, never a transferable resource or a client claim.
export const innateThermal=body=>reservedWardrobe(body?.clinical?.castCharacter);
