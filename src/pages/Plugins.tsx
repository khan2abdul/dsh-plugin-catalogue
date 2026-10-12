import { Badge } from '../components/Badge';
import { ONLY_LABELS, type Filters } from '../components/Sidebar';
import {
  AUDIENCE_LABEL,
  EFFORT_HINT,
  EFFORT_LABEL,
  STATE_HINT,
  bestForOf,
  effortOf,
  friendlyName,
  installState,
  oneLiner,
  plainStatus,
  shortName,
} from '../lib/data';
import { Link } from '../lib/router';
import type { Plugin } from '../lib/types';

interface Props {
  results: Plugin[];
  filters: Filters;
  onFilters: (next: Filters) => void;
}

export function Plugins({ results, filters, onFilters }: Props) {
  const onlyLabel = ONLY_LABELS.find((o) => o.id === filters.only)?.label ?? 'Everything';

  return (
    <div className="page">
      <section className="hero hero--compact">
        <div className="hero__eyebrow">The whole list</div>
        <h1 className="hero__title">All plugins</h1>
        <p className="hero__lead">
          Every part that comes with this version of the assistant, in plain English. The most useful
          ones are listed first, and the internal plumbing is at the bottom where it belongs. Click any
          row to read what it does, when to use it, and its pros and cons.
        </p>
      </section>

      <div className="filters">
        {filters.only !== 'all' && (
          <span className="filters__chip">
            {onlyLabel}
            <button type="button" onClick={() => onFilters({ ...filters, only: 'all' })} title="Reset">
              ×
            </button>
          </span>
        )}
        {filters.group && (
          <span className="filters__chip">
            {filters.group}
            <button type="button" onClick={() => onFilters({ ...filters, group: '' })} title="Reset">
              ×
            </button>
          </span>
        )}
        {filters.query && (
          <span className="filters__chip">
            “{filters.query}”
            <button type="button" onClick={() => onFilters({ ...filters, query: '' })} title="Reset">
              ×
            </button>
          </span>
        )}
        <span className="filters__count">
          showing {results.length} of 287
        </span>
      </div>

      <div className="table-wrap">
        <table className="table table--reader">
          <thead>
            <tr>
              <th>What it is</th>
              <th>Status</th>
              <th>Who it is for</th>
              <th>What it takes</th>
              <th>Category</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.map((p) => {
              const status = plainStatus(p);
              const state = installState(p);
              const effort = effortOf(p);
              const isLibrary = p.plain?.kind === 'library';
              return (
                <tr key={p.name}>
                  <td className="cell-what">
                    <div className="what__head">
                      {p.plain?.kind === 'plugin' && <Icon name={p.plain.icon} />}
                      <code className="what__pkg">{shortName(p.name)}</code>
                    </div>
                    <div className="what__headline">{p.plain?.headline || friendlyName(p)}</div>
                    <div className="what__line">{oneLiner(p)}</div>
                  </td>
                  <td>
                    <Badge tone={status.tone} title={STATE_HINT[state]}>
                      {status.label}
                    </Badge>
                  </td>
                  <td className="cell-audience">
                    {bestForOf(p).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      bestForOf(p).map((a) => <Badge key={a} tone="outline">{AUDIENCE_LABEL[a]}</Badge>)
                    )}
                  </td>
                  <td className="cell-effort">
                    {isLibrary ? (
                      <span className="muted">
                        {p.plain?.kind === 'library' && p.plain.isPack ? 'add-on pack' : 'nothing to do'}
                      </span>
                    ) : effort ? (
                      <span className={`effort effort--${effort.replace(/ /g, '-')}`} title={EFFORT_HINT[effort]}>
                        {EFFORT_LABEL[effort]}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="tag">{p.group}</span>
                  </td>
                  <td>
                    <Link to={`/plugins/${p.name}`} className="linkish">
                      open →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {results.length === 0 && (
          <div className="empty">
            Nothing matches that. Try fewer words, or{' '}
            <button type="button" className="linkish" onClick={() => onFilters({ query: '', group: '', only: 'all' })}>
              clear the filters
            </button>{' '}
            to see all 287 parts.
          </div>
        )}
      </div>

      {filters.only === 'all' && !filters.query && !filters.group && (
        <p className="page__footnote">
          Sorted so the parts you are most likely to care about come first. Internal building blocks
          appear at the bottom and need no action from you.
        </p>
      )}
    </div>
  );
}

const ICON_PATHS: Record<string, string> = {
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3.5 9h17M3.5 15h17M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  shield: 'M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z',
  wrench: 'M14.5 6.5a4 4 0 0 1 5 5L11 20l-3-3zM5 15l4 4M17.5 3.5 21 7l-2 2-3.5-3.5z',
  plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4',
  robot: 'M6 9h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM9 13h.01M15 13h.01M12 5v4M9 4h6',
  folder: 'M3 7a2 2 0 0 1 2-2h3.5l2 2.5H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  terminal: 'M4 5h16v14H4zM8 10l2.5 2.5L8 15M13 15h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  lock: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z',
  layers: 'm12 3 9 4.5-9 4.5-9-4.5zM3 12.5l9 4.5 9-4.5',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 0 0 4 0',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-3.5-3.5',
  users: 'M9 5a3.2 3.2 0 1 0 0 6.4A3.2 3.2 0 0 0 9 5M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M18 20a5.5 5.5 0 0 0-2-4.3',
  box: 'M12 2.8 20.5 7v10L12 21.2 3.5 17V7zM3.5 7 12 11.4 20.5 7M12 21.2v-9.8',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7.5V12l3 2',
  database: 'M12 3c4.4 0 8 1.1 8 2.5S16.4 8 12 8 4 6.9 4 5.5 7.6 3 12 3M4 5.5v13C4 19.9 7.6 21 12 21s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  message: 'M4 5h16v11H9l-5 4z',
};

export function Icon({ name }: { name: string }) {
  const d = ICON_PATHS[name] ?? ICON_PATHS.box;
  return (
    <svg className="what__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={d} />
    </svg>
  );
}
