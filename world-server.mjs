if(process.env.NODE_ENV==='production'||process.env.WORLD_SERVER_HUB==='true'){
 const {startWorldHub}=await import('./world-hub.mjs'),hub=await startWorldHub();
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void hub.close().then(()=>process.exit(0)));
}else await import('./world-instance.mjs');
