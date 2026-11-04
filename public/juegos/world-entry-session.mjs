const memory=new Map();
function storageFor(options){if('storage'in options)return options.storage;try{return globalThis.window?.sessionStorage;}catch{return null;}}
function scopeFor(options){const pathname=options.pathname??globalThis.location?.pathname??'';return pathname.match(/^(.*\/servers\/[0-9a-f-]{36})(?:\/|$)/i)?.[1]||globalThis.window?.XpeditionWorldServer?.id||'world';}
function read(storage,key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
function write(storage,key,value){memory.set(key,value);try{storage?.setItem(key,JSON.stringify(value));}catch{}}
function entry(options){const storage=storageFor(options),key='xp-world-visit:'+scopeFor(options);let value=read(storage,key)||memory.get(key);if(!value?.id){value={id:globalThis.crypto?.randomUUID?.()||Date.now()+':'+Math.random(),completed:[]};write(storage,key,value);}return {storage,key,value};}
// Called only at the explicit server entrance, never by an internal menu or a challenge return.
export function beginWorldVisit(options={}){const storage=storageFor(options),key='xp-world-visit:'+scopeFor(options),value={id:globalThis.crypto?.randomUUID?.()||Date.now()+':'+Math.random(),completed:[]};write(storage,key,value);return value.id;}
export function introVisit(config,options={}){const {storage,key,value}=entry(options),identity=(options.userId||'local')+'|'+(config?.version||config?.url||'intro');return {id:value.id+':'+identity,completed:config?.seen!==false&&value.completed.includes(identity),complete(){const current=read(storage,key)||memory.get(key);if(current?.id!==value.id)return;current.completed=[...new Set([...current.completed,identity])];write(storage,key,current);}};}
