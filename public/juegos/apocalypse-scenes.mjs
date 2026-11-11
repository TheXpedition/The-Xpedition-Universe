import {buildMemorialProps} from './world-memorials.mjs';
import {MAIN_WALK_ROUTE,PRODUCTION_WALK_ROUTE} from './world-route-layout.mjs';
import {APOCALYPSE_ASSETS as assets} from './apocalypse-assets.mjs';
import {createFrontScene,frontPoint} from './front-world.mjs';
const definitions=[
 ['montana-ladera','montana-ladera','Montaña · pie del sendero','El puente de patrulla llega al pie de la montaña. Una caseta conserva pocas provisiones. Sigue al este para ascender.'],
 ['montana-escalinata','montana-escalinata','Montaña · escalinata','El sendero sube por las lazadas de roca. Oeste: caseta. Este: cresta.'],
 ['montana-cresta','montana-cresta','Montaña · cresta','Un resguardo de emergencia sobre el bosque. Este: cima. Oeste: descenso por la escalinata.'],
 ['montana-cima','montana-cima','Montaña · cima','El telescopio domina las ruinas. El descenso seguro está al oeste, por la cresta.'],
 ['caseta-montana','caseta-montana','Caseta de montaña','Un cuarto pequeño con cuerdas, tela y salida al sendero.'],
 ['cruce-comunicaciones','cruce-comunicaciones','Cruce de comunicaciones','Oeste: comisaría. Este: hospital. El portón abierto conduce a la torre.'],
 ['cementerio-interior','cementerio-interior','Cementerio · sala memorial','Lápidas de la temporada en la antigua capilla. La puerta oeste vuelve al camino.'],
 ['base','refugio-1-exterior','Refugio 1','Primer alojamiento del campamento. Hacia el oeste queda el acceso al bosque; hacia el este, el bosque separa este refugio del segundo. El comedor está en el desvío señalizado.'],
 ['refugio-2','refugio-2-exterior','Refugio 2','El antiguo hangar protege las literas y los suministros del segundo grupo.'],
 ['comida','comedor','Comedor','Mesas bajo una cubierta deteriorada. La cocina permanece abierta al otro lado del mostrador.'],
 ['hospital','hospital','Hospital','El puesto médico ocupa un hospital abandonado junto a las tiendas de emergencia.'],
 ['iglesia','iglesia','Iglesia','Las ruinas de la iglesia conservan una entrada hacia la nave principal.'],
 ['cueva','cueva-exterior','Cueva','La entrada de la mina conduce a dos galerías y un túnel subterráneo.'],
 ['cuarentena','cuarentena','Zona de cuarentena','Vallas, puestos de control y un acceso iluminado al subsuelo.'],
 ['comunicaciones','comunicaciones','Torre de comunicaciones','El puesto de radio enlaza el campamento con el anfiteatro y la zona de producción.'],
 ['desafios','anfiteatro','Anfiteatro','Un escenario abierto del campamento, reservado para futuras actividades.'],
 ['cementerio','cementerio','Cementerio','El camino junto a los mausoleos continúa hacia la antigua mina.'],
 ['eliminacion','eliminacion','Ceremonia de eliminación','Las gradas rodean el escenario de Bonju. El STAFF dirige las decisiones de la temporada.'],
 ['tunel','tunel','Túnel subterráneo','Corredor subterráneo entre la galería profunda y el portón iluminado de la zona de cuarentena. Ambos extremos tienen regreso.'],
 ['cocina','cocina','Cocina','Estanterías, fogones y una zona de servicio detrás del comedor.'],
 ['iglesia-interior','iglesia-interior','Interior de la iglesia','Una nave abierta al cielo, con pasillos entre los bancos y el altar en ruinas.'],
 ['hospital-interior','hospital-interior','Hospital · interior','La sala de atención conserva camas, equipo médico y el registro de la patrulla.'],
 ['cueva-galeria','cueva-galeria','Cueva · galería de entrada','Sigue la iluminación hasta el segundo tramo de la mina.'],
 ['cueva-profunda','cueva-profunda','Cueva · galería profunda','Pasarelas antiguas y un acceso al corredor subterráneo.'],
 ['refugio-1','refugio-1-interior','Refugio 1 · interior','Área de descanso del primer refugio.'],
 ['dormitorio-2','refugio-2-interior','Refugio 2 · interior','Dormitorio del segundo refugio.'],
 ['confesionario','produccion-interior','Confesionario','Un espacio privado para registrar tus notas de la temporada.'],
 ['tren-pasajeros','tren-pasajeros','Tren · pasajeros','Tu primera llegada al recinto. Recorre los vagones o sal por la puerta hacia el andén de la estación.'],
 ['tren-salon','tren-salon','Tren · salón','El salón conecta el vagón de pasajeros con la cabina del tren.'],
 ['tren-equipaje','tren-equipaje','Tren · equipaje','El último vagón guarda el equipaje de la expedición. Regresa por pasajeros para salir a la estación.'],
 ['tren-cabina','tren-cabina','Tren · cabina','La cabina conserva los mandos del tren detenido. El salón comunica con el resto de los vagones.'],
 ['estacion','estacion','Estación abandonada','El andén es la entrada al mundo. La carretera hacia el este pasa por la gasolinera y el desguace antes del control.'],
 ['gasolinera-interior','gasolinera-interior','Tienda de la gasolinera','Estanterías con alimentos secos y suministros limitados. La puerta de cristal devuelve a la carretera.'],
 ['gasolinera','gasolinera','Gasolinera','Cruce de la carretera de llegada. Un desvío baja al puerto; el camino principal continúa hacia el desguace.'],
 ['desguace','desguace','Desguace','El tramo industrial separa la estación del control del campamento. Continúa al este para llegar a cuarentena.'],
 ['comisaria','comisaria','Comisaría','Puesto de seguridad entre cuarentena y el hospital. Sigue al este hasta el cruce señalizado para ir a comunicaciones.'],
 ['comisaria-interior','comisaria-interior','Comisaría · control','La sala de vigilancia reúne los registros de seguridad y las cámaras del recinto.'],
 ['sendero-bosque','sendero-bosque','Bosque de los refugios','Sendero continuo entre los dos alojamientos: Refugio 1 al oeste y Refugio 2 al este. Sigue la carretera para cruzar el bosque; no necesitas buscar accesos invisibles.'],
 ['acceso-bosque','acceso-bosque','Acceso al bosque','La carretera se aleja del control de cuarentena y continúa hasta el Refugio 1. El sendero junto a los pinos desciende a la ribera.'],
 ['carretera-patrulla','carretera-patrulla','Carretera de patrulla','La carretera continúa desde el puente oriental del Refugio 2 hasta la comisaría. Oeste: arroyo y refugios. Este: seguridad y hospital.'],
 ['ruta-refugio-oriental','ruta-refugio-oriental','Sendero oriental del refugio','El camino sale del lado derecho del Refugio 2, cruza el arroyo y continúa hacia la carretera de patrulla y la comisaría.'],
 ['cascada-ribera','cascada-ribera','Ribera de la cascada','Un sendero del bosque baja al río. La plataforma de pesca queda frente a la corriente; la orilla continúa hacia la poza de la cascada.'],
 ['poza-cascada','poza-cascada','Poza de la cascada','Varias caídas de agua alimentan una poza amplia con plataforma de pesca, fuente y escalones hacia la zona de baño. Regresa por la ribera para volver al bosque.'],
 ['puerto','puerto','Puerto abandonado','El camino desde la gasolinera llega a la antigua dársena. Sigue la orilla hasta el muelle de las ruinas.'],
 ['muelle-ruinas','muelle-ruinas','Muelle de las ruinas','El final del paseo del puerto, frente al río y las murallas derruidas. El regreso sigue la misma orilla.'],
 ['avion-interior','avion-interior','Avión · interior','Cabina del avión destruido. La salida izquierda lleva a las escaleras del aeródromo; cada maleta conserva existencias compartidas.'],
 ['avion','avion','Aeródromo · avión','Los restos del avión ocupan el antiguo aeródromo, después del hangar y antes del anfiteatro.'],
 ['pista-aerodromo','pista-aerodromo','Hangar y pista','El acceso a las pistas une la torre de comunicaciones con los restos del avión. Puedes regresar a comunicaciones por el oeste o seguir al aeródromo por el este.']
];
export const LEGACY_ZONES=Object.freeze({montana:'comunicaciones',mirador:'comunicaciones',muelle:'cuarentena',taller:'refugio-2',bosque:'cementerio',termales:'hospital'});
export const canonicalZone=id=>LEGACY_ZONES[id]||id;
export function buildApocalypseMaps(){
 const walkBands={'caseta-montana':[.875,.945],comunicaciones:[.78,.948],'acceso-bosque':[.665,.805],'carretera-patrulla':[.706,.805],'ruta-refugio-oriental':[.735,.825],'cascada-ribera':[.718,.785],'poza-cascada':[.815,.935]};
 const maps=Object.fromEntries(definitions.filter(([,asset])=>assets[asset]).map(([id,asset,name,description])=>{const walk=walkBands[id]||[.747,.948];return [id,createFrontScene({id,asset:assets[asset],name,description,artScale:id==='comunicaciones'?1.8:1.5,walk,spawn:[.28,(walk[0]+walk[1])/2],private:id==='confesionario'})];}));
 const coord=(id,x,y)=>frontPoint(maps[id],x,y);
 const groundY=id=>(maps[id].walkBand[0]+maps[id].walkBand[1])/2;
 // Interior paintings use a closer shot: match the adults to their doors and furniture.
 for(const id of ['refugio-1','dormitorio-2','confesionario','cocina','hospital-interior','comisaria-interior','gasolinera-interior','avion-interior','tren-pasajeros','tren-salon','tren-equipaje','tren-cabina'])maps[id].avatarHeight=300;
 maps['iglesia-interior'].avatarHeight=250;
 // Match adults to the foreground telescope and railings, without changing cast proportions.
 for(const id of ['montana-cima','montana-cresta'])maps[id].avatarHeight=470;
 function obj(id,name,type,x,y,extra={}){const m=maps[id],p=coord(id,x,y);const prop={id:name,type,...p,w:70,h:35,height:60,solid:false,painted:true,...extra};m.props.push(prop);return prop;}
 function access(from,to,id,x,y,{spawn,hit,auto=false,trigger,label,arrival,...extra}={}){if(!maps[from]||!maps[to])return;const m=maps[from],p=coord(from,x,y);if(arrival)m.spawns[id]=coord(from,...arrival);return obj(from,id,'door',x,y,{label:label||maps[to].name,hitRect:hit&&[hit[0]*m.width,hit[1]*m.height,hit[2]*m.width,hit[3]*m.height],portal:{zone:to,...p,toSpawn:spawn,auto,range:auto?1:110,trigger:trigger?[trigger[0]*m.width,trigger[1]*m.height,trigger[2]*m.width,trigger[3]*m.height]:!auto&&hit?[hit[0]*m.width,m.walkBand[0]*m.height,hit[2]*m.width,m.walkBand[1]*m.height]:undefined,...extra}});}
 function street(a,b){const left=maps[a],right=maps[b];if(!left||!right)return;left.spawns['east']=coord(a,.92,groundY(a));right.spawns['west']=coord(b,.08,groundY(b));access(a,b,'road-east',.975,groundY(a),{spawn:'west',auto:true,trigger:[.95,left.walkBand[0],1,left.walkBand[1]],label:'Camino a '+right.name});access(b,a,'road-west',.025,groundY(b),{spawn:'east',auto:true,trigger:[0,right.walkBand[0],.05,right.walkBand[1]],label:'Camino a '+left.name});}
 function interior(exterior,inside,x,hit){if(!maps[inside])return;maps[exterior].spawns['door-'+inside]=coord(exterior,x,.79);maps[inside].spawns['entrance']=coord(inside,.24,.86);access(exterior,inside,'enter-'+inside,x,Math.max(.772,maps[exterior].walkBand[0]+.015),{spawn:'entrance',hit,label:'Entrar · '+maps[inside].name});access(inside,exterior,'exit',.08,.81,{spawn:'door-'+inside,hit:[.015,.5,.14,.76],label:'Salir · '+maps[exterior].name});}
 // A road has a physical west and east end. Branches use their own manual access.
 const road=MAIN_WALK_ROUTE;for(let i=1;i<road.length;i++)street(road[i-1],road[i]);
 for(const chain of [PRODUCTION_WALK_ROUTE,['puerto','muelle-ruinas'],['tren-cabina','tren-salon','tren-pasajeros','tren-equipaje']])for(let i=1;i<chain.length;i++)street(chain[i-1],chain[i]);
 function branch(a,b,id,ax,bx){maps[a].spawns[id]=coord(a,ax,groundY(a));maps[b].spawns[id]=coord(b,bx,groundY(b));access(a,b,id+'-out',ax,groundY(a),{spawn:id,label:'Camino a '+maps[b].name});access(b,a,id+'-back',bx,groundY(b),{spawn:id,label:'Volver a '+maps[a].name});}
 branch('base','comida','canteen-trail',.17,.88);
 maps.base.wayfinding=[{x:.17,y:.735,label:'COMEDOR · DESVÍO',direction:-1}];
 maps['sendero-bosque'].wayfinding=[{x:.10,y:.735,label:'REFUGIO 1 · OESTE',direction:-1},{x:.89,y:.735,label:'REFUGIO 2 · ESTE',direction:1}];
 // An emergency footpath opens only while the eastern bridge is flooded.
 branch('sendero-bosque','carretera-patrulla','flood-detour',.71,.20);
 for(const id of ['sendero-bosque','carretera-patrulla'])for(const p of maps[id].props.filter(p=>p.id.startsWith('flood-detour'))){p.portal.eventDetour=true;p.portal.eventBlocked=true;p.portal.kind='trail';p.label='Seguir · Desvío por crecida';}
 branch('acceso-bosque','cascada-ribera','river-trail',.80,.12);
 street('cascada-ribera','poza-cascada');
 maps['acceso-bosque'].wayfinding=[{x:.80,y:.642,label:'SENDERO A LA RIBERA',direction:1}];
 maps['carretera-patrulla'].wayfinding=[{x:.53,y:.68,label:'REFUGIO 2 · PUENTE DEL ARROYO',direction:-1}];
 maps['ruta-refugio-oriental'].wayfinding=[{x:.90,y:.713,label:'CARRETERA DE PATRULLA',direction:1}];

 // The only branch toward production is the visible gate, never the police floor.
 branch('cruce-comunicaciones','comunicaciones','security-road',.52,.16);
 const gate=maps['cruce-comunicaciones'].props.find(p=>p.id==='security-road-out');
 gate.contextAnchor=coord('cruce-comunicaciones',.52,.63);gate.hitRect=[.43*maps['cruce-comunicaciones'].width,.43*maps['cruce-comunicaciones'].height,.64*maps['cruce-comunicaciones'].width,.70*maps['cruce-comunicaciones'].height];
 maps['cruce-comunicaciones'].wayfinding=[{x:.88,y:.29,label:'COMISARÍA',direction:-1},{x:.88,y:.35,label:'HOSPITAL',direction:1}];
 maps.comunicaciones.wayfinding=[{x:.16,y:.76,label:'CRUCE · COMISARÍA / HOSPITAL',direction:-1}];
 maps['carretera-patrulla'].spawns['mountain-bridge']=coord('carretera-patrulla',.80,groundY('carretera-patrulla'));
 maps['montana-ladera'].spawns['bridge-arrival']=coord('montana-ladera',.19,.82);
 access('carretera-patrulla','montana-ladera','cross-mountain-bridge',.80,groundY('carretera-patrulla'),{spawn:'bridge-arrival',hit:[.755,.49,.86,.63],label:'Cruzar puente · Montaña'});
 access('montana-ladera','carretera-patrulla','return-mountain-bridge',.19,.81,{spawn:'mountain-bridge',hit:[.08,.50,.24,.69],label:'Cruzar puente · Carretera de patrulla'});
 maps['carretera-patrulla'].props.find(p=>p.id==='cross-mountain-bridge').portal.kind='bridge';maps['montana-ladera'].props.find(p=>p.id==='return-mountain-bridge').portal.kind='bridge';
 maps['carretera-patrulla'].wayfinding.push({x:.80,y:.655,label:'PUENTE · ASCENSO A LA MONTAÑA',direction:-1});
 for(const [a,b]of [['montana-ladera','montana-escalinata'],['montana-escalinata','montana-cresta'],['montana-cresta','montana-cima']])street(a,b);
 for(const [id,west,east]of [['montana-ladera','PUENTE / CARRETERA','ESCALINATA'],['montana-escalinata','CASETA','CRESTA'],['montana-cresta','ESCALINATA','CIMA'],['montana-cima','DESCENSO · CRESTA',null]])maps[id].wayfinding=[{x:.09,y:.74,label:west,direction:-1},...(east?[{x:.90,y:.74,label:east,direction:1}]:[])];
 interior('montana-ladera','caseta-montana',.805,[.777,.41,.85,.58]);
 maps['caseta-montana'].avatarHeight=550;maps['caseta-montana'].spawns.entrance=coord('caseta-montana',.145,.91);
 const hutExit=maps['caseta-montana'].props.find(p=>p.id==='exit');Object.assign(hutExit,coord('caseta-montana',.13,.91),{hitRect:[.035*maps['caseta-montana'].width,.22*maps['caseta-montana'].height,.20*maps['caseta-montana'].width,.78*maps['caseta-montana'].height]});Object.assign(hutExit.portal,coord('caseta-montana',.13,.91));
 interior('cementerio','cementerio-interior',.245,[.207,.42,.28,.65]);
 maps['cementerio-interior'].avatarHeight=245;maps['cementerio-interior'].spawns.entrance=coord('cementerio-interior',.14,.85);
 const cryptExit=maps['cementerio-interior'].props.find(p=>p.id==='exit');Object.assign(cryptExit,coord('cementerio-interior',.10,.82),{hitRect:[.035*maps['cementerio-interior'].width,.10*maps['cementerio-interior'].height,.155*maps['cementerio-interior'].width,.64*maps['cementerio-interior'].height]});Object.assign(cryptExit.portal,coord('cementerio-interior',.10,.82));
 obj('comisaria-interior','security-cameras','camera',.645,.67,{surveillance:true,label:'Cámaras del recinto',approach:coord('comisaria-interior',.645,.81),contextAnchor:coord('comisaria-interior',.645,.35),hitRect:[.505*maps['comisaria-interior'].width,.175*maps['comisaria-interior'].height,.78*maps['comisaria-interior'].width,.345*maps['comisaria-interior'].height]});
 obj('montana-cima','summit-telescope','telescope',.36,.69,{mountainView:true,approach:coord('montana-cima',.36,.79),contextAnchor:coord('montana-cima',.36,.49)});

 branch('gasolinera','puerto','harbour-road',.27,.17);
 maps.gasolinera.wayfinding=[{x:.27,y:.71,label:'PUERTO · CAMINO COSTERO',direction:-1}];maps.puerto.wayfinding=[{x:.17,y:.72,label:'CARRETERA / GASOLINERA',direction:-1}];
 interior('gasolinera','gasolinera-interior',.775,[.74,.47,.82,.70]);
 maps['gasolinera-interior'].spawns.entrance=coord('gasolinera-interior',.11,.81);
 maps['gasolinera-interior'].props.find(p=>p.id==='exit').hitRect=[.065*maps['gasolinera-interior'].width,.29*maps['gasolinera-interior'].height,.175*maps['gasolinera-interior'].width,.745*maps['gasolinera-interior'].height];
 interior('base','refugio-1',.48,[.41,.43,.54,.704]);interior('refugio-2','dormitorio-2',.52,[.4,.48,.61,.707]);interior('comida','cocina',.72,[.59,.47,.83,.71]);interior('hospital','hospital-interior',.62,[.55,.42,.69,.72]);interior('iglesia','iglesia-interior',.6,[.55,.49,.66,.73]);interior('comunicaciones','confesionario',.55,[.50,.58,.60,.78]);
 // The interaction label belongs inside the visible entrance; approach and
 // collision coordinates remain on the pavement in front of the hospital.
 maps.hospital.props.find(p=>p.portal?.zone==='hospital-interior').contextAnchor=coord('hospital',.62,.57);
 interior('comisaria','comisaria-interior',.72,[.63,.43,.82,.718]);
 maps.estacion.spawns['train-door']=coord('estacion',.91,.805);maps['tren-pasajeros'].spawns['station-door']=coord('tren-pasajeros',.205,.835);
 access('estacion','tren-pasajeros','enter-train',.91,.79,{spawn:'station-door',hit:[.84,.38,.97,.72],label:'Entrar · Tren de pasajeros'});
 access('tren-pasajeros','estacion','exit-station',.205,.79,{spawn:'train-door',hit:[.16,.38,.25,.715],label:'Salir · Estación abandonada'});
 maps.cueva.spawns['cave-door']=coord('cueva',.62,.8);maps['cueva-galeria'].spawns['entrance']=coord('cueva-galeria',.15,.85);
 access('cueva','cueva-galeria','enter-mine',.62,.775,{spawn:'entrance',hit:[.51,.39,.76,.71],label:'Entrar en la mina'});access('cueva-galeria','cueva','exit',.13,.8,{spawn:'cave-door',hit:[.015,.35,.25,.74],label:'Salir de la mina'});
 street('cueva-galeria','cueva-profunda');maps['cueva-profunda'].spawns['shaft']=coord('cueva-profunda',.86,.8);maps.tunel.spawns['mine']=coord('tunel',.14,.85);
 access('cueva-profunda','tunel','shaft-tunnel',.87,.79,{spawn:'mine',hit:[.79,.43,.98,.74],label:'Bajar al túnel'});access('tunel','cueva-profunda','back-mine',.08,.8,{spawn:'shaft',hit:[.01,.36,.19,.74],label:'Volver a la mina'});
 maps.cuarentena.spawns['tunnel-gate']=coord('cuarentena',.53,.82);maps.tunel.spawns['control']=coord('tunel',.87,.84);access('cuarentena','tunel','enter-service-tunnel',.53,.80,{spawn:'control',hit:[.44,.39,.62,.69],contextAnchor:coord('cuarentena',.53,.67),label:'Entrar · Túnel subterráneo'});access('tunel','cuarentena','tunnel-east',.89,.8,{spawn:'tunnel-gate',hit:[.78,.4,.99,.74],label:'Salir · Zona de cuarentena'});
 // A real doorway at the aircraft stairs, with a right-hand exit in the provisional cabin.
 maps.avion.spawns['aircraft-stairs']=coord('avion',.835,.805);
 maps['avion-interior'].spawns['entrance']=coord('avion-interior',.14,.80);
 access('avion','avion-interior','enter-aircraft',.835,.795,{spawn:'entrance',hit:[.755,.49,.855,.70],label:'Entrar · Cabina del avión'});
 access('avion-interior','avion','exit-aircraft',.10,.80,{spawn:'aircraft-stairs',hit:[.035,.25,.155,.63],label:'Salir · Aeródromo'});
 // The production wing is reached through security and the aerodrome, never through a refuge shortcut.
 for(const [zone,id,type,x,y,discovery,text]of [
  ['base','supplies','crate',.17,.773,'compass','Suministros del primer refugio.'],['base','plaza-field-log','workbench',.265,.775,'map','Registro de las rutas del campamento.'],
  ['comunicaciones','observatory-scope','telescope',.62,.805,'stars','Registros de la torre de radio.'],['comunicaciones','summit-log','crate',.41,.805,'summit','Bitácora de vigilancia del recinto.'],
  ['hospital-interior','thermal-log','workbench',.69,.79,'thermal','Registro de atención del hospital.'],['cementerio','forest-cache','crate',.36,.79,'trail','Suministros abandonados junto al mausoleo.'],
  ['cueva-galeria','cave-route-map','workbench',.525,.79,'caveEntry','El plano de los dos tramos de la mina.'],['cueva-profunda','cave-west-desk','crate',.195,.79,'caveArchive','Diario de los exploradores.'],['tunel','cave-main-crystal','workbench',.56,.785,'caveEcho','Panel de servicio del túnel.']
 ])obj(zone,id,type,x,y,{discovery,description:text,approach:coord(zone,x,.83)});
 obj('iglesia','church-prayer','prayer-point',.59,.73,{prayer:true,contextAnchor:coord('iglesia',.59,.70),approach:coord('iglesia',.59,.79)});
 obj('iglesia-interior','altar-prayer','prayer-point',.535,.73,{prayer:true,contextAnchor:coord('iglesia-interior',.535,.66),approach:coord('iglesia-interior',.535,.79)});
 obj('base','plaza-b-lamp','pole',.275,.79,{approach:coord('base',.275,.83),lightPoint:coord('base',.26,.54)});obj('base','plaza-a-lamp','pole',.82,.79,{approach:coord('base',.82,.83),lightPoint:coord('base',.82,.56)});
 obj('comida','food-counter','counter',.7,.78,{description:'La zona de servicio comunica con el interior de la cocina.',approach:coord('comida',.7,.83)});
 obj('cocina','kitchen-fridge','fridge',.448,.70,{description:'Nevera compartida con un compartimento para cada equipo.',approach:coord('cocina',.448,.805),hitRect:[.392*maps.cocina.width,.363*maps.cocina.height,.507*maps.cocina.width,.708*maps.cocina.height]});
 obj('hospital-interior','medical-supplies','medical-cabinet',.29,.66,{description:'Armario de tratamientos, gasas y material de recuperación.',approach:coord('hospital-interior',.29,.815),hitRect:[.248*maps['hospital-interior'].width,.435*maps['hospital-interior'].height,.34*maps['hospital-interior'].width,.675*maps['hospital-interior'].height]});
 obj('hospital-interior','medical-counter','medical-counter',.72,.70,{description:'Puesto de atención y tratamientos del hospital.',approach:coord('hospital-interior',.72,.815),hitRect:[.63*maps['hospital-interior'].width,.55*maps['hospital-interior'].height,.85*maps['hospital-interior'].width,.70*maps['hospital-interior'].height]});
 obj('hospital-interior','medical-first-aid','medical-kit',.94,.92,{description:'Botiquín de campaña.',approach:coord('hospital-interior',.9,.86),hitRect:[.85*maps['hospital-interior'].width,.86*maps['hospital-interior'].height,.99*maps['hospital-interior'].width,.96*maps['hospital-interior'].height]});
 obj('cueva-galeria','sealed-shaft','crate',.64,.79,{description:'Un antiguo acceso está apuntalado. La galería principal continúa hacia la derecha.',approach:coord('cueva-galeria',.64,.83)});
 obj('tren-equipaje','train-luggage','crate',.52,.79,{description:'Equipaje y suministros del viaje. La salida al andén está en el vagón de pasajeros.',approach:coord('tren-equipaje',.52,.83)});
 obj('tren-cabina','train-controls','workbench',.50,.79,{description:'El tren permanece detenido en la estación. Las luces del tablero ya no responden.',approach:coord('tren-cabina',.50,.83)});
 obj('comisaria-interior','security-records','workbench',.55,.79,{description:'Los registros distinguen la carretera de llegada, el bosque de alojamientos y el sector de producción.',approach:coord('comisaria-interior',.55,.83)});
 obj('puerto','harbour-crates','crate',.17,.79,{description:'Viejas cajas junto a la dársena. El paseo del río continúa hacia el muelle de las ruinas.',approach:coord('puerto',.17,.83)});
 for(const id of ['cascada-ribera','poza-cascada']){
  const m=maps[id],pool=id==='poza-cascada',pierY=pool?.612:.555;m.waterZone=true;m.waterArea={left:m.width*(pool?.35:.40),right:m.width*(pool?.71:.77),top:m.height*(pool?.70:.60),bottom:m.height*(pool?.765:.65)};
  // A narrow, walkable strip follows the real left bank onto the painted pier.
  const pierFloor=[[.025,pierY-.015],[.26,pierY-.015],[.26,pierY+.03],[.075,pierY+.05],[.075,m.walkBand[0]+.035],[.025,m.walkBand[0]+.035]].map(([x,y])=>[x*m.width,y*m.height]);m.floors.push(pierFloor);m.bounds[1]=(pierY-.016)*m.height;
  const locations=pool?{fish:[.235,pierY,.235],drink:[.14,.66,.14],bathe:[.86,.76,.86]}:{fish:[.235,pierY,.235],drink:[.36,.69,.36],bathe:[.71,.68,.71]};
  for(const [activity,[x,y,approachX]]of Object.entries(locations))obj(id,id+'-'+activity,'water-point',x,y,{activity,approach:coord(id,approachX,activity==='fish'?pierY:groundY(id)),waterTarget:coord(id,activity==='fish'?.39:x,pool?.71:.625),hitRect:[Math.max(0,x-.045)*m.width,Math.max(0,y-.04)*m.height,Math.min(1,x+.045)*m.width,Math.min(1,y+.035)*m.height],description:{fish:'La plataforma permite pescar en la corriente de la ribera.',drink:'Punto de agua de la ribera.',bathe:'Los escalones dan acceso al agua para asearte.'}[activity]});
  // Three separate shore contacts enter open water. Preserve the original east
  // access ID; each swimmer returns to the particular bank contact they used.
  const entries=pool?[['',.74,.79,.68,.735,'este'],['-west',.36,.79,.39,.735,'oeste'],['-centre',.55,.79,.55,.735,'central']]:[['',.84,.69,.73,.625,'este'],['-west',.44,.69,.44,.625,'oeste'],['-centre',.59,.69,.59,.625,'central']];
  for(const [suffix,x,y,waterX,waterY,label]of entries)obj(id,id+'-swim'+suffix,'water-point',x,y,{activity:'swim',activityName:'Acceso '+label+' al agua',interactionRange:64,approach:coord(id,x,groundY(id)),contextAnchor:coord(id,x,y),waterTarget:coord(id,waterX,waterY),hitRect:[(x-.025)*m.width,(y-.025)*m.height,(x+.025)*m.width,(y+.025)*m.height],description:'Entrada '+label+' para nadar. Al salir vuelves a este mismo punto de la orilla.'});
 }
 // Seats are anchored to the furniture already painted in each background.
 function seating(zone,id,type,points){return obj(zone,id,type,points[0][0],points[0][1],{seatContact:true,seatHeight:maps[zone].avatarHeight*1.35,seats:points.map(([x,y,facing=1])=>({...coord(zone,x,y),facing})),approaches:points.map(([x])=>coord(zone,x,.815)),description:'Puedes elegir un espacio libre y levantarte con el botón de acción.'});}
 seating('refugio-1','refuge-bench','bench',[[.245,.635,1],[.282,.635,1]]);
 seating('confesionario','confessional-chair','chair',[[.515,.565,1]]);
 seating('comida','canteen-bench','bench',[[.175,.722,1],[.237,.722,1],[.306,.722,1]]);
 for(const [id,x,y,facing]of [['left',.105,.59,1],['middle',.46,.60,1],['right',.96,.59,-1]]){const bed=seating('hospital-interior','hospital-bed-'+id,'bench',[[x,y,facing]]);bed.medicalBed=true;bed.restWidth=maps['hospital-interior'].width*.12;if(id==='right')bed.restX=maps['hospital-interior'].width*.947;bed.restBottom=bed.y*.62+12;bed.description='Descansar en la camilla recupera salud y ayuda al tratamiento.';}

 const council=maps.eliminacion;council.presenter={...coord('eliminacion',.5,.585),z:0,height:council.avatarHeight*1.35*1.04};
 for(const [side,x,facing]of [['left',.23,1],['right',.77,-1]]){const seats=Array.from({length:8},(_,i)=>({...coord('eliminacion',x+(side==='left'?-1:1)*(i%4)*.043,.63-Math.floor(i/4)*.085),facing}));obj('eliminacion','seating-'+side,'grandstand',x,.64,{w:council.width*.23,h:council.height*.2,seats,seatFacing:facing,approaches:seats.map(s=>({x:s.x,y:council.height*.795})),description:'Gradas orientadas al escenario central.'});}
 for(const [key,map]of Object.entries(maps)){map.spawns.default={x:map.spawn[0],y:map.spawn[1]};map.icon=key.includes('hospital')?'medical':key.includes('cueva')?'cave':key==='eliminacion'?'star':key==='comunicaciones'?'radio':key.includes('iglesia')?'church':'home';}
 seating('montana-escalinata','mountain-rest-bench','bench',[[.31,.675,1],[.37,.675,1]]);
 buildMemorialProps(maps);
 return maps;
}
