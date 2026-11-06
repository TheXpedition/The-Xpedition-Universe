// The server waits for actual playback completion; buffering never skips a clip.
export class MediaGate {
 constructor({maxWaitMs=Infinity,startWaitMs=0}={}){this.maxWaitMs=maxWaitMs;this.startWaitMs=startWaitMs;this.viewers=new Set();this.current=null;this.waitingSince=null;}
 observe(descriptor,eligible){if(!descriptor){this.current=null;this.waitingSince=null;return;}if(this.current?.key!==descriptor.key){this.current={key:descriptor.key,expected:new Set([...this.viewers].filter(eligible)),started:new Set(),ended:new Set()};this.waitingSince=null;}}
 viewer(id,visible,descriptor,eligible){const same=!!this.current&&this.current.key===descriptor?.key,alreadyStarted=same&&this.current.started.size>0;if(visible)this.viewers.add(id);else this.viewers.delete(id);this.observe(descriptor,eligible);if(this.current){if(visible&&eligible(id)){this.current.expected.add(id);if(alreadyStarted)this.current.started.add(id);}else{this.current.expected.delete(id);this.current.started.delete(id);this.current.ended.delete(id);}}}
 disconnect(id,{preserveExpected=false}={}){this.viewers.delete(id);if(!preserveExpected){this.current?.expected.delete(id);this.current?.started.delete(id);this.current?.ended.delete(id);}}
 started(id,key){if(this.current?.key===key&&this.current.expected.has(id))this.current.started.add(id);}
 ended(id,key){if(this.current?.key===key&&this.current.expected.has(id)){this.current.started.add(id);this.current.ended.add(id);}}
 failed(id,key){this.ended(id,key);}
 pending(){return !!this.current&&[...this.current.expected].some(id=>!this.current.ended.has(id));}
 advance(descriptor,clock,delta,now=Date.now()){
  if(!descriptor||this.current?.key!==descriptor.key||!this.pending()){this.waitingSince=null;return delta;}
  if(this.startWaitMs>0&&[...this.current.expected].some(id=>!this.current.started.has(id))){this.waitingSince??=now;if(now-this.waitingSince<this.startWaitMs)return 0;for(const id of this.current.expected)this.current.started.add(id);this.waitingSince=null;}
  const untilEnd=descriptor.start+descriptor.duration-1-clock;if(untilEnd>0){this.waitingSince=null;return Math.max(0,Math.min(delta,untilEnd));}
  this.waitingSince??=now;return now-this.waitingSince>=this.maxWaitMs?delta:0;
 }
}
