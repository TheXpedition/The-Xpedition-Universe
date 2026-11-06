// Smooth only the on-screen countdown between authoritative WebSocket snapshots.
// Server state, votes, duel deadlines and video playback are never modified.
export function displayProtocolClock(state,receivedAt,frameAt){
 if(!state)return 0;
 if(state.paused)return state.clock;
 const elapsed=Math.max(0,Math.min(1600,frameAt-receivedAt));
 return state.clock+elapsed;
}
