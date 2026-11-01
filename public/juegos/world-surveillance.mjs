// Camera coverage is explicit. Private rooms and health records are never feeds.
export const SECURITY_CAMERAS=Object.freeze([
 {id:'gate',zone:'comisaria',name:'C01 · Acceso a seguridad'},
 {id:'junction',zone:'cruce-comunicaciones',name:'C02 · Portón de comunicaciones'},
 {id:'refuge-west',zone:'base',name:'C03 · Exterior del refugio 1'},
 {id:'refuge-east',zone:'refugio-2',name:'C04 · Exterior del refugio 2'},
 {id:'runway',zone:'pista-aerodromo',name:'C05 · Pista del aeródromo'}
]);
export const CAMERA_FIELDS=Object.freeze(['id','userId','name','characterId','zone','x','y','z','facing','moving','walk','grounded','state','sleeping','swimming','activity','fishingTarget','activityAt','seatId','seatSlot','actionAt','actionFrom','action','reaction','reactionAt']);
export function cameraPlayer(player){return Object.fromEntries(CAMERA_FIELDS.filter(k=>k in player).map(k=>[k,player[k]]));}
