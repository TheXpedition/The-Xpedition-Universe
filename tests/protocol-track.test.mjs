import test from 'node:test';import assert from 'node:assert/strict';
import {orderTrackCast} from '../public/juegos/protocol-track.mjs';
const person=(id,result)=>({id,characterId:id,result});

test('an archived display order can put an eliminated player above selected exits',()=>{
 const first=[person('joseserna','OUT'),person('peggy','OUT')];
 const next=[person('vita','HIGH'),person('eduard','DISQ'),person('bayron','DISQ'),person('gabrielsab','ELIM')];
 const order=[{characterId:'gabrielsab',before:['joseserna','peggy','eduard','bayron']}];
 const result=orderTrackCast({cast:[...first,...next],episodes:[{cast:first},{cast:next,displayOverrides:{order}}]});
 assert.deepEqual(result.map(p=>p.id),['vita','gabrielsab','eduard','bayron','joseserna','peggy']);
});

test('track record rows follow WIN, HIGH, SAFE, LOW, BTM2 and ELIM regardless of original seating order',()=>{
 const cast=[person('eliminated','ELIM'),person('safe','SAFE'),person('bottom','BTM2'),person('high-three','HIGH'),person('low','LOW'),person('win','WIN'),person('high-two','HIGH')];
 const ranking=['win','high-two','high-three','safe','low','bottom','eliminated'].map((id,i)=>({id,rank:i+1}));
 const ordered=orderTrackCast({cast,episodes:[{cast,ranking}]}).map(p=>p.id);
 assert.deepEqual(ordered,['win','high-two','high-three','safe','low','bottom','eliminated']);
});

test('advantages, idols and cancelled eliminations stay with SAFE; earlier eliminated contestants remain at the very bottom',()=>{
 const previous=[person('earlier-exit','ELIM')],current=[person('current-exit','ELIM'),person('idol','IDOL'),person('bottom','BTM2'),person('advantage','SAFE_ADV'),person('cancelled','ELIM_CANCELLED'),person('low','LOW')];
 const ordered=orderTrackCast({cast:[...previous,...current],episodes:[{cast:previous},{cast:current}]}).map(p=>p.id);
 assert.deepEqual(ordered,['idol','advantage','cancelled','low','bottom','current-exit','earlier-exit']);
});

test('the latest episode determines each row; season winner and finalists lead the completed season',()=>{
 const cast=[person('a','WIN'),person('b','SAFE'),person('c','SAFE')],first={cast},latest={cast:[person('a','LOW'),person('b','WIN'),person('c','HIGH')]};
 assert.deepEqual(orderTrackCast({cast,episodes:[first,latest]}).map(p=>p.id),['b','c','a']);
 assert.deepEqual(orderTrackCast({cast,episodes:[first,latest],final:{winner:'c',runners:['a']}}).map(p=>p.id),['c','a','b']);
});

test('later eliminations stay above the fixed five exits in their specified order',()=>{
 const bottom=['gabrielsab','bayron','eduard','peggy','joseserna'];
 const first={cast:[person('joseserna','OUT'),person('peggy','OUT')]};
 const next={cast:[person('eduard','DISQ'),person('bayron','DISQ'),person('gabrielsab','ELIM')],displayOverrides:{bottom}};
 const later={cast:[person('alice','ELIM'),person('roger','WIN')]};
 const cast=[...first.cast,...next.cast,...later.cast];
 assert.deepEqual(orderTrackCast({cast,episodes:[first,next,later]}).map(p=>p.id),['roger','alice',...bottom]);
});
