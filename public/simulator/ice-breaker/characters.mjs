import {FALL_LINES,AMBIENT_LINES} from './dani-lines.mjs';
const line=(id,spoken,text=spoken)=>({id,spoken,text});
export const CHARACTERS=Object.freeze([
 {id:'dani',name:'Dani',image:'./art/dani.png',portrait:'/personajes/dani.png',height:206.04,voice:'Sarcástica',fall:FALL_LINES,ambient:AMBIENT_LINES},
 {id:'bayron',name:'Bayron',image:'./art/bayron-reference.png',height:185,voice:'Infantil',portraitPosition:'50% 15%',fall:[
  line('bayron-babay','¡Me dejaron toda Babay!'),
  line('bayron-panales','¡Me cagué los pañales encima!','¡Me c*gué los pañales encima!'),
  line('bayron-verguenza','Pasé vergüenza como de costumbre.')
 ],ambient:[]},
 {id:'felix',name:'Felix',image:'./art/felix-reference.png',height:214,voice:'Segura y grave',portraitPosition:'50% 9%',fall:[
  line('felix-vitany','¡Pasé la Vitany Glambert!'),
  line('felix-chiok','¡Qué día de la Gargajo Chiok!'),
  line('felix-denuncia','Si sigo perdiendo te voy a denunciar tus cuentas.')
 ],ambient:[]},
 {id:'andromeda',name:'Andromeda',image:'./art/andromeda-reference.png',height:202,voice:'Femenina y relajada',portraitPosition:'50% 13%',fall:[
  line('andromeda-dia','¡Qué día de la Andromierda!','¡Qué día de la Androm**rda!'),
  line('andromeda-churriaria','Esto debe ser culpa de Churriaria Villegas.'),
  line('andromeda-genshit','En Genshit Impact esto es más fácil.','En Gensh*t Impact esto es más fácil.'),
  line('andromeda-peggy','Esto me pasa por traicionar a Peggy.')
 ],ambient:[]},
 {id:'isabel',name:'Isabel',image:'./art/isabel-reference.png',height:201,voice:'Alocada y eléctrica',fall:[
  line('isabel-tosera','¡Me dejaron María Isabel Tosera!'),
  line('isabel-lol','Tengo que acabar rápido para seguir jugando LOL.'),
  line('isabel-trabajo','Me pueden dejar todo el día aquí, con tal de no ir a trabajar.'),
  line('isabel-blasfemus','¡Malditos hijos de perra! ¡Blasfemus Hauz Siu Guar!','¡Malditos hijos de p*rra! ¡Blasfemus Hauz Siu Guar!')
 ],ambient:[]},
 {id:'peggy',name:'Peggy',image:'./art/peggy-reference.png',height:214,voice:'Diva de pasarela',fall:[
  line('peggy-piggy','¡Me dejaron toda Piggy Marrano!'),
  line('peggy-ebria','Ya estoy ebria, no sé qué estoy haciendo.'),
  line('peggy-pagar','Cuando salga de esta mamada me la vas a pagar, pinche prieta.','Cuando salga de esta m*m*da me la vas a pagar, p*nche pr**ta.'),
  line('peggy-inaella','Esto es culpa de Iñaella.')
 ],ambient:[]},
 {id:'eris',name:'Eris',image:'./art/eris-reference.png',height:207,voice:'Aguda y teatral',fall:[
  line('eris-mierdaria','¡Mierdaria, maldita loca!','¡M**rdaria, maldita loca!'),
  line('eris-racista','Esta mierda es racista.','Esta m**rda es racista.'),
  line('eris-jugar','Yo pensé que era malo hasta que te vi jugar a ti.'),
  line('eris-angel','¡Qué día de la Angel Vanderwood!'),
  line('eris-premio','Tengo que buscar mi premio del Poop of the Year.')
 ],ambient:[]},
 {id:'ximena',name:'Ximena',image:'./art/ximena-reference.png',height:205,voice:'Poderosa y firme',fall:[
  line('ximena-celebrity','¡Me dejaron toda Celebrity Stars!'),
  line('ximena-ximierdota','¡Quedé hecha una ximierdota!','¡Quedé hecha una xim**rdota!'),
  line('ximena-susana','¡Me saqué la Susana Orix!'),
  line('ximena-odio','Odio a los gays.'),
  line('ximena-morena','Esto es culpa del partido Morena.')
 ],ambient:[]},
 {id:'vita',name:'Vita',image:'./art/vita-reference.png',height:208,voice:'Fuerte y grave',fall:[
  line('vita-ponchi','¡Quedé hecha una ponchi!'),
  line('vita-molotov','¡Me saqué la Vita Molotov!'),
  line('vita-empire','¡Qué día de la Empire of Blood!'),
  line('vita-comunidad','Esto me pasa por desperdiciar mi adolescencia en esta comunidad.'),
  line('vita-drugs','¡Qué día de la Drugs Queen!')
 ],ambient:[]},
 {id:'inaella',name:'Iñaella Rose',image:'./art/inaella-reference.png',height:203,voice:'Diva melódica',fall:[
  line('inaella-ima','¡Me saqué la ima ima ame!'),
  line('inaella-reto','No entendí el reto.'),
  line('inaella-hacer','¿Qué se supone que tengo que hacer?'),
  line('inaella-survivor','Me dejaron toda: amigos del Survivor, soy Iñaella Rose.'),
  line('inaella-iconica','Y ni modo, me morí icónica.'),
  line('inaella-perrita','Pobre perrita, aprende a jugar.','Pobre p*rrita, aprende a jugar.')
 ],ambient:[]},
 {id:'daelly',name:'Daelly',image:'./art/daelly-reference.png',height:198,voice:'Dulce y aguda',fall:[
  line('daelly-pier','Esto me pasa por comprarle ese dibujo a Pier.'),
  line('daelly-bombom','¡Me sacaron la Daelly BomBom!'),
  line('daelly-kiara','¡Me saqué la Kiara Milena!'),
  line('daelly-favoritismo','Bonju, hazme favoritismo, perra.','Bonju, hazme favoritismo, p*rra.'),
  line('daelly-coronel','Esto está más frío que los calzones de Coronel.')
 ],ambient:[]},
 {id:'coronel',name:'Coronel',image:'./art/coronel-reference.png',height:218,voice:'Grave y seductora',fall:[
  line('coronel-corazon','Nena, esto está más frío que tu corazón.'),
  line('coronel-survivors','Tranquilos, yo tengo experiencia en cincuenta mil Survivors.'),
  line('coronel-abuelo','Apúrate, que tengo que cambiarle el pañal a mi abuelo.'),
  line('coronel-vacunas','Esto no estaría pasando si me hubiera quedado poniendo vacunas.'),
  line('coronel-migaylito','¡Me dejaron toda Migaylito Sanders!'),
  line('coronel-cuarteto','¡Me saqué la Cuarteto Dramático!')
 ],ambient:[]},
 {id:'julian',name:'Julián',image:'./art/julian-reference.png',height:208,voice:'Colombiana',fall:[
  line('julian-rosalia','¡Me saqué la Rosalía!'),
  line('julian-anderson','¡Qué día de la Anderson Moreno!'),
  line('julian-grindr','¿Me pueden sacar de aquí? Tengo que ir a usar Grindr.'),
  line('julian-ano','Me reventé todo el ano, aunque ya lo tenía así.','Me reventé todo el *no, aunque ya lo tenía así.'),
  line('julian-parce','Uy, parce, ¡qué gonorrea!','Uy, parce, ¡qué g*n*rrea!')
 ],ambient:[]},
 {id:'alexandro',name:'Alexandro',image:'./art/alexandro-reference.png',height:210,voice:'Castellana',fall:[
  line('alexandro-joder','Joder, tío, ¿qué coño ha pasado?','J*der, tío, ¿qué c*ño ha pasado?'),
  line('alexandro-hostia','¡Hostia, la madre que los ha pillado!','¡H*stia, la madre que los ha pillado!'),
  line('alexandro-global','Madre mía, ¡me dejaron toda Global War!'),
  line('alexandro-gym','Me saqué toda la Gym Camila, gilipollas.','Me saqué toda la Gym Camila, g*lip*llas.'),
  line('alexandro-projects','No sé quién seas, pero puedes audicionar a Alex Projects.'),
  line('alexandro-camp','Joder, haré mi próximo camp en este mundo.','J*der, haré mi próximo camp en este mundo.'),
  line('alexandro-onda','¡Onda vital a todo gas!')
 ],ambient:[]},
 {id:'catalina',name:'Catalina',image:'./art/catalina-reference.png',height:204,voice:'Alocada y expresiva',fall:[
  line('catalina-pomni','¡Pomni, ayúdame a salir de aquí!'),
  line('catalina-jax','Necesito buscar a Jax.'),
  line('catalina-kylie','Me dejaron toda Kylie Krystal Mufasalina Guicet Díaz Micrófono Navarro.'),
  line('catalina-renuncio','¡Renuncio, estoy harta!'),
  line('catalina-usar','Ya te dije que me dejes de usar, pedazo de mierda. ¡Renuncio!','Ya te dije que me dejes de usar, pedazo de m**rda. ¡Renuncio!'),
  line('catalina-cochinada','Me voy de esta cochinada, pensé que eras mejor.'),
  line('catalina-hablar','No me vuelvas a hablar.')
 ],ambient:[]},
 {id:'luciano',name:'Luciano',image:'./art/luciano-reference.png',height:209,voice:'Aguda y caricaturesca',fall:[
  line('luciano-cafecin','¡Me dejaron toda Cafecín!'),
  line('luciano-momento','Pensé que este era mi momento.'),
  line('luciano-pelicula','Apúrate a terminar esto, que tengo que ir a grabar mi próxima película porno.','Apúrate a terminar esto, que tengo que ir a grabar mi próxima película p*rno.'),
  line('luciano-soyluna','¿Ya te dije que grabé una escena erótica en Soy Luna?','¿Ya te dije que grabé una escena er*tica en Soy Luna?'),
  line('luciano-ganar','Necesito ganar, deja de perder, hijueputa.','Necesito ganar, deja de perder, hiju*p*ta.'),
  line('luciano-hermano','Deja de perder, que tengo que ir a ver Gran Hermano.'),
  line('luciano-argentina','Tengo que ir a defender a Argentina en Twitter porque dicen que somos fascistas.'),
  line('luciano-luchoben','¡Me saqué toda la LuchoBen!')
 ],ambient:[]}
]);
export const characterConfig=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
