// Keep full-resolution textures only for the active/recent character. Rapid
// selector taps replace the queued request instead of decoding the whole cast.
export class CharacterAssets{
 constructor({characters,loadImage,prepare,maxEntries=2}){this.characters=new Map(characters.map(c=>[c.id,c]));this.loadImage=loadImage;this.prepare=prepare;this.maxEntries=maxEntries;this.cache=new Map();this.active=null;this.queued=null;}
 load(id){
  if(this.queued?.id===id)return this.queued.promise;
  if(this.queued){this.queued.reject(new DOMException('Selection changed','AbortError'));this.queued=null;}
  if(this.cache.has(id)){const texture=this.cache.get(id);this.cache.delete(id);this.cache.set(id,texture);return Promise.resolve(texture);}
  if(this.active?.id===id)return this.active.promise;
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});this.queued={id,promise,resolve,reject};void this.drain();return promise;
 }
 async drain(){
  if(this.active||!this.queued)return;const task=this.queued;this.queued=null;this.active=task;
  try{const character=this.characters.get(task.id);if(!character)throw Error('Unknown character');const image=await this.loadImage(character.renderImage||character.image),texture=this.prepare(image,character);this.cache.set(task.id,texture);this.trim();task.resolve(texture);}catch(error){task.reject(error);}finally{this.active=null;void this.drain();}
 }
 trim(){while(this.cache.size>this.maxEntries)this.cache.delete(this.cache.keys().next().value);}
 get(id){return this.cache.get(id);}
}
