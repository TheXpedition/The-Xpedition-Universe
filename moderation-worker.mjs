import {parentPort} from 'node:worker_threads';
import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
import {setWasmPaths,setThreadsCount} from '@tensorflow/tfjs-backend-wasm';
import {fileURLToPath} from 'node:url';
import {load} from 'nsfwjs/core';
import {MobileNetV2Model} from 'nsfwjs/models/mobilenet_v2';

setWasmPaths(fileURLToPath(new URL('./node_modules/@tensorflow/tfjs-backend-wasm/dist/',import.meta.url)).replaceAll('\\','/'));
setThreadsCount(1);
sharp.concurrency(1);
sharp.cache({memory:8,files:0,items:10});
let model;
parentPort.on('message',async ({id,bytes})=>{
  let tensor,phase='decode';
  try {
    const image=sharp(Buffer.from(bytes),{limitInputPixels:25000000,animated:false,failOn:'error'});
    const metadata=await image.metadata();
    if(!['png','jpeg','webp'].includes(metadata.format)||(metadata.pages||1)>1)throw new Error('Formato no permitido. Usa una imagen PNG, JPG o WebP sin animación.');
    const pixels=await image.clone().rotate().flatten({background:'#ffffff'}).resize(224,224,{fit:'cover'}).removeAlpha().raw().toBuffer();
    phase='review';
    if(!model)await tf.setBackend('wasm');
    await tf.ready();
    model ||= await load('MobileNetV2',{modelDefinitions:[MobileNetV2Model]});
    tensor=tf.tensor3d(new Uint8Array(pixels),[224,224,3],'int32');
    const predictions=await model.classify(tensor,5);
    let sanitized=await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).png().toBuffer();
    if(sanitized.length>5.5*1024*1024)sanitized=await image.rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
    parentPort.postMessage({id,predictions,image:sanitized});
  } catch(error) {parentPort.postMessage({id,status:phase==='decode'?422:503,error:phase==='decode'?'No se pudo leer la imagen. Usa un PNG, JPG o WebP sin animación y de hasta 25 megapíxeles.':'No se pudo revisar la imagen. No se ha publicado; inténtalo de nuevo en un momento.'});}
  finally {tensor?.dispose();}
});
