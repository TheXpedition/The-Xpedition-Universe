// Owner-supplied pictures stay intact; both duelists receive the same saved index.
export const PUZZLE_IMAGES=Object.freeze([
 {url:'art/puzzle-reference.webp',aspect:1},
 ...Array.from({length:6},(_,i)=>({url:'art/puzzles/owner-'+(i+1)+'.png',aspect:1672/941}))
]);
export function puzzleImage(duel,selfId){const stage=Math.min(2,duel?.actors?.[selfId]?.completed||0);return PUZZLE_IMAGES[duel?.puzzleImages?.[stage]??duel?.puzzleImageIndex]||PUZZLE_IMAGES[0];}
