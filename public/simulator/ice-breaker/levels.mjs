export const LEVELS=Object.freeze([
 {id:1,name:'Costa de cristal',count:24,tickets:8,description:'Encuentra el ritmo entre grietas y refugios.'},
 {id:2,name:'El laberinto azul',count:36,tickets:12,description:'Más desvíos, criaturas y decisiones sobre el hielo.'},
 {id:3,name:'El fin del mundo',count:52,tickets:18,description:'Una expedición larga hasta la última base.'}
]);
export const DIFFICULTIES=Object.freeze({relaxed:{name:'Relajado',lives:4,fragile:4.5},normal:{name:'Normal',lives:3,fragile:2.8},intense:{name:'Intenso',lives:2,fragile:2}});
export const levelConfig=id=>LEVELS.find(l=>l.id===Number(id))||LEVELS[0];
export const worldEnd=id=>160+(levelConfig(id).count-1)*205;
