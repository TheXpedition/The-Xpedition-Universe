'use strict';
(()=>{
 let context=null,simStream=null,session=null;
 function audioContext(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;try{return context||(context=new Audio());}catch{return null;}}
 async function arm(){const audio=audioContext();if(audio?.state==='suspended')try{await audio.resume();}catch{}}
 document.addEventListener('pointerdown',arm,{passive:true});document.addEventListener('keydown',arm,{passive:true});
 function tone(){const audio=audioContext();if(!audio||audio.state!=='running')return;const start=audio.currentTime;for(const [offset,hz]of [[0,740],[.13,988]]){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,start+offset);gain.gain.linearRampToValueAtTime(.11,start+offset+.015);gain.gain.exponentialRampToValueAtTime(.001,start+offset+.2);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start+offset);oscillator.stop(start+offset+.22);}}
 async function incoming(event,ownId){let payload;try{payload=JSON.parse(event.data);}catch{return;}const message=payload.message;if(!ownId||!message?.id||message.sender?.id===ownId||message.deleted)return;
  const notify=()=>{if(audioContext()?.state!=='running')return;let seen=[];try{seen=JSON.parse(localStorage.getItem('xp-message-sounds')||'[]');}catch{}if(seen.includes(message.id))return;try{localStorage.setItem('xp-message-sounds',JSON.stringify([...seen.slice(-79),message.id]));}catch{}tone();};
  try{if(navigator.locks)await navigator.locks.request('xpedition-message-sound',notify);else notify();}catch{}
 }
 if(typeof startStream==='function'){const original=startStream;startStream=function(){original();state.stream?.addEventListener('message',event=>void incoming(event,state.user?.id));};}
 window.addEventListener('xp:session',event=>{const id=event.detail?.id;if(id===session)return;simStream?.close();simStream=null;session=id;if(id){simStream=new EventSource('/api/events');simStream.addEventListener('message',event=>void incoming(event,session));}});
 window.addEventListener('pagehide',()=>{simStream?.close();});
})();
