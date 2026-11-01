const absolute=/^\/(?:juegos|api\/world|api\/arcade|api\/conversations|simulator\/ice-breaker|assets|brand|performance\.(?:js|mjs|css)|world-config\.js|auth)(?:[/?#]|$)/;
const literal=/(?<![\\\w./])\/(?:juegos|api\/world|api\/arcade|api\/conversations|simulator\/ice-breaker|assets|brand|performance\.(?:js|mjs|css)|world-config\.js|auth)(?=[/?#\s"'`)>;]|$)/g;
export function roomText(text,prefix){return prefix?text.replace(literal,path=>prefix+path):text;}
export function roomData(value,prefix,key=''){
 if(!prefix)return value;
 if(typeof value==='string')return !['text','message','name','bio','description','question','answer'].includes(key)&&absolute.test(value)?prefix+value:value;
 if(Array.isArray(value))return value.map(item=>roomData(item,prefix,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,roomData(item,prefix,name)]));
 return value;
}
