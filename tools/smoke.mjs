// Smoke test: validate the generated dataset and the markdown pipeline that the
// site depends on, without needing a browser.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const data = join(root, 'src', 'data');
const readmeDir = join(data, 'readmes');

const plugins = JSON.parse(readFileSync(join(data, 'plugins.json'), 'utf8'));
const presets = JSON.parse(readFileSync(join(data, 'presets.json'), 'utf8'));
const hostRows = JSON.parse(readFileSync(join(data, 'host-rows.json'), 'utf8'));
const guides = JSON.parse(readFileSync(join(data, 'guides.json'), 'utf8'));
const stats = JSON.parse(readFileSync(join(data, 'stats.json'), 'utf8'));

const problems = [];
const check = (label, ok, detail = '') => {
  if (!ok) problems.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

check('plugins.json has 287 packages', plugins.length === 287, String(plugins.length));
check('host-rows.json has 183 rows', hostRows.length === 183, String(hostRows.length));
check('4 agent presets', presets.length === 4, presets.map((p) => p.id).join(','));
check('preset row counts', JSON.stringify(presets.map((p) => p.flatCount)) === '[29,30,6,30]',
  presets.map((p) => `${p.id}=${p.flatCount}`).join(' '));
check('9 authoring guides', guides.length === 9, String(guides.length));

const withReadme = plugins.filter((p) => p.readme);
check('packages with documentation metadata', withReadme.length === 285, String(withReadme.length));

// Every documented package must have a lazily-loadable chunk on disk.
const files = new Set(readdirSync(readmeDir));
const missingFiles = withReadme.filter((p) => !files.has(`${p.name}.md`)).map((p) => p.name);
check('every documented package has a readme chunk', missingFiles.length === 0, missingFiles.slice(0, 5).join(','));

// The markdown pipeline must handle every shipped document.
marked.setOptions({ gfm: true, breaks: false });
let rendered = 0;
let tables = 0;
let codeBlocks = 0;
const renderFailures = [];
for (const name of files) {
  if (!name.endsWith('.md')) continue;
  const md = readFileSync(join(readmeDir, name), 'utf8').replace(/^#\s+@deepseek-ai\/[^\n]*\r?\n+/, '');
  try {
    const html = marked.parse(md, { async: false });
    if (typeof html !== 'string' || html.trim().length === 0) throw new Error('empty render');
    rendered++;
    if (html.includes('<table>')) tables++;
    if (html.includes('<pre>')) codeBlocks++;
  } catch (error) {
    renderFailures.push(`${basename(name)}: ${error.message}`);
  }
}
check('all readmes render to HTML', renderFailures.length === 0, renderFailures.slice(0, 4).join(' | '));
console.log(`      rendered ${rendered} documents, ${tables} with tables, ${codeBlocks} with code blocks`);

// Host-plane invariants, mirroring what the pages assert.
const states = hostRows.reduce((a, r) => ((a[r.state] = (a[r.state] || 0) + 1), a), {});
check('row states match the report', states.enabled === 149 && states.disabled === 25 && states['conditional (!!js)'] === 9,
  JSON.stringify(states));
check('no orphan overrides', hostRows.every((r) => r.layer));
check('stats agree with the data', stats.counts.packagesTotal === 287 && stats.counts.hostRows === 183);

// Rationale coverage: the shipped patches annotate many rows with the reason
// the row exists and how it may be reconfigured.
const withRationale = hostRows.filter((r) => r.rationale && r.rationale.length > 0);
check('patch rationale was captured for a substantial share of rows', withRationale.length >= 70,
  `${withRationale.length} of ${hostRows.length}`);
const ralph = hostRows.find((r) => r.id === 'tool-ralph');
check('a long-form rationale survives intact', !!ralph && ralph.rationale[0].length > 300,
  ralph ? `${ralph.rationale[0].length} chars` : 'not found');

// A representative deep record.
const sample = plugins.find((p) => p.name === 'dsh-tool-web');
check('dsh-tool-web carries its row and config',
  !!sample && sample.rows.length === 1 && sample.rows[0].id === 'tool-web' && sample.rows[0].config !== null,
  sample ? `rows=${sample.rows.length} config=${JSON.stringify(sample.rows[0]?.config)}` : 'not found');
const web = plugins.find((p) => p.name === 'dsh-web');
check('dsh-web carries its row rationale', !!web && web.rows[0]?.rationale.length > 0);

const guidesOk = guides.every((g) => g.markdown.trim().length > 200);
check('guides have substantial content', guidesOk);

// The plain-language layer: every package explained for a general reader.
const withPlain = plugins.filter((p) => p.plain);
check('every package has a plain-language entry', withPlain.length === plugins.length,
  `${withPlain.length} of ${plugins.length}`);
const pluginy = withPlain.filter((p) => p.plain.kind === 'plugin');
check('plugin entries carry pros and cons',
  pluginy.every((p) => p.plain.pros.length >= 2 && p.plain.cons.length >= 1));
check('plugin entries say when to use and when to skip',
  pluginy.every((p) => p.plain.useWhen.length >= 1 && p.plain.skipWhen.length >= 1));
check('every entry has a one-line summary', withPlain.every((p) => p.plain.oneLiner.length > 10));
check('every entry has a plain headline', withPlain.every((p) => p.plain.headline.length > 3));

// Cons must be grounded: either taken from the authors' stated limitations, or
// explicitly recorded as absent. A fabricated-looking con is not detectable
// here, but the placeholder discipline is.
const noLimitPlaceholder = pluginy.filter((p) => p.plain.cons.length === 1 && p.plain.cons[0] === 'No documented limitations.');
check('cons are present everywhere (recorded as absent where undocumented)',
  pluginy.every((p) => p.plain.cons.length >= 1), `${noLimitPlaceholder.length} entries record no documented limitations`);

// Reader-facing text must not leak engineer vocabulary.
const HARD = ['seam', 'ctx', 'cordis', 'loader', 'hmr', 'asar', 'composition', 'schema', 'namespace'];
const leaks = [];
for (const p of withPlain) {
  const pl = p.plain;
  const text = pl.kind === 'library'
    ? `${pl.headline} ${pl.whatItDoes} ${pl.oneLiner}`
    : [pl.headline, pl.whatItDoes, pl.whyYoudCare, pl.oneLiner, ...pl.useWhen, ...pl.skipWhen, ...pl.pros, ...pl.cons].join(' ');
  const lower = text.toLowerCase();
  for (const term of HARD) if (lower.includes(term)) leaks.push(`${p.name}:${term}`);
}
check('no engineer jargon in reader-facing text', leaks.length === 0, leaks.slice(0, 6).join(', '));

const facets = withPlain.reduce((a, p) => {
  if (p.plain.kind !== 'plugin') return a;
  a.effort[p.plain.effort] = (a.effort[p.plain.effort] ?? 0) + 1;
  return a;
}, { effort: {} });
check('effort values are from the fixed set',
  Object.keys(facets.effort).every((e) => ['already on', 'one setting', 'needs a plugin', 'developer task'].includes(e)),
  JSON.stringify(facets.effort));

// Install state is what the homepage is built on: working / can switch on /
// not in this version / internal. It must account for every package exactly once.
const stateOf = (p) => (!p.isPlugin ? 'internal' : !p.mountedAtAll ? 'absent' : p.mounted ? 'working' : 'off');
const installStates = plugins.reduce((a, p) => {
  const s = stateOf(p);
  a[s] = (a[s] ?? 0) + 1;
  return a;
}, {});
const stateSum = Object.values(installStates).reduce((a, b) => a + b, 0);
check('install states account for every package', stateSum === plugins.length, JSON.stringify(installStates));
check('the four state groups are all populated',
  installStates.working > 0 && installStates.off > 0 && installStates.absent > 0 && installStates.internal > 0);
check('the "can switch on" group matches the disabled settings lines',
  installStates.off > 0 && installStates.off <= hostRows.filter((r) => r.state === 'disabled').length + 1,
  `off=${installStates.off} disabledRows=${hostRows.filter((r) => r.state === 'disabled').length}`);

// Every part must be findable by name, which is what a reader searches for.
check('every package exposes a searchable name',
  plugins.every((p) => /^@deepseek-ai\//.test(p.pkg) && p.name.length >= 3),
  plugins.filter((p) => !(p.name.length >= 3)).map((p) => p.name).join(', '));
check('every plugin page will show a name and a headline',
  plugins.every((p) => !!(p.plain?.headline || p.catalogDescription)));

console.log('');
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('All smoke checks passed.');
}
