// Local fallback only. CI/browser acceptance uses infra/docker/nginx.conf.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('build');
const baseUrl = process.env.SITE_BASE_URL ?? '/';
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};
const server = createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(
      new URL(req.url ?? '/', 'http://localhost').pathname,
    );
    if (baseUrl !== '/') {
      if (!name.startsWith(baseUrl)) {
        res.writeHead(404);
        res.end();
        return;
      }
      name = '/' + name.slice(baseUrl.length);
    }
    if (name.includes('..') || name.includes('\\')) {
      res.writeHead(400);
      res.end();
      return;
    }
    const base = path.join(root, name);
    let found: string | undefined;
    for (const candidate of [
      base,
      base + '.html',
      path.join(base, 'index.html'),
    ]) {
      try {
        if ((await stat(candidate)).isFile()) {
          found = candidate;
          break;
        }
      } catch {
        /* Try next static path. */
      }
    }
    const file = found ?? path.join(root, '404.html');
    res.writeHead(found ? 200 : 404, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end('Static server error');
  }
});
server.listen(4173, '127.0.0.1', () =>
  console.log(
    'Local: http://localhost:4173/docs (Node fallback; not Nginx acceptance)',
  ),
);
