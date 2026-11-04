import {test} from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {fieldNoticeMarkup,mountFieldNotices} from '../public/juegos/world-field-notices.mjs';
import {fishingGeometry} from '../public/juegos/world-fishing-art.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {interactionPoint} from '../public/juegos/world-interactions.mjs';
test('pickup receipts show the actual PNG reward in a dismissible nonmodal field notice',()=>{
 const dom=new JSDOM('<body><main>Escenario</main></body>'),old=globalThis.document;globalThis.document=dom.window.document;
 try{const notices=mountFieldNotices(),items=[{id:'empty-bottle',kind:'resource',quantity:1}];notices.show({title:'Recogido',items});const root=document.querySelector('.world-field-notice');assert(!root.hidden);assert.equal(document.querySelector('dialog'),null);assert(root.querySelector('.field-reward svg image'));assert.match(root.textContent,/Botella vacía/);assert.match(root.textContent,/\+1/);root.querySelector('button').click();assert(root.hidden);notices.destroy();assert(!document.querySelector('.world-field-notice'));assert(fieldNoticeMarkup({title:'<script>',text:'<test>'}).includes('&lt;script&gt;'));}finally{dom.window.close();globalThis.document=old;}
});
test('fishing feet stand on each painted pier and the float is anchored to the water rather than the road',()=>{
 for(const id of ['cascada-ribera','poza-cascada']){const m=WORLD_MAPS[id],prop=m.props.find(p=>p.activity==='fish'),point=interactionPoint(m,prop),p={...point,fishingTarget:prop.waterTarget},g=fishingGeometry(p,251,1);
  assert(point.y<m.walkBand[0]*m.height,'the actor walks onto the pier');assert(point.x<m.width*.27);assert(g.water.x>m.width*.3);assert(g.water.y<m.walkBand[0]*m.height*.62);assert.equal(g.water.x,prop.waterTarget.x);assert.equal(g.water.y,prop.waterTarget.y*.62);
 }
});
