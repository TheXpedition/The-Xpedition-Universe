import {PREP_HITS} from './data.mjs';
const noCut=new Set(['meat','eggs','milk','butter','bread','pasta','tortilla','flour','rice','corn','cream','salsa','broth','oil','bbq','sugar','vinegar','vanilla','beans','yogurt','oats','chickpeas','lentils','quinoa','blueberries']);
export const cutIngredients=st=>(st?.inventory||[]).filter(id=>!noCut.has(id));
export function prepProgress(st){const items=cutIngredients(st),done=Math.floor((st?.cuts?.length||0)/PREP_HITS);return {items,current:items[done]||null,completed:Math.min(items.length,done),hits:(st?.cuts?.length||0)%PREP_HITS,total:items.length*PREP_HITS};}
export function needsBlending(recipe){return ['icecream','pasta','tart'].includes(recipe?.id);}
export function blendIngredients(st,recipe){const ids=st?.inventory||[];return recipe?.id==='pasta'?ids.filter(id=>['tomato','garlic','onion','basil','pepper','mushroom','zucchini','pumpkin'].includes(id)):recipe?.id==='tart'?ids.filter(id=>['milk','banana','sugar','vanilla','cream','yogurt','mango'].includes(id)):ids.filter(id=>!['nori','steak','fish','chicken','meat','pasta','bread','tortilla'].includes(id));}
export function fatigueOf(p){const v=p?.vitals||{};return Math.max(0,Math.min(.24,((100-(v.energy??100))*.32+(100-(v.sleep??100))*.3+(100-(v.hunger??100))*.2+(100-(v.health??100))*.12+(v.stress??0)*.06)/100*.24));}
export const prepPeriod=(s,p)=>(s.round===(s.totalRounds||6)?1500:1950)*(1-fatigueOf(p)*.35);
export const basketLimit=s=>(s.rounds?.[s.round-1]?.mode||s.mode)==='single'?4:8;
export function beginCooking(st,clock,recipe){st.stage=needsBlending(recipe)&&!st.blended?'blend':'cook';st.stageAt=clock;st.lastStir=clock;st.blendInput=false;st.blendAt=clock;st.blendProgress||=0;}
