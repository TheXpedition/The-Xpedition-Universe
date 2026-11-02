export const MOVEMENT_KEYS=Object.freeze({ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]});
// Physical key codes survive Shift/Caps Lock changes between press and release.
export function movementKey(event){if(event.code&&(/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space)$/.test(event.code)))return event.code;const key=event.key?.toLowerCase();return {w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',shift:'ShiftLeft',' ':'Space'}[key]||event.key;}
export function movementVector(keys,touch={x:0,y:0}){let x=touch.x,y=touch.y;for(const key of keys){const v=MOVEMENT_KEYS[key];if(v){x+=v[0];y+=v[1];}}return {x,y,run:!!touch.run||keys.has('ShiftLeft')||keys.has('ShiftRight')};}
