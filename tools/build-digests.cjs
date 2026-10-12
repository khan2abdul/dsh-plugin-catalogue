// Build per-package digests for the plain-language rewrite.
//
// Each digest carries only decision-relevant source material — the package's own
// summary, its "when to choose it" guidance, its stated limitations, its live row
// config and the patch rationale — so a writer can produce why/how/when and
// pros/cons without inventing anything.
const fs = require('fs');
const path = require('path');

// Anchor to this file so the script runs from any working directory.
const SITE = path.resolve(__dirname, '..');
const WS = path.resolve(SITE, '..');
const WORK = path.join(SITE, '.work');
const DOCS = path.join(WS, 'dsh-plugins', 'docs');

const plugins = JSON.parse(fs.readFileSync(path.join(SITE, 'src', 'data', 'plugins.json'), 'utf8'));

const DIGEST_DIR = path.join(WORK, 'digests');
const TASK_DIR = path.join(WORK, 'tasks');
const PLAIN_DIR = path.join(WORK, 'plain');
for (const d of [DIGEST_DIR, TASK_DIR, PLAIN_DIR]) fs.mkdirSync(d, { recursive: true });

const cap = (text, n) => {
  if (!text) return '';
  const t = text.replace(/\s+\n/g, '\n').trim();
  return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + ' …';
};

// ── split a README into titled sections ─────────────────────────────────────
function sections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let current = null;
  for (const line of lines) {
    const m = /^(#{2,4})\s+(.*)$/.exec(line);
    if (m) {
      current = { level: m[1].length, title: m[2].replace(/<[^>]+>/g, '').trim(), body: [] };
      out.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }
  return out.map((s) => ({ level: s.level, title: s.title, body: s.body.join('\n').trim() }));
}

function pick(list, patterns) {
  for (const re of patterns) {
    const hit = list.find((s) => re.test(s.title));
    if (hit && hit.body) return hit.body;
  }
  return '';
}

// Keep bullets readable for the writer rather than dumping paragraphs of prose.
function bulletise(text, limit) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));
  const source = bullets.length ? bullets.join('\n') : text;
  return cap(source, limit);
}

const used = new Set();
const digests = [];

for (const p of plugins) {
  const readmePath = path.join(DOCS, p.name, 'README.md');
  let secs = [];
  if (fs.existsSync(readmePath)) {
    const raw = fs.readFileSync(readmePath, 'utf8');
    secs = sections(raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''));
  }

  const summary = cap(pick(secs, [/^summary$/i]) || p.readme?.summary || '', 1100);
  const whenToChoose = cap(pick(secs, [
    /when to choose/i, /when to use/i, /choose it/i, /^use this package$/i, /use cases/i,
  ]), 900);
  const notFor = cap(pick(secs, [/when not/i, /poor fit/i, /not a fit/i, /do not choose/i, /avoid/i]), 500);
  const limitsHeading = pick(secs, [/known limitations/i, /limitations/i, /deferred work/i]);
  const limitations = bulletise(limitsHeading, 1500);
  const minimalConfig = cap(pick(secs, [/minimal configuration/i, /^configuration$/i]), 400);

  const rows = p.rows.map((r) => ({
    id: r.id,
    state: r.state,
    condition: r.disabledExpr || null,
    config: r.config === null || r.config === undefined ? null : r.config,
    rationale: cap((r.rationale || []).join('\n\n'), 800),
  }));

  const digest = {
    name: p.name,
    package: p.pkg,
    version: p.version,
    group: p.group,
    isPlugin: p.isPlugin,
    takesConfig: p.config === 'yes',
    mount: !p.mountedAtAll ? 'not mounted in this build' : p.mounted ? 'mounted and on' : 'mounted but switched off',
    usedInPresets: [...new Set(p.presets.map((x) => x.preset))],
    shortOfficialDescription: cap(p.catalogDescription || p.manifestDescription, 320),
    authorsSummary: summary,
    whenToChoose,
    notFor,
    statedLimitations: limitations,
    minimalConfig,
    currentRows: rows,
  };

  fs.writeFileSync(path.join(DIGEST_DIR, p.name + '.json'), JSON.stringify(digest, null, 1), 'utf8');
  digests.push(digest);
  used.add(p.name);
}

// ── batches ─────────────────────────────────────────────────────────────────
const pluginBatches = [];
const realPlugins = digests.filter((d) => d.isPlugin).map((d) => d.name);
const libraries = digests.filter((d) => !d.isPlugin).map((d) => d.name);

const PLUGIN_BATCH = 10;
for (let i = 0; i < realPlugins.length; i += PLUGIN_BATCH) {
  pluginBatches.push({ id: `p${String(pluginBatches.length + 1).padStart(2, '0')}`, kind: 'plugin', packages: realPlugins.slice(i, i + PLUGIN_BATCH) });
}
const startLib = pluginBatches.length;
const LIB_BATCH = 18;
for (let i = 0; i < libraries.length; i += LIB_BATCH) {
  pluginBatches.push({ id: `l${String(pluginBatches.length - startLib + 1).padStart(2, '0')}`, kind: 'library', packages: libraries.slice(i, i + LIB_BATCH) });
}

const tasks = pluginBatches.map((b) => ({
  batch: b.id,
  kind: b.kind,
  packages: b.packages,
  digestFiles: b.packages.map((n) => path.join(DIGEST_DIR, n + '.json')),
  outputFile: path.join(PLAIN_DIR, b.id + '.json'),
}));

fs.writeFileSync(path.join(WORK, 'batches.json'), JSON.stringify(pluginBatches, null, 1), 'utf8');
for (const t of tasks) fs.writeFileSync(path.join(TASK_DIR, t.batch + '.json'), JSON.stringify(t, null, 1), 'utf8');

const libCount = libraries.length;
console.log(`digests written: ${digests.length} (plugins ${realPlugins.length}, libraries ${libCount})`);
console.log(`batches: ${pluginBatches.length} (plugin ${pluginBatches.length - (pluginBatches.length - startLib)}, library ${pluginBatches.length - startLib})`);
console.log(`tasks in ${TASK_DIR}`);
console.log(`work dir: ${WORK}`);
