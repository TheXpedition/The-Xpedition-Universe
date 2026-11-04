export function chefLobby(s){return !!s&&(['closed','lobby','finished','cancelled'].includes(s.phase)||s.phase==='farewell'&&s.returned);}
export function lobbyRoster(s){return s?.phase==='lobby'?s.roster:[];}
export function returnedDuringVisit(previous,next){return !!previous&&previous.id===next?.id&&!previous.returned&&!!next.returned&&!chefLobby(previous);}
