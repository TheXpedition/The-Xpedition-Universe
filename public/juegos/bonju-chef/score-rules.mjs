import {substitutions,PREP_HITS} from './data.mjs';
import {cutIngredients} from './preparation.mjs';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
export function scoreDish(station,recipe){
 const used=station.mixed??station.inventory,matches=substitutions(recipe.required,used),missing=matches.filter(m=>m.kind==='missing').length,substitutes=matches.filter(m=>m.kind==='substitute').length,bonus=recipe.bonus.filter(id=>used.includes(id)).length,unmatched=used.filter(id=>!matches.some(m=>m.actual===id)&&!recipe.bonus.includes(id)).length;
 const expectedCuts=cutIngredients(station).length*PREP_HITS,precision=expectedCuts?Math.min(1,station.cuts.reduce((s,c)=>s+c.value,0)/expectedCuts):1,heat=station.cookTotal?station.cookGood/station.cookTotal:0,burned=station.burn>6500,raw=heat<.35||station.cookTotal<18000;
 const expected=matches.map(m=>m.actual).filter(Boolean),placed=station.placed||[],correct=placed.filter((p,i)=>p.id===expected[i]&&Math.abs(p.x-(.25+(i%3)*.25))<.18&&Math.abs(p.y-(.35+Math.floor(i/3)*.3))<.24).length;
 const neat=expected.length?correct/expected.length:0,late=station.late||!station.served,parts={ingredients:Math.max(0,25-missing*12-substitutes*6),technique:15*precision,cooking:Math.max(0,25*heat-(burned?15:0)-(raw?12:0)-unmatched*6),time:late?0:10,presentation:Math.max(0,15*neat-(neat<.55?10:0)),creativity:Math.max(0,Math.min(10,3+bonus*3+substitutes*1.5-unmatched*4))};
 let total=clamp(Object.values(parts).reduce((a,b)=>a+b,0)-(late?20:0));
 if(missing>=2)total=Math.min(total,54);if(missing||substitutes||burned||raw||neat<.85)total=Math.min(total,89);
 const quality=total>=94&&missing===0&&substitutes===0&&!burned&&!raw&&precision>=.9&&neat>=.9?'excellent':total>=65&&!burned&&missing<2?'normal':'ugly';
 const comment=missing>=2?'La falta de ingredientes dejó el plato sin estructura.':burned?'El fuego se impuso: el plato perdió sabor y textura.':raw?'La cocción quedó incompleta.':quality==='excellent'?'Precisión, equilibrio y una presentación impecable.':quality==='normal'?'Un plato que cumple. Todavía hay detalles por pulir.':'La técnica y el montaje necesitan más cuidado.';
 return {total:Math.round(total*10)/10,note:Math.round(total)/10,quality,parts,matches,missing,substitutes,bonus,burned,raw,late,comment};
}
