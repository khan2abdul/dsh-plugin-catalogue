// Classify every shipped package: does it export a loadable plugin, does it ship
// an installable bundle patch, or is it purely an internal library?
//
// This matters for the plain-language layer: an internal helper needs no action
// from a reader, but a bundle is an add-on pack they could choose to install.
const fs = require('fs');
const path = require('path');

const ARCHIVE = process.argv[2];
const OUT = path.resolve(__dirname, '..', '.work', 'package-flags.json');
if (!ARCHIVE) {
  console.error('usage: node bundle-flags.cjs <path to app.asar>');
  process.exit(1);
}

const fd = fs.openSync(ARCHIVE, 'r');
const sizeBuf = Buffer.alloc(8);
fs.readSync(fd, sizeBuf, 0, 8, 0);
const jsonSize = sizeBuf.readUInt32LE(4);
const headerBuf = Buffer.alloc(jsonSize);
fs.readSync(fd, headerBuf, 0, jsonSize, 8);
const raw = headerBuf.toString('utf8');
const header = JSON.parse(raw.slice(raw.indexOf('{')));
const base = 8 + jsonSize;
const UNPACKED = ARCHIVE.replace(/app\.asar$/, 'app.asar.unpacked');

function read(p) {
  let node = header;
  for (const part of p.split('/')) {
    node = node.files && node.files[part];
    if (!node) return null;
  }
  if (node.files) return null;
  if (node.unpacked || node.offset === undefined || node.offset === null) {
    const up = path.join(UNPACKED, p);
    return fs.existsSync(up) ? fs.readFileSync(up) : null;
  }
  const buf = Buffer.alloc(node.size);
  fs.readSync(fd, buf, 0, node.size, base + Number(node.offset));
  return buf;
}

const files = [];
(function walk(node, prefix) {
  for (const [k, v] of Object.entries(node.files || {})) {
    const p = prefix ? prefix + '/' + k : k;
    if (v.files) walk(v, p);
    else files.push(p);
  }
})(header, '');

const flags = {};
for (const p of files) {
  const m = /^dsh\/node_modules\/@deepseek-ai\/([^/]+)\/package\.json$/.exec(p);
  if (!m) continue;
  const buf = read(p);
  if (!buf) continue;
  let json;
  try {
    json = JSON.parse(buf.toString('utf8'));
  } catch {
    continue;
  }
  const dsh = json.dsh || {};
  const patch = dsh.bundle && dsh.bundle.patch;
  const patches = Array.isArray(patch) ? patch.length : patch ? 1 : 0;
  flags[m[1]] = {
    name: m[1],
    isBundle: patches > 0,
    patchFiles: patches,
    hasClientHalf: !!(dsh.client && Object.keys(dsh.client).length),
    hasProfile: !!(dsh.profile && Object.keys(dsh.profile).length),
    keywords: Array.isArray(json.keywords) ? json.keywords.slice(0, 6) : [],
  };
}

fs.writeFileSync(OUT, JSON.stringify(flags, null, 1), 'utf8');
const bundles = Object.values(flags).filter((f) => f.isBundle);
const clients = Object.values(flags).filter((f) => f.hasClientHalf);
console.log(`packages inspected: ${Object.keys(flags).length}`);
console.log(`ship a bundle patch (installable add-on packs): ${bundles.length}`);
for (const b of bundles) console.log(`  ${b.name}${b.patchFiles > 1 ? ` (${b.patchFiles} patch files)` : ''}`);
console.log(`declare a browser half (dsh.client): ${clients.length}`);
console.log(`written: ${OUT}`);
