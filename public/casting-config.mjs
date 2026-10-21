export const CASTING_SEASON='apocalypse-ii';
export const AUDITION_PRICE=100;
export const DIRECT_PRICE=500;
export const DIRECT_CAPACITY=10;
export const LAST_DIRECT_PRICE=3000;
export const challengeTypes=['Rapidez','Inteligencia','Estrategia','Concentración','Suerte','Moda','Comedia','Música','TV y Cine','Rol','Cultura y Conocimiento','Edición y Habilidades','Composición','Producto y Venta','Duelos'];
export const playerTypes=['El estratega','El villano','El competitivo','El impredecible','El cómico'];
export const allyChoices=['Lo confronto inmediatamente.','Finjo no saber nada y preparo mi venganza.','Busco otra alianza para protegerme.','Intento convencerlo de continuar juntos.'];
export const agreementLabels=['Totalmente en desacuerdo','En desacuerdo','Ni de acuerdo ni en desacuerdo','De acuerdo','Totalmente de acuerdo'];
export const castingQuestions=[
 {id:'history',type:'history',title:'¿Ya participaste antes?',note:'Queremos conocer tu historia en el universo.',seconds:60,chapter:'Tu historia'},
 {id:'why',type:'text',title:'¿Por qué debería elegirte entre los demás?',note:'Este es tu momento. Haz que recordemos tu nombre.',seconds:90,chapter:'Tu historia',max:1800},
 {id:'role',type:'choice',title:'¿Qué tipo de participante crees que serías?',options:playerTypes,seconds:25,chapter:'Tu juego'},
 {id:'unfair',type:'text',title:'¿Cómo reaccionarías si fueras eliminado injustamente?',note:'Cuéntanos qué harías, con tus propias palabras.',seconds:75,chapter:'Tu juego',max:1800},
 {id:'ally',type:'choice',title:'Si descubres que tu mejor aliado planea eliminarte, ¿qué haces?',options:allyChoices,seconds:25,chapter:'Tu juego'},
 {id:'challenges',type:'multi',title:'¿Cuál es tu tipo de reto favorito?',note:'Elige hasta 3. No tienes que ser bueno en todo.',options:challengeTypes,max:3,seconds:35,chapter:'Tu juego'},
 {id:'confidence',type:'scale',title:'Confío en mis decisiones incluso cuando tengo poco tiempo.',seconds:20,chapter:'Bajo presión'},
 {id:'adaptation',type:'scale',title:'Puedo cambiar de plan sin perder la calma cuando algo sale mal.',seconds:20,chapter:'Bajo presión'},
 {id:'spotlight',type:'scale',title:'Me siento cómodo defendiendo una idea cuando todos están en desacuerdo.',seconds:20,chapter:'Bajo presión'},
 {id:'risk',type:'scale',title:'Prefiero arriesgarme por una ventaja antes que jugar sobre seguro.',seconds:20,chapter:'Bajo presión'},
 {id:'decision1',type:'decision',title:'La alarma está sonando. Solo puedes tomar una cosa.',note:'Tu primera decisión en The Casting Challenge.',options:['Salvar a mi aliado de la eliminación','Conseguir inmunidad para mí','Arriesgarme por una ventaja secreta'],scores:['Estratega','Competitivo','Caótico'],seconds:25,chapter:'The Casting Challenge'},
 {id:'decision2',type:'decision',title:'Encuentras un mensaje que cambia todo.',note:'Tu alianza quiere votar a alguien que podría ayudarte a ganar.',options:['Negocio en secreto para conservar las dos opciones','Voy por quien amenaza mi victoria','Revelo el mensaje frente a todo el grupo'],scores:['Estratega','Competitivo','Caótico'],seconds:25,chapter:'The Casting Challenge'},
 {id:'decision3',type:'decision',title:'La última puerta está por cerrarse.',note:'Queda una ventaja. Otra persona está a punto de alcanzarla.',options:['Le propongo compartir la información y hacer un trato','Compito hasta el último segundo para conseguirla','Cambio las reglas del juego con una decisión inesperada'],scores:['Estratega','Competitivo','Caótico'],seconds:25,chapter:'The Casting Challenge'}
];
export function castingProfile(answers){
 const scores={Estratega:0,Competitivo:0,'Caótico':0};let answered=0;
 for(const question of castingQuestions.filter(q=>q.type==='decision')){const answer=answers[question.id]?.value;if(question.options.includes(answer)){scores[question.scores[question.options.indexOf(answer)]]++;answered++;}}
 const highest=Math.max(...Object.values(scores)),leaders=Object.keys(scores).filter(key=>scores[key]===highest);
 return {name:!answered?'Sin definir':leaders.length>1?'Versátil':leaders[0],scores,answered,description:!answered?'No hubo decisiones suficientes para definir un estilo.':leaders.length>1?'Combinas estrategia, competencia y sorpresa. Tu juego cambia con la situación.':({Estratega:'Lees el tablero, cuidas tus opciones y piensas en el siguiente movimiento.',Competitivo:'Vas por la victoria. Te motivan los retos y demostrar lo que puedes hacer.','Caótico':'Te atreves a cambiar el rumbo. La sorpresa y el riesgo forman parte de tu juego.'})[leaders[0]]};
}
