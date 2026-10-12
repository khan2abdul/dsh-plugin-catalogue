// Verify the running Vite dev server: shell, entry module, styles, data and the
// on-demand markdown chunks. Dev mode serves untransformed paths, not hashed
// build assets, so this checks a different surface than verify-dist.mjs.
const base = process.argv[2] || 'http://localhost:5273';

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function get(path) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, ok: res.ok, body: await res.text() };
}

const shell = await get('/');
check('dev server serves the shell', shell.ok && shell.body.includes('id="root"'));
check('shell loads the real entry module', shell.body.includes('/src/main.tsx'));
check('shell applies the stored theme before paint', shell.body.includes('data-ds-dark-theme'));

const vite = await get('/@vite/client');
check('Vite HMR client is served', vite.ok && vite.body.includes('createHotContext'));

const main = await get('/src/main.tsx');
check('entry module transforms', main.ok && /import\s|createRoot/.test(main.body), `${(main.body.length / 1024).toFixed(1)} KB`);

const app = await get('/src/App.tsx');
check('App module transforms', app.ok && app.body.includes('PluginDetail'));

const css = await get('/src/styles/site.css');
check('site stylesheet is served', css.ok, `${(css.body.length / 1024).toFixed(1)} KB`);
check('stylesheet carries Harness tokens', css.body.includes('--dsw-alias-bg-base'));

const tokens = await get('/src/styles/dsh/design-platform.css');
check('shipped Harness token stylesheet is served', tokens.ok && tokens.body.includes('data-ds-dark-theme'));

const data = await get('/src/data/plugins.json');
let pluginCount = 0;
try {
  pluginCount = JSON.parse(data.body).length;
} catch {
  /* leave at 0 */
}
check('package dataset is served and parses', data.ok && pluginCount === 287, `${pluginCount} records`);
check('dataset carries mount facts', data.body.includes('session-query-sqlite'));

const chunk = await get('/src/data/readmes/dsh-tool-web.md?raw');
check('a markdown chunk loads on demand', chunk.ok && chunk.body.length > 2000, `${(chunk.body.length / 1024).toFixed(1)} KB`);
check('markdown chunk contains real documentation', /web_search/.test(chunk.body));

const deep = await get('/plugins/dsh-tool-web');
check('deep links fall back to the shell', deep.ok && deep.body.includes('id="root"'));

console.log('');
const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `All ${results.length} dev checks passed.` : `${failed} of ${results.length} dev checks FAILED.`);
process.exitCode = failed === 0 ? 0 : 1;
