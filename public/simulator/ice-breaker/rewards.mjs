async function request(url,method='GET',data){const response=await fetch(url,{method,cache:'no-store',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const value=await response.json();if(!response.ok){const error=Error(value.error||'No pudimos guardar el progreso.');error.status=response.status;throw error;}return value;}
export const loadProgress=()=>request('/api/arcade/ice-breaker/progress');
export class ArcadeRecorder{
 constructor(session,onUpdate){this.id=session.id;this.revision=session.revision;this.userId=session.userId;this.queue=[];this.retry=null;this.busy=null;this.last=null;this.onUpdate=onUpdate;this.fatal=false;}
 static async start(config,onUpdate){return new ArcadeRecorder(await request('/api/arcade/ice-breaker/runs','POST',config),onUpdate);}
 tick(input){const clean={x:input.x||0,y:input.y||0,dodge:!!input.dodge},last=this.queue.at(-1);if(last?.op==='step'&&last.ticks<360&&last.input.x===clean.x&&last.input.y===clean.y&&last.input.dodge===clean.dodge)last.ticks++;else this.queue.push({op:'step',ticks:1,input:clean});}
 action(command){this.queue.push(command);}
 batch(){let ticks=0;const result=[];while(this.queue.length&&result.length<110){const next=this.queue[0];if(next.op==='step'&&ticks+next.ticks>600){const count=600-ticks;if(count){result.push({...next,ticks:count});next.ticks-=count;}break;}result.push(this.queue.shift());if(next.op==='step')ticks+=next.ticks;}return result;}
 async flush(all=false){
  if(this.fatal)throw Error('No se pudo verificar esta partida. Empieza una nueva expedición para ganar tickets.');
  if(this.busy){await this.busy;return all?this.flush(true):this.last;}
  const batch=this.retry||this.batch();if(!batch.length)return this.last;this.retry=batch;
  this.busy=(async()=>{try{const result=await request('/api/arcade/ice-breaker/runs/'+this.id,'PUT',{revision:this.revision,commands:batch});this.revision=result.revision;this.retry=null;if(result.reward?.tickets)this.earned=result.reward;this.last={...result,reward:this.earned||result.reward};this.onUpdate?.(this.last);return this.last;}catch(error){if([400,403,404,409].includes(error.status))this.fatal=true;throw error;}})();
  try{await this.busy;}finally{this.busy=null;}
  return all&&this.queue.length?this.flush(true):this.last;
 }
}
