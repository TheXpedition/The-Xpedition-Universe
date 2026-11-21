import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

// Runs during npm install on Render. Original artwork is never overwritten.
const publicDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const catalogPath=path.join(publicDir,'catalog.json');
const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
let optimizedFiles=0,originalBytes=0,optimizedBytes=0;
for(const item of catalog.content?.campria||[]){
  for(const kind of ['background','logo']){
    const original=kind==='background'?item.art?.background:item.art?.logo?.src;
    if(!original||!/^[-\w/]+\.png$/i.test(original))continue;
    const optimized=original.replace(/\.png$/i,'-fast-2026.webp');
    const source=path.resolve(publicDir,original),destination=path.resolve(publicDir,optimized);
    if(!source.startsWith(publicDir+path.sep)||!destination.startsWith(publicDir+path.sep))continue;
    try{
      const stat=await fs.stat(source);
      await fs.mkdir(path.dirname(destination),{recursive:true});
      await sharp(source).webp(kind==='logo'
        ?{quality:92,alphaQuality:100,effort:4}
        :{quality:82,effort:4}).toFile(destination);
      const newStat=await fs.stat(destination);
      if(newStat.size>=stat.size){await fs.unlink(destination);continue;}
      if(kind==='background')item.art.background=optimized;
      else item.art.logo.src=optimized;
      originalBytes+=stat.size;optimizedBytes+=newStat.size;optimizedFiles++;
    }catch(error){
      console.warn('Campria: PNG retained for '+original+': '+error.message);
    }
  }
}
if(optimizedFiles)await fs.writeFile(catalogPath,JSON.stringify(catalog));
console.log('Campria: '+optimizedFiles+' assets optimized ('+(originalBytes/1048576).toFixed(1)+' MB -> '+(optimizedBytes/1048576).toFixed(1)+' MB). Original PNG files preserved.');
