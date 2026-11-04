import {SHELTER_PARTICIPANTS} from './public/juegos/world-shelters.mjs';
const parse=raw=>{try{return JSON.parse(raw);}catch{return null;}};
export function rankLastGrip(s){
 if(!s?.winner||!Array.isArray(s.roster)||s.roster.length<4)return null;
 const final=s.round?.final?s.round:s.rounds?.find(r=>r.final),finalIds=new Set(final?.members||s.qualifiers||[]),winner=s.roster.find(p=>p.id===s.winner);if(!winner)return null;
 function performance(id,r){if(!r)return 0;const raw=r.falls?.find(f=>f.id===id)?.seconds??r.duration??0;return Math.max(0,raw)*(r.duration>0&&r.effort>0?r.effort/r.duration:1);}
 const others=s.roster.filter(p=>p.id!==winner.id),top=others.filter(p=>finalIds.has(p.id)).sort((a,b)=>performance(b.id,final)-performance(a.id,final)||a.characterId.localeCompare(b.characterId)),rest=others.filter(p=>!finalIds.has(p.id)).map(p=>({...p,performance:performance(p.id,s.rounds?.find(r=>r.members.includes(p.id)))})).sort((a,b)=>b.performance-a.performance||a.characterId.localeCompare(b.characterId));
 return [winner,...top,...rest].map((p,i)=>({rank:i+1,sourceActorId:p.id,characterId:p.characterId,name:p.name,score:i===0?performance(p.id,final):finalIds.has(p.id)?performance(p.id,final):p.performance||0}));
}
export async function protocolResults(db,now=Date.now()){
 const rows=await db.all("SELECT id,state,updated FROM world_environment WHERE id=? OR id LIKE ? OR id LIKE ? ORDER BY updated DESC LIMIT 50",'last-grip','last-grip:history:%','challenge-result:%'),seen=new Set(),results=[];
 for(const row of rows){const value=parse(row.state),created=Number(row.id.startsWith('challenge-result:')?value?.created??row.updated:value?.completedId===value?.id?value?.completedAt:row.updated);if(!Number.isFinite(created)||created<now-86400000||created>now)continue;if(row.id.startsWith('challenge-result:')){if(value?.kind==='protocol-result'&&Array.isArray(value.ranking))results.push({...value,id:row.id,created});continue;}if(!value||seen.has(value.id))continue;seen.add(value.id);const ranking=rankLastGrip(value);if(ranking)results.push({id:row.id,kind:'last-grip',name:'The Last Grip',episode:1,challengeId:value.id,created,ranking});}
 return results;
}
export function mapProtocolRanking(source,roster){
 const byCharacter=new Map(roster.map(p=>[p.characterId,p]));if(!byCharacter.has(source.ranking[0]?.characterId))throw Object.assign(Error('El ganador de este reto no está en el elenco. Inclúyelo antes de revelar este resultado.'),{status:409});const rows=source.ranking.filter(r=>byCharacter.has(r.characterId));if(rows.length!==roster.length||new Set(rows.map(r=>r.characterId)).size!==roster.length)throw Object.assign(Error('Este resultado no contiene a todo el elenco de la ceremonia.'),{status:409});return {...source,ranking:rows.map((r,i)=>({...r,rank:i+1,id:byCharacter.get(r.characterId).id}))};
}
export function validateImportedResult(input){const name=typeof input?.name==='string'?input.name.trim().slice(0,80):'';if(!name||!Array.isArray(input.ranking)||input.ranking.length<4||input.ranking.length>18||new Set(input.ranking.map(r=>r.characterId)).size!==input.ranking.length||input.ranking.some(r=>!SHELTER_PARTICIPANTS.includes(r.characterId)))throw Object.assign(Error('Introduce un nombre de reto y un ranking sin personajes repetidos.'),{status:400});return {kind:'protocol-result',name,episode:Math.max(1,Math.min(99,Number(input.episode)||1)),ranking:input.ranking.map((r,i)=>({rank:i+1,characterId:r.characterId,name:String(r.name||r.characterId).slice(0,60),score:Number.isFinite(r.score)?r.score:0}))};}
