// The server waits for actual playback completion; buffering never skips a clip.
export class MediaGate {
 constructor({maxWaitMs=Infinity}={}){this.maxWaitMs=maxWaitMs;this.viewers=new Set();this.current=null;this.waitingSince=null;}
 observe(descriptor,eligible){if(!descriptor){this.current=null;this.waitingSince=null;return;}if(this.current?.key!==descriptor.key){this.current={key:descriptor.key,expected:new Set([...this.viewers].filter(eligible)),ended:new Set()};this.waitingSince=null;}}
 viewer(id,visible,descriptor,eligible){if(visible)this.viewers.add(id);else this.viewers.delete(id);this.observe(descriptor,eligible);if(this.current){if(visible&&eligible(id))this.current.expected.add(id);else this.current.expected.delete(id);}}
 disconnect(id,{preserveExpected=false}={}){this.viewers.delete(id);if(!preserveExpected)this.current?.expected.delete(id);}
 ended(id,key){if(this.current?.key===key&&this.current.expected.has(id))this.current.ended.add(id);}
 pending(){return !!this.current&&[...this.current.expected].some(id=>!this.current.ended.has(id));}
 advance(descriptor,clock,delta,now=Date.now()){if(!descriptor||!this.pending()){this.waitingSince=null;return delta;}const untilEnd=descriptor.start+descriptor.duration-1-clock;if(untilEnd>0){this.waitingSince=null;return Math.max(0,Math.min(delta,untilEnd));}this.waitingSince??=now;return now-this.waitingSince>=this.maxWaitMs?delta:0;}
}
