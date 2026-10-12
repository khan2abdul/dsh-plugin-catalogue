// Independent quality check on the plain-language layer: coverage, field shape,
// and — most importantly — whether any engineer jargon leaked into reader-facing
// text. Run after merge-plain.cjs.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const plugins = JSON.parse(fs.readFileSync(path.join(SITE, 'src', 'data', 'plugins.json'), 'utf8'));

const BANNED = [
  'seam', 'ctx', 'cordis', 'loader', 'hmr', 'asar', 'composition', 'provider registry',
  'schema', 'middleware', 'idempotent', 'orchestrat', 'namespace',
];
// Words that are jargon when used as nouns about the system, but are ordinary
// English inside expressions like "nothing to configure".
const SOFT = [
  { term: 'config', re: /\bconfig\b/i },
  { term: 'patch', re: /\bpatch/i },
  { term: 'row', re: /\brows?\b/i },
  { term: 'bundle', re: /\bbundle/i },
  { term: 'preset', re: /\bpreset/i },
  { term: 'subagent', re: /\bsub-?agents?\b/i },
  { term: 'sandbox', re: /\bsandbox/i },
  { term: 'API', re: /\bAPIs?\b/ },
  { term: 'registry', re: /\bregistr/i },
  { term: 'LLM', re: /\bLLM\b/ },
  { term: 'token', re: /\btokens?\b/i },
];

const problems = [];
const jargon = [];
let counted = 0;

function readerText(p) {
  const pl = p.plain;
  if (!pl) return '';
  if (pl.kind === 'library') return [pl.headline, pl.whatItDoes, pl.oneLiner].join(' \u0001 ');
  return [
    pl.headline, pl.whatItDoes, pl.whyYoudCare, pl.oneLiner,
    ...pl.useWhen, ...pl.skipWhen, ...pl.pros, ...pl.cons,
  ].join(' \u0001 ');
}

for (const p of plugins) {
  const pl = p.plain;
  if (!pl) {
    problems.push(`${p.name}: no plain entry`);
    continue;
  }
  counted++;

  const required = pl.kind === 'library'
    ? ['headline', 'whatItDoes', 'oneLiner', 'bestFor', 'safeToIgnore']
    : ['headline', 'icon', 'whatItDoes', 'whyYoudCare', 'useWhen', 'skipWhen', 'pros', 'cons', 'effort', 'bestFor', 'safeToIgnore', 'oneLiner'];
  for (const key of required) {
    if (pl[key] === undefined || pl[key] === null || pl[key] === '') problems.push(`${p.name}: missing ${key}`);
  }
  if (pl.kind === 'plugin') {
    if (pl.pros.length < 2) problems.push(`${p.name}: fewer than 2 pros`);
    if (pl.cons.length < 1) problems.push(`${p.name}: no cons`);
    if (pl.useWhen.length < 1) problems.push(`${p.name}: no useWhen`);
    if (pl.skipWhen.length < 1) problems.push(`${p.name}: no skipWhen`);
    if (pl.whyYoudCare.length > 200) problems.push(`${p.name}: whyYoudCare too long (${pl.whyYoudCare.length})`);
  }

  const text = readerText(p);
  const lower = text.toLowerCase();
  // Banned anywhere, including inside longer words.
  for (const term of BANNED) {
    const at = lower.indexOf(term);
    if (at >= 0) {
      jargon.push({ name: p.name, term, hard: true, snippet: text.slice(Math.max(0, at - 60), at + 60).replace(/\u0001/g, ' / ') });
    }
  }
  // Soft terms are fine in some contexts; report them with context for review.
  for (const { term, re } of SOFT) {
    const m = re.exec(text);
    if (m) {
      jargon.push({
        name: p.name, term, hard: false,
        snippet: text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\u0001/g, ' / '),
      });
    }
  }
}

const hard = jargon.filter((j) => j.hard);
const soft = jargon.filter((j) => !j.hard);

const counts = (key) => plugins.reduce((acc, p) => {
  const v = p.plain && p.plain[key];
  if (Array.isArray(v)) for (const item of v) acc[item] = (acc[item] ?? 0) + 1;
  else if (typeof v === 'string') acc[v] = (acc[v] ?? 0) + 1;
  return acc;
}, {});

console.log(`plain entries: ${counted} of ${plugins.length}`);
console.log(`problems: ${problems.length}`);
for (const p of problems.slice(0, 20)) console.log(`  - ${p}`);
console.log('');
console.log(`hard jargon hits: ${hard.length}`);
const byTerm = hard.reduce((a, j) => ((a[j.term] = (a[j.term] ?? 0) + 1), a), {});
for (const [term, n] of Object.entries(byTerm).sort((a, b) => b[1] - a[1])) console.log(`  ${term}: ${n}`);
console.log('');
console.log(`soft terms to review: ${soft.length}`);
const softByTerm = soft.reduce((a, j) => ((a[j.term] = (a[j.term] ?? 0) + 1), a), {});
for (const [term, n] of Object.entries(softByTerm).sort((a, b) => b[1] - a[1])) console.log(`  ${term}: ${n}`);
if (soft.length) {
  console.log('');
  console.log('examples:');
  for (const j of soft.slice(0, 12)) console.log(`  ${j.name} → "${j.term}"`);
}
console.log('');
console.log('effort:', JSON.stringify(counts('effort')));
console.log('bestFor:', JSON.stringify(counts('bestFor')));
console.log('safeToIgnore true:', plugins.filter((p) => p.plain && p.plain.safeToIgnore).length);

fs.writeFileSync(path.join(SITE, '.work', 'plain-quality.json'),
  JSON.stringify({ counted, problems, hard, soft }, null, 1), 'utf8');

process.exitCode = problems.length === 0 && hard.length === 0 ? 0 : 1;
