import { Link } from '../lib/router';
import { groups, installState, oneLiner, plugins, shortName, stateCounts, stats } from '../lib/data';
import type { Plugin } from '../lib/types';

export interface Filters {
  query: string;
  group: string;
  only: Only;
}

export type Only = 'all' | 'working' | 'off' | 'absent' | 'internal' | 'developers';

export const ONLY_LABELS: { id: Only; label: string; count?: number; hint: string }[] = [
  { id: 'all', label: 'Everything', count: stats.counts.packagesTotal, hint: 'Every part that comes with this version' },
  { id: 'working', label: 'Working now', count: stateCounts.working, hint: 'Switched on and running in your sessions right now' },
  { id: 'off', label: 'Can switch on', count: stateCounts.off, hint: 'On your computer but not running — you could turn these on' },
  { id: 'absent', label: 'Not in this version', count: stateCounts.absent, hint: 'Present in other builds, but not installed here' },
  { id: 'developers', label: 'For developers', hint: 'Only useful if you build or extend the harness' },
  { id: 'internal', label: 'Internal parts', count: stateCounts.internal, hint: 'Building blocks the assistant uses. Ignore these.' },
];

export function applyOnly(list: Plugin[], only: Only): Plugin[] {
  if (only === 'all') return list;
  if (only === 'developers') return list.filter((p) => p.plain?.bestFor.includes('developers'));
  return list.filter((p) => installState(p) === only);
}

const NAV = [
  { to: '/', label: 'Start here', icon: 'home' },
  { to: '/plugins', label: 'All plugins', icon: 'box', count: stats.counts.packagesTotal },
  { to: '/glossary', label: 'Words explained', icon: 'book' },
  { to: '/presets', label: 'Session setups', icon: 'users', count: stats.counts.presets },
  { to: '/composition', label: 'Under the hood', icon: 'layers', count: stats.counts.hostRows },
  { to: '/guides', label: 'Build your own', icon: 'wrench' },
];

interface Props {
  route: string;
  filters: Filters;
  onFilters: (next: Filters) => void;
  results: Plugin[];
}

export function Sidebar({ route, filters, onFilters, results }: Props) {
  const activeGroup = filters.group;
  const shown = results.slice(0, 250);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2.5 21 7v10l-9 4.5L3 17V7z" />
            <path d="M12 7.2 17 9.7v4.6L12 16.8 7 14.3V9.7z" />
          </svg>
        </div>
        <div className="sidebar__brand-text">
          <div className="sidebar__brand-name">DeepSeek Harness</div>
          <div className="sidebar__brand-sub">What each plugin does</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.map((item) => {
          const active = item.to === '/' ? route === '/' : route.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} className={`nav-item${active ? ' nav-item--active' : ''}`}>
              <NavIcon name={item.icon} />
              <span className="nav-item__label">{item.label}</span>
              {item.count !== undefined && <span className="nav-item__count">{item.count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__search">
        <svg className="sidebar__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={filters.query}
          placeholder="Search: web, files, safety…"
          onChange={(event) => onFilters({ ...filters, query: event.target.value })}
          aria-label="Search plugins"
        />
        {filters.query && (
          <button type="button" className="sidebar__clear" onClick={() => onFilters({ ...filters, query: '' })} title="Clear search">
            ×
          </button>
        )}
      </div>

      <div className="sidebar__section">
        <div className="sidebar__section-head">
          <span>Show me</span>
        </div>
        <div className="chipgrid">
          {ONLY_LABELS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              className={`chip chip--block${filters.only === option.id ? ' chip--active' : ''}`}
              onClick={() => onFilters({ ...filters, only: option.id })}
            >
              <span className="chip__text">{option.label}</span>
              {option.count !== undefined && <span className="chip__count">{option.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar__section sidebar__section--cat">
        <div className="sidebar__section-head">
          <span>Category</span>
          {activeGroup && (
            <button type="button" className="linkish" onClick={() => onFilters({ ...filters, group: '' })}>
              clear
            </button>
          )}
        </div>
        {/* A dropdown keeps this aligned with the chips above it and avoids a
            second scrollbar in the middle of the sidebar. */}
        <select
          className="select"
          value={activeGroup}
          onChange={(event) => onFilters({ ...filters, group: event.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories ({plugins.length})</option>
          {groups.map((g) => (
            <option key={g.group} value={g.group}>
              {g.group} ({g.count})
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar__section sidebar__section--results">
        <div className="sidebar__section-head">
          <span>Matches</span>
          <span className="muted">{results.length}</span>
        </div>
        <div className="sidebar__results">
          {shown.map((p) => (
            <Link
              key={p.name}
              to={`/plugins/${p.name}`}
              className={`result${route === `/plugins/${p.name}` ? ' result--active' : ''}`}
            >
              <span className="result__name">{shortName(p.name)}</span>
              <span className="result__meta">{p.plain?.headline ?? oneLiner(p)}</span>
            </Link>
          ))}
          {results.length > shown.length && (
            <div className="sidebar__more">+{results.length - shown.length} more — narrow the search</div>
          )}
          {results.length === 0 && <div className="sidebar__more">Nothing matches. Try fewer words.</div>}
        </div>
      </div>

      <div className="sidebar__foot">
        <span className="muted">from DeepSeek Harness {stats.build.version}</span>
      </div>
    </aside>
  );
}

export function technicalName(p: Plugin): string {
  return shortName(p.name);
}

function NavIcon({ name }: { name: string }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9 } as const;
  switch (name) {
    case 'home':
      return (
        <svg {...common} aria-hidden>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common} aria-hidden>
          <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z" />
          <path d="M3.5 7 12 11.4 20.5 7M12 21.2v-9.8" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} aria-hidden>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M18 20a5.5 5.5 0 0 0-2-4.3" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common} aria-hidden>
          <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
          <path d="m3 12.5 9 4.5 9-4.5" />
        </svg>
      );
    case 'wrench':
      return (
        <svg {...common} aria-hidden>
          <path d="M14.5 6.5a4 4 0 0 1 5 5L11 20l-3-3z" />
          <path d="m5 15 4 4M17.5 3.5 21 7l-2 2-3.5-3.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
        </svg>
      );
  }
}

export const allPlugins = plugins;
