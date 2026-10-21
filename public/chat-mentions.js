'use strict';
// A mention can only resolve to a member of the conversation being displayed.
function chatMentionText(text,members=[]){
 const people=[...new Map(members.filter(p=>p?.id&&p?.name&&!p.bot).map(p=>[p.id,p])).values()].sort((a,b)=>b.name.length-a.name.length);
 if(!people.length)return linkify(text);
 const escaped=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(^|\\s)@('+people.map(p=>escaped(p.name)).join('|')+')(?=$|[\\s.,!?;:])','giu');
 let output='',cursor=0;for(const match of String(text||'').matchAll(pattern)){const person=people.find(p=>p.name.toLocaleLowerCase()===match[2].toLocaleLowerCase());output+=linkify(String(text).slice(cursor,match.index))+esc(match[1])+`<a class="chat-mention" href="#perfil/${encodeURIComponent(person.id)}">@${esc(person.name)}</a>`;cursor=match.index+match[0].length;}
 return output+linkify(String(text||'').slice(cursor));
}
(()=>{
 let box=null,field=null,start=0,end=0,choices=[],selected=0;
 const close=()=>{box?.remove();box=null;field=null;choices=[];};
 function roster(input){if(input.id==='messageInput')return state.conversations.find(c=>c.id===state.active)?.members||[];if(input.id==='sdChatText'&&typeof sdUI!=='undefined')return sdUI.room?.people.map(p=>({id:p.id,name:p.username}))||[];return [];}
 function commit(index){const person=choices[index],input=field;if(!person||!input)return;input.setRangeText('@'+person.name+' ',start,end,'end');close();input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));}
 function paint(){if(!box)return;box.innerHTML=choices.map((p,i)=>`<button type="button" data-mention-index="${i}" role="option" aria-selected="${i===selected}"><strong>@${esc(p.name)}</strong></button>`).join('');}
 document.addEventListener('input',event=>{
  const input=event.target;if(!['messageInput','sdChatText'].includes(input.id))return;
  const before=input.value.slice(0,input.selectionStart),match=before.match(/(?:^|\s)@([^@\n]{0,70})$/);if(!match){close();return;}
  const people=roster(input),query=norm(match[1]);if(match[1].endsWith(' ')&&people.some(p=>norm(p.name)===query.trim())){close();return;}
  choices=people.filter(p=>norm(p.name).includes(query)).slice(0,8);if(!choices.length){close();return;}
  field=input;end=input.selectionStart;start=end-match[1].length-1;selected=0;if(!box){box=document.createElement('div');box.className='chat-mentions';box.setAttribute('role','listbox');box.setAttribute('aria-label','Mencionar a alguien de este chat');document.body.append(box);}paint();
  const bounds=input.getBoundingClientRect();box.style.width=Math.min(300,window.innerWidth-24)+'px';box.style.left=Math.min(Math.max(12,bounds.left),window.innerWidth-Math.min(300,window.innerWidth-24)-12)+'px';box.style.top=Math.max(10,bounds.top-Math.min(260,choices.length*40)-12)+'px';
 });
 document.addEventListener('keydown',event=>{if(!box||event.target!==field)return;if(['ArrowDown','ArrowUp','Enter','Escape'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape')close();else if(event.key==='Enter')commit(selected);else{selected=(selected+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;paint();}}},true);
 document.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-mention-index]');if(button&&box?.contains(button)){event.preventDefault();commit(Number(button.dataset.mentionIndex));}else if(box&&event.target!==field)close();});
 window.addEventListener('hashchange',close);window.addEventListener('resize',close);
})();
