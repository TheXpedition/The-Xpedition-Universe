export const PAJAMA_PRICE=5000;
export const PAJAMA_OUTFITS=Object.freeze(Object.fromEntries([
 ['andromeda','Andromeda'],['arisantana','Ari Santana'],['bayron','Bayron'],['bruno','Bruno'],['carmine','Carmine'],['daelly','Daelly'],['eduard','Eduard'],['guillermo','Guillermo'],['ivy','Ivy'],['alice','Alice'],['joseserna','Jose'],['kareli','Kareli'],['leandro','Leandro'],['marianito','Marianito'],['peggy','Peggy'],['roger','Roger'],['sallua','Sal Lua'],['vita','Vita'],['vitany','Vitany']
].map(([id,source])=>[id,Object.freeze({id,source,image:'/juegos/outfits/pajamas-v1/'+id+'.webp',atlas:'/juegos/outfits/pajamas-v1/'+id+'-atlas.webp',lite:'/juegos/outfits/pajamas-v1/'+id+'-lite.webp',sleep:'/juegos/outfits/pajamas-v1/'+id+'-sleep.webp',price:PAJAMA_PRICE})])));
