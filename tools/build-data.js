// Build the catalogue site's data files from the extracted DSH payload.
const fs = require('fs');
const path = require('path');

const WS = process.cwd();
const OUT = path.join(WS, 'dsh-plugin-catalogue', 'src', 'data');
const readmesOut = path.join(OUT, 'readmes');
fs.mkdirSync(readmesOut, { recursive: true });

const pkgs = JSON.parse(fs.readFileSync('dsh-plugins/manifests.json', 'utf8'));
const cat = JSON.parse(fs.readFileSync('dsh-plugins/catalog.json', 'utf8'));
const comp = JSON.parse(fs.readFileSync('dsh-plugins/composition.json', 'utf8'));
const docsDir = path.join(WS, 'dsh-plugins', 'docs');

const EXT = path.join(WS, 'extracted', 'dsh', 'node_modules', '@deepseek-ai');

// ── deployment rationale: the comment block above each row in a patch file ──
function rationaleFor(file, layer) {
  const map = new Map();
  let buf = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) {
      buf.push(line.replace(/^\s*#\s?/, '').replace(/\s+$/, ''));
      continue;
    }
    const row = /^(\s*)-\s+id:\s*(\S+)\s*$/.exec(line);
    const ins = /^(\s*)-\s+insert:\s*$/.test(line);
    if (row) {
      if (buf.length) map.set(row[2], { layer, text: buf.join('\n') });
      buf = [];
      continue;
    }
    if (ins) { buf = []; continue; }
    if (/^\s*$/.test(line)) continue;   // keep a comment block together across blanks
    buf = [];                            // any other content ends the block
  }
  return map;
}

const rationale = new Map();   // rowId -> [{layer,text}]
const LAYERS = [
  ['dsh-base', 'dsh-base/cordis.patch.yml'],
  ['dsh-web-app', 'dsh-web-app/cordis.patch.yml'],
  ['preset:standard', 'dsh-web-app/presets/standard.patch.yml'],
  ['preset:ptc', 'dsh-web-app/presets/ptc.patch.yml'],
  ['preset:minimal', 'dsh-web-app/presets/minimal.patch.yml'],
  ['preset:cordis', 'dsh-web-app/presets/cordis.patch.yml'],
];
const layerFiles = [];
for (const [layer, rel] of LAYERS) {
  const file = path.join(EXT, rel);
  if (!fs.existsSync(file)) continue;
  layerFiles.push({ layer, rel, bytes: fs.statSync(file).size });
  for (const [id, v] of rationaleFor(file, layer)) {
    if (!rationale.has(id)) rationale.set(id, []);
    rationale.get(id).push(v);
  }
}

// ── README frontmatter, summary, and kind ──────────────────────────────────
function parseReadme(pkgDir) {
  const file = path.join(docsDir, pkgDir, 'README.md');
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  let body = raw;
  const fm = {};
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (m) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
  }
  let summary = '';
  const s = /^##\s+Summary\s*$/m.exec(body);
  if (s) {
    const rest = body.slice(s.index + s[0].length);
    const next = /^##\s+/m.exec(rest);
    summary = (next ? rest.slice(0, next.index) : rest).trim();
  }
  // Headings make a useful table of contents for the detail page.
  const headings = [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)]
    .map(h => ({ level: h[1].length, text: h[2].replace(/<[^>]+>/g, '').trim() }));
  return { frontmatter: fm, summary, headings, bytes: raw.length, markdown: body };
}

// ── preset expansion ───────────────────────────────────────────────────────
function expandGrouped(list, out, groupId) {
  for (const r of list || []) {
    if (!r || !r.id) continue;
    if (r.name === 'cordis:group') {
      const kids = expandGrouped(r.config, [], r.id);
      out.push({ id: r.id, name: 'cordis:group', group: true, isolate: r.isolate || null, state: 'group', children: kids });
      continue;
    }
    out.push({
      id: r.id, name: r.name, parent: groupId || null,
      state: r.disabled === true ? 'disabled' : (r.disabled ? 'conditional' : 'enabled'),
      disabledExpr: typeof r.disabled === 'string' ? r.disabled : '',
      config: r.config,
    });
  }
  return out;
}
// Flatten the nested group shape into a plain row list.
function flattenGrouped(nodes, out) {
  out = out || [];
  for (const n of nodes || []) {
    if (n.group) flattenGrouped(n.children, out);
    else out.push(n);
  }
  return out;
}

const decls = comp.presetDeclarations.map(p => p.row).filter(r => r.config && r.config.id);
const presets = decls.map(d => {
  const rows = expandGrouped(d.config.plugins, []);
  return {
    id: d.config.id,
    order: d.config.order ?? null,
    name: d.config.name || d.config.id,
    description: d.config.description || '',
    rowId: d.id,
    package: d.name,
    rows,
    flatCount: flattenGrouped(rows).length,
  };
}).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

// ── per-package records ────────────────────────────────────────────────────
const rowsByPkg = new Map();
for (const r of comp.hostPlane) {
  if (!r.name || typeof r.name !== 'string' || r.name.startsWith('cordis:')) continue;
  const key = r.name.replace(/^@deepseek-ai\//, '').split('/')[0];
  if (!rowsByPkg.has(key)) rowsByPkg.set(key, []);
  rowsByPkg.get(key).push(r);
}
const presetUse = new Map();
for (const p of presets) {
  for (const r of flattenGrouped(p.rows)) {
    const key = String(r.name || '').replace(/^@deepseek-ai\//, '').split('/')[0];
    if (!key) continue;
    if (!presetUse.has(key)) presetUse.set(key, []);
    presetUse.get(key).push({ preset: p.id, rowId: r.id, state: r.state });
  }
}

const plugins = [];
for (const p of pkgs) {
  const c = cat.rows.find(r => r.pkg === '@deepseek-ai/' + p.dir) || {};
  const readme = parseReadme(p.dir);
  if (readme) {
    fs.writeFileSync(path.join(readmesOut, p.dir + '.md'), readme.markdown, 'utf8');
  }
  const rows = (rowsByPkg.get(p.dir) || []).map(r => ({
    id: r.id, state: r.state, disabledExpr: r.disabledExpr,
    layer: r.layer, hasConfig: !!r.hasConfig,
    config: r.config === undefined ? null : r.config,
    rationale: (rationale.get(r.id) || []).map(x => x.text),
  }));
  plugins.push({
    name: p.dir,
    pkg: '@deepseek-ai/' + p.dir,
    version: p.version,
    group: c.group || 'internal library',
    isPlugin: !!c.isPlugin,
    config: c.config || '',
    catalogDescription: c.description || '',
    manifestDescription: p.description || '',
    readme: readme ? {
      description: readme.frontmatter.description || '',
      kind: readme.frontmatter.kind || '',
      summary: readme.summary,
      headings: readme.headings,
      bytes: readme.bytes,
    } : null,
    rows,
    presets: presetUse.get(p.dir) || [],
    mounted: rows.some(r => r.state === 'enabled' || r.state.startsWith('conditional')),
    mountedAtAll: rows.length > 0,
  });
}
plugins.sort((a, b) => a.name.localeCompare(b.name));

// ── the authoring guides shipped inside the harness ────────────────────────
const SKILLS = path.join(EXT, 'dsh-agent-preset', 'skills');
const guides = [];
function readGuide(skill, rel, title, note) {
  const file = path.join(SKILLS, skill, rel);
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  let body = fm ? raw.slice(fm[0].length) : raw;
  let description = '';
  if (fm) {
    const d = /description:\s*([\s\S]*?)(?:\r?\n[A-Za-z_]+:|\r?\n?$)/.exec(fm[1]);
    if (d) description = d[1].trim();
  }
  guides.push({ skill, file: rel, title, description, note: note || '', markdown: body });
}
readGuide('cordis-plugin-development', 'SKILL.md', 'Developing a plugin', 'The main authoring workflow: bundles, installation, verification.');
readGuide('cordis-plugin-development', 'references/host-plugin.md', 'Bundles and Host plugins', 'Manifest, export forms, Config, install/enable semantics.');
readGuide('cordis-plugin-development', 'references/ui-plugin.md', 'UI plugins in the Web page', 'Client manifest, module loader, slot registration.');
readGuide('cordis-plugin-development', 'references/mcp-bundle.md', 'Connect an MCP server', 'A configuration-only bundle; no Host or Client code.');
readGuide('cordis-plugin-development', 'references/practices.md', 'Plugin practices', 'Extension points, stability, performance, UI rules.');
readGuide('cordis-plugin-development', 'references/user-actions.md', 'Sharing user actions', 'Reuse one operation between UI actions and agent tools.');
readGuide('cordis-plugin-development', 'references/verification.md', 'Verification limits', 'What installation alone does and does not prove.');
readGuide('editing-cordis-compositions', 'SKILL.md', 'Editing Cordis compositions', 'Creating and overriding agent presets; host vs preset placement.');
readGuide('cordis-composition-reference', 'SKILL.md', 'Composition reference', 'The Loader patch dialect and the installable package list.');

// ── stats ──────────────────────────────────────────────────────────────────
const groupCounts = {};
for (const p of plugins) groupCounts[p.group] = (groupCounts[p.group] || 0) + 1;
const rowStates = {};
for (const r of comp.hostPlane) rowStates[r.state] = (rowStates[r.state] || 0) + 1;
const stats = {
  build: {
    product: 'DeepSeek Harness desktop',
    version: pkgs[0] ? pkgs[0].version : '',
    platform: 'win32 x64 (Electron)',
    profile: 'desktop',
    framework: 'Cordis ~4.0.4 + cordis-plugin-loader ~1.0.5',
    bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'],
  },
  counts: {
    packagesTotal: plugins.length,
    pluginPackages: plugins.filter(p => p.isPlugin).length,
    libraries: plugins.filter(p => !p.isPlugin).length,
    withReadme: plugins.filter(p => p.readme).length,
    hostRows: comp.hostPlane.length,
    enabled: rowStates['enabled'] || 0,
    disabled: rowStates['disabled'] || 0,
    conditional: rowStates['conditional (!!js)'] || 0,
    mounted: plugins.filter(p => p.mountedAtAll).length,
    enabledPackages: plugins.filter(p => p.mounted).length,
    presets: presets.length,
    presetRows: presets.reduce((a, p) => a + p.flatCount, 0),
    documentedBytes: plugins.reduce((a, p) => a + (p.readme ? p.readme.bytes : 0), 0),
  },
  groupCounts,
  rowStates,
  layerFiles,
  readmeKinds: plugins.reduce((a, p) => {
    const k = p.readme && p.readme.kind ? p.readme.kind : 'not documented';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {}),
};

fs.writeFileSync(path.join(OUT, 'plugins.json'), JSON.stringify(plugins), 'utf8');
fs.writeFileSync(path.join(OUT, 'presets.json'), JSON.stringify(presets, null, 1), 'utf8');
fs.writeFileSync(path.join(OUT, 'host-rows.json'), JSON.stringify(comp.hostPlane.map(r => ({
  id: r.id, name: r.name, state: r.state, disabledExpr: r.disabledExpr, layer: r.layer,
  hasConfig: !!r.hasConfig, config: r.config === undefined ? null : r.config,
  rationale: (rationale.get(r.id) || []).map(x => x.text),
})), null, 1), 'utf8');
fs.writeFileSync(path.join(OUT, 'guides.json'), JSON.stringify(guides, null, 1), 'utf8');
fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 1), 'utf8');

console.log('plugins: ' + plugins.length + ' (readme: ' + stats.counts.withReadme + ', ' + (stats.counts.documentedBytes / 1048576).toFixed(2) + ' MB)');
console.log('presets: ' + presets.map(p => p.id + '=' + p.flatCount).join(' '));
console.log('host rows: ' + stats.counts.hostRows + ' | groups: ' + Object.keys(groupCounts).length + ' | guides: ' + guides.length);
console.log('layers: ' + layerFiles.map(l => l.layer).join(' -> '));
