// Work in screen coordinates, never in zoomed map units. Size is expressed in
// CSS pixels so dialogue stays readable on both the overview and close shots.
export function speechBubbleLayout(c,text,{x,y,width,height,cssScale=1}={}){
 const unit=1/cssScale,fontSize=18*unit,padding=15*unit,lineHeight=25*unit,
  margin=12*unit,maxWidth=Math.max(80*unit,Math.min(330*unit,width-margin*2)),
  textWidth=maxWidth-padding*2,maxLines=Math.max(1,Math.min(6,Math.floor((height*.72-padding*2)/lineHeight)));
 c.font='600 '+fontSize+'px system-ui,sans-serif';
 const lines=[''];
 for(const word of String(text??'').trim().split(/\s+/u)){
  let pending=word;
  if(lines.at(-1)&&c.measureText(lines.at(-1)+' '+word).width<=textWidth){lines[lines.length-1]+=' '+word;continue;}
  if(lines.at(-1))lines.push('');
  while(pending){let part='';for(const char of pending){if(part&&c.measureText(part+char).width>textWidth)break;part+=char;}
   lines[lines.length-1]=part;pending=pending.slice(part.length);if(pending)lines.push('');}
 }
 if(lines.length>maxLines){lines.length=maxLines;let last=lines.at(-1);while(last&&c.measureText(last+'…').width>textWidth)last=last.slice(0,-1);lines[maxLines-1]=last+'…';}
 const w=Math.min(maxWidth,Math.max(60*unit,...lines.map(l=>c.measureText(l).width))+padding*2),h=lines.length*lineHeight+padding*2,
  left=Math.max(margin,Math.min(width-w-margin,x-w/2)),top=Math.max(margin,Math.min(height-h-margin,y-h-12*unit));
 return {left,top,width:w,height:h,lines,fontSize,lineHeight,padding,unit,tailX:Math.max(left+18*unit,Math.min(left+w-18*unit,x))};
}
export function paintSpeechBubble(c,text,options){
 c.save();const b=speechBubbleLayout(c,text,options),{left:x,top:y,width:w,height:h,unit:u}=b;
 c.fillStyle='#fff9eb';c.strokeStyle='#352519';c.lineWidth=2*u;c.lineJoin='round';
 c.shadowColor='#0007';c.shadowBlur=9*u;c.shadowOffsetY=3*u;
 c.beginPath();c.roundRect(x,y,w,h,12*u);c.fill();c.stroke();c.shadowBlur=0;c.shadowOffsetY=0;
 c.beginPath();c.moveTo(b.tailX-8*u,y+h-1*u);c.lineTo(b.tailX,y+h+10*u);c.lineTo(b.tailX+9*u,y+h-1*u);c.fill();c.stroke();
 c.fillStyle='#251b17';c.textAlign='center';c.textBaseline='top';
 b.lines.forEach((line,i)=>c.fillText(line,x+w/2,y+b.padding+i*b.lineHeight));c.restore();return b;
}
