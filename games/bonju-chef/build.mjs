import {build} from 'vite';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),stage=path.resolve(root,'.chef-client-stage'),target=path.join(root,'public/juegos/bonju-chef/client');
if(path.dirname(stage)!==path.resolve(root))throw Error('Invalid build workspace.');
// Never empty the directory used by connected players. Publish dependencies
// first, keep previous hashed chunks, then replace the entry point atomically.
await build({configFile:fileURLToPath(new URL('./vite.config.mjs',import.meta.url)),build:{outDir:stage,emptyOutDir:true}});
await fs.mkdir(target,{recursive:true});const names=(await fs.readdir(stage)).sort((a,b)=>(a==='app.js'?2:a==='style.css'?1:0)-(b==='app.js'?2:b==='style.css'?1:0));
for(const name of names){const from=path.join(stage,name);if(!(await fs.stat(from)).isFile())throw Error('Unexpected nested client build.');const dest=path.join(target,name),pending=dest+'.next';await fs.copyFile(from,pending);await fs.rename(pending,dest);}
console.log('Bonju Chef client published without removing active resources.');
