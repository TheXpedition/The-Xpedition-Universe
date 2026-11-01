export const FALL_LINES=[
 {id:'fall-trani',spoken:'¡Me dejaron toda Trani!',text:'¡Me dejaron toda Trani!'},
 {id:'fall-ramdanneh',spoken:'¡Se me salió la RamDanneh!',text:'¡Se me salió la RamDanneh!'},
 {id:'fall-jugo',spoken:'¡Me saqué toda la Jugo de Pija!',text:'¡Me saqué toda la Jugo de P*ja!'},
 {id:'fall-daniela',spoken:'Quedé hecha toda una Daniela Jara Valentina.',text:'Quedé hecha toda una Daniela Jara Valentina.'},
 {id:'fall-concha',spoken:'¡Me partí toda la concha en esta mamada!',text:'¡Me partí toda la c*nch* en esta m*m*d*!'},
 {id:'fall-camp',spoken:'¡Me dejaron toda un camp así!',text:'¡Me dejaron toda un camp así!'},
 {id:'fall-lynx',spoken:'¡Hijueputa! ¡Me saqué la Leandro Lynx!',text:'¡Hiju*p*t*! ¡Me saqué la Leandro Lynx!'},
 {id:'fall-doble-cara',spoken:'Esto me pasa por doble cara, falsa, hipócrita, mustia, mentirosa, roba maridos, manca, zoofílica y pedófila.',text:'Esto me pasa por doble cara, falsa, hipócrita, mustia, mentirosa, roba maridos, manca, zo*fílica y ped*fila.'}
];
export const AMBIENT_LINES=[
 {id:'idle-carlos',spoken:'Qué día de la Carlos Harrington.',text:'Qué día de la Carlos Harrington.'},
 {id:'idle-felix',spoken:'Prefiero estar aquí que con Félix amenazándome de muerte.',text:'Prefiero estar aquí que con Félix amenazándome de muerte.'},
 {id:'idle-frio-corregido',spoken:'Qué frío hace, pero yo estoy caliente.',text:'Qué frío hace, pero yo estoy caliente.'},
 {id:'idle-foca',spoken:'¿Por qué esa foca se parece al ogro de Andrómeda?',text:'¿Por qué esa foca se parece al ogro de Andrómeda?'},
 {id:'idle-acoso',spoken:'Tengo que ganar para seguir acosando más mujeres.',text:'Tengo que ganar para seguir acosando más mujeres.'},
 {id:'idle-lucas',spoken:'Prefiero quedarme aquí todo el día que hacer la lista del top cuarenta artistas de Lucas Mendes.',text:'Prefiero quedarme aquí todo el día que hacer la lista del top 40 artistas de Lucas Mendes.'}
];
export function shuffleBag(lines,random=Math.random){let bag=[],last=null;return ()=>{if(!bag.length){bag=[...lines];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];}last=bag.pop();return last;};}
