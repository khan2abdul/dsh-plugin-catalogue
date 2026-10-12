// Verify a *hosted* deployment: not just that files exist, but that the host
// serves them with the right caching, compression and routing.
//
//   node tools/verify-hosted.mjs https://dsh-plugin-catalogue.web.app
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node tools/verify-hosted.mjs <base-url>');
  process.exit(1);
}

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const get = (path) => fetch(base + path);

const rootRes = await get('/');
const html = await rootRes.text();
check('root serves the app shell', rootRes.ok && html.includes('id="root"'), `HTTP ${rootRes.status}`);

// The shell names its own hashed assets. Parse them without assuming a leading
// "./" or "/", so this works for a relative or an absolute base, and resolve
// them the way a browser would from the page that served them.
const assetRef = (markup, ext) => {
  for (const m of markup.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (m[1].endsWith(ext)) return m[1];
  }
  return undefined;
};
const resolveFrom = (ref, pagePath = '/') => new URL(ref, base + pagePath).href;

const jsPath = assetRef(html, '.js');
const cssPath = assetRef(html, '.css');
check('shell references hashed assets', !!jsPath && !!cssPath, `${jsPath ?? '?'} / ${cssPath ?? '?'}`);

const jsRes = await fetch(resolveFrom(jsPath));
const js = await jsRes.text();
check('main bundle is served', jsRes.ok && js.length > 500_000, `${(js.length / 1024).toFixed(0)} KB`);

const cssRes = await fetch(resolveFrom(cssPath));
const css = await cssRes.text();
check('stylesheet is served with Harness tokens',
  cssRes.ok && css.includes('--dsw-alias-bg-base') && css.includes('data-ds-dark-theme'));

/* ── caching ─────────────────────────────────────────────────────────────── */
const jsCache = jsRes.headers.get('cache-control') || '';
check('hashed assets are cached immutably', /max-age=31536000/.test(jsCache) && /immutable/.test(jsCache), jsCache);

const indexRes = await get('/index.html');
const indexCache = indexRes.headers.get('cache-control') || '';
check('the shell itself is not cached', /no-cache/.test(indexCache), indexCache);

/* ── content types and compression ───────────────────────────────────────── */
check('stylesheet has the right content type',
  (cssRes.headers.get('content-type') || '').includes('text/css'),
  cssRes.headers.get('content-type') || 'none');

const encoding = rootRes.headers.get('content-encoding');
check('responses are compressed', !!encoding, encoding || 'none reported');

/* ── routing ─────────────────────────────────────────────────────────────── */
const deep = await get('/plugins/dsh-tool-web');
const deepBody = await deep.text();
check('a path deep link falls back to the shell', deep.ok && deepBody.includes('id="root"'), `HTTP ${deep.status}`);

// Returning the shell is not enough: the shell's own asset references must
// resolve to JavaScript *from that path*. With a relative base they resolve
// under /plugins/, the rewrite answers with HTML, the browser refuses the module
// script, and the visitor gets a blank page. Check the real thing.
const deepJs = deepBody.match(/src="([^"]+\.js)"/)?.[1];
check('the deep-link shell references a script', !!deepJs, deepJs || 'none found');
if (deepJs) {
  const resolved = new URL(deepJs, base + '/plugins/dsh-tool-web').href;
  const assetRes = await fetch(resolved);
  const assetBody = await assetRes.text();
  const isHtml = /^\s*<!doctype html|^\s*<html/i.test(assetBody);
  check('a deep-path visit loads real JavaScript, not the HTML shell',
    assetRes.ok && !isHtml,
    `${resolved} -> ${assetRes.headers.get('content-type')}${isHtml ? ' (would render blank)' : ''}`);
}

// The same must hold for any other path a visitor might type.
const oddRes = await get('/some/other/deep/path');
const oddBody = await oddRes.text();
const oddJs = oddBody.match(/src="([^"]+\.js)"/)?.[1];
if (oddJs) {
  const resolved = new URL(oddJs, base + '/some/other/deep/path').href;
  const res = await fetch(resolved);
  const body = await res.text();
  check('an arbitrary path also loads real JavaScript',
    res.ok && !/^\s*<!doctype html|^\s*<html/i.test(body), resolved);
}

const routing = html.includes('data-ds-dark-theme');
check('the pre-paint theme script survived the deploy', routing);

/* ── lazy documentation chunks ───────────────────────────────────────────── */
const chunk = js.match(/(dsh-tool-web-[\w-]+\.js)/)?.[1];
check('documentation chunks are referenced', !!chunk, chunk || 'not found');
if (chunk) {
  const chunkRes = await get('/assets/' + chunk);
  const chunkBody = await chunkRes.text();
  check('a documentation chunk is served', chunkRes.ok && chunkBody.length > 1000,
    `${(chunkBody.length / 1024).toFixed(1)} KB`);
  check('the chunk carries real documentation', /web_search/.test(chunkBody));
}

/* ── 404 behaviour for assets ────────────────────────────────────────────── */
const missing = await get('/assets/definitely-not-here-12345.js');
const missingBody = await missing.text();
check('a missing asset does not crash the host', missing.ok || missing.status === 404,
  `HTTP ${missing.status}${missingBody.includes('id="root"') ? ' (shell fallback)' : ''}`);

console.log('');
const failed = results.filter((r) => !r).length;
console.log(failed === 0
  ? `All ${results.length} hosted-site checks passed for ${base}`
  : `${failed} of ${results.length} hosted-site checks FAILED for ${base}`);
process.exitCode = failed === 0 ? 0 : 1;
