// Serve the production build over HTTP so it can be verified or previewed
// without any dependency. Usage: node tools/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'dist');
const port = Number(process.argv[2] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const target = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!target.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target)] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    // Single-page app: unknown paths fall back to the shell.
    try {
      const body = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${root}`);
  console.log(`http://127.0.0.1:${port}/`);
});
