import { defineConfig, build, type ViteDevServer, type PreviewServer, type Connect } from 'vite'
import type { ServerResponse } from 'http'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve, join, normalize, extname, sep } from 'path'
import { cpSync, existsSync, statSync, readFileSync } from 'fs'
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

      console.log('[vite-plugin-potok-sdk] Copying subtitles-octopus static assets...');
      try {
        const octopusDir = resolve(__dirname, 'node_modules/libass-wasm/dist/js');
        const destDir = resolve(__dirname, 'public/assets/subtitles-octopus');
        cpSync(octopusDir, destDir, { recursive: true });
        console.log('[vite-plugin-potok-sdk] subtitles-octopus static assets copied successfully.');
      } catch (err) {
        console.error('[vite-plugin-potok-sdk] Failed to copy subtitles-octopus static assets:', err);
      }
    },
    configureServer(server: ViteDevServer) {
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

// Forwards client log lines (POST /__clientlog) to THIS server's terminal. Lets us read
// network/header logs from a device (Apple TV / Luxo) that loads the app over LAN via
// `npm run preview`, where the on-device browser console is unreachable. The client side
// is src/utils/clientLogShipper.ts. Debug-only instrumentation — remove when done.
function clientLogToTerminal() {
  const handler = (req: Connect.IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
    let body = '';
    req.on('data', (c: Buffer) => {
      body += c;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        const { level, message } = JSON.parse(body || '{}');
        const line = `[client] ${message}`;
        if (level === 'error') console.error(line);
        else if (level === 'warn') console.warn(line);
        else console.log(line);
      } catch { /* ignore malformed payloads */ }
      res.statusCode = 204;
      res.end();
    });
  };
  const register = (server: ViteDevServer | PreviewServer) => server.middlewares.use('/__clientlog', handler);
  return {
    name: 'potok-client-log',
    configureServer(server: ViteDevServer) { register(server); },
    configurePreviewServer(server: PreviewServer) { register(server); },
  };
}

// Serves the local `dev-plugins/` directory over HTTP at /dev-plugins/ (dev AND preview) so a
// plugin under development can be installed by its plain localhost URL — e.g.
// http://localhost:5173/dev-plugins/card-customizer/ — and loaded directly in the browser with NO
// gateway bundler and NO tunnel (see iframeHelper.ts: same-origin plugins are imported natively,
// with `potok-sdk` resolved via an import map to the SDK already inlined in the iframe). Files are
// served raw with permissive CORS + no-store.
function devPluginsServer() {
  const root = resolve(__dirname, 'dev-plugins');
  // Accept both the clean path and the legacy `__dev-plugins__` alias so existing plugin
  // registrations keep working.
  const PREFIX_RE = /^\/(?:dev-plugins|__dev-plugins__)\//;

  // ES-module shim that a locally-loaded plugin's `import ... from 'potok-sdk'` resolves to (via the
  // import map injected in iframeHelper.ts). Re-exports the SDK already inlined in the iframe as the
  // global `window.PotokSDK`, so no bundler is needed. Served with CORS so the sandboxed (opaque-origin)
  // plugin iframe can fetch it cross-origin.
  const SHIM_PATH = '/__potok_sdk_shim__.js';
  const SHIM_JS = [
    'const S = window.PotokSDK;',
    'export default S;',
    'export const PotokSDK = S;',
    'export const ui = S.ui;',
    'export const http = S.http;',
    'export const storage = S.storage;',
    'export const streams = S.streams;',
    'export const media = S.media;',
    'export const i18n = S.i18n;',
    'export const registerPlugin = S.registerPlugin;',
    'export const registerSource = S.registerSource;',
    'export const registerHomeSection = S.registerHomeSection;',
    'export const registerSlotContribution = S.registerSlotContribution;',
    'export const initPotokSDK = S.initPotokSDK;',
  ].join('\n');

  const MIME: Record<string, string> = {
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.map': 'application/json',
    '.wasm': 'application/wasm',
    '.svg': 'image/svg+xml',
  };
  const handler = (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const rawUrl = req.url || '';
    const path = rawUrl.split('?')[0];
    const prefixMatch = rawUrl.match(PREFIX_RE);
    if (path !== SHIM_PATH && !prefixMatch) return next();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

    if (path === SHIM_PATH) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(SHIM_JS);
    }
    if (!prefixMatch) return next();

    const rel = decodeURIComponent(rawUrl.slice(prefixMatch[0].length).split('?')[0]);
    const filePath = normalize(join(root, rel));
    // Path-traversal guard: the resolved path must stay inside dev-plugins/.
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
    res.end(readFileSync(filePath));
  };
  return {
    name: 'potok-dev-plugins',
    configureServer(server: ViteDevServer) { server.middlewares.use(handler); },
    configurePreviewServer(server: PreviewServer) { server.middlewares.use(handler); },
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
    clientLogToTerminal(),
    devPluginsServer(),
    ...(PWA_ENABLED ? [VitePWA({
      // No update prompts — TV/WebView containers should refresh silently.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Potok',
        short_name: 'Potok',
        description: 'Potok — movies and TV shows',
        lang: 'en',
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
  // Listen on all network interfaces so devices on the home LAN (the TV, phones)
  // can reach the dev/preview server by the host machine's IP — e.g.
  // http://192.168.x.x:4173 — without adb reverse. allowedHosts:true relaxes Vite's
  // host check for arbitrary LAN hostnames (IPs are allowed by default).
  server: {
    host: true,
    // Accept requests with arbitrary Host headers (public tunnels like *.trycloudflare.com,
    // *.ngrok.io) so the dev-plugins served at /__dev-plugins__/ are reachable by the remote
    // gateway bundler. IPs are allowed by default; this covers public hostnames too.
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
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

