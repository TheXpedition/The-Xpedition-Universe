const clamp=n=>Math.max(0,Math.min(100,n));
const label=n=>n>=90?'delicious':n>=75?'good':n>=50?'meh':'disgust';
export const REACTION_NAMES={delicious:'Delicioso',good:'Bueno',meh:'Meh',disgust:'Asqueroso',nausea:'Asqueroso'};
export function judgeReactions(result,key=''){
 if(result.quality==='empty')return [0,1,2].map(i=>({reaction:'meh',frame:6+i}));
 const p=result.parts||{},total=Number(result.total)||0,flavor=clamp(((p.ingredients||0)/25+(p.cooking||0)/25+(p.technique||0)/15)/3*100),scores=[flavor,total*.6+(p.presentation||0)/15*40,total*.65+(p.creativity||0)*3.5];
 const seed=[...key].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619),2166136261)>>>0;
 return scores.map((n,i)=>{let reaction=label(Math.min(n,total+15));if(total<30&&(seed+i)%3===0)reaction='nausea';return {reaction,frame:({delicious:0,good:3,meh:6,disgust:9,nausea:12})[reaction]+i};});
}
