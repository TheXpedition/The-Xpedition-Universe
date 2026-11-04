import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',publicDir:false,build:{minify:'terser',terserOptions:{compress:{passes:2},format:{comments:false}},target:'es2022',outDir:fileURLToPath(new URL('../../public/juegos/bonju-chef/client',import.meta.url)),emptyOutDir:true,lib:{entry:fileURLToPath(new URL('./main.ts',import.meta.url)),formats:['es'],fileName:()=> 'app.js',cssFileName:'style'},rollupOptions:{output:{manualChunks:{phaser:['phaser']}}},chunkSizeWarningLimit:1600}});
