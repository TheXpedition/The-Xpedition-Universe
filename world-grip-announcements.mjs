import {EdgeTTS,Constants} from '@andresaya/edge-tts';
import {randomUUID} from 'node:crypto';
import {parseBuffer} from 'music-metadata';
export const ANNOUNCER_VOICE='es-MX-DaliaNeural';
export const SPEECH_PROFILES={maria:{voice:ANNOUNCER_VOICE,rate:'+12%',pitch:'-2Hz'},bonju:{voice:'es-ES-ElviraNeural',rate:'+14%',pitch:'-5Hz'},dua:{voice:'es-AR-ElenaNeural',rate:'+22%',pitch:'+6Hz'}};
const speechKey=(text,profile='maria')=>profile+'\n'+text;
const engine=new EdgeTTS({timeout:20000});
class PreparedSpeech extends EdgeTTS {
 keepWarm(entry){clearTimeout(entry.timer);entry.timer=setTimeout(()=>{if(this.standby===entry)this.standby=null;entry.socket.close();},7000);entry.timer.unref?.();}
 async prepare(){if(this.preparing)return;if(this.standby&&this.standby.socket.readyState<2){this.keepWarm(this.standby);return;}this.preparing=true;try{const signature=await this.generateSecMsGec(Constants.TRUSTED_CLIENT_TOKEN),url=Constants.WSS_URL+'?Ocp-Apim-Subscription-Key='+Constants.TRUSTED_CLIENT_TOKEN+'&Sec-MS-GEC='+signature+'&Sec-MS-GEC-Version='+Constants.VERSION_MS_GEC+'&ConnectionId='+randomUUID().replaceAll('-',''),socket=super.openSocket(url),entry={socket,timer:null};socket.on('error',()=>{});this.standby=entry;this.keepWarm(entry);socket.once('close',()=>{clearTimeout(entry.timer);if(this.standby===entry)this.standby=null;});}catch{}finally{this.preparing=false;}}
 openSocket(url){const entry=this.standby;this.standby=null;if(entry){clearTimeout(entry.timer);if(entry.socket.readyState<2){if(entry.socket.readyState===1)queueMicrotask(()=>{if(entry.socket.readyState===1)entry.socket.onopen?.({});});return entry.socket;}}return super.openSocket(url);}
 closePrepared(){if(this.standby){clearTimeout(this.standby.timer);this.standby.socket.close();this.standby=null;}}
}
const preparedEngine=new PreparedSpeech({timeout:20000});
export const prepareAnnouncementVoice=()=>{void preparedEngine.prepare();};
export async function* streamAnnouncement(text,{signal,profile='maria'}={}){const cached=speechCache.get(speechKey(text,profile));if(cached){yield (await cached).bytes;return;}let received=false;try{for await(const bytes of preparedEngine.synthesizeStream(text,(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria).voice,{...(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria),volume:'+0%',timeout:20000,signal})){received=true;yield Buffer.from(bytes);}}catch(error){if(received||signal?.aborted)throw error;for await(const bytes of new EdgeTTS({timeout:20000}).synthesizeStream(text,(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria).voice,{...(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria),volume:'+0%',timeout:20000,signal}))yield Buffer.from(bytes);}}
export function rememberAnnouncement(text,audio,profile='maria'){speechCache.set(speechKey(text,profile),Promise.resolve(audio));while(speechCache.size>128)speechCache.delete(speechCache.keys().next().value);}
const speechCache=new Map();
export function synthesizeAnnouncement(text,{profile='maria'}={}){const key=speechKey(text,profile);
 if(speechCache.has(key)){const cached=speechCache.get(key);speechCache.delete(key);speechCache.set(key,cached);return cached;}
 const promise=generateSpeech(text,profile).catch(error=>{if(speechCache.get(key)===promise)speechCache.delete(key);throw error;});speechCache.set(key,promise);while(speechCache.size>128)speechCache.delete(speechCache.keys().next().value);return promise;
}
async function generateSpeech(text,profile){
 const result=await new EdgeTTS({timeout:20000}).generate(text,(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria).voice,{...(SPEECH_PROFILES[profile]||SPEECH_PROFILES.maria),volume:'+0%',timeout:20000});
 const bytes=Buffer.from(result.audio),metadata=await parseBuffer(bytes,{mimeType:'audio/mpeg'},{duration:true}),duration=Math.ceil(metadata.format.duration*1000);
 if(!bytes.length||bytes.length>1500000||!Number.isFinite(duration)||duration<100||duration>60000)throw Error('Invalid speech audio');
 return {bytes,duration};
}
// Synthesis never occupies the episode's game queue. Announcements retain their
// accepted order, share an MP3 and start time, and cannot overlap on the server.
export function createGripAnnouncements({synthesize=synthesizeAnnouncement,now=Date.now,onReady=()=>{},onError=()=>{}}={}){
 const clips=new Map(),pending=[];let working=false,nextStart=0,closed=false;
 const view=c=>({id:c.id,episodeId:c.episodeId,text:c.text,speaker:'María Villegas',voice:ANNOUNCER_VOICE,url:'/api/world/last-grip/announcements/'+c.id+'.mp3',startsAt:c.startsAt,duration:c.duration});
 async function pump(){if(working||closed)return;working=true;try{while(pending.length&&!closed){const m=pending[0];try{const audio=await synthesize(m.text);if(closed)break;const clip={...m,...audio,startsAt:Math.max(now()+150,nextStart)};nextStart=clip.startsAt+clip.duration+150;clips.set(clip.id,clip);while(clips.size>40)clips.delete(clips.keys().next().value);onReady(view(clip));}catch{if(!closed)onError(m);}finally{pending.shift();}}}finally{working=false;}}
 return {get pending(){return pending.length;},canQueue:()=>pending.length<8&&nextStart-now()<120000,
  enqueue(m){if(closed||pending.length>=8||nextStart-now()>=120000)throw Object.assign(Error('Hay varios anuncios en cola. Espera a que María termine de hablar.'),{status:429});pending.push({...m});void pump();},
  get(id){return clips.get(id)||null;},
  live(episodeId){return [...clips.values()].filter(c=>c.episodeId===episodeId&&c.startsAt+c.duration+3000>now()).map(view);},
  close(){closed=true;pending.length=0;clips.clear();}
 };
}
export function serveAnnouncement(req,res,clip){const size=clip.bytes.length;let start=0,end=size-1,status=200;const headers={'Content-Type':'audio/mpeg','Cache-Control':'private, no-store','Accept-Ranges':'bytes','Content-Length':size,'X-Content-Type-Options':'nosniff'};
 if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||!m[1]&&!m[2]){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));end=m[1]&&m[2]?Math.min(size-1,Number(m[2])):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;headers['Content-Length']=end-start+1;}
 res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:clip.bytes.subarray(start,end+1));
}
