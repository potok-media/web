import { defineConfig, build } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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

// PWA (Service Worker) is opt-in via POTOK_PWA=1 — enable it only for production
// deploys (`npm run build:pwa`). Plain `npm run build` ships NO service worker, so
// on-device iteration is always fresh and the cleanup in main.tsx removes any SW
// previously registered on the device.
const PWA_ENABLED = process.env.POTOK_PWA === "1";

// https://vite.dev/config/
export default defineConfig({
  define: {
    __PWA_ENABLED__: JSON.stringify(PWA_ENABLED),
  },
  plugins: [
    react(),
    vitePotokSdkPlugin(),
    ...(PWA_ENABLED ? [VitePWA({
      // No update prompts — TV/WebView containers should refresh silently.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Potok',
        short_name: 'Potok',
        description: 'Potok — фильмы и сериалы',
        lang: 'ru',
        theme_color: '#0f0f12',
        background_color: '#0f0f12',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache the app shell. Chunks are large (media/hls/artplayer ~0.5–0.7 MB).
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // TMDB posters/backdrops — cache across sessions for instant re-render.
            urlPattern: ({ url }) => url.origin === 'https://image.tmdb.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    })] : []),
  ],
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

