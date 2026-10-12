# DeepSeek Harness — Plugin Catalogue

A browsable reference for **every plugin, bundle and session setup** in the DeepSeek Harness desktop
build — written so that someone who has never seen the inside of this software can still understand
what each part does, whether they need to care, and what it costs them.

Everything on the site is derived from the shipped `app.asar` payload: each package's own
documentation, the settings lines the profile actually composes, the live configuration, the notes
the engineers wrote beside each line, and the plugin-authoring skills the harness ships for its own
agents. Nothing is summarised from memory.

---

## Quick start

```bash
npm install
npm run dev        # dev server, http://localhost:5273
npm run build      # tsc --noEmit && vite build  ->  dist/
npm run preview    # serve the production build (vite preview)
```

`dist/` uses relative asset paths, so it works from any sub-path on a static host — but serve it over
HTTP. Opening `dist/index.html` straight from the filesystem does **not** work: Chrome blocks
`<script type="module">` over `file://` with a CORS error. With no dependencies installed you can
still preview a build using the bundled server:

```bash
node tools/serve-dist.mjs 4173    # then open http://127.0.0.1:4173/
```

> **Windows note — use npm, not pnpm.** Without symlink privilege pnpm falls back to Windows
> *junctions* for `node_modules` entries. Node's ESM resolver does not realpath a junction, so Vite's
> own transitive dependency (`vite` → `rolldown`) is not found and the config fails to load with
> `ERR_MODULE_NOT_FOUND`. npm produces a flat tree of real directories and resolves correctly.
> `pnpm-lock.yaml` is therefore not committed; `package-lock.json` is.

## Two layers, on purpose

The catalogue exists for two different readers, and the same page serves both:

| Layer | For | Where it lives |
|---|---|---|
| **Plain language** — what it does, why you'd care, when to use it or skip it, good things, things to know, and how much effort it takes | anyone | leads every plugin page and every list row |
| **Technical detail** — the package name, the exact settings line, its configuration, the shipped rationale, and the makers' original reference | engineers | behind a **Technical details** disclosure on the same page |

A reader never has to open the technical half, and an engineer never loses the evidence behind the
plain half.

## What the site contains

| View | What it shows |
|---|---|
| **Start here** | What a plugin is, how many you can safely ignore, which are worth a look, how a setup is built up in layers, what is off by default and why, and the four session setups |
| **All plugins** | Every part, best-for-you first and internal plumbing last. Each row shows a plain headline, a one-line explanation, its status, who it is for, and what it takes to use it |
| **Plugin detail** | What it does → why you'd care → good things and things to know side by side → use it when / skip it when → what it takes. Then Technical details: the settings line, its configuration, the engineers' own note, and the full original reference |
| **Words explained** | A glossary of every technical term the site uses — plugin, profile, row, patch, sandbox, approval, preset, subagent, `!!js`, `app.asar` … |
| **Session setups** | Why two chats behave differently: the four setups, with their tools named in plain English and grouped |
| **Under the hood** | The raw list of composed settings lines, in order, with configuration and rationale. Explicitly marked as skippable for non-engineers |
| **Build your own** | The harness's own plugin-development skills, verbatim, behind a clear "this is for developers" warning |

Dark mode is the Harness mechanism, not a re-implementation: the toggle sets `data-ds-dark-theme` on
`<body>`, the exact selector the shipped design tokens key their dark values on.

## How the plain-language layer was written

This is the part worth trusting carefully, so the method matters:

1. **Digest per package.** For each of the 287 packages the pipeline extracts only decision-relevant
   material from its own documentation: the authors' summary, their "when to choose it" guidance,
   their stated limitations, the live settings line and configuration, and the shipped rationale.
   Nothing else.
2. **Fan-out writing.** Each digest batch is handed to a writer that must produce a fixed JSON shape
   (headline, what it does, why you'd care, use-when, skip-when, pros, cons, effort, best-for,
   one-liner).
3. **The grounding rule.** Writers are instructed to derive **cons only from the package's stated
   limitations**, and — where the authors documented no downside — to write exactly
   *"No documented limitations."* rather than invent one. Pros must be grounded in what the digest
   says the package enables.
4. **Validation before shipping.** `tools/merge-plain.cjs` re-checks every field: presence, type,
   length caps, enum membership, and one entry per package in order. A bad batch is reported, not
   silently published.

Internal building blocks (72 of the 287) get an honest one-liner instead of invented trade-offs,
because a reader cannot switch them on or off — "nothing here for you to configure" is the truthful
answer.

## Data provenance

Generated from `app.asar` of the installed **DeepSeek Harness desktop 0.2.0-rc.2** (Windows x64):

| Fact | Value |
|---|---|
| Packages under `@deepseek-ai/` | 287 (215 export a Cordis plugin, 72 are internal libraries) |
| Composed host-plane rows | 183 (149 enabled, 25 disabled, 9 conditional) |
| Packages mounted by a host row | 175 |
| Agent presets | 4 → 29 / 30 / 6 / 30 plugin rows |
| Original documentation | 285 package references, 2.8 MB, 205 of them with tables |
| Patch rationale captured | 73 of 183 rows |

`src/data/` holds the generated dataset:

- `plugins.json` — one record per package: metadata, mount facts, and the `plain` entry
- `readmes/<package>.md` — 285 lazily-loaded documentation chunks
- `host-rows.json`, `presets.json`, `guides.json`, `stats.json`

## Regenerating the data

The generators live with the extraction toolkit that produced them and expect that toolkit's outputs
as siblings (`dsh-plugins/`, `extracted/`). From that parent directory:

```bash
node dsh-plugin-catalogue/tools/build-data.cjs      # dataset from the extracted payload
node dsh-plugin-catalogue/tools/build-digests.cjs   # per-package digests + batches for writers
#   … writers produce .work/plain/<batch>.json …
node dsh-plugin-catalogue/tools/merge-plain.cjs     # validate + attach the plain layer
```

See the toolkit's `asar.js` (a dependency-free ASAR reader), `compose.js` (resolves the patch layers
into the final row set) and `report.js` (generates the Markdown catalogues).

## Verification

```bash
node tools/smoke.mjs        # dataset + markdown pipeline, no browser needed
node tools/serve-dist.mjs   # serve dist/ on :4173
node tools/verify-dist.mjs http://127.0.0.1:4173   # HTTP checks against the built site
node tools/verify-dev.mjs   http://localhost:5273  # checks against the running dev server
```

`smoke.mjs` asserts the dataset invariants (287 / 183 / 29-30-6-30), that all 285 documents render to
HTML through the deployed markdown pipeline, and that row states and rationale coverage match the
source. `verify-dist.mjs` asserts the built artifact serves its shell, stylesheet, main bundle and
lazily-loaded documentation chunks. `merge-plain.cjs` asserts the shape and coverage of the
plain-language layer.

## Layout

```
src/
  main.tsx              entry; imports the real Harness stylesheets, then the site styles
  App.tsx               shell, routing, shared filter state
  components/           Sidebar, Badge, Markdown, ThemeToggle
  lib/                  data access + search, markdown pipeline, tiny hash router, types
  pages/                Dashboard, Plugins, PluginDetail, Glossary, Presets, Composition, Guides
  styles/
    dsh/                the shipped Harness stylesheets, verbatim
    site.css            the catalogue UI, expressed entirely in Harness tokens
    site-plain.css      components added for the plain-language layer
  data/                 generated dataset
tools/
  build-data.cjs        dataset from the extracted payload
  build-digests.cjs     per-package digests and writer batches
  merge-plain.cjs       validates and attaches the plain-language layer
  smoke.mjs             dataset + markdown smoke test
  serve-dist.mjs        dependency-free static server for dist/
  verify-dist.mjs       HTTP verification of the built site
  verify-dev.mjs        checks against the running dev server
```

## Notes and limitations

- **Documentation is rendered as trusted first-party HTML.** Content comes from the harness's own
  shipped packages; it is not sanitized, because it is not third-party input. If you point this
  pipeline at untrusted packages, add a sanitizer before `dangerouslySetInnerHTML`.
- **Rationale notes are copied verbatim**, including one case where the shipped patch places a
  workspace-file comment above the terminal row. The UI labels them as "the note the makers left above
  this line", which is accurate regardless.
- **In-page anchors are intercepted** in rendered documents so that `#section` links inside a package
  reference scroll instead of replacing the route hash.
- The Markdown renderer is `marked` with GFM tables; Shiki syntax highlighting from the Harness theme
  is not reproduced, so code blocks are token-coloured rather than syntax-coloured.
- **The plain-language entries are grounded but not authored by DeepSeek.** They are derived from the
  shipped documentation by the pipeline above. Where the makers documented no limitation, the entry
  says so rather than guessing.
- 27 packages that the in-product reference documents are **not** in this desktop build: the
  `dsh-lsp` language-server family, the `dsh-ssh` family, `dsh-storage-sqlite`, `dsh-tool-terminal`,
  `dsh-tool-session-query`, `dsh-llm-replay`, `dsh-session-title-all-prompts-llm`, the Exa and
  Perplexity search providers, the ACP / Codex / Claude-Code / SDK subagent backends, and the
  experimental browser-use, computer-use, inspector and Python-PTC packages.
