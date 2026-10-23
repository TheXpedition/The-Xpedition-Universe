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
,
 {"id":"ivanserrano","name":"Ivan Serrano","height":211,"voice":"Dulce y principesca","fall":[{"id":"ivanserrano-ivansere","spoken":"¡Me dejaron toda Ivansere doce!","text":"¡Me dejaron toda Ivansere12!"},{"id":"ivanserrano-celebrity","spoken":"¿Ya te dije que gané Celebrity Stars?","text":"¿Ya te dije que gané Celebrity Stars?"},{"id":"ivanserrano-ophelia","spoken":"¡Me saqué la The Fate of Ophelia!","text":"¡Me saqué la The Fate of Ophelia!"},{"id":"ivanserrano-taytay","spoken":"TayTay, ayúdame a salir de aquí.","text":"TayTay, ayúdame a salir de aquí."},{"id":"ivanserrano-marionel","spoken":"Necesito que Marionel Bros me rescate.","text":"Necesito que Marionel Bros me rescate."}],"image":"./art/ivanserrano-reference.png","ambient":[]},
 {"id":"maryhao","name":"Mary Hao","height":205,"voice":"Tierna y luminosa","fall":[{"id":"maryhao-graduacion","spoken":"¿Ya le diste like a mi post de la graduación de la primaria?","text":"¿Ya le diste like a mi post de la graduación de la primaria?"},{"id":"maryhao-seventeen","spoken":"Quedé hecha una Seven Teen Chua con trocitos de The King of China.","text":"Quedé hecha una Seven Teen Chua con trocitos de ᴛʜᴇ ᴋɪɴɢ ᴏғ ᴄʜɪɴᴀ."},{"id":"maryhao-lesbiana","spoken":"Ya te dije que no soy lesbiana.","text":"Ya te dije que no soy lesbiana."},{"id":"maryhao-bts","spoken":"BTS paved the way.","text":"BTS paved the way."},{"id":"maryhao-completa","spoken":"¡Me saqué la Mary Hao completísima!","text":"¡Me saqué la Mary Hao completísima!"},{"id":"maryhao-taetae","spoken":"¿Qué estará haciendo TaeTae en el servicio militar?","text":"¿Qué estará haciendo TaeTae en el servicio militar?"}],"image":"./art/maryhao-reference.png","ambient":[]},
 {"id":"marianito","name":"Marianito","height":208,"voice":"Masculina joven y relajada","fall":[{"id":"marianito-marranito","spoken":"¡Me saqué la Marranito!","text":"¡Me saqué la Marranito!"},{"id":"marianito-soltero","spoken":"¿Estás soltero?","text":"¿Estás soltero?"},{"id":"marianito-pagar","spoken":"Me la vas a pagar si sigues perdiendo.","text":"Me la vas a pagar si sigues perdiendo."},{"id":"marianito-piscina","spoken":"Esto me recuerda a cuando salté a la piscina, como en mi foto de perfil.","text":"Esto me recuerda a cuando salté a la piscina, como en mi foto de perfil."},{"id":"marianito-acostumbrado","spoken":"No importa si pierdes, ya estoy acostumbrado.","text":"No importa si pierdes, ya estoy acostumbrado."}],"image":"./art/marianito-reference.png","ambient":[]},
 {"id":"gabrielsab","name":"Gabriel Sab","height":208,"voice":"Emo, grave y reservada","fall":[{"id":"gabrielsab-swetty","spoken":"¡Me saqué la Swetty!","text":"¡Me saqué la Swetty!"},{"id":"gabrielsab-pasivo","spoken":"Soy pasivo.","text":"Soy pasivo."},{"id":"gabrielsab-app","spoken":"Pensé que esta app sería como Grindr.","text":"Pensé que esta app sería como Grindr."},{"id":"gabrielsab-saltando","spoken":"¿Cómo voy a perder, si ya tengo experiencia saltando?","text":"¿Cómo voy a perder, si ya tengo experiencia saltando?"},{"id":"gabrielsab-mcr","spoken":"¿Has escuchado My Chemical Romance?","text":"¿Has escuchado My Chemical Romance?"},{"id":"gabrielsab-pier","spoken":"No sé si sabías que Pier era mi ex.","text":"No sé si sabías que Pier era mi ex."}],"image":"./art/gabrielsab-reference.png","ambient":[]},
 {"id":"alice","name":"Alice","height":202,"voice":"Gótica, lenta y melancólica","fall":[{"id":"alice-torrico","spoken":"¡Me saqué la Alice Torrico Vergas!","text":"¡Me saqué la Alice Torrico V*rgas!"},{"id":"alice-matar","spoken":"Me quiero matar.","text":"Me quiero m*tar."},{"id":"alice-golpe","spoken":"Ese golpe fue muy leve, pégame más fuerte.","text":"Ese golpe fue muy leve, pégame más fuerte."},{"id":"alice-manson","spoken":"¿Sabías que escucho a Marilyn Manson?","text":"¿Sabías que escucho a Marilyn Manson?"},{"id":"alice-jubilarte","spoken":"Deberías jubilarte de este juego.","text":"Deberías jubilarte de este juego."},{"id":"alice-carmine","spoken":"Todavía estás a tiempo de salir de aquí y ahorrarte otra Carmine.","text":"Todavía estás a tiempo de salir de aquí y ahorrarte otra Carmine."},{"id":"alice-dragmother","spoken":"¿Sabías que P. Diddy es mi Drag Mother?","text":"¿Sabías que P. Diddy es mi Drag Mother?"}],"image":"./art/alice-reference.png","ambient":[]},
 {"id":"oscar","name":"Oscar","height":209,"voice":"Masculina colombiana","fall":[{"id":"oscar-barajas","spoken":"¡Me saqué la Oscar Barajas!","text":"¡Me saqué la Oscar Barajas!"},{"id":"oscar-patria","spoken":"¡Firmes por la patria!","text":"¡Firmes por la patria!"},{"id":"oscar-tigre","spoken":"Cuídate, Bonju. El tigre viene por ti y muerde.","text":"Cuídate, Bonju. El tigre viene por ti y muerde."},{"id":"oscar-webcamer","spoken":"¿Ya te dije que soy webcammer y trabajo a las tres de la mañana?","text":"¿Ya te dije que soy w*bcamer y trabajo a las 3 a. m.?"}],"image":"./art/oscar-reference.png","ambient":[]},
 {"id":"bruno","name":"Bruno","height":211,"voice":"Aguda, coqueta y teatral","fall":[{"id":"bruno-kingdick","spoken":"¡Me saqué la King Dick!","text":"¡Me saqué la King D*ck!"},{"id":"bruno-moda","spoken":"¿Ya te conté que casi gano Moda Total?","text":"¿Ya te conté que casi gano Moda Total?"},{"id":"bruno-tickets","spoken":"No soy friki por tener cuatrocientos sesenta y tres mil setecientos cincuenta y ocho tickets.","text":"No soy friki por tener 463758 tickets."},{"id":"bruno-dragrace","spoken":"Apúrate, que tengo que ir a ver todas las franquicias de Drag Race.","text":"Apúrate, que tengo que ir a ver todas las franquicias de Drag Race."},{"id":"bruno-discord","spoken":"¡Me saqué la Discord Total!","text":"¡Me saqué la Discord Total!"},{"id":"bruno-poste","spoken":"No me tienes que rogar más, podemos ir y hacerlo detrás de ese poste.","text":"No me tienes que rogar más, podemos ir y hacerlo detrás de ese poste."}],"image":"./art/bruno-reference.png","ambient":[]},
 {"id":"doppel","name":"Doppel","height":206,"voice":"Neutra y tranquila","fall":[{"id":"doppel-camper","spoken":"¡Me saqué la Doppel Camper completísima!","text":"¡Me saqué la Doppel Camper completísima!"},{"id":"doppel-hipopotamo","spoken":"¿Ya te dije que era el día del hipopótamo?","text":"¿Ya te dije que era el día del hipopótamo?"},{"id":"doppel-chudae","spoken":"¡Me saqué la Chudae!","text":"¡Me saqué la Chudae!"},{"id":"doppel-foca","spoken":"Deberíamos hacer el día de la foca.","text":"Deberíamos hacer el día de la foca."},{"id":"doppel-pronombres","spoken":"Ya te dije que mis pronombres son they, them, it, ix, witz, motz.","text":"Ya te dije que mis pronombres son they, them, it, ix, witz, motz."}],"image":"./art/doppel-reference.png","ambient":[]},
 {"id":"bodegabodeguita","voiceProfile":"es-MX-JorgeNeural","name":"Bodega Bodeguita","height":210,"voice":"TikToker, enérgica y expresiva","fall":[{"id":"bodegabodeguita-steve","spoken":"¡Me saqué la Steve Rockwell!","text":"¡Me saqué la Steve Rockwell!"},{"id":"bodegabodeguita-tiktoker","spoken":"Ya te dije que soy TikToker.","text":"Ya te dije que soy TikToker."},{"id":"bodegabodeguita-bailar","spoken":"Termina rápido, que tengo que ir a bailar Bby Wow de Karol G para mis fans.","text":"Termina rápido, que tengo que ir a bailar Bby Wow de Karol G para mis fans."},{"id":"bodegabodeguita-activo","spoken":"¿Dónde estará Activo Con Lugar No Fems, y por qué me trajo a este lugar?","text":"¿Dónde estará Activo Con Lugar No Fems, y por qué me trajo a este lugar?"}],"image":"./art/bodegabodeguita-reference.png","ambient":[]},
 {"id":"leandro","voiceProfile":"es-CL-LorenzoNeural","name":"Leandro","height":208,"voice":"Masculina joven y coqueta","fall":[{"id":"leandro-nyx","spoken":"¡Me saqué la Leandro Nyx!","text":"¡Me saqué la Leandro Nyx!"},{"id":"leandro-bonju","spoken":"Termina rápido, que tengo que ir a insultar a Bonju por cuatrocientos sesenta y tres mil ochocientos cuarenta y siete vez en el día.","text":"Termina rápido, que tengo que ir a insultar a Bonju por 463847 vez en el día."},{"id":"leandro-sangwoo","spoken":"¿Será que aquí consigo a mi Sangwoo?","text":"¿Será que aquí consigo a mi Sangwoo?"},{"id":"leandro-novio","spoken":"¿Te gustaría ser mi novio?","text":"¿Te gustaría ser mi novio?"},{"id":"leandro-onlyfans","spoken":"¿Ya me sigues en OnlyFans?","text":"¿Ya me sigues en OnlyFans?"}],"image":"./art/leandro-reference.png","ambient":[]},
 {"id":"renzo","voiceProfile":"es-ES-AlvaroNeural","name":"Renzo","height":212,"voice":"Locutor, grave y clara","fall":[{"id":"renzo-chat","spoken":"¡Me saqué la chat tosero!","text":"¡Me saqué la chat tosero!"},{"id":"renzo-rodriguez","spoken":"¡Qué día de la Renzo Rodríguez!","text":"¡Qué día de la Renzo Rodríguez!"},{"id":"renzo-facebook","spoken":"No sé si sabías que estoy en Facebook desde mil setecientos cincuenta.","text":"No sé si sabías que estoy en Facebook desde 1750."},{"id":"renzo-okami","spoken":"¿Dónde estará mi perro Okami?","text":"¿Dónde estará mi perro Okami?"},{"id":"renzo-noche","spoken":"Noche. Prohibido hablar. Te mando por privado los cuatro mil seiscientos cincuenta y siete roles que hay por elegir.","text":"— Noche — Prohibido hablar, te mando por privado los 4657 roles que hay por elegir."}],"image":"./art/renzo-reference.png","ambient":[]},
 {"id":"misskopp","voiceProfile":"es-MX-DaliaNeural","name":"Miss Kopp","height":193,"voice":"Muy aguda, chillona y traviesa","fall":[{"id":"misskopp-mommy","spoken":"Mommy, estás mas é chalupa da cabeça.","text":"Mommy, estás mas é chalupa da cabeça."},{"id":"misskopp-recarga","spoken":"Si me sacas de aquí te hago una recarga de celular.","text":"Si me sacas de aquí te hago una recarga de celular."},{"id":"misskopp-kappa","spoken":"¿Te gustaría audicionar a Kappa Kappa House?","text":"¿Te gustaría audicionar a Kappa Kappa House?"},{"id":"misskopp-memea","spoken":"¡MEMEAAA, POBRE PERRITA! Bien nappa.","text":"¡MEMEAAA, POBRE P*RRITA! :d bien nappa."},{"id":"misskopp-mastermind","spoken":"¡Upupupupu! Me descubriste, soy la mastermind.","text":"¡Upupupupu! Me descubriste, soy la mastermind."},{"id":"misskopp-sopa","spoken":"Sopa de Macaco, uma delícia.","text":"Sopa de Macaco, uma delícia."}],"image":"./art/misskopp-reference.png","ambient":[]},
 {"id":"solf","voiceProfile":"es-CO-SalomeNeural","name":"Solf","height":211,"voice":"Felina, animada y teatral","fall":[{"id":"solf-sphynx","spoken":"Quedé hecha una Sphynx.","text":"Quedé hecha una Sphynx."},{"id":"solf-origen","spoken":"¿Ya te dije que soy mitad filipina, hindú, francesa y egipciana?","text":"¿Ya te dije que soy mitad filipina, hindú, francesa y egipciana?"},{"id":"solf-cumpleanos","spoken":"A la mierda, espero que te pase algo horrible en tu cumpleaños.","text":"A la m**rda, espero que te pase algo horrible en tu cumpleaños."},{"id":"solf-alex","spoken":"Tienes que sacarme de aquí, me tengo que convertir en la próxima Alex Consani.","text":"Tienes que sacarme de aquí, me tengo que convertir en la próxima Alex Consani."},{"id":"solf-wins","spoken":"Imposible que haya perdido, yo tengo cincuenta y seis mil cuatrocientos treinta y siete wins en otras competencias.","text":"Imposible que haya perdido, yo tengo 56437 Wins en otras competencias."},{"id":"solf-renuncio","spoken":"No voy a perder más, renuncio.","text":"No voy a perder más, renuncio."},{"id":"solf-petska","spoken":"No sé si sabías que los Petska somos la primera familia japonesa en Latinoamérica.","text":"No sé si sabías que los Petska somos la primera familia japonesa en Latinoamérica."}],"image":"./art/solf-reference.png","ambient":[]},
 {"id":"arisalgado","voiceProfile":"es-EC-LuisNeural","name":"Ari Salgado","height":211,"voice":"Masculina joven latina","fall":[{"id":"arisalgado-zoom","spoken":"Pensé que el reto era por Zoom.","text":"Pensé que el reto era por Zoom."},{"id":"arisalgado-survivor","spoken":"En Survivor Virtual by Jeff Zere esto era más fácil.","text":"En Survivor Virtual by Jeff Zere esto era más fácil."},{"id":"arisalgado-idolos","spoken":"¿Dónde están los ídolos?","text":"¿Dónde están los ídolos?"},{"id":"arisalgado-idd","spoken":"Ya te conté que estuve en la comunidad IDD hace diez años.","text":"Ya te conté que estuve en la comunidad IDD hace 10 años."},{"id":"arisalgado-fogata","spoken":"¿A qué hora inicia la fogata para hacer blindside?","text":"¿A qué hora inicia la fogata para hacer blindside?"},{"id":"arisalgado-sole","spoken":"¡Me saqué la Sole Survivor!","text":"¡Me saqué la Sole Survivor!"}],"image":"./art/arisalgado-reference.png","ambient":[]},
 {"id":"pablo","voiceProfile":"es-AR-TomasNeural","name":"Pablo","height":213,"voice":"Argentina, grave y seductora","fall":[{"id":"pablo-maximoff","spoken":"¡Me saqué la Lucas Maximoff!","text":"¡Me saqué la Lucas Maximoff!"},{"id":"pablo-argentinos","spoken":"¿Sabías que los argentinos no somos latinos?","text":"¿Sabías que los argentinos no somos latinos?"},{"id":"pablo-milei","spoken":"¿A qué hora Milei me saca de aquí?","text":"¿A qué hora Milei me saca de aquí?"},{"id":"pablo-ancestro","spoken":"¿Sabías que mi ancestro era Luis diecisiete y soy de raza pura?","text":"¿Sabías que mi ancestro era Louis XVII y soy de raza pura?"},{"id":"pablo-endgame","spoken":"¿Sabías que End Game es la película más taquillera de los Avengers?","text":"¿Sabías que End Game es la película más taquillera de los Avengers?"}],"image":"./art/pablo-reference.png","ambient":[]},
 {"id":"luis","voiceProfile":"es-GT-AndresNeural","name":"Luis","height":209,"voice":"Masculina joven y vivaz","fall":[{"id":"luis-mauricio","spoken":"¡Me saqué la Luis Mauricio!","text":"¡Me saqué la Luis Mauricio!"},{"id":"luis-cuerda","spoken":"En mis tiempos el reto solo era Salto la Cuerda uno, Salto la Cuerda dos.","text":"En mis tiempos el reto solo era Salto la Cuerda 1, Salto la Cuerda 2."},{"id":"luis-moda","spoken":"Entiende que soy experto en moda.","text":"Entiende que soy experto en moda."},{"id":"luis-armaggedon","spoken":"¡Qué día de la Armaggedon!","text":"¡Qué día de la 4rmaggedon!"},{"id":"luis-topmodel","spoken":"¿Te gustaría jugar Top Model en Messenger con Atneimip y Candy Cookies?","text":"¿Te gustaría jugar Top Model en Messenger con Atneimip y Candy Cookies?"},{"id":"luis-meiling","spoken":"¡Me fui a la Mei Ling!","text":"¡Me fui a la Mei Ling!"}],"image":"./art/luis-reference.png","ambient":[]},
 {"id":"plastiquedoll","voiceProfile":"es-US-PalomaNeural","name":"Plastique Doll","height":208,"voice":"Diva, altiva y cortante","fall":[{"id":"plastiquedoll-babi","spoken":"¡Pasé la Babi Hoe!","text":"¡Pasé la Babi H*e!"},{"id":"plastiquedoll-incompetente","spoken":"Eres un completo incompetente.","text":"Eres un completo incompetente."},{"id":"plastiquedoll-inutil","spoken":"¡Qué inútil eres!","text":"¡Qué inútil eres!"},{"id":"plastiquedoll-pendejo","spoken":"Pendejo, no dura nada.","text":"P*ndejo, no dura nada."},{"id":"plastiquedoll-luciano","spoken":"¿Eres Luciano o por qué juegas tan mal?","text":"¿Eres Luciano o por qué juegas tan mal?"},{"id":"plastiquedoll-habbo","spoken":"Mejor me quedaba en Habbo.","text":"Mejor me quedaba en Habbo."},{"id":"plastiquedoll-reina","spoken":"Soy la reina de la temporada, aprende a usarme, cerdo.","text":"Soy la reina de la temporada, aprende a usarme, cerdo."}],"image":"./art/plastiquedoll-reference.png","ambient":[]},
 {"id":"teseo","voiceProfile":"es-BO-MarceloNeural","name":"Teseo","height":212,"voice":"Masculina pausada y pedante","fall":[{"id":"teseo-pelicula","spoken":"Ya te dije que mi película favorita es una rusa de mil quinientos setenta, grabada en blanco y negro, con tres reseñas en IMDb.","text":"Ya te dije que mi película favorita es una rusa de 1570 grabada en blanco y negro con 3 reseñas en IMDb."},{"id":"teseo-bignon","spoken":"¡Pasé la TCO Bignon completísima!","text":"¡Pasé la TCO Bignon completísima!"},{"id":"teseo-profesor","spoken":"Te conté que soy profesor de Sexología.","text":"Te conté que soy profesor de Sexología."},{"id":"teseo-estrellas","spoken":"Ya vi suficiente, ahora iré a calificar este juego con cero estrellas.","text":"Ya vi suficiente, ahora iré a calificar este juego con 0 estrellas."},{"id":"teseo-sixseven","spoken":"Six Seven.","text":"Six Seven."}],"image":"./art/teseo-reference.png","ambient":[]}
]);
export const characterConfig=id=>CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
