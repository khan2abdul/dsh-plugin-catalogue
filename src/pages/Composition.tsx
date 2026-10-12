import { Fragment, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { byName, friendlyName, hostRows, oneLiner, stats } from '../lib/data';
import { Link } from '../lib/router';
import type { HostRow } from '../lib/types';

type StateFilter = 'all' | 'enabled' | 'disabled' | 'conditional';

const STATE_WORD: Record<string, { label: string; tone: 'success' | 'muted' | 'warn' | 'neutral' }> = {
  enabled: { label: 'on', tone: 'success' },
  disabled: { label: 'off', tone: 'muted' },
  conditional: { label: 'depends', tone: 'warn' },
  group: { label: 'group', tone: 'neutral' },
};

export function Composition() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hostRows.filter((r) => {
      if (state !== 'all' && normalize(r.state) !== state) return false;
      if (!q) return true;
      const p = byName.get(r.name);
      const plain = p?.plain;
      return (
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (p?.group ?? '').toLowerCase().includes(q) ||
        (plain ? `${plain.headline} ${plain.oneLiner}`.toLowerCase().includes(q) : false)
      );
    });
  }, [query, state]);

  return (
    <div className="page">
      <section className="hero hero--compact">
        <div className="hero__eyebrow">For the curious and the technical</div>
        <h1 className="hero__title">Under the hood</h1>
        <p className="hero__lead">
          Everything above this page is written in plain English. This page is the opposite: it is the
          raw list of {stats.counts.hostRows} settings lines that switch on the parts of your
          installation, in the exact order they are applied. If you are not an engineer, you can safely
          skip it — nothing here needs your attention, and the plain explanations on every plugin page
          are derived from these very lines.
        </p>
      </section>

      <div className="filters">
        <div className="filters__search">
          <input
            type="search"
            value={query}
            placeholder="Filter by name or purpose…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter settings lines"
          />
        </div>
        <div className="chips">
          {(['all', 'enabled', 'disabled', 'conditional'] as StateFilter[]).map((s) => (
            <button key={s} type="button" className={`chip${state === s ? ' chip--active' : ''}`} onClick={() => setState(s)}>
              {s === 'all' ? 'everything' : STATE_WORD[s].label}
              <span className="chip__count">
                {s === 'all' ? hostRows.length : hostRows.filter((r) => normalize(r.state) === s).length}
              </span>
            </button>
          ))}
        </div>
        <span className="filters__count">{filtered.length} shown</span>
      </div>

      <div className="table-wrap">
        <table className="table table--rows">
          <thead>
            <tr>
              <th>#</th>
              <th>Settings line</th>
              <th>What it is</th>
              <th>Status</th>
              <th>Set by</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const p = byName.get(row.name);
              const index = hostRows.indexOf(row) + 1;
              const open = openId === row.id;
              const word = STATE_WORD[normalize(row.state)];
              return (
                <Fragment key={row.id}>
                  <tr className={open ? 'tr--open' : undefined}>
                    <td className="muted">{index}</td>
                    <td>
                      <code className="rowid">{row.id}</code>
                    </td>
                    <td className="cell-name">
                      {p ? (
                        <Link to={`/plugins/${p.name}`}>{p.plain?.headline || friendlyName(p)}</Link>
                      ) : (
                        <span className="muted">{row.name}</span>
                      )}
                      {p && <div className="what__line">{oneLiner(p).slice(0, 110)}</div>}
                    </td>
                    <td>
                      <Badge tone={word.tone} title={row.disabledExpr || undefined}>
                        {word.label}
                      </Badge>
                    </td>
                    <td className="cell-layer">{row.layer}</td>
                    <td>
                      <button type="button" className="linkish" onClick={() => setOpenId(open ? null : row.id)} aria-expanded={open}>
                        {open ? 'hide' : 'details'}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="tr--detail">
                      <td colSpan={6}>
                        <RowDetail row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">Nothing matches that filter.</div>}
      </div>
    </div>
  );
}

function RowDetail({ row }: { row: HostRow }) {
  return (
    <div className="rowdetail">
      {row.disabledExpr && (
        <div className="rowdetail__block">
          <div className="rowdetail__label">Only switched on when</div>
          <pre className="code">{row.disabledExpr}</pre>
        </div>
      )}
      {row.config !== null && row.config !== undefined && (
        <div className="rowdetail__block">
          <div className="rowdetail__label">Settings for this line</div>
          <pre className="code">{JSON.stringify(row.config, null, 2)}</pre>
        </div>
      )}
      {row.rationale.map((text, i) => (
        <div key={i} className="rowdetail__block">
          <div className="rowdetail__label">
            The note the makers left above this line{i > 0 ? ` (earlier layer ${i + 1})` : ''}
          </div>
          <pre className="rationale__text">{text}</pre>
        </div>
      ))}
      {!row.hasConfig && row.rationale.length === 0 && (
        <div className="muted">This line has no settings and no note beside it.</div>
      )}
    </div>
  );
}

function normalize(state: string): StateFilter | 'group' {
  if (state.startsWith('conditional')) return 'conditional';
  if (state === 'disabled') return 'disabled';
  if (state === 'enabled') return 'enabled';
  return 'group';
}
