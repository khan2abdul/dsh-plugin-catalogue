// Merge the plain-language entries written by the batch writers into the site
// dataset, validating every field first so a bad batch is reported rather than
// silently shipped.
const fs = require('fs');
const path = require('path');

const SITE = path.resolve(__dirname, '..');
const WORK = path.join(SITE, '.work');
const PLAIN_DIR = path.join(WORK, 'plain');
const DATA = path.join(SITE, 'src', 'data');

const batches = JSON.parse(fs.readFileSync(path.join(WORK, 'batches.json'), 'utf8'));
const plugins = JSON.parse(fs.readFileSync(path.join(DATA, 'plugins.json'), 'utf8'));
const flagsPath = path.join(WORK, 'package-flags.json');
const flags = fs.existsSync(flagsPath) ? JSON.parse(fs.readFileSync(flagsPath, 'utf8')) : {};
const byName = new Map(plugins.map((p) => [p.name, p]));
const expected = new Map();
for (const b of batches) for (const n of b.packages) expected.set(n, b);

const ICONS = new Set(['globe', 'shield', 'wrench', 'plug', 'robot', 'folder', 'terminal', 'chart', 'lock', 'sparkles', 'layers', 'book', 'bell', 'search', 'users', 'box', 'clock', 'database', 'eye', 'message']);
const EFFORTS = ['already on', 'one setting', 'needs a plugin', 'developer task'];
const AUDIENCES = ['everyone', 'power users', 'admins', 'developers'];

const warnings = [];
const errors = [];
const merged = new Map();

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Reader-facing prose only. Every rule is a deliberate translation of an
// engineer word into the phrasing the rest of the site uses; none of them touch
// package names, status values or the technical half of a page. Longer phrases
// come first so they win over the bare word.
const POLISH = [
  [/\bagent presets\b/gi, 'session setups'],
  [/\bagent preset\b/gi, 'session setup'],
  [/\bpresets\b/g, 'session setups'],
  [/\bPresets\b/g, 'Session setups'],
  [/\bpreset\b/g, 'session setup'],
  [/\bPreset\b/g, 'Session setup'],
  [/\bsettings rows\b/gi, 'settings'],
  [/\bsettings row\b/gi, 'setting'],
  [/\bAPI keys\b/g, 'access keys'],
  [/\bAPI key\b/g, 'access key'],
  [/\bsubagents\b/g, 'helpers'],
  [/\bsubagent\b/g, 'helper'],
  [/\bout of tokens\b/gi, 'out of room'],
  [/\btoken budget\b/gi, 'text budget'],
  [/\btoken use\b/gi, 'text use'],
  [/\bnot tokens\b/gi, 'not text length'],
  [/\btokens were saved\b/gi, 'text was saved'],
  [/\bfirst token\b/gi, 'first word of the reply'],
  [/\bexact token count\b/gi, 'exact length'],
  [/\btoken estimates\b/gi, 'length estimates'],
  [/\bhow many tokens\b/gi, 'how much text'],
  [/\bschemas\b/gi, 'type descriptions'],
  [/\bschema\b/gi, 'type description'],
  [/\bregistry of\b/gi, 'list of'],
];

function polish(text) {
  let out = str(text);
  for (const [re, to] of POLISH) out = out.replace(re, to);
  return out;
}
const polishList = (arr) => arr.map(polish);
function clamp(text, max, label) {
  const s = str(text);
  if (s.length <= max) return s;
  warnings.push(`${label}: ${s.length} chars, truncated to ${max}`);
  return s.slice(0, max).replace(/\s+\S*$/, '');
}
function list(value, { label, max = 5, min = 1, itemMax = 130, fallback }) {
  let arr = Array.isArray(value) ? value : value ? [value] : [];
  arr = arr.map((v) => clamp(v, itemMax, `${label} item`)).filter((v) => v.length > 0);
  if (arr.length > max) {
    warnings.push(`${label}: ${arr.length} items, trimmed to ${max}`);
    arr = arr.slice(0, max);
  }
  if (arr.length < min) {
    warnings.push(`${label}: needed ${min}+ items, got ${arr.length} — using fallback`);
    arr = fallback;
  }
  return arr;
}

let filesFound = 0;
const seenBatches = new Set();

for (const b of batches) {
  const file = path.join(PLAIN_DIR, b.id + '.json');
  if (!fs.existsSync(file)) {
    errors.push(`batch ${b.id}: output file missing`);
    continue;
  }
  filesFound++;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`batch ${b.id}: invalid JSON — ${e.message}`);
    continue;
  }
  if (!Array.isArray(parsed)) {
    errors.push(`batch ${b.id}: expected a JSON array`);
    continue;
  }
  const found = new Set(parsed.map((e) => str(e && e.name)));
  for (const want of b.packages) if (!found.has(want)) errors.push(`batch ${b.id}: missing entry for ${want}`);
  seenBatches.add(b.id);

  for (const entry of parsed) {
    const name = str(entry && entry.name);
    if (!name || !expected.has(name)) {
      errors.push(`batch ${b.id}: unexpected package "${name}"`);
      continue;
    }
    const meta = byName.get(name);
    const isLib = !meta.isPlugin || b.kind === 'library';

    const base = {
      headline: polish(clamp(entry.headline, 48, `${name}.headline`)),
      oneLiner: polish(clamp(entry.oneLiner, 95, `${name}.oneLiner`)),
      bestFor: list(entry.bestFor, { label: `${name}.bestFor`, max: 2, itemMax: 20, fallback: [isLib ? 'developers' : 'everyone'] })
        .map((v) => (AUDIENCES.includes(v) ? v : (warnings.push(`${name}.bestFor: unknown value "${v}"`), 'everyone'))),
      safeToIgnore: entry.safeToIgnore === true,
    };

    if (isLib) {
      // Some "libraries" are really installable add-on packs (they ship a bundle
      // patch). Saying "nothing to configure" about those would be misleading.
      const isPack = !!(flags[name] && flags[name].isBundle);
      merged.set(name, {
        kind: 'library',
        ...base,
        bestFor: ['developers'],
        safeToIgnore: true,
        isPack,
        whatItDoes: polish(clamp(entry.whatItDoes, 220, `${name}.whatItDoes`)),
      });
      continue;
    }

    let effort = str(entry.effort);
    if (!EFFORTS.includes(effort)) {
      warnings.push(`${name}.effort: unknown value "${effort}" — defaulted`);
      effort = 'needs a plugin';
    }

    merged.set(name, {
      kind: 'plugin',
      ...base,
      icon: ICONS.has(str(entry.icon)) ? str(entry.icon) : 'box',
      whatItDoes: polish(clamp(entry.whatItDoes, 260, `${name}.whatItDoes`)),
      whyYoudCare: polish(clamp(entry.whyYoudCare, 200, `${name}.whyYoudCare`)),
      useWhen: polishList(list(entry.useWhen, { label: `${name}.useWhen`, max: 3, min: 1, itemMax: 120, fallback: ['See the technical details for how this is used.'] })),
      skipWhen: polishList(list(entry.skipWhen, { label: `${name}.skipWhen`, max: 3, min: 1, itemMax: 120, fallback: ['Nothing documented against using it.'] })),
      pros: polishList(list(entry.pros, { label: `${name}.pros`, max: 5, min: 2, itemMax: 110, fallback: ['Documented as useful by its authors.'] })),
      cons: polishList(list(entry.cons, { label: `${name}.cons`, max: 5, min: 1, itemMax: 130, fallback: ['No documented limitations.'] })),
      effort,
    });
  }
}

// Attach to the dataset.
let attached = 0;
for (const p of plugins) {
  const plain = merged.get(p.name);
  if (plain) {
    p.plain = plain;
    attached++;
  }
}
fs.writeFileSync(path.join(DATA, 'plugins.json'), JSON.stringify(plugins), 'utf8');

const missing = [...expected.keys()].filter((n) => !merged.has(n));
const summary = {
  batches: batches.length,
  filesFound,
  entries: merged.size,
  attached,
  missingCount: missing.length,
  missing: missing.slice(0, 40),
  warnings: warnings.length,
  errors: errors.length,
};
fs.writeFileSync(path.join(WORK, 'merge-report.json'), JSON.stringify({ ...summary, warningList: warnings, errorList: errors }, null, 1), 'utf8');

console.log(`batches: ${filesFound}/${batches.length} files found`);
console.log(`entries merged: ${merged.size} of ${expected.size} expected (attached to ${attached} packages)`);
if (missing.length) console.log(`missing: ${missing.length} → ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ' …' : ''}`);
if (warnings.length) console.log(`warnings: ${warnings.length} (see .work/merge-report.json)`);
if (errors.length) {
  console.log(`errors: ${errors.length}`);
  for (const e of errors.slice(0, 12)) console.log(`  - ${e}`);
}
console.log(`report: ${path.join(WORK, 'merge-report.json')}`);
