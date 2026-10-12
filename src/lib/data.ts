import pluginsJson from '../data/plugins.json';
import presetsJson from '../data/presets.json';
import hostRowsJson from '../data/host-rows.json';
import statsJson from '../data/stats.json';
import guidesJson from '../data/guides.json';
import type { Audience, Effort, Guide, HostRow, PlainEntry, Plugin, Preset, Stats } from './types';

export const plugins = pluginsJson as unknown as Plugin[];
export const presets = presetsJson as unknown as Preset[];
export const hostRows = hostRowsJson as unknown as HostRow[];
export const stats = statsJson as unknown as Stats;
export const guides = guidesJson as unknown as Guide[];

export const byName = new Map(plugins.map((p) => [p.name, p]));

/** Groups ordered by size, then name. */
export const groups: { group: string; count: number; plugins: Plugin[] }[] = (() => {
  const map = new Map<string, Plugin[]>();
  for (const p of plugins) {
    const list = map.get(p.group);
    if (list) list.push(p);
    else map.set(p.group, [p]);
  }
  return [...map.entries()]
    .map(([group, list]) => ({ group, count: list.length, plugins: list }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
})();

/* ── install state: the question every reader actually has ───────────────── */

export type InstallState = 'working' | 'off' | 'absent' | 'internal';

/**
 * Authoritative state, derived from the composed settings lines rather than from
 * the written entry: is this part running, on disk but switched off, not in this
 * build at all, or an internal building block nobody switches on.
 */
export function installState(p: Plugin): InstallState {
  if (!p.isPlugin) return 'internal';
  if (!p.mountedAtAll) return 'absent';
  return p.mounted ? 'working' : 'off';
}

export const STATE_LABEL: Record<InstallState, string> = {
  working: 'Working now',
  off: 'Installed, switched off',
  absent: 'Not in this version',
  internal: 'Internal part',
};

export const STATE_SHORT: Record<InstallState, string> = {
  working: 'Working now',
  off: 'Can switch on',
  absent: 'Not in this version',
  internal: 'Internal part',
};

export const STATE_TONE: Record<InstallState, 'success' | 'warn' | 'muted' | 'neutral'> = {
  working: 'success',
  off: 'warn',
  absent: 'muted',
  internal: 'neutral',
};

export const STATE_HINT: Record<InstallState, string> = {
  working: 'Switched on and running in your sessions right now. Nothing for you to do.',
  off: 'It is on your computer but not running. This is one you could switch on if you want it.',
  absent: 'This version does not include it, so there is nothing to switch on here.',
  internal: 'A building block the assistant uses to run itself. Not something you switch on.',
};

/** How many packages sit in each state. */
export const stateCounts: Record<InstallState, number> = plugins.reduce(
  (acc, p) => {
    const s = installState(p);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  },
  { working: 0, off: 0, absent: 0, internal: 0 } as Record<InstallState, number>,
);

/* ── plain-language helpers ──────────────────────────────────────────────── */

/** The short list-view sentence for a package. */
export function oneLiner(p: Plugin): string {
  return p.plain?.oneLiner || p.readme?.description || p.catalogDescription || p.manifestDescription || '';
}

/** A friendly name for a package: "dsh-tool-web" → "tool web". */
export function friendlyName(p: Plugin): string {
  if (p.plain?.headline) return p.plain.headline;
  return shortName(p.name).replace(/^dsh-/, '').replace(/-/g, ' ');
}

export function effortOf(p: Plugin): Effort | null {
  return p.plain && p.plain.kind === 'plugin' ? p.plain.effort : null;
}

export function bestForOf(p: Plugin): Audience[] {
  return p.plain?.bestFor ?? [];
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  everyone: 'For everyone',
  'power users': 'For power users',
  admins: 'For admins',
  developers: 'For developers',
};

export const EFFORT_LABEL: Record<Effort, string> = {
  'already on': 'Already working',
  'one setting': 'One setting to change',
  'needs a plugin': 'Needs an add-on',
  'developer task': 'A developer task',
};

export const EFFORT_HINT: Record<Effort, string> = {
  'already on': 'Nothing to do — it is on and working in your sessions.',
  'one setting': 'You would change one option to use it.',
  'needs a plugin': 'It is installed but switched off, or needs an extra piece turned on first.',
  'developer task': 'Only useful if you are building or extending the harness.',
};

/** Counts used for the overview and the filter chips. */
export const facets = (() => {
  const effort: Record<string, number> = {};
  const audience: Record<string, number> = {};
  let safeToIgnore = 0;
  let withPlain = 0;
  let undocumented = 0;
  for (const p of plugins) {
    if (!p.plain) {
      undocumented++;
      continue;
    }
    withPlain++;
    if (p.plain.safeToIgnore) safeToIgnore++;
    const e = effortOf(p);
    if (e) effort[e] = (effort[e] ?? 0) + 1;
    for (const a of p.plain.bestFor) audience[a] = (audience[a] ?? 0) + 1;
  }
  return { effort, audience, safeToIgnore, withPlain, undocumented };
})();

/** The status line for a package, in the reader's terms. */
export function plainStatus(p: Plugin): { label: string; tone: 'success' | 'muted' | 'warn' | 'neutral' } {
  const s = installState(p);
  return { label: STATE_LABEL[s], tone: STATE_TONE[s] };
}

/** Reader-first ordering: things that matter to people come before plumbing. */
export function sortForReader(list: Plugin[]): Plugin[] {
  const rank = (p: Plugin) => {
    if (!p.plain) return 5;
    if (p.plain.kind === 'library') return 6;
    const e = effortOf(p);
    if (e === 'already on' && !p.plain.safeToIgnore) return 0;
    if (e === 'already on') return 1;
    if (e === 'one setting') return 2;
    if (e === 'needs a plugin') return 3;
    return 4;
  };
  return [...list].sort((a, b) => rank(a) - rank(b) || friendlyName(a).localeCompare(friendlyName(b)));
}

/* ── search ──────────────────────────────────────────────────────────────── */

const searchIndex = plugins.map((p) => ({
  plugin: p,
  haystack: [
    p.name,
    p.group,
    p.catalogDescription,
    p.manifestDescription,
    p.readme?.description ?? '',
    p.readme?.summary ?? '',
    p.rows.map((r) => r.id).join(' '),
    p.plain ? `${p.plain.headline} ${p.plain.whatItDoes} ${p.plain.oneLiner}` : '',
    p.plain && p.plain.kind === 'plugin' ? `${p.plain.whyYoudCare} ${p.plain.useWhen.join(' ')} ${p.plain.pros.join(' ')}` : '',
  ]
    .join(' \u0001 ')
    .toLowerCase(),
}));

export function search(query: string): Plugin[] {
  const q = query.trim().toLowerCase();
  if (!q) return plugins;
  const terms = q.split(/\s+/).filter(Boolean);
  const hits: { plugin: Plugin; score: number }[] = [];
  for (const entry of searchIndex) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const at = entry.haystack.indexOf(term);
      if (at < 0) {
        ok = false;
        break;
      }
      // A name or headline hit outranks a hit deep in the reference text.
      score += entry.plugin.name.toLowerCase().includes(term) ? 100 : 10;
      if (entry.plugin.plain?.headline.toLowerCase().includes(term)) score += 40;
      score += Math.max(0, 8 - Math.floor(at / 200));
    }
    if (ok) hits.push({ plugin: entry.plugin, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.plugin.name.localeCompare(b.plugin.name)).map((h) => h.plugin);
}

// README bodies are ~2.8 MB, so each one is a separate lazily loaded chunk.
const readmes = import.meta.glob<string>('../data/readmes/*.md', {
  query: '?raw',
  import: 'default',
});

const cache = new Map<string, string>();

export function loadReadme(name: string): Promise<string> | null {
  const cached = cache.get(name);
  if (cached !== undefined) return Promise.resolve(cached);
  const loader = readmes[`../data/readmes/${name}.md`];
  if (!loader) return null;
  return loader().then((text) => {
    cache.set(name, text);
    return text;
  });
}

/* ── formatting ──────────────────────────────────────────────────────────── */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function shortName(name: string): string {
  return name.replace(/^@deepseek-ai\//, '');
}

export function plainEntry(p: Plugin): PlainEntry | undefined {
  return p.plain;
}
