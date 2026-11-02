// A monotonic presentation clock. Network snapshots adjust its rate, never its
// position within an attempt; the marker keeps moving between snapshots.
export class GripClock {
 constructor(){this.key=null;this.value=0;this.target=0;this.at=0;this.received=-Infinity;this.latency=0;this.paused=true;}
 sync(s,stamp){const key=s.id+':'+s.phase+':'+(s.round?.id||'');const target=s.clock+(s.paused?0:this.latency);
  if(key!==this.key||s.paused!==this.paused||stamp-this.received>=1200){this.value=target;this.at=stamp;this.key=key;}
  else this.read(stamp);
  this.target=target;this.at=stamp;this.received=stamp;this.paused=s.paused;return this.value;
 }
 pong({sent,clock},stamp){const rtt=stamp-sent;if(!Number.isFinite(rtt)||rtt<0||rtt>1200||!Number.isFinite(clock))return;this.read(stamp);this.latency=Math.min(300,rtt/2);this.target=clock+(this.paused?0:this.latency);this.at=stamp;}
 read(stamp){const dt=Math.max(0,Math.min(1500,stamp-this.at));if(!this.paused&&stamp-this.received<1500){const error=this.target-this.value;this.value+=dt*(1+Math.max(-.08,Math.min(.08,error/250)));this.target+=dt;}this.at=stamp;return this.value;}
 fresh(stamp){return stamp-this.received<1200;}
}

export class GripMotion {
 constructor(){this.at=0;this.duration=100;this.frames=new Map();}
 sync(s,stamp){const previous=this.sample(s,stamp);const rendered=new Map([...previous.roster,...(previous.visitors||[])].map(p=>[p.id,p]));const next=new Map();
  for(const p of [...s.roster,...(s.visitors||[])]){const old=rendered.get(p.id),smooth=old&&old.area===p.area&&Math.hypot(old.x-p.x,old.y-p.y)<180;next.set(p.id,{from:smooth?old:p,to:p});}
  this.duration=Math.max(80,Math.min(160,stamp-this.at||100));this.at=stamp;this.frames=next;
 }
 sample(s,stamp){const t=Math.min(1,Math.max(0,(stamp-this.at)/this.duration));const actor=p=>{const f=this.frames.get(p.id);if(!f||f.to.area!==p.area)return p;return {...p,x:f.from.x+(f.to.x-f.from.x)*t,y:f.from.y+(f.to.y-f.from.y)*t,walk:(f.from.walk||0)+((f.to.walk||0)-(f.from.walk||0))*t};};return {...s,roster:s.roster.map(actor),visitors:(s.visitors||[]).map(actor)};}
}
