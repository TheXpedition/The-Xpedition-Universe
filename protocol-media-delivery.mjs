// Only bundled public video may be offloaded to an optional CDN. Custom
// STAFF uploads keep their authenticated /api paths and never become public.
const publicClip=/^\/juegos\/x-protocol\/media\/[a-z0-9][a-z0-9._-]*\.(?:mp4|webm)$/i;
export function protocolDeliveryMedia(media,origin=process.env.PROTOCOL_MEDIA_CDN_ORIGIN){
 if(!media?.url||!origin||!publicClip.test(media.url))return media;
 try{
  const base=new URL(origin);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')return media;
  return {...media,url:new URL(media.url,base).href,fallbackUrl:media.url};
 }catch{return media;}
}
