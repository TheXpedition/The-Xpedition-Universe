export const gripRoundMusic=(s,{video=false}={})=>!!s?.engaged&&s.phase==='active'&&!!s.round&&!s.paused&&!video;
