export function avatarRevision(id){
 return id==='luciano'||id==='nacho'?'cast-20261122-2':'transparent-rig-20261101-5';
}
export function worldAtlasUrl(id,lite=false){
 return '/juegos/sprites/'+encodeURIComponent(id)+(lite?'-lite':'')+'.webp?v='+avatarRevision(id);
}
