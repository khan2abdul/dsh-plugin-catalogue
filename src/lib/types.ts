export interface PluginRow {
  id: string;
  state: string;
  disabledExpr: string;
  layer: string;
  hasConfig: boolean;
  config: unknown;
  rationale: string[];
}

export interface ReadmeMeta {
  description: string;
  kind: string;
  summary: string;
  headings: { level: number; text: string }[];
  bytes: number;
}

export interface PresetUse {
  preset: string;
  rowId: string;
  state: string;
}

/** Who a capability is actually for, in plain words. */
export type Audience = 'everyone' | 'power users' | 'admins' | 'developers';

/** How much work it takes to get a capability working. */
export type Effort = 'already on' | 'one setting' | 'needs a plugin' | 'developer task';

export interface PlainPlugin {
  kind: 'plugin';
  headline: string;
  icon: string;
  whatItDoes: string;
  whyYoudCare: string;
  useWhen: string[];
  skipWhen: string[];
  pros: string[];
  cons: string[];
  effort: Effort;
  bestFor: Audience[];
  safeToIgnore: boolean;
  oneLiner: string;
}

export interface PlainLibrary {
  kind: 'library';
  headline: string;
  whatItDoes: string;
  oneLiner: string;
  bestFor: Audience[];
  safeToIgnore: boolean;
  /** Ships a bundle patch: an installable add-on pack rather than a helper. */
  isPack?: boolean;
}

export type PlainEntry = PlainPlugin | PlainLibrary;

export interface Plugin {
  name: string;
  pkg: string;
  version: string;
  group: string;
  isPlugin: boolean;
  config: string;
  catalogDescription: string;
  manifestDescription: string;
  readme: ReadmeMeta | null;
  rows: PluginRow[];
  presets: PresetUse[];
  mounted: boolean;
  mountedAtAll: boolean;
  /** Written for a general reader: what it does, why, when, pros and cons. */
  plain?: PlainEntry;
}

export interface PresetRow {
  id: string;
  name: string;
  parent?: string | null;
  state: string;
  disabledExpr?: string;
  config?: unknown;
  group?: boolean;
  isolate?: Record<string, unknown> | null;
  children?: PresetRow[];
}

export interface Preset {
  id: string;
  order: number | null;
  name: string;
  description: string;
  rowId: string;
  package: string;
  rows: PresetRow[];
  flatCount: number;
}

export interface HostRow {
  id: string;
  name: string;
  state: string;
  disabledExpr: string;
  layer: string;
  hasConfig: boolean;
  config: unknown;
  rationale: string[];
}

export interface Guide {
  skill: string;
  file: string;
  title: string;
  description: string;
  note: string;
  markdown: string;
}

export interface Stats {
  build: {
    product: string;
    version: string;
    platform: string;
    profile: string;
    framework: string;
    bundles: string[];
  };
  counts: Record<string, number>;
  groupCounts: Record<string, number>;
  rowStates: Record<string, number>;
  layerFiles: { layer: string; rel: string; bytes: number }[];
  readmeKinds: Record<string, number>;
}
