# DeepSeek Harness — Plugin Catalogue

**Every part of DeepSeek Harness, explained in plain English.**

DeepSeek Harness is built out of **287 small parts** — one searches the web, one reads your files,
one keeps a long goal on track, one draws the sidebar. The app ships a reference for each of them,
but it is written for the engineers who build the harness. It will tell you that something is a
*"sandbox-consuming implementation of the PowerShell executor seam"* and leave you none the wiser.

This project turns that into a browsable catalogue that answers three questions about every single
part:

1. **What does it do?**
2. **Should I care — and when would I actually use it?**
3. **What is it called?**

## At a glance

| | |
|---|---|
| Parts documented | **287** (215 usable plugins + 72 internal building blocks) |
| Working in your setup | **152** |
| Installed, can be switched on | **21** |
| Not included in this build | **42** |
| Source documentation read | **285 package references**, 2.8 MB |
| Sample setups explained | **4** session presets, 29 / 30 / 6 / 30 tools |

## What makes it different from a package list

**It leads with people, not plumbing.** Open any plugin and you get what it does, why you would care,
when to use it, when to skip it, its good points and the things to know — followed by how much effort
it takes and who it is for.

**The names stay visible.** Every entry shows its real name (`dsh-tool-fs-search`) next to the plain
explanation, so you can find it again in settings or in a search box.

**The states are computed, not written.** "Working now", "Installed, switched off", "Not in this
version" and "Internal part" are derived from the settings lines the app actually composes — the same
source the *Under the hood* page shows. They cannot drift from reality.

**Nothing is invented.** See [Where the information comes from](#where-the-information-comes-from).

**Engineering detail survives.** Every plugin page keeps the original reference, the exact settings
line, its configuration and the note the engineers wrote beside it — behind a **Technical details**
toggle on the same page.

## What you will find

| View | What it answers |
|---|---|
| **Start here** | What you have, what each thing is called, and which group it falls into — grouped by install state |
| **All plugins** | The full list, useful parts first, with status, audience and effort on every row |
| **A plugin page** | What it does → why you'd care → good things / things to know → use it when / skip it when → effort → technical details |
| **Words explained** | A glossary of every technical term the site uses, in 24 plain definitions |
| **Session setups** | Why two chats behave differently: the four tool sets, named in plain English |
| **Under the hood** | The raw composed settings lines with their rationale — explicitly skippable |
| **Build your own** | The harness's own plugin-development guides, verbatim, marked for developers |

## Run it

```bash
git clone https://github.com/khan2abdul/dsh-plugin-catalogue.git
cd dsh-plugin-catalogue
npm install
npm run dev
```

Then open **http://localhost:5273**.

To produce a static build instead:

```bash
npm run build      # -> dist/
npm run preview    # serve it
```

`dist/` uses relative asset paths so it works from any sub-path, but serve it over HTTP — opening
`dist/index.html` from the filesystem fails, because browsers block ES modules over `file://`. With no
dependencies installed you can still preview a build:

```bash
node tools/serve-dist.mjs 4173    # then open http://127.0.0.1:4173/
```

> **Windows: use npm, not pnpm.** Without symlink privilege pnpm falls back to Windows *junctions* for
> `node_modules` entries. Node's ESM resolver does not resolve a junction to its real path, so Vite
> cannot find its own dependency and the build fails with `ERR_MODULE_NOT_FOUND`. npm produces a flat
> tree of real directories and works.

## Where the information comes from

Nothing here was written from memory, and nothing was summarised from a blog post. Every explanation,
option and stated drawback was read out of the **installed application payload** (`app.asar`):
each package's own documentation, the settings lines the `desktop` profile actually composes, the live
configuration, and the notes the engineers wrote beside each line.

The plain-language entries are generated under one hard rule:

> Derive drawbacks **only** from the package's own stated limitations. If the authors documented no
> downside, write *"No documented limitations."* — never invent one.

Across all 215 plugins, **not one entry needed that placeholder**: every single drawback traces back to
a limitation the DeepSeek engineers documented themselves. Pros are grounded the same way. The
generation pipeline, its grounding rule and its validation gates are described in
[How the data is built](#how-the-data-is-built).

## How it's built

- **Vite + React + TypeScript.** No component library — every control is built by hand from the
  Harness design tokens, so the site matches the real client rather than approximating it.
- **The real Harness design language.** Five stylesheets are copied verbatim from the shipped
  `dsh-client-ui-theme` package: 101 semantic design tokens plus 76 palette values, for light and dark.
  Dark mode is toggled exactly as the Harness Web client does it — `data-ds-dark-theme` on `<body>`.
- **The dataset is generated, not typed.** 287 package records, 183 composed settings lines, the four
  expanded presets, and 285 documentation chunks that load lazily per plugin page.

```
src/
  App.tsx               shell, routing, shared filter state
  components/           Sidebar, Badge, Markdown renderer, theme toggle
  lib/                  data access + search, markdown pipeline, tiny hash router, types
  pages/                Dashboard, Plugins, PluginDetail, Glossary, Presets, Composition, Guides
  styles/dsh/           the shipped Harness stylesheets, verbatim
  styles/site*.css      the catalogue UI, expressed entirely in Harness tokens
  data/                 the generated dataset (287 records + 285 documentation chunks)
tools/
  build-data.cjs        builds the dataset from the extracted payload
  build-digests.cjs     per-package digests and writer batches
  merge-plain.cjs       validates and merges the plain-language layer
  check-plain.cjs       coverage and jargon audit
  smoke.mjs             dataset, markdown and state invariants
  serve-dist.mjs        dependency-free static server
  verify-dist.mjs       HTTP checks against a built site
  verify-dev.mjs        checks against a running dev server
```

## Checking it

```bash
node tools/smoke.mjs                                 # dataset + markdown pipeline, no browser needed
node tools/serve-dist.mjs                            # serve dist/ on :4173
node tools/verify-dist.mjs http://127.0.0.1:4173     # HTTP checks against the built site
node tools/check-plain.cjs                           # plain-language coverage + jargon audit
```

`smoke.mjs` asserts the dataset invariants (287 packages, 183 settings lines, 4 presets expanding to
29/30/6/30), that all 285 documents render through the deployed markdown pipeline, that install states
account for every package exactly once, and that no engineer jargon reaches reader-facing text.
`verify-dist.mjs` asserts a built site serves its shell, stylesheet, main bundle and lazily-loaded
documentation.

## Limitations, stated plainly

- **The plain-language entries are generated from the shipped documentation — they are not written by
  DeepSeek.** They are grounded under the rule above, and each page shows the original reference so you
  can always check them.
- **Documentation is rendered as trusted first-party HTML** and is not sanitized, because it is not
  third-party input. Point this pipeline at untrusted packages and you would need a sanitizer first.
- **Quoted rationale is verbatim**, including one place where the shipped patch places a comment about
  the workspace file service above the terminal row. The UI labels those notes as "the note the makers
  left above this line", which stays accurate regardless.
- **Code blocks are token-coloured, not syntax-highlighted.** The Harness Shiki theme is not reproduced.
- **27 packages the in-product reference documents are absent from this build** — the `dsh-lsp`
  language-server family, the `dsh-ssh` family, `dsh-storage-sqlite`, `dsh-tool-terminal`, the Exa and
  Perplexity search providers, the ACP / Codex / Claude-Code / SDK subagent backends, and the
  experimental browser-use and computer-use packages.

## How the data is built

The generators read an extraction of the installed DeepSeek Harness, so they expect that extraction's
outputs as sibling directories (`dsh-plugins/`, `extracted/`) which are **not** part of this repository.
The published site is fully self-contained for building and running; regenerating the dataset needs the
extraction step.

```bash
node tools/build-data.cjs       # dataset from the extracted payload
node tools/build-digests.cjs    # per-package digests + batches for the writers
#   … writer batches produce .work/plain/<batch>.json …
node tools/merge-plain.cjs      # validate and attach the plain-language layer
```

## Licensing

No licence has been chosen for this repository yet, which means it is currently "all rights reserved"
by default. The DeepSeek Harness itself is MIT licensed, and the documentation quoted here comes from
that package.
