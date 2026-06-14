import { defineConfig, build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync } from 'fs'
import { execSync } from 'child_process'


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
    configurePreviewServer() {
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

