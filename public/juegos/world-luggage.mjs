// Shared, finite contents. Each visible container has its own persisted stock.
export const LUGGAGE = Object.freeze([
 {id:'mountain-trail-chest',zone:'montana-ladera',name:'Baúl del guardabosques',category:'supplies',x:.923,y:.592,anchorY:.565,painted:true,contents:{'resource:rope':1,'resource:cloth':1,'resource:matches':1}},
 {id:'mountain-hut-shelf',zone:'caseta-montana',name:'Estante de la caseta',category:'supplies',x:.71,y:.49,anchorY:.37,painted:true,contents:{'resource:rope':2,'resource:cloth':1}},
 {id:'mountain-ridge-cache',zone:'montana-cresta',name:'Reserva de la cresta',category:'supplies',x:.17,y:.665,anchorY:.63,painted:true,contents:{'resource:purifier':1,'resource:matches':1}},
 {id:'gas-snack-shelf',zone:'gasolinera-interior',name:'Estantería de despensa',category:'supplies',x:.72,y:.68,anchorY:.53,painted:true,contents:{'food:crackers':4,'food:oat-bar':3,'food:oats':2}},
 {id:'gas-pantry-shelf',zone:'gasolinera-interior',name:'Estantería de ingredientes',category:'supplies',x:.90,y:.68,anchorY:.53,painted:true,contents:{'food:dry-beans':3,'food:dry-rice':3}},
 {id:'gas-cigarette-box',hideWhenEmpty:true,zone:'gasolinera-interior',name:'Caja de 10 cigarrillos',category:'supplies',x:.43,y:.61,anchorY:.59,width:60,art:'cigarettes.png',contents:{'resource:cigarette':10}},
 {id:'gas-fuel-can',hideWhenEmpty:true,zone:'gasolinera-interior',name:'Bidón de combustible',category:'supplies',x:.28,y:.76,anchorY:.72,width:65,art:'fuel-can.png',contents:{'resource:fuel':1}},
 {id:'plane-red-case',zone:'avion',name:'Maleta roja',x:.595,y:.69,anchorY:.66,painted:true,contents:{'resource:light-clothes':1,'resource:cloth':2,'food:apple':1}},
 {id:'plane-grey-case',zone:'avion',name:'Maleta de herramientas',x:.655,y:.663,anchorY:.62,painted:true,contents:{'resource:battery':2,'resource:wire':2,'resource:fuse':1}},
 {id:'plane-travel-case',zone:'avion',name:'Equipaje abandonado',x:.465,y:.675,anchorY:.64,painted:true,contents:{'resource:empty-bottle':1,'resource:purifier':2,'food:carrot':2}},
 {id:'cabin-red-case',zone:'avion-interior',name:'Maleta de ropa',x:.31,y:.845,art:'maleta-roja.png',contents:{'resource:coat':1,'resource:cloth':2,'resource:rope':1}},
 {id:'cabin-grey-case',zone:'avion-interior',name:'Maleta de emergencia',x:.55,y:.845,art:'maleta-gris.png',contents:{'resource:flashlight':1,'resource:battery':2,'resource:purifier':2}},
 {id:'cabin-travel-case',zone:'avion-interior',name:'Bolsa de provisiones',x:.69,y:.845,art:'maleta-roja.png',contents:{'food:apple':2,'food:carrot':2,'resource:empty-bottle':1,'resource:matches':1}},
 {id:'train-baggage-case',zone:'tren-equipaje',name:'Equipaje de la expedición',x:.426,y:.723,anchorY:.65,painted:true,contents:{'resource:rope':2,'resource:matches':1,'food:apple':2}},
]);
export const LUGGAGE_BY_ID = Object.freeze(Object.fromEntries(LUGGAGE.map(v=>[v.id,v])));
export const initialLuggage = () => Object.fromEntries(LUGGAGE.map(v=>[v.id,{items:{...v.contents},revision:0}]));
export function luggageStock(shared, id){return shared.luggage?.[id] || (LUGGAGE_BY_ID[id]?{items:{...LUGGAGE_BY_ID[id].contents},revision:0}:null);}
export function luggageSummary(shared){return Object.fromEntries(LUGGAGE.map(v=>{const s=luggageStock(shared,v.id);return [v.id,{items:{...s.items},remaining:Object.values(s.items).reduce((a,n)=>a+n,0),revision:s.revision}];}));}
// HTTP replies and websocket broadcasts can arrive in either order. Never restore
// already collected contents from an older response.
export function mergeLuggageShared(previous,incoming){if(!incoming)return previous;const luggage={...previous?.luggage,...incoming.luggage};for(const [id,stock]of Object.entries(previous?.luggage||{}))if(stock.revision>(luggage[id]?.revision??-1))luggage[id]=stock;return {...previous,...incoming,luggage};}
