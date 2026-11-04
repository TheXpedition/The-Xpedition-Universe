// Export the full table, including columns/rows outside the scroll viewport.
// Only cell backgrounds, borders, portraits and text are painted to the PNG.
export function trackSnapshot(table){
 const win=table.ownerDocument.defaultView,rows=[...table.rows];
 const widths=rows[0]?[...rows[0].cells].map(c=>c.getBoundingClientRect().width):[];
 return {width:Math.ceil(widths.reduce((a,b)=>a+b,0)),height:Math.ceil(rows.reduce((n,r)=>n+r.getBoundingClientRect().height,0)),widths,rows:rows.map(row=>({height:row.getBoundingClientRect().height,cells:[...row.cells].map(c=>{const css=win.getComputedStyle(c),strong=c.querySelector('strong'),small=c.querySelector('small'),img=c.querySelector('img');return {background:css.backgroundColor,color:css.color,border:css.borderRightColor,font:css.font||`${css.fontWeight} ${css.fontSize} ${css.fontFamily}`,text:c.textContent.trim(),strike:css.textDecorationLine?.includes('line-through'),identity:strong?{name:strong.textContent,user:small?.textContent||'',image:img,nameFont:win.getComputedStyle(strong).font,userFont:small?win.getComputedStyle(small).font:'10px Arial',userColor:small?win.getComputedStyle(small).color:css.color}:null};})}))};
}
function fitText(ctx,text,width,font){ctx.font=font||'12px Arial';if(ctx.measureText(text).width<=width)return text;while(text&&ctx.measureText(text+'…').width>width)text=text.slice(0,-1);return text+'…';}
export function paintTrack(ctx,snapshot){
 let y=0;ctx.textBaseline='middle';
 for(const row of snapshot.rows){let x=0;for(const [i,c]of row.cells.entries()){const w=snapshot.widths[i],h=row.height;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();if(c.background&&c.background!=='rgba(0, 0, 0, 0)'){ctx.fillStyle=c.background;ctx.fillRect(x,y,w,h);}ctx.fillStyle=c.color;
   if(c.identity){const p=c.identity,icon=Math.min(34,h-10),ix=x+10,iy=y+(h-icon)/2;if(p.image?.naturalWidth){const im=p.image,side=Math.min(im.naturalWidth,im.naturalHeight);ctx.drawImage(im,(im.naturalWidth-side)/2,(im.naturalHeight-side)/2,side,side,ix,iy,icon,icon);ctx.strokeStyle='#805739';ctx.lineWidth=1;ctx.strokeRect(ix+.5,iy+.5,icon-1,icon-1);}const tx=ix+icon+9,tw=w-(tx-x)-10;ctx.textAlign='left';const name=fitText(ctx,p.name,tw,p.nameFont||'bold 12px Arial');ctx.fillText(name,tx,y+h/2-(p.user?6:0));if(p.user){ctx.fillStyle=p.userColor;ctx.fillText(fitText(ctx,p.user,tw,p.userFont||'10px Arial'),tx,y+h/2+9);}}
   else{ctx.font=c.font||'bold 11px Arial';ctx.textAlign=i===0?'left':'center';ctx.fillText(c.text,i===0?x+12:x+w/2,y+h/2);if(c.strike&&c.text){const tw=ctx.measureText(c.text).width;ctx.strokeStyle=c.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+(w-tw)/2,y+h/2);ctx.lineTo(x+(w+tw)/2,y+h/2);ctx.stroke();}}
   ctx.strokeStyle=c.border||'#674a38';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);ctx.restore();x+=w;}y+=row.height;}
}
export async function downloadTrack(table,{filename='Apocalypse-II-desempeño.png'}={}){
 if(!table?.rows.length)throw Error('Todavía no hay una tabla para descargar.');
 await table.ownerDocument.fonts?.ready;
 await Promise.all([...table.querySelectorAll('img')].map(async im=>{if(im.complete&&im.naturalWidth)return;await Promise.race([im.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('No se pudo cargar un retrato. Intenta descargar de nuevo.')),6000))]);}));
 const snapshot=trackSnapshot(table),canvas=table.ownerDocument.createElement('canvas'),scale=2;
 if(snapshot.width<=0||snapshot.height<=0)throw Error('Abre Desempeño antes de descargar la tabla.');
 canvas.width=snapshot.width*scale;canvas.height=snapshot.height*scale;const ctx=canvas.getContext('2d');if(!ctx)throw Error('La descarga de imagen no está disponible.');ctx.scale(scale,scale);paintTrack(ctx,snapshot);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo crear la imagen.');
 const url=URL.createObjectURL(blob),link=table.ownerDocument.createElement('a');link.href=url;link.download=filename;link.hidden=true;table.ownerDocument.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
