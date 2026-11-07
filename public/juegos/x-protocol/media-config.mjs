// The previous bundled intro stays available until the user's optimized
// official clip has actually been uploaded to the public media directory.
// Never switch the live ceremony to a video URL that returns 404.
export const PROTOCOL_MEDIA_LEGACY_INTRO=Object.freeze({
 url:'/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4',
 duration:15070
});
export const PROTOCOL_MEDIA_OFFICIAL_INTRO=Object.freeze({
 url:'/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4',
 duration:14833
});
export function selectProtocolIntro(stored,officialAvailable){
 if(stored?.url&&stored.url!==PROTOCOL_MEDIA_LEGACY_INTRO.url)return stored;
 return officialAvailable?{...PROTOCOL_MEDIA_OFFICIAL_INTRO}:{...(stored||PROTOCOL_MEDIA_LEGACY_INTRO)};
}
export const PROTOCOL_MEDIA_DEFAULTS={
 intro:{...PROTOCOL_MEDIA_LEGACY_INTRO},
 eliminations:{}
};
