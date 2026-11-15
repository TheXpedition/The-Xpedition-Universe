import {test} from 'node:test';import assert from 'node:assert/strict';import {worldContext,contextMarkup,contextPosition} from '../public/juegos/world-context.mjs';import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';import {objectAction} from '../public/juegos/world-interactions.mjs';import {WorldCamera} from '../public/juegos/world-camera.mjs';import {frontCameraTarget} from '../public/juegos/front-world.mjs';
import {buildSurvivalProps,SURVIVAL_STATIONS} from '../public/juegos/world-survival-catalog.mjs';
import {gardenTitleOffset} from '../public/juegos/world-garden-art.mjs';
import {survivalBounds} from '../public/juegos/world-survival-art.mjs';

test('context prioritizes standing up and real door destinations, while automatic road edges need no action button',()=>{assert.equal(worldContext(null,null,null,WORLD_MAPS),null);assert.equal(worldContext({seatId:'chair'},{zone:'base'},null,WORLD_MAPS).label,'Levantarse');assert.equal(worldContext({}, {id:'booth',zone:'confesionario'},null,WORLD_MAPS).detail,'Confesionario · Privado');assert.equal(worldContext({}, {id:'road',zone:'base',auto:true},null,WORLD_MAPS),null);});
test('every available object keeps its real action and seat slot; context markup cannot inject HTML',()=>{for(const map of Object.values(WORLD_MAPS))for(const prop of map.props){const action=objectAction(prop);if(!action)continue;const context=worldContext({},null,{prop,action,slot:0},WORLD_MAPS);assert.equal(context.label,action.label);assert.equal(context.detail,action.name);}const html=contextMarkup({label:'<script>',detail:'" onclick="attack',icon:'door'},()=>'<svg/>');assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('&quot;'));});
test('refuge and hospital return routes anchor the compact prompt to its visible door rather than screen center',()=>{for(const id of ['refugio-1','dormitorio-2','hospital-interior'])for(const [width,height]of [[1440,810],[390,705]]){const map=WORLD_MAPS[id],exit=map.props.find(p=>p.id===(id==='hospital-interior'?'exit':'return-patio')),portal={...exit.portal,id:exit.id},context=worldContext({},portal,null,WORLD_MAPS,map);assert.equal(context.label,id==='hospital-interior'?'Salir':'Volver');assert.equal(context.anchor.x,(exit.hitRect[0]+exit.hitRect[2])/2);assert.equal(context.anchor.y,exit.hitRect[3]);const camera=new WorldCamera(),scene={width:675*width/height,height:675};camera.update(frontCameraTarget(map,scene.width,scene.height,{x:map.width*.08,y:map.height*.865}),1,true);const position=contextPosition(context,camera,scene,{width,height,safeTop:88},{width:180,height:32}),anchor=camera.project(context.anchor.x,context.anchor.y,0,scene.width,scene.height);assert(position.left>=8&&position.left+180<=width-8);assert(position.top>=88&&position.top+32<=height-8);if(width>700){assert(position.left+90<width*.35,'exit prompt stays beside the left-hand door');assert(Math.abs(position.left+90-anchor.x/scene.width*width)<1);}}});
test('action prompts follow horizontal camera movement instead of staying in the middle of the map',()=>{const map=WORLD_MAPS.base,door=map.props.find(p=>p.portal?.zone==='patio-refugio-1'),context=worldContext({}, {...door.portal,id:door.id},null,WORLD_MAPS,map),camera=new WorldCamera(),scene={width:1200,height:675},view={width:1440,height:810,safeTop:88},button={width:200,height:32};camera.update({x:map.width*.45,y:map.height*.31,zoom:.7},1,true);const a=contextPosition(context,camera,scene,view,button);camera.update({x:map.width*.55,y:map.height*.31,zoom:.7},1,true);const b=contextPosition(context,camera,scene,view,button);assert(a.left>b.left+100);});

test('beds use click bubbles, while wake and fishing cancellation retain an E prompt',()=>{const prop={id:'bed',sleepBed:true};assert.equal(worldContext({},null,{prop,action:{label:'Dormir',name:'Cama'},slot:0},WORLD_MAPS),null);assert.equal(worldContext({seatId:'bed',sleeping:true},null,null,WORLD_MAPS).label,'Levantarse');assert.equal(worldContext({activity:'fish',x:50,y:100},null,null,WORLD_MAPS).label,'Cancelar pesca');});

test('the garden prompt sits just above the sign in both shelters, including with crops',()=>{
 const maps=structuredClone(WORLD_MAPS);
 for(const crops of [[],[{seed:'tomato'}]]){
  buildSurvivalProps(maps,{gardens:{left:crops,right:crops}});
  for(const station of SURVIVAL_STATIONS.filter(item=>item.kind==='garden')){
   const map=maps[station.zone],prop=map.props.find(item=>item.survival?.id===station.id);
   const context=worldContext(prop.approach,null,{prop,action:objectAction(prop)},maps,map);
   assert.equal(context.label,'Ver huerta');
   assert.equal(prop.approach.y,map.height*(station.y+.045));
   const bounds=survivalBounds(prop),titleTop=bounds.y-gardenTitleOffset(bounds.w,crops);
   for(const [width,height] of [[1440,810],[1024,768],[852,393],[390,705]]){
    const camera=new WorldCamera(),scene={width:675*width/height,height:675};
    camera.update(frontCameraTarget(map,scene.width,scene.height,prop.approach),1,true);
    const title=camera.project(bounds.x,titleTop/.62,0,scene.width,scene.height);
    const button={width:180,height:34};
    const position=contextPosition(context,camera,scene,{width,height,safeTop:70,safeBottom:80},button);
    assert(position.visible);
    assert(Math.abs(position.left+button.width/2-title.x/scene.width*width)<1);
    assert(Math.abs(position.top+button.height-title.y/scene.height*height+8)<1);
   }
  }
 }
});
