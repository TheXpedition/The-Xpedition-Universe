export function touchControls(){return matchMedia('(pointer:coarse)').matches||(globalThis.navigator?.platform==='MacIntel'&&globalThis.navigator.maxTouchPoints>1);}
