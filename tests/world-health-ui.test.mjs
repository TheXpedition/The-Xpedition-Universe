import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountHealthPanel} from '../public/juegos/world-health-ui.mjs';
import {MEDICINES,createWellness,wellnessSnapshot,treatCondition} from '../public/juegos/world-wellness.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){const dom=new JSDOM('<dialog open><div id="health-root"></div></dialog>',{pretendToBeVisual:true});return {dom,root:dom.window.document.getElementById('health-root')};}

test('the health panel equips protection and applies only a matching personal treatment',async()=>{
 const {dom,root}=fixture();let body=createWellness({clothingOptions:[{id:'heat',owned:true,condition:100},{id:'cold',owned:true,condition:100}],conditions:[{id:'scratch',severity:60}],medicines:{antiseptic:2,water:1}}),vitals={health:70},requests=[];
 const panel=mountHealthPanel(root,{data:{body:{...wellnessSnapshot(body),warning:'<script>unsafe</script>'},vitals,nurse:true},
  onClothing:async input=>{requests.push(input);body.clothing=input.clothing;return {body:wellnessSnapshot(body)};},
  onTreat:async input=>{requests.push(input);const next=treatCondition(body,vitals,input.medicineId);body=next.body;vitals=next.vitals;return {body:wellnessSnapshot(body),vitals};}
 });
 assert(root.textContent.includes('<script>unsafe</script>'));assert.equal(root.querySelector('script'),null);
 assert.match(root.textContent,/Corte superficial/);assert.equal(root.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),'60');
 root.querySelector('[data-health-tab=clothing]').click();root.querySelector('[data-clothing=cold]').click();await tick();assert.equal(root.querySelector('[data-clothing=cold]').getAttribute('aria-pressed'),'true');assert.deepEqual(requests[0],{clothing:'cold'});
 root.querySelector('[data-health-tab=personal]').click();assert.equal(root.querySelectorAll('[data-medicine]').length,2,'only supplies personally owned appear');root.querySelector('[data-medicine=water]').click();assert(root.querySelector('[data-health-action=treat]').disabled,'water cannot treat a scratch');
 root.querySelector('[data-medicine=antiseptic]').click();assert(!root.querySelector('[data-health-action=treat]').disabled);root.querySelector('[data-health-action=treat]').click();await tick();assert.deepEqual(requests[1],{medicineId:'antiseptic'});assert.equal(body.medicines.antiseptic,1);assert.equal(body.conditions[0].severity,15);assert.match(root.textContent,/Tratamiento aplicado/);
 panel.destroy();dom.window.close();
});

test('hospital slots keep scroll, focused staff quantity drafts and selection across live updates',async()=>{
 const {dom,root}=fixture(),supplies=Object.fromEntries(MEDICINES.map(m=>[m.id,20])),requests=[];let body=createWellness();
 const panel=mountHealthPanel(root,{mode:'hospital',data:{body:wellnessSnapshot(body),vitals:{health:98},supplies,staff:true},onManage:async input=>{requests.push(input);if(input.action==='set')supplies[input.medicineId]=input.quantity;return {supplies:{...supplies}};},onTake:async input=>{requests.push(input);supplies[input.medicineId]--;body.medicines[input.medicineId]++;return {body:wellnessSnapshot(body),supplies:{...supplies}};}});
 assert.equal(root.querySelectorAll('[data-medicine]').length,MEDICINES.length);root.querySelector('[data-medicine=dressing]').click();const scroller=root.querySelector('.health-content');scroller.scrollTop=180;root.querySelector('.health-staff').open=true;
 const field=root.querySelector('[data-med-quantity]');field.value='27';field.focus();panel.update({body:{...wellnessSnapshot(body),wetness:20},vitals:{health:97}});
 assert.equal(root.querySelector('.health-content').scrollTop,180);assert.equal(root.querySelector('[data-med-quantity]').value,'27');assert.equal(dom.window.document.activeElement,root.querySelector('[data-med-quantity]'));assert(root.querySelector('.health-staff').open);assert.equal(root.querySelector('[data-medicine=dressing]').getAttribute('aria-pressed'),'true');
 root.querySelector('[data-health-action=set]').click();await tick();assert.deepEqual(requests[0],{action:'set',medicineId:'dressing',quantity:27});
 root.querySelector('[data-health-action=take]').click();await tick();assert.deepEqual(requests[1],{medicineId:'dressing'});assert.equal(body.medicines.dressing,1);assert.equal(supplies.dressing,26);
 root.querySelector('[data-med-quantity]').value='100';root.querySelector('[data-health-action=set]').click();await tick();assert.equal(requests.length,2);assert.match(root.querySelector('[role=status]').textContent,/entre 0 y 99/);
 root.querySelector('[data-health-tab=clothing]').click();root.querySelector('[data-health-tab=hospital]').click();assert.equal(root.querySelector('.health-content').scrollTop,180,'tab switching restores the hospital scroll offset');
 panel.destroy();dom.window.close();
});

test('a pending pickup cannot be duplicated and destroyed panels do not mutate after completion',async()=>{
 const {dom,root}=fixture();let resolve,count=0;const promise=new Promise(r=>resolve=r),panel=mountHealthPanel(root,{mode:'hospital',data:{body:wellnessSnapshot(createWellness()),supplies:{water:2},nurse:true},onTake:async()=>{count++;return promise;}});
 assert.equal(root.querySelector('.health-staff'),null,'participants have no stock management');root.querySelector('[data-medicine=water]').click();root.querySelector('[data-health-action=take]').click();root.querySelector('[data-health-action=take]').click();assert.equal(count,1);assert(root.querySelector('[data-health-action=take]').disabled);
 panel.destroy();const before=root.innerHTML;resolve({supplies:{water:1}});await tick();assert.equal(root.innerHTML,before);dom.window.close();
});
test('clinical supplies use five care areas and keep the selected filter and search through live updates',()=>{
 const {dom,root}=fixture(),supplies=Object.fromEntries(MEDICINES.map(m=>[m.id,20])),panel=mountHealthPanel(root,{mode:'hospital',data:{body:wellnessSnapshot(createWellness()),supplies,nurse:true}});
 assert.equal(root.querySelectorAll('[data-med-section]').length,5);assert.equal(root.querySelector('.health-medical-search svg'),null,'the supply search has no detached first-aid icon');root.querySelector('[data-med-group=mental]').click();assert.equal(root.querySelectorAll('[data-med-section]').length,1);assert(root.querySelector('[data-med-section=mental]'));assert(root.querySelector('[data-medicine=cbt-session]'));assert(!root.querySelector('[data-medicine=cbt-session] .medical-png'),'a therapy session is not illustrated as a pill bottle');
 const input=root.querySelector('[data-med-search]');input.focus();input.value='fluoxetina';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.equal(root.querySelectorAll('[data-medicine]').length,1);assert(root.querySelector('[data-medicine=fluoxetine]'));root.querySelector('.health-content').scrollTop=97;panel.update({vitals:{health:95}});assert.equal(root.querySelector('[data-med-group=mental]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('[data-med-search]').value,'fluoxetina');assert.equal(dom.window.document.activeElement,root.querySelector('[data-med-search]'));assert.equal(root.querySelector('.health-content').scrollTop,97);panel.destroy();dom.window.close();
});
