import {test} from 'node:test';import assert from 'node:assert/strict';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {routeBetween} from '../public/juegos/front-world.mjs';
import {createWorldPlayer,worldPath,stepWorld,nearestPortal,hasFloor} from '../public/juegos/world-motion.mjs';
import {ATLAS_POSITIONS} from '../public/juegos/apocalypse-atlas.mjs';
import {MAIN_WALK_ROUTE} from '../public/juegos/world-route-layout.mjs';
import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';
test('forty-eight destinations have unique entrances, named returns and a route back to the train',()=>{
 assert.equal(Object.keys(WORLD_MAPS).length,48);assert.deepEqual(Object.keys(ATLAS_POSITIONS).sort(),Object.keys(WORLD_MAPS).sort());
 for(const map of Object.values(WORLD_MAPS)){assert(routeBetween(WORLD_MAPS,'tren-pasajeros',map.id));assert(routeBetween(WORLD_MAPS,map.id,'tren-pasajeros'));assert.equal(new Set(map.props.map(p=>p.id)).size,map.props.length,map.id);for(const p of map.props.filter(p=>p.portal)){assert(WORLD_MAPS[p.portal.zone].props.some(back=>back.portal?.zone===map.id),map.id+' return from '+p.portal.zone);const arrival=WORLD_MAPS[p.portal.zone].spawns[p.portal.toSpawn];assert(arrival&&hasFloor(WORLD_MAPS[p.portal.zone],arrival.x,arrival.y));}}
});
test('the camp route is physically linear: refuge one, forest, refuge two, creek, patrol road',()=>{
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps);
 for(let i=0;i<MAIN_WALK_ROUTE.length;i++){const map=maps[MAIN_WALK_ROUTE[i]],west=map.props.find(p=>p.id==='road-west'),east=map.props.find(p=>p.id==='road-east');if(i)assert.equal(west.portal.zone,MAIN_WALK_ROUTE[i-1]);if(i<MAIN_WALK_ROUTE.length-1)assert.equal(east.portal.zone,MAIN_WALK_ROUTE[i+1]);}
 assert.deepEqual(routeBetween(maps,'base','comisaria'),['base','sendero-bosque','refugio-2','ruta-refugio-oriental','carretera-patrulla','comisaria']);
 const gate=maps.cuarentena.props.find(p=>p.portal?.zone==='tunel');assert(gate&&!gate.portal.auto,'enter the visible quarantine gate deliberately');assert.equal(maps.tunel.props.find(p=>p.id==='tunnel-east').portal.zone,'cuarentena');assert(!maps.cueva.props.some(p=>p.id==='enter-service-tunnel'));
 for(const id of MAIN_WALK_ROUTE){const map=maps[id];for(const p of map.props.filter(p=>p.portal?.auto)){const actor=createWorldPlayer(id);actor.path=worldPath(map,actor,p.portal);for(let t=0;t<1600&&actor.path.length;t++)stepWorld(actor,{},.05,map);assert.equal(nearestPortal(actor,map)?.id,p.id,id+' can walk to road exit');const destination=maps[p.portal.zone],arrival=destination.spawns[p.portal.toSpawn];assert(!nearestPortal(arrival,destination)?.auto,id+' arrival never bounces back automatically');}}
});
test('quarantine gate and eastern tunnel exit are reachable and return to the same visible doorway',()=>{
 for(const [from,to,key] of [['cuarentena','tunel','enter-service-tunnel'],['tunel','cuarentena','tunnel-east']]){
  const map=WORLD_MAPS[from],door=map.props.find(p=>p.id===key),actor=createWorldPlayer(from);
  assert.equal(door.portal.zone,to);assert(!door.portal.auto);
  actor.path=worldPath(map,actor,door.portal);
  for(let i=0;i<1200&&actor.path.length;i++)stepWorld(actor,{},.05,map);
  assert.equal(nearestPortal(actor,map)?.id,key);
  const target=WORLD_MAPS[to],arrival=target.spawns[door.portal.toSpawn];
  assert(hasFloor(target,arrival.x,arrival.y));assert(!nearestPortal(arrival,target)?.auto);
 }
 const gate=WORLD_MAPS.cuarentena.props.find(p=>p.id==='enter-service-tunnel');
 assert(gate.hitRect[0]>.4*WORLD_MAPS.cuarentena.width&&gate.hitRect[2]<.7*WORLD_MAPS.cuarentena.width);
});

test('Shift runs ten percent faster while ordinary walking and tiredness scaling are preserved',()=>{
 const map=WORLD_MAPS.cuarentena,point={x:map.width*.5,y:map.height*.9};
 const distance=input=>{const p=createWorldPlayer(map.id,point);for(let i=0;i<10;i++)stepWorld(p,{x:1,...input},.05,map);return p.x-point.x;};
 assert(Math.abs(distance({})-102.5)<.001);
 assert(Math.abs(distance({run:true})-165)<.001);
 assert(Math.abs(distance({run:true,speedFactor:.5})-82.5)<.001);
});

test('flood closes the creek but opens an actual reachable forest detour, then restores the normal road',()=>{
 const maps=structuredClone(WORLD_MAPS);buildSurvivalProps(maps,{event:{type:'flood'},projects:{bridge:{ready:false}}});
 assert.deepEqual(routeBetween(maps,'base','comisaria'),['base','sendero-bosque','carretera-patrulla','comisaria']);
 for(const id of ['sendero-bosque','carretera-patrulla']){const map=maps[id],p=map.props.find(p=>p.portal?.eventDetour),actor=createWorldPlayer(id);actor.path=worldPath(map,actor,p.portal);for(let t=0;t<1600&&actor.path.length;t++)stepWorld(actor,{},.05,map);assert.equal(nearestPortal(actor,map)?.id,p.id);}
 buildSurvivalProps(maps,{event:{type:'flood'},projects:{bridge:{ready:true}}});assert.equal(routeBetween(maps,'base','comisaria').length,6);assert(maps['sendero-bosque'].props.find(p=>p.portal?.eventDetour).portal.eventBlocked);
});
