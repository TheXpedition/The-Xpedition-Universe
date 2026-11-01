import {setInfection,isSuppressed} from './world-infectious-health.mjs';
// Game probabilities only. Gender/orientation never creates an infection.
export function applyEncounterHealth(first,second,{protectedEncounter=true,pregnancyConsent=false,random=Math.random}={}) {
 const pair=[first,second];
 if(pair.some(p=>!p.adult||p.body.life.status!=='alive'))throw Error('Se requieren dos personajes adultos conscientes.');
 const exposure=pair.map(p=>({type:p.body.infection.type,suppressed:isSuppressed(p.body)}));
 for(let n=0;n<2;n++) {
  const donor=exposure[1-n],body=pair[n].body;
  if(!body.infection.type&&donor.type&&!donor.suppressed&&random()<(donor.type==='hiv-2'?.03:.12)*(protectedEncounter?.05:1))setInfection(body,donor.type);
 }
 if(pregnancyConsent) {
  const woman=pair.find(p=>p.gender==='female'&&p.body.reproductive.enabled),man=pair.find(p=>p.gender==='male');
  if(woman)woman.body.reproductive.allowPregnancyStory=true;
  if(woman&&man&&!woman.body.reproductive.pregnant&&random()<(protectedEncounter?.005:.20)*(woman.body.reproductive.contraception?.01:1)) {
   woman.body.reproductive.pregnant=true;woman.body.reproductive.tested=false;
  }
 }
 for(const p of pair){p.vitals.stress=Math.max(0,p.vitals.stress-5);p.vitals.energy=Math.max(0,p.vitals.energy-3);}
 return pair;
}
