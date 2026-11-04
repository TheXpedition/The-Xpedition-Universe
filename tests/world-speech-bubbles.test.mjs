import {test} from 'node:test';import assert from 'node:assert/strict';
import {speechBubbleLayout} from '../public/juegos/world-speech-bubbles.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {worldContext,contextPosition} from '../public/juegos/world-context.mjs';
import {WorldCamera} from '../public/juegos/world-camera.mjs';
import {frontCameraTarget} from '../public/juegos/front-world.mjs';
const ctx={font:'',measureText(text){return {width:[...text].length*parseFloat(this.font.split(' ')[1])*.56};}};
test('dialogue stays 18 CSS pixels across phone, short landscape and desktop render sizes',()=>{
 for(const [width,height]of [[1440,810],[390,705],[852,393]]){const cssScale=height/675,w=675*width/height,b=speechBubbleLayout(ctx,'La tormenta se acerca. Vamos al refugio.',{x:w/2,y:400,width:w,height:675,cssScale});assert.equal(b.fontSize*cssScale,18);assert(b.width*cssScale<=330.01);assert(b.left>=0&&b.left+b.width<=w);}
});
test('long words, explicit hostile-looking text and 280-character chat wrap without escaping the screen',()=>{
 for(const x of [-10,200,800]){const b=speechBubbleLayout(ctx,'<script>alert(1)</script> '+('a'.repeat(280)),{x,y:10,width:390,height:675,cssScale:1});assert(b.lines.length<=6);assert(b.lines.at(-1).endsWith('…'));assert(b.top>=12);assert(b.left>=12&&b.left+b.width<=378);assert(b.lines.every(l=>ctx.measureText(l).width<=b.width-b.padding*2+.01));}
});
test('hospital entrance prompt is anchored inside the doorway, while the actor approach stays on the ground',()=>{
 const map=WORLD_MAPS.hospital,door=map.props.find(p=>p.portal?.zone==='hospital-interior'),context=worldContext({}, {...door.portal,id:door.id},null,WORLD_MAPS,map);
 assert.equal(context.label,'Entrar');assert.deepEqual(context.anchor,door.contextAnchor);assert(context.anchor.y<door.portal.y-map.height*.15);
 assert(context.anchor.x>door.hitRect[0]&&context.anchor.x<door.hitRect[2]);assert(context.anchor.y>door.hitRect[1]&&context.anchor.y<door.hitRect[3]);
 for(const [width,height]of [[1440,810],[852,393],[390,705]]){const scene={width:675*width/height,height:675},camera=new WorldCamera();camera.update(frontCameraTarget(map,scene.width,scene.height,{x:door.portal.x,y:door.portal.y}),1,true);const anchor=camera.project(context.anchor.x,context.anchor.y,0,scene.width,scene.height),position=contextPosition(context,camera,scene,{width,height,safeTop:88},{width:180,height:32});assert(Math.abs(position.top-(anchor.y/675*height+4))<1,'label follows the door, not actor feet');}
});
