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
 ],ambient:[]},
 {id:'ignacio',name:'Ignacio Ricci',image:'./art/ignacio-reference.png',height:204,voice:'Masculina y gruesa',fall:[
  line('ignacio-silvanya','¡Me dejaron toda Silvanya Dlemberth!'),
  line('ignacio-coneolimpiadas','¡Me saqué la Coneolimpiadas!'),
  line('ignacio-audios','Rápido, que tengo que enviar audios de cuarenta minutos.'),
  line('ignacio-bonshu','Bonshu está detrás de esto.'),
  line('ignacio-boicot','Me vuelves a hacer perder y te hago un boicot.')
 ],ambient:[]},
 {id:'lalamila',name:'Lalamila',image:'./art/lalamila-reference.png',height:200,voice:'Femenina y joven',fall:[
  line('lalamila-leyenda','¿Ya te dijeron que soy una leyenda en competencias?'),
  line('lalamila-gucci','¡Me reventé toda la Lalamila Gucci!'),
  line('lalamila-empleo','Verte jugar me motiva a buscar empleo.'),
  line('lalamila-chamo','Chamo, no te pases, mamaguevo.','Chamo, no te pases, m*m*guevo.'),
  line('lalamila-pierre','Te voy a ir a buscar a tu casa y sacarte la Pierre Donnovan.')
 ],ambient:[]},
 {id:'lucasmendez',name:'Lucas Mendez',image:'./art/lucasmendez-reference.png',height:209,voice:'Dominicana',fall:[
  line('lucasmendez-leyenda','¿Ya te dije que soy la nueva leyenda del grupo?'),
  line('lucasmendez-global','¡Me saqué la Global Wars!'),
  line('lucasmendez-top40','Ya deja de perder y ve a hacer el top cuarenta canciones de mi lista musical.'),
  line('lucasmendez-wap','Termina rápido, que tengo que ir a reproducir WAP y I Like It.'),
  line('lucasmendez-pagar','No olvidaré esto, me la vas a pagar.'),
  line('lucasmendez-elias','Esto es culpa de Elías.'),
  line('lucasmendez-adriana','¿Dónde estará mi mejor amiga Adriana?')
 ],ambient:[]},
 {id:'cocomong',name:'Cocomong',image:'./art/cocomong-reference.png',height:142,voice:'Infantil y pequeña',fall:[
  line('cocomong-yumyum','¡Expulsé la Cocomong Yum Yum!'),
  line('cocomong-abortado','Me debieron haber abortado.'),
  line('cocomong-siete','Tal vez tenga siete años, pero no juego tan mal como tú.'),
  line('cocomong-amamantar','¿Me podrías amamantar?'),
  line('cocomong-bua','¡Buaaaaa!','¡BUAAAAAAA!'),
  line('cocomong-adoptas','¿Me adoptas?')
 ],ambient:[]},
 {id:'bryan',name:'Bryan Montalvo',image:'./art/bryan-reference.png',height:216,voice:'Coqueta y seductora',fall:[
  line('bryan-sidapop','¡Me saqué la Sida Pop!'),
  line('bryan-trabajo','Apúrate, que tengo que ir a mi trabajo como escort.','Apúrate, que tengo que ir a mi trabajo como esc*rt.'),
  line('bryan-celebrity','Juegas horrible, deberías entrar a Celebrity Stars.'),
  line('bryan-canvas','¿Te gustaría calificar mi Drag Race en Canvas?'),
  line('bryan-concierto','Ya te dije que no puedo seguir jugando, tengo un concierto.'),
  line('bryan-coronel','Esto me recuerda a cuando me saqué la Coronel Sanders en un evento.')
 ],ambient:[]},
 {id:'beto',name:'Beto',image:'./art/beto-reference.png',height:205,voice:'Masculina y joven',fall:[
  line('beto-kareli','¡Me saqué la Kareli!'),
  line('beto-cae','¿Cómo te cae Kareli? A mí, mal.'),
  line('beto-bullying','¿Ya te conté la historia de cuando me hacían bullying en la comunidad IDD?'),
  line('beto-crayola','Volví a perder, como cuando me rayé la cara con una crayola para la final de un camp.'),
  line('beto-campria','¡Me dejaron toda Campria All Stars dos!')
 ],ambient:[]},
 {id:'greg',name:'Greg',image:'./art/greg-reference.png',height:202,voice:'Aguda y chillona',fall:[
  line('greg-rep','¡Me saqué la Greg Rep!'),
  line('greg-retos','Estos retos están horribles. Mejor pon los de Turn It Up, de mandar música de canciones de cuna.'),
  line('greg-gregorito','¡Me dejaron toda la Gregorito!'),
  line('greg-chats','Deja de perder o te filtro tus chats.'),
  line('greg-verguenza','Pasé vergüenza por milésima vez.'),
  line('greg-cardi','Tengo que buscar a Lucas y decirle que le puse noventa y nueve de nota al álbum de Cardi B.')
 ],ambient:[]},
 {id:'sallua',name:'Sal Lua',image:'./art/sallua-reference.png',height:211,voice:'Excéntrica y juguetona',fall:[
  line('sallua-cincuenta','Esta es la vez número cincuenta y uno que pierdo este juego.'),
  line('sallua-camp','¡Me dejaron toda un Camp Así!'),
  line('sallua-traitors','Deberías saber que gané The Traitors uno hace diez años.'),
  line('sallua-desempleada','Ya te dije que no estoy desempleada, solo no tengo nada mejor que hacer.'),
  line('sallua-ir','Sigue perdiendo, no me quiero ir.'),
  line('sallua-pesimo','Eres pésimo jugando, me recuerdas a mí.')
 ],ambient:[]},
 {id:'ivy',name:'Ivy',image:'./art/ivy-reference.png',height:208,voice:'Femenina, arrogante y segura',portraitPosition:'50% 12%',fall:[
  line('ivy-natalia','¡Me dejaron toda Natalia Pierce!'),
  line('ivy-mommy','Oh my fucking God, mommy, qué icónica soy.','¡OMFG, mommy, qué icónica soy!'),
  line('ivy-get','Ay, amiga, mejor me voy a Get.'),
  line('ivy-ojitos','Mmm... ojitos... E. E.','MJM *OJITOS* E.E'),
  line('ivy-diva','Se me escurrió la The Next Diva.'),
  line('ivy-nieve','Lo blanco, ¿es coca o es nieve, para saber si me la meto por la nariz?')
 ],ambient:[]},
 {id:'eduard',name:'Eduard',image:'./art/eduard-reference.png',height:211,voice:'Masculina venezolana, cómica y rápida',portraitPosition:'50% 13%',fall:[
  line('eduard-pase','Ay, chamo, pasé pena, marico. No, sí.'),
  line('eduard-turnitup','¡Me saqué la Turn It Up!'),
  line('eduard-chavez','No joda, mamaguevo, esto es culpa de Chávez.','No joda, mamag**evo, esto es culpa de Chávez.'),
  line('eduard-pasteles','Si no salgo de aquí me voy a poner a vender pasteles de nieve.'),
  line('eduard-bunuelo','Deja de perder, marico, que tengo un buñuelo en el horno.','Deja de perder, marico, que tengo un buñuelo en el horno.'),
  line('eduard-heidi','¡Me saqué la Heidi Cum!')
 ],ambient:[]},
 {id:'kimcamila',name:'Kim Camila',image:'./art/kimcamila-reference.png',height:211,voice:'Femenina, musculosa y de registro grave',portraitPosition:'50% 11%',fall:[
  line('kimcamila-obeso','Deja de perder, obeso.'),
  line('kimcamila-gordinflon','Intenta hacerlo mejor la próxima vez, gordinflón.'),
  line('kimcamila-mamut','Estoy segura de que debes ser un mamuth de 20 kilos en persona.'),
  line('kimcamila-gym','Deberías inscribirte a mi gimnasio, lo necesitas, cerda.'),
  line('kimcamila-globalwar','Pensé que el reto sería ver un mapa hecho en PowerPoint, como en Global War.')
 ],ambient:[]},
 {id:'carlosharrington',name:'Carlos Harrington',image:'./art/carlosharrington-reference.png',height:208,voice:'Masculina joven, dicción precisa y cadencia tranquila',portraitPosition:'50% 12%',fall:[
  line('carlosharrington-trapajo','¡Me saqué la Trapajo!'),
  line('carlosharrington-bts','Apúrate, que tengo que ir a ver a BTS.'),
  line('carlosharrington-novios','¿Ya te conté que tuvo 50 novios en la comunidad IDD?'),
  line('carlosharrington-hermano','Necesito encontrar a mi hermano Daniel Sims.'),
  line('carlosharrington-arigato','¡Arigato!')
 ],ambient:[]},
 {id:'nahuee',name:'Nahuee',image:'./art/nahuee-reference.png',height:209,voice:'Femenina muy aguda y chillona',portraitPosition:'50% 10%',fall:[
  line('nahuee-ternera','¡Me dejaron toda Nahuee Ternera!'),
  line('nahuee-meto','¿Y si me meto con él?'),
  line('nahuee-pasiva','¡Me saqué la pasiva del rancho!'),
  line('nahuee-minecraft','Apúrate, que tengo que ir a jugar Minecraft.'),
  line('nahuee-luzverde','Jugaremos Muévete, luz verde.'),
  line('nahuee-nahuel','¡Qué día de la Nahuel Silva!')
 ],ambient:[]},
 {id:'pier',name:'Pier',image:'./art/pier-reference.png',height:208,voice:'Masculina extremadamente grave, oscura y demoníaca',portraitPosition:'50% 12%',fall:[
  line('pier-caer','Cuando salga de aquí, muchos van a caer.'),
  line('pier-croquetas','¿Dónde estarán mis croquetas?'),
  line('pier-jail','Prefiero estar aquí que en The Xpedition Jail.'),
  line('pier-diddy','¡Me saqué toda la P. Diddy!'),
  line('pier-edad','¿Cuántos años tienes?')
 ],ambient:[]},
 {id:'esteban',name:'Esteban',image:'./art/esteban-reference.png',height:208,voice:'Masculina joven y directa',portraitPosition:'50% 11%',fall:[
  line('esteban-ano','Me reventé el Esteban-ano.','Me reventé el Esteban-*no.'),
  line('esteban-messenger','Si no me sacas de aquí, te voy a ir a pelear por Messenger.'),
  line('esteban-instagram','Si sigues perdiendo, me voy a crear una cuenta en Instagram y exponerte.'),
  line('esteban-bracket','Me dejaron más humillado que en el bracket uno.')
 ],ambient:[]},
 {id:'marcos',name:'Marcos',image:'./art/marcos-reference.png',height:208,voice:'Masculina venezolana, cálida y sensual',portraitPosition:'50% 12%',fall:[
  line('marcos-izquierda','Esto es culpa de la izquierda liberal comunista.'),
  line('marcos-maracaibo','Prefiero estar aquí que en Maracaibo.'),
  line('marcos-trump','Trump, sácame de aquí, ya me salvaste una vez.'),
  line('marcos-marquitos','Tengo ganas de expulsar la Marquitos.'),
  line('marcos-marcostoso','¡Qué día de la Marcostoso!'),
  line('marcos-maga','Make America Great Again.')
 ],ambient:[]}
]);
export const characterConfig=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
