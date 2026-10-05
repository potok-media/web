import type { Connect, Plugin } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
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

/** Serve the built docs in development too, including their real Pagefind search index. */
export function wikiServer(webRoot: string): Plugin {
  const wiki = resolve(webRoot, 'wiki');
  const build = () => execFileSync(process.execPath, [resolve(wiki, 'node_modules/astro/astro.js'), 'build'], { cwd: wiki, stdio: 'inherit' });
  return {
    name: 'potok-wiki',
    configureServer(server) {
      execFileSync(process.execPath, [resolve(wiki, 'scripts/gen-components.mjs')], { stdio: 'inherit' });
      build();
      server.middlewares.use(serveWiki(resolve(wiki, 'dist')));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const scheduleBuild = (path: string) => {
        if (!path.startsWith(resolve(wiki, 'src')) && path !== resolve(wiki, 'astro.config.mjs') && path !== resolve(wiki, 'component-groups.mjs') && path !== resolve(wiki, 'scripts/gen-components.mjs') && path !== resolve(webRoot, 'src/pages/wiki/docs-metadata.json') && !/src\/i18n\/locales\/(?:ru|en)\.json$/.test(path)) return;
        // Generated files are rebuilt as part of this operation, never watched recursively.
        if (/\/components\/.*\.md$/.test(path)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            execFileSync(process.execPath, [resolve(wiki, 'scripts/gen-components.mjs')], { stdio: 'inherit' });
            build();
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
