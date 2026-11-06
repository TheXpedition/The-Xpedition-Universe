// State changes are always published immediately by the authoritative server.
// This cadence applies only to unchanged, clock-driven presentation snapshots.
// Rendered animation/video stays client-side, while interactive positions and
// duel feedback still receive a fast stream.
const interactive=new Set(['LUCKY_SKULLS_PICKING','DUEL_ACTIVE']);
const responsive=new Set(['WINNER_NOMINATION','GROUP_VOTE','TIEBREAKER_VOTE','BETTING_PHASE','ADVANTAGE_WINDOW','THIRD_NOMINEE_CONFIRMATION','INVENTORY_GIFT']);
export function protocolWireInterval(phase){
 if(interactive.has(phase))return 250;
 if(responsive.has(phase))return 500;
 return 1100;
}
