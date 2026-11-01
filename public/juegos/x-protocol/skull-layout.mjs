export function skullLayout(count=6){const cols=count<=8?count:Math.ceil(count/3),rows=Math.ceil(count/cols),height=rows===1?.29:.15;return Array.from({length:count},(_,i)=>{const row=Math.floor(i/cols),col=i%cols,x=.04+(col+.5)*.92/cols,y=rows===1?.80:.57+row*.155;return {index:i,x,y,height,width:.92/cols*.91,approach:{x,y:Math.min(.95,y+.075)}};});}
export const skullPicks=value=>value===undefined?[]:Array.isArray(value)?value:[value];
export const usedSkulls=s=>Object.values(s.skulls.picks).flatMap(skullPicks);
export function nearSkull(s,id,index){const p=s.skulls.positions?.[id],a=skullLayout(s.secret.skulls?.length||s.skulls.count||6)[index]?.approach;return !!p&&!!a&&Math.abs(p.x-a.x)<.065&&Math.abs(p.y-a.y)<.07;}
