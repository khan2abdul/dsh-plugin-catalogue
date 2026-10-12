import { useState } from 'react';
import { Badge } from '../components/Badge';
import { byName, friendlyName, oneLiner, presets } from '../lib/data';
import { Link } from '../lib/router';
import type { PresetRow } from '../lib/types';

const SETUP: Record<string, { name: string; blurb: string }> = {
  standard: {
    name: 'Everyday work',
    blurb:
      'The setup you are using now. It can read and change files, run commands, search the web, make a plan before acting, keep a to-do list, and hand long jobs to helpers.',
  },
  ptc: {
    name: 'Code-style tools',
    blurb:
      'The same abilities as everyday work, but the assistant writes a short program that calls the tools instead of calling them one at a time. Faster for long, repetitive jobs.',
  },
  minimal: {
    name: 'Bare minimum',
    blurb:
      'A deliberately tiny set of tools. Chosen when you want speed and predictability rather than capability.',
  },
  cordis: {
    name: 'Tool building',
    blurb:
      'For inspecting and extending the assistant itself. Not meant for ordinary work.',
  },
};

const GROUP_NAME: Record<string, string> = {
  planning: 'Planning first',
  compaction: 'Keeping long chats manageable',
  delegation: 'Handing work to helpers',
};

const TOOL_STATE: Record<string, { label: string; tone: 'success' | 'muted' | 'warn' }> = {
  enabled: { label: 'available', tone: 'success' },
  disabled: { label: 'turned off', tone: 'muted' },
  conditional: { label: 'only sometimes', tone: 'warn' },
};

export function Presets() {
  return (
    <div className="page">
      <section className="hero hero--compact">
        <div className="hero__eyebrow">Why two chats can differ</div>
        <h1 className="hero__title">Session setups</h1>
        <p className="hero__lead">
          Every new conversation picks one of {presets.length} ready-made sets of tools. That is the
          main reason two chats with the same assistant can behave differently — one may be able to
          run commands on your computer while another can only read files. You usually never change
          this; it is here so the difference makes sense.
        </p>
      </section>

      {presets.map((preset) => {
        const info = SETUP[preset.id] ?? { name: preset.name, blurb: preset.description };
        return (
          <section className="panel preset" key={preset.id}>
            <div className="preset-head">
              <div>
                <h2 className="panel__title">
                  {info.name} <span className="panel__count">{preset.flatCount} tools</span>
                </h2>
                <p className="panel__lead">{info.blurb}</p>
              </div>
              {preset.id === 'standard' && <Badge tone="business">your default</Badge>}
            </div>

            <div className="preset-body">
              {preset.rows.map((row) =>
                row.group ? (
                  <div className="preset-group" key={row.id}>
                    <div className="preset-group__head">
                      <span className="preset-group__title">
                        {GROUP_NAME[row.id] ?? friendlyGroup(row.id)}
                      </span>
                      <span className="preset-group__count">{row.children?.length ?? 0} tools</span>
                      {row.isolate && (
                        <span className="preset-group__isolate" title="These tools share their own private copy of the service they provide.">
                          separate from the rest
                        </span>
                      )}
                    </div>
                    <div className="preset-group__children">
                      {row.children?.map((child) => (
                        <ToolRow key={child.id} row={child} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <ToolRow key={row.id} row={row} />
                ),
              )}
            </div>

            <details className="disclose disclose--tech">
              <summary>Technical details for engineers</summary>
              <pre className="code">{`id: ${preset.id}\nrow: ${preset.rowId}\norder: ${preset.order}\npackage: ${preset.package}`}</pre>
            </details>
          </section>
        );
      })}

      <section className="panel">
        <h2 className="panel__title">Which one should you use?</h2>
        <p className="panel__lead">
          Leave it on <strong>Everyday work</strong> unless you have a reason not to. If a job is long
          and repetitive, <strong>Code-style tools</strong> can be faster. The other two exist for
          specific situations and are not better in general. Nothing here is permanent — a new chat can
          use a different setup.
        </p>
      </section>
    </div>
  );
}

function ToolRow({ row }: { row: PresetRow }) {
  const p = byName.get(row.name);
  const state = TOOL_STATE[row.state] ?? { label: row.state, tone: 'muted' as const };
  const [open, setOpen] = useState(false);
  const hasConfig = row.config !== undefined && row.config !== null && Object.keys(row.config as object).length > 0;

  return (
    <div className="preset-row">
      <div className="preset-row__main">
        {p ? (
          <Link to={`/plugins/${p.name}`} className="preset-row__pkg">
            {p.plain?.headline || friendlyName(p)}
          </Link>
        ) : (
          <span className="muted">{row.name}</span>
        )}
        <span className="muted preset-row__purpose">{p ? oneLiner(p) : row.id}</span>
      </div>
      <Badge tone={state.tone}>{state.label}</Badge>
      {hasConfig && (
        <button type="button" className="linkish" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'hide settings' : 'settings'}
        </button>
      )}
      {open && hasConfig && <pre className="code code--inline">{JSON.stringify(row.config, null, 2)}</pre>}
    </div>
  );
}

function friendlyGroup(id: string): string {
  return id.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
