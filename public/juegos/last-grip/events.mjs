export const GRIP_EVENTS=Object.freeze({
 wind:{name:'Ráfagas de viento',impact:'El viento exige un 18% más de resistencia.',drain:1.18,sound:'wind.mp3',gain:.42},
 shake:{name:'Temblor de la estructura',impact:'Las vibraciones consumen un 15% más de resistencia y estrechan la zona de acierto un 15%.',drain:1.15,precision:.85,sound:'structure.mp3',gain:.38},
 rain:{name:'Lluvia sobre el metal',impact:'El agarre mojado consume un 12% más de resistencia.',drain:1.12,sound:'rain.mp3',gain:.34},
 pressure:{name:'Presión final',impact:'La resistencia se consume un 25% más rápido.',drain:1.25,sound:'pressure.mp3',gain:.28}
});
export function activeGripEvents(s){return (s.events|| (s.event?[s.event]:[])).filter(e=>s.clock>=e.start);}
export function eventDrain(s){return Math.min(2,activeGripEvents(s).reduce((n,e)=>n*(GRIP_EVENTS[e.kind]?.drain||1),1));}
export function eventPrecision(s){return activeGripEvents(s).reduce((n,e)=>n*(GRIP_EVENTS[e.kind]?.precision||1),1);}
