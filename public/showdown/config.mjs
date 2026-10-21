export const SHOWDOWN_PRICE=1000;
export const SHOWDOWN_FORMATS={
 2:{id:2,name:'Double Chance',soloDescription:'Dos por bracket, expansión por empate, un regreso de Bonju y una Wild Card que eliges tú. Semifinal de ocho, final de seis con doble WIN y torneo.',subtitle:'2 por bracket · doble Wild Card',advance:2,wildcards:2,semis:8,finalists:6,semiEpisodes:2,description:'Seis clasificados y dos regresos al azar. Dos eliminaciones en semifinales dejan una final de seis.'},
 3:{id:3,name:'The Original',soloDescription:'Tres por bracket y una Wild Card que eliges tú. Seis retos de estrellas y penalizaciones, corte al top 4 y final de duelos.',subtitle:'3 por bracket · Wild Card',advance:3,wildcards:1,semis:10,finalists:6,semiEpisodes:4,description:'Nueve clasificados, un regreso al azar, cuatro eliminaciones y una final de seis. El formato de las salas con amigos.'},
 4:{id:4,name:'All Stars',soloDescription:'Cuatro por bracket y una Wild Card que eliges tú. El top 2 hace lipsync y su ganador elimina del bottom 3. Torneo final de ocho.',subtitle:'4 por bracket · Wild Card',advance:4,wildcards:1,semis:13,finalists:8,semiEpisodes:5,description:'Trece semifinalistas. El top 2 hace lipsync y quien gane elimina a alguien del bottom 3. Cinco salidas dejan un torneo final de ocho.'}
};
export const SHOWDOWN_TIMES={challenge:20000,intro:9000,critiques:14000,countdown:3000,lipsync:10000,lipResult:7500,xvote:20000,cut:12000,semifinalists:14000,ranking:15000,judging:44000,rival:15000,finalWelcome:10000,eliminate:15000,coronation:13000};
export const LIP_BEAT=400;
export const SHOWDOWN_CHALLENGES=[
 ['rapidez','Rapidez','Piensa rápido, decide más rápido. Hoy cada segundo cuenta.','⚡'],
 ['estrategia','Estrategia','Lee a tus rivales. El movimiento más evidente no siempre es el mejor.','♟'],
 ['creatividad','Creatividad','Quiero una idea que nadie más pueda traer a este escenario.','✦'],
 ['inteligencia','Inteligencia','Conecta las pistas y demuestra que tu mente también merece una corona.','◇'],
 ['agilidad','Agilidad','Precisión, ritmo y nervios de acero. No pierdas el paso.','↗'],
 ['busqueda','Búsqueda','Una pista puede cambiarlo todo. Mira donde nadie está mirando.','⌕'],
 ['duelos','Duelos','Frente a frente. Sin escondites. Demuestra por qué sigues aquí.','⚔'],
 ['moda','Moda','La pasarela está encendida. Quiero concepto, presencia y una historia en cada look.','♛'],
 ['musica','Música','Siente el ritmo, encuentra tu momento y haz que el escenario te pertenezca.','♫'],
 ['cultura','Cultura y conocimiento','Memoria, mundo y curiosidad. Hoy tu conocimiento es tu mejor ventaja.','◎'],
 ['talentos','Show de Talentos','Este es tu momento de hacer algo que solo tú puedes hacer. Sorpréndeme.','★'],
 ['rap','Rappin’ Roast','Rimas afiladas y mucha personalidad. Que el roast tenga ritmo.','♪'],
 ['salem','Town of Salem','Secretos, sospechas y alianzas. Descubre quién está jugando contigo.','☾'],
 ['noticiero','Noticiero','Tienes el micrófono. Convierte el caos en el titular de la noche.','▣'],
 ['suerte','Suerte','Hoy el destino tiene voz. Prepárate para lo que salga de la caja.','⚄'],
 ['chef','Bonju Chef','Sabor, imaginación y presentación. Esta cocina no admite platos sin personalidad.','♨'],
 ['misterio','¿Quién mató a Bonju?','Escucha cada versión. Una coartada perfecta también puede ser una mentira.','◈'],
 ['drag','Bonju Drag Race','Carisma, presencia y una pasarela inolvidable. Quiero una estrella completa.','♛'],
 ['model','Top Model','Una pose, una mirada, una imagen que se quede conmigo.','✧'],
 ['wipeout','Wipeout','El recorrido no tendrá piedad. Mantén el equilibrio y sigue adelante.','≋'],
 ['antartida','Expedición turística','Transforma la Antártida en una experiencia que nadie quiera perderse.','❄'],
 ['baile','Batalla de baile','Esta pista es tuya durante unos segundos. Haz que parezcan eternos.','✺'],
 ['covers','Covers','Respeta la canción y atrévete a hacerla tuya.','♬'],
 ['sillas','Sillas musicales','Un asiento menos, mucha tensión y cero margen para distraerse.','◌'],
 ['entrevista','Entrevista de trabajo','Véndeme tu mejor versión. Quiero seguridad y una respuesta que recuerde.','▤'],
 ['hielo','Romper hielos','El primer paso lo das tú. Convierte una situación incómoda en tu oportunidad.','❖'],
 ['bomba','La Bomba','El reloj está corriendo. Resuelve antes de que todo estalle.','◉']
].map(([id,name,description,symbol])=>({id,name,description,symbol}));
export const SHOWDOWN_STATUS={WIN:'Victoria',TOP2:'Top 2',HIGH:'High',SAFE:'A salvo',LOW:'Low',BTM2:'Lipsync de eliminación',BTM3:'Bottom 3',BTM4:'The X Vote',ELIM:'Eliminación',RETURN:'Wild Card',WINNER:'Ganador',RUNNERUP:'Segundo lugar',FINALIST:'Finalista'};
