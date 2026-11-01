// Fictional character histories. These are never inferred from the account holder.
export const CAST_HEALTH_PROFILES=Object.freeze({
 andromeda:{traits:{downSyndrome:true},conditions:[]},
 sallua:{conditions:[['schizophrenia',36]]},
 vita:{conditions:[['postnatal-depression',38]],postpartum:true},
 eduard:{conditions:[['obsessive-compulsive-disorder',35]]},
 leandro:{conditions:[['generalized-anxiety',35]]},
 bayron:{conditions:[['head-lice',40]]},
 carmine:{conditions:[['body-weight-support',25]]},
 daelly:{conditions:[['ptsd',36]]}
});
export const PRIVATE_MENTAL_IDS=Object.freeze(['depressive-symptoms','anxiety','schizophrenia','postnatal-depression','obsessive-compulsive-disorder','generalized-anxiety','ptsd']);
export const PRIVATE_CLINICAL_IDS=Object.freeze([...PRIVATE_MENTAL_IDS,'body-weight-support','copd','allergic-reaction','hiv-1','hiv-2','aids']);
export const CHRONIC_CONDITION_IDS=Object.freeze([...PRIVATE_MENTAL_IDS,'body-weight-support','copd','hiv-1','hiv-2','aids']);
const copy=condition=>({...condition});
export function applyCastHealthProfile(body,characterId){
 const clinical=body.clinical;clinical.castProfiles??={};if(clinical.castCharacter===characterId){Object.assign(clinical.traits,CAST_HEALTH_PROFILES[characterId]?.traits||{});return body;}
 const previous=clinical.castCharacter,oldConditions=previous?body.conditions.filter(c=>c.castCharacter===previous):[];
 if(previous){clinical.castProfiles[previous]={conditions:oldConditions.map(copy),traits:{...clinical.traits},known:clinical.known.filter(id=>oldConditions.some(c=>c.id===id)||id==='traits'),postpartum:body.reproductive.postpartum===true};body.conditions=body.conditions.filter(c=>c.castCharacter!==previous);const knownIds=new Set([...(CAST_HEALTH_PROFILES[previous]?.conditions||[]).map(([id])=>id),...oldConditions.map(c=>c.id),'traits']);clinical.known=clinical.known.filter(id=>!knownIds.has(id));}
 const profile=CAST_HEALTH_PROFILES[characterId]||{},saved=clinical.castProfiles[characterId];
 clinical.traits=saved?{autism:false,downSyndrome:false,...saved.traits}:{autism:false,downSyndrome:false,...profile.traits};
 const conditions=saved?saved.conditions:(profile.conditions||[]).map(([id,severity])=>({id,severity,age:0,treatment:0}));
 for(const value of conditions){const existing=body.conditions.find(c=>c.id===value.id);if(existing)existing.castCharacter=characterId;else if(body.conditions.length<16)body.conditions.push({...value,castCharacter:characterId});}
 if(saved)clinical.known=[...new Set([...clinical.known,...saved.known])];
 body.reproductive.postpartum=saved?saved.postpartum:profile.postpartum===true;clinical.castCharacter=characterId;
 // An empty archive is intentional: a resolved condition must not be reseeded on login.
 clinical.castProfiles[characterId]??={conditions:conditions.map(copy),traits:{...clinical.traits},known:[],postpartum:body.reproductive.postpartum};
 return body;
}
export const CAST_HEALTH_SOURCES=Object.freeze([
 'https://www.nhs.uk/mental-health/conditions/schizophrenia/treatment/',
 'https://www.nhs.uk/medicines/risperidone/about-risperidone/',
 'https://www.nhs.uk/mental-health/conditions/obsessive-compulsive-disorder-ocd/treatment/',
 'https://www.nhs.uk/mental-health/conditions/ptsd-post-traumatic-stress-disorder/',
 'https://www.nhs.uk/mental-health/conditions/postnatal-depression/',
 'https://www.nice.org.uk/guidance/cg113/ifp/chapter/what-treatments-should-i-be-offered-for-gad',
 'https://www.nhs.uk/conditions/head-lice-and-nits/'
]);
