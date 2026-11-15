import test from 'node:test';
import assert from 'node:assert/strict';
import {COOP_BIRDS,flockAt,startFlock,resizeFlock,coopBirdName} from '../public/juegos/world-shelter-care.mjs';
import {WORLD_MAPS} from '../public/juegos/world-maps.mjs';
import {buildSurvivalProps} from '../public/juegos/world-survival-catalog.mjs';
import {clearPoint} from '../public/juegos/world-motion.mjs';

test('hens lay separately after sustained care, a starter flock never lays unattended, and roosters never lay',()=>{
 const now=10_000,minute=60_000;
 const untouched=flockAt(startFlock(now),now+90*minute);
 assert.equal(Object.values(untouched.birds).reduce((n,bird)=>n+bird.eggs,0),0);
 const flock=startFlock(now);
 flock.water=100;flock.fence=100;
 for(const bird of Object.values(flock.birds))Object.assign(bird,{fed:true,food:100});
 const before=flockAt(flock,now+54*minute);
 assert.equal(before.birds.canela.eggs,0);
 const first=flockAt(flock,now+55*minute);
 assert.equal(first.birds.canela.eggs,1);
 assert.equal(first.birds.pepita.eggs,0);
 const refilled=flockAt(flock,now+35*minute);
 refilled.water=100;
 const second=flockAt(refilled,now+65*minute);
 assert.equal(second.birds.pepita.eggs,1);
 assert.equal(second.birds.gallo.eggs,0);
 flock.birds.canela.health=0;
 assert.equal(flockAt(flock,now+65*minute).birds.canela.health,0);
});

test('old eggs stay collectable after the change to individual birds',()=>{
 const flock=flockAt({at:0,clean:85,fence:70,eggs:3},120_000);
 assert.equal(flock.water,1);
 assert.equal(flock.birds.canela.eggs+flock.birds.pepita.eggs,3);
 assert(!flock.birds.canela.fed);
});

test('both workshops have a reachable enlarged chest and the patio replaces its build point only while a fire is present',()=>{
 const maps=structuredClone(WORLD_MAPS);
 const active={id:'fire-test',zone:'patio-refugio-1',x:1000,y:1700};
 buildSurvivalProps(maps,{fires:[active]});
 for(const id of [1,2]){
  const workshop=maps['taller-refugio-'+id],chest=workshop.props.find(p=>p.survival?.kind==='chest');
  assert.equal(chest.w,345);
  assert(chest.y<chest.approach.y);
  assert(clearPoint(workshop,chest.approach.x,chest.approach.y));
 }
 assert(!maps['patio-refugio-1'].props.some(p=>p.survival?.kind==='fire-spot'));
 assert(maps['patio-refugio-1'].props.some(p=>p.survival?.kind==='fire'));
 assert(maps['patio-refugio-2'].props.some(p=>p.survival?.kind==='fire-spot'));
 assert(!maps['patio-refugio-2'].props.some(p=>p.survival?.kind==='fire'));
});

test('each configured total has the requested species split and neglected birds disappear at zero health',()=>{
 const time=10_000;
 for(const count of [2,3,4,7,12]){
  const flock=resizeFlock(startFlock(time),count),active=COOP_BIRDS.filter(bird=>flock.birds[bird.id]);
  assert.equal(active.filter(bird=>!bird.rooster).length,Math.ceil(count/2));
  assert.equal(active.filter(bird=>bird.rooster).length,Math.floor(count/2));
 }
 const flock=startFlock(time),bird=flock.birds.canela;
 Object.assign(bird,{health:.5,food:0,eggs:1});flock.clean=5;flock.fence=5;
 const later=flockAt(flock,time+60_000);
 assert.equal(later.birds.canela.health,0);
 assert.equal(later.birds.canela.eggs,0);
 assert.equal(flockAt(later,time+120_000).birds.canela.health,0);
});

test('each refuge uses the nominated names and puts its principal birds in the first slots',()=>{
 const hens=['Daelly','Gennie Sheet','Zoila Menos','Mary Weed','Doppel','Peggy'].sort();
 const roosters=['Miss Tea','Xavier','Eduardo Buñuelo','Mel RZ','Beto Trujillo','Jose Serna'].sort();
 const names=(team,birds)=>birds.map(bird=>coopBirdName(team,bird.id));
 for(const team of ['left','right']){
  assert.deepEqual(names(team,COOP_BIRDS.filter(bird=>!bird.rooster)).sort(),hens);
  assert.deepEqual(names(team,COOP_BIRDS.filter(bird=>bird.rooster)).sort(),roosters);
 }
 assert.deepEqual(names('left',COOP_BIRDS.slice(0,4)),['Daelly','Mel RZ','Doppel','Miss Tea']);
 assert.deepEqual(names('right',COOP_BIRDS.slice(0,2)),['Peggy','Jose Serna']);
});
