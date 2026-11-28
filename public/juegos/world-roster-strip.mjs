import {WORLD_CHARACTERS} from './world-characters.mjs';

const hosts=['maria-villegas','isabel'];
const contestants=['alice','andromeda','arisantana','kareli','bruno','daelly','vitany','guillermo','ivy','marianito','roger','sallua','vita','carmine','nacho','luciano','leandro'];
const eliminated=['gabrielsab','eduard','bayron','peggy','joseserna'];
const characters=new Map(WORLD_CHARACTERS.map(c=>[c.id,c]));

export function mountWorldRosterStrip(){
 const root=document.createElement('div');
 root.id='world-roster-strip';
 root.setAttribute('aria-label','Participantes conectados y estado de temporada');
 document.body.append(root);
 let signature='';
 return {update(roster=[]){
  const byCharacter=new Map(roster.map(p=>[p.characterId,p]));
  const out=id=>byCharacter.get(id)?.status==='eliminated'||eliminated.includes(id);
  const order=[...hosts,...contestants.filter(id=>!out(id)),...eliminated,...contestants.filter(out)];
  const key=JSON.stringify(order.map(id=>[id,out(id),byCharacter.get(id)?.userId,byCharacter.get(id)?.connected]));
  if(key===signature)return;
  signature=key;
  root.replaceChildren(...order.flatMap(id=>{
   const character=characters.get(id);
   if(!character)return [];
   const person=byCharacter.get(id),online=person?.connected===true;
   const icon=document.createElement('span'),image=document.createElement('img');
   icon.className='roster-strip-person'+(out(id)?' eliminated':'')+(online?' online':'');
   icon.title=character.name+' · '+(out(id)?'Eliminado':online?'En línea':'En el reparto');
   icon.dataset.characterId=id;
   if(person?.userId)icon.dataset.userId=person.userId;
   image.src=character.portrait;
   image.alt=icon.title;
   image.decoding='async';
   icon.append(image);
   return [icon];
  }));
 },destroy(){root.remove();}};
}
