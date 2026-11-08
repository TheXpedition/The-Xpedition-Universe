const serverPath=pathname=>String(pathname||'').match(/^\/world-play\/servers\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}(?=\/|$)/i)?.[0]||'';

export function worldApiPath(path,pathname=globalThis.location?.pathname){
 const suffix=String(path||'').replace(/^\/+/, '').replace(/^api\//,'');
 return serverPath(pathname)+['','api',suffix].join('/');
}

export function worldSocketPath(path,pathname=globalThis.location?.pathname){
 const suffix=String(path||'').replace(/^\/+/, '').replace(/^api\//,'');
 return serverPath(pathname)+['','api',suffix].join('/');
}
