import { defineConfig, build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync } from 'fs'
import { execSync } from 'child_process'

function potokLogMiddleware(req: any, res: any, next: any) {
  if (req.url === '/api/potok-log' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.warn(`\n\x1b[41m\x1b[37m[FPS DROP DETECTED]\x1b[0m \x1b[33mFPS dropped to ${data.fps} at ${data.time}\x1b[0m`);
        console.warn('Recent activities (preceding 2s):');
        if (data.activities && Array.isArray(data.activities)) {
          data.activities.slice().reverse().forEach((act: any) => {
            let color = '\x1b[36m'; // cyan
            if (act.type === 'longtask') color = '\x1b[31m'; // red
            else if (act.type === 'render') color = '\x1b[32m'; // green
            else if (act.type === 'scroll' || act.type === 'keydown') color = '\x1b[33m'; // yellow
            else if (act.type === 'route') color = '\x1b[35m'; // magenta
            
            console.log(`  [${act.time}] ${color}[${act.type.toUpperCase()}]\x1b[0m ${act.description}`);
          });
        }
        console.warn('\n');
      } catch (err) {
        console.error('Failed to parse FPS drop log:', err);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  } else {
    next();
  }
}

function vitePotokSdkPlugin() {
  return {
    name: 'vite-plugin-potok-sdk',
    async buildStart() {
      console.log('[vite-plugin-potok-sdk] Generating SDK documentation...');
      try {
        execSync('node scripts/document-sdk.js', { stdio: 'inherit' });
      } catch (err) {
        console.error('[vite-plugin-potok-sdk] Failed to generate documentation:', err);
      }

      console.log('[vite-plugin-potok-sdk] Compiling SDK...');
      try {
        await build({
          configFile: resolve(__dirname, 'src/sdk/vite.config.ts'),
        });
        console.log('[vite-plugin-potok-sdk] SDK compiled successfully.');
      } catch (err) {
        console.error('[vite-plugin-potok-sdk] SDK compilation failed:', err);
      }

      console.log('[vite-plugin-potok-sdk] Copying Lucide static icons...');
      try {
        const lucideStaticDir = resolve(__dirname, 'node_modules/lucide-static/icons');
        const destDir = resolve(__dirname, 'public/assets/icons');
        cpSync(lucideStaticDir, destDir, { recursive: true });
        console.log('[vite-plugin-potok-sdk] Lucide static icons copied successfully.');
      } catch (err) {
        console.error('[vite-plugin-potok-sdk] Failed to copy lucide-static icons:', err);
      }
    },
    configureServer(server: any) {
      server.middlewares.use(potokLogMiddleware);

      const sdkDir = resolve(__dirname, 'src/sdk');
      server.watcher.add(sdkDir);
      server.watcher.on('change', async (file: string) => {
        if (file.startsWith(sdkDir)) {
          console.log(`[vite-plugin-potok-sdk] Change detected in SDK: ${file}, rebuilding...`);
          try {
            console.log('[vite-plugin-potok-sdk] Re-generating SDK documentation...');
            execSync('node scripts/document-sdk.js', { stdio: 'inherit' });

            await build({
              configFile: resolve(__dirname, 'src/sdk/vite.config.ts'),
            });
            console.log('[vite-plugin-potok-sdk] SDK rebuilt successfully.');
            
            const rawSdkModule = server.moduleGraph.getModuleById(resolve(__dirname, 'public/sdk/potok-sdk.js?raw'));
            const sdkModule = server.moduleGraph.getModuleById(resolve(__dirname, 'public/sdk/potok-sdk.js'));
            
            if (rawSdkModule) {
              server.moduleGraph.invalidateModule(rawSdkModule);
            }
            if (sdkModule) {
              server.moduleGraph.invalidateModule(sdkModule);
            }
            
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });
          } catch (err) {
            console.error('[vite-plugin-potok-sdk] SDK build failed:', err);
          }
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(potokLogMiddleware);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vitePotokSdkPlugin()],
  resolve: {
    alias: {
      '@potok/sdk-types': resolve(__dirname, './src/sdk/src/types.ts')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('hls.js')) {
            return 'hls-vendor';
          }
          if (id.includes('artplayer')) {
            return 'artplayer-vendor';
          }
        }
      }
    }
  }
})

