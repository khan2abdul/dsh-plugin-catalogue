// Diagnose a blank page on a hosted deployment: compare what the host serves
// with what the local build contains, and report anything that would stop the
// module graph from executing.
//
//   node tools/diagnose-hosted.mjs https://example.web.app [local-dist-dir]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.argv[2] || '').replace(/\/$/, '');
const dist = process.argv[3] || join(process.cwd(), 'dist');
if (!base) {
  console.error('usage: node tools/diagnose-hosted.mjs <base-url> [dist-dir]');
  process.exit(1);
}

const res = await fetch(base + '/');
const html = await res.text();

console.log('── shell ─────────────────────────────────────────────');
console.log('status       :', res.status);
console.log('content-type :', res.headers.get('content-type'));
console.log('bytes        :', html.length);
console.log('has #root    :', /id="root"/.test(html));

const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
console.log('referenced   :', refs.join('\n               '));

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
console.log('inline scripts:', inline.length);

console.log('\n── referenced assets as the host serves them ─────────');
for (const ref of refs) {
  const url = ref.startsWith('http') ? ref : new URL(ref, base + '/').href;
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  const head = buf.subarray(0, 80).toString('utf8').replace(/\s+/g, ' ');
  const looksHtml = /^\s*<!doctype html|^\s*<html/i.test(head);
  console.log(`${r.status}  ${(buf.length / 1024).toFixed(0).padStart(6)} KB  ${r.headers.get('content-type')}`);
  console.log(`      ${url}`);
  console.log(`      first bytes: ${head.slice(0, 70)}`);
  if (looksHtml && /\.js$/.test(url)) console.log('      !! JS request returned HTML — the rewrite is swallowing assets');
}

console.log('\n── local vs deployed ─────────────────────────────────');
if (existsSync(dist)) {
  const localIndex = readFileSync(join(dist, 'index.html'), 'utf8');
  console.log('local index.html identical to deployed :', localIndex.trim() === html.trim());
  const localAssets = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
  console.log('local assets                           :', localAssets.length);
  for (const ref of refs) {
    const name = ref.split('/').pop();
    if (!name || !name.endsWith('.js')) continue;
    const localPath = join(dist, 'assets', name);
    if (!existsSync(localPath)) {
      console.log(`MISSING LOCALLY: ${name} — the deployed shell references an asset the build does not contain`);
      continue;
    }
    const local = readFileSync(localPath);
    const remote = Buffer.from(await (await fetch(new URL(ref, base + '/').href)).arrayBuffer());
    console.log(`${name}: local ${local.length} B, deployed ${remote.length} B, identical ${local.equals(remote)}`);
  }
} else {
  console.log('no local dist at', dist);
}

console.log('\n── anything that would break module execution ────────');
const jsRef = refs.find((r) => /assets\/index-.*\.js$/.test(r));
if (jsRef) {
  const js = await (await fetch(new URL(jsRef, base + '/').href)).text();
  const checks = {
    'has react runtime': /react/i.test(js.slice(0, 20000)),
    'has createRoot call': /createRoot/.test(js),
    'mentions #root guard': /is missing from index\.html/.test(js),
    'top-level await present': /(^|\})await\s/.test(js.slice(0, 4000)),
    'ends with sourceMappingURL': /sourceMappingURL/.test(js.slice(-200)),
    'has document/window refs': /document\.|window\./.test(js),
  };
  for (const [k, v] of Object.entries(checks)) console.log(`${v ? 'yes' : 'no '}  ${k}`);
}
