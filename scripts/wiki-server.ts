import type { Connect, Plugin } from 'vite';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.pf_fragment': 'application/octet-stream',
  '.pf_index': 'application/octet-stream', '.pf_meta': 'application/octet-stream',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
};

function serveWiki(root: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/wiki') {
      res.writeHead(301, { Location: `/wiki/${url.search}` });
      res.end();
      return;
    }
    if (!url.pathname.startsWith('/wiki/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
    let path: string;
    try { path = resolve(root, decodeURIComponent(url.pathname.slice('/wiki/'.length))); }
    catch { res.statusCode = 400; res.end(); return; }
    if (path !== root && !path.startsWith(root + sep)) { res.statusCode = 403; res.end(); return; }
    let status = 200;
    try {
      if (statSync(path).isDirectory()) path = resolve(path, 'index.html');
      statSync(path);
    } catch { status = 404; path = resolve(root, '404.html'); }
    try {
      res.writeHead(status, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(path));
    } catch { res.statusCode = 404; res.end('Documentation has not been built. Run npm run build:wiki.'); }
  };
}

/** Build the wiki. Returns true if successful, false if wiki/dist is already up to date and SKIP_WIKI_BUILD is set. */
function tryBuildWiki(wiki: string): boolean {
  if (process.env.SKIP_WIKI_BUILD === '1' && existsSync(resolve(wiki, 'dist', 'index.html'))) {
    return true;
  }
  try {
    const astroCli = resolve(wiki, 'node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');
    execFileSync(astroCli, ['build'], { cwd: wiki, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/** Serve the built docs in development too, including their real Pagefind search index. */
export function wikiServer(webRoot: string): Plugin {
  const wiki = resolve(webRoot, 'wiki');
  const generatedComponentRoots = [
    resolve(wiki, 'src/content/docs/components'),
    resolve(wiki, 'src/content/docs/en/components'),
  ];
  return {
    name: 'potok-wiki',
    configureServer(server) {
      try {
        execFileSync(process.execPath, [resolve(wiki, 'scripts/gen-components.mjs')], { stdio: 'inherit' });
      } catch { /* gen-components is optional */ }

      if (!tryBuildWiki(wiki)) {
        server.config.logger.warn('Wiki build failed, serving pre-built wiki/dist if available');
      }
      server.middlewares.use(serveWiki(resolve(wiki, 'dist')));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const scheduleBuild = (path: string) => {
        if (!path.startsWith(resolve(wiki, 'src')) && path !== resolve(wiki, 'astro.config.mjs') && path !== resolve(wiki, 'component-groups.mjs') && path !== resolve(wiki, 'scripts/gen-components.mjs') && path !== resolve(webRoot, 'src/pages/wiki/docs-metadata.json') && !/src\/i18n\/locales\/(?:ru|en)\.json$/.test(path)) return;
        // Generated component references are rebuilt as part of this operation.
        // Ignore both their files and directory events so the generator cannot trigger itself.
        if (generatedComponentRoots.some((root) => path === root || path.startsWith(root + sep))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            execFileSync(process.execPath, [resolve(wiki, 'scripts/gen-components.mjs')], { stdio: 'inherit' });
            if (!tryBuildWiki(wiki)) {
              server.config.logger.error(`Wiki rebuild failed.`);
            }
            server.ws.send({ type: 'full-reload', path: '/wiki/*' });
          } catch (error) { server.config.logger.error(`Wiki rebuild failed: ${String(error)}`); }
        }, 200);
      };
      server.watcher.add(resolve(wiki, 'src'));
      server.watcher.on('all', (_event, path) => scheduleBuild(path));
      server.httpServer?.once('close', () => { clearTimeout(timer); });
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveWiki(resolve(webRoot, 'dist/wiki')));
    },
  };
}
