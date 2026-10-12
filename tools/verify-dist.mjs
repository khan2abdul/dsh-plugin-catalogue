// Verify the production build over HTTP: assets resolve, the shell is intact,
// the documentation chunks load, and deep links fall back to the app shell.
const base = process.argv[2] || 'http://127.0.0.1:4178';

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const html = await (await fetch(`${base}/`)).text();
check('GET / serves the shell', html.includes('id="root"'));
check('shell references hashed assets', /assets\/index-[\w-]+\.js/.test(html));
check('shell applies the stored theme before paint', html.includes('data-ds-dark-theme'));
// Asset paths must be absolute. A relative base breaks every real path: at
// /plugins/x the browser resolves "./assets/x.js" under /plugins/, an SPA rewrite
// answers with HTML, and the module script is refused — a blank page.
check('assets use absolute paths (required for deep links)', /(?:src|href)="\/assets\//.test(html));
check('asset paths are not relative', !/(?:src|href)="\.\/assets\//.test(html));

const js = html.match(/(?:src)="(\/?assets\/[^"]+)"/)?.[1];
const css = html.match(/(?:href)="(\/?assets\/[^"]+)"/)?.[1];

// Resolve exactly as a browser would, so an absolute or relative base both work
// and a leading slash never becomes a double slash.
const url = (ref) => new URL(ref, `${base}/`).href;

const jsRes = await fetch(url(js));
const jsBody = await jsRes.text();
check('main bundle loads', jsRes.ok && jsBody.length > 100000, `${(jsBody.length / 1024).toFixed(0)} KB`);

const cssRes = await fetch(url(css));
const cssBody = await cssRes.text();
check('stylesheet loads', cssRes.ok && cssBody.length > 10000, `${(cssBody.length / 1024).toFixed(0)} KB`);
check('stylesheet carries the Harness tokens', cssBody.includes('--dsw-alias-bg-base') && cssBody.includes('data-ds-dark-theme'));
check('stylesheet carries the site layout', cssBody.includes('.sidebar') && cssBody.includes('.md table'));

// The catalogue content is inlined into the main bundle (metadata) …
check('bundle carries package metadata', jsBody.includes('dsh-tool-web') && jsBody.includes('dsh-client-ui-theme'));
check('bundle carries row configs', jsBody.includes('session-query-sqlite'));

// … while each package's documentation is a separate lazily loaded chunk.
// In the bundle the chunk is referenced relative to the assets directory.
const chunk = jsBody.match(/(dsh-tool-web-[\w-]+\.js)/)?.[1];
check('readme chunks are referenced separately', !!chunk, chunk || 'not found');
if (chunk) {
  const chunkRes = await fetch(url(`assets/${chunk}`));
  const chunkBody = await chunkRes.text();
  check('a documentation chunk loads', chunkRes.ok && chunkBody.length > 1000, `${(chunkBody.length / 1024).toFixed(1)} KB`);
  check('chunk contains real documentation text', /web_search/.test(chunkBody));
}

const deep = await fetch(`${base}/plugins/dsh-tool-web`);
check('deep links fall back to the shell', deep.ok && (await deep.text()).includes('id="root"'));

const missing = await fetch(`${base}/assets/does-not-exist.js`);
check('unknown asset falls back to the shell (SPA)', missing.ok);

console.log('');
const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `All ${results.length} HTTP checks passed.` : `${failed} of ${results.length} HTTP checks FAILED.`);
process.exitCode = failed === 0 ? 0 : 1;
