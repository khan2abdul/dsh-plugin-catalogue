import { useEffect, useMemo, useState } from 'react';
import { Sidebar, applyOnly, type Filters } from './components/Sidebar';
import { ThemeToggle, useTheme } from './components/ThemeToggle';
import { search, sortForReader, stats } from './lib/data';
import { Link, scrollToTop, useRoute } from './lib/router';
import { Dashboard } from './pages/Dashboard';
import { Plugins } from './pages/Plugins';
import { PluginDetail } from './pages/PluginDetail';
import { Composition } from './pages/Composition';
import { Presets } from './pages/Presets';
import { Guides } from './pages/Guides';
import { Glossary } from './pages/Glossary';

const TITLES: Record<string, string> = {
  '/': 'Start here',
  '/plugins': 'All plugins',
  '/glossary': 'Words explained',
  '/presets': 'Session setups',
  '/composition': 'Under the hood',
  '/guides': 'Build your own',
};

export function App() {
  const route = useRoute();
  const { theme, toggle } = useTheme();
  const [filters, setFilters] = useState<Filters>({ query: '', group: '', only: 'all' });

  const results = useMemo(() => {
    const matched = search(filters.query).filter((p) => !filters.group || p.group === filters.group);
    return applyOnly(matched, filters.only);
  }, [filters]);

  useEffect(() => {
    scrollToTop();
  }, [route]);

  const pluginName = route.startsWith('/plugins/') ? decodeURIComponent(route.slice('/plugins/'.length)) : '';
  const current = TITLES[route] ?? (pluginName ? 'Plugin details' : 'All plugins');

  return (
    <div className="app">
      <Sidebar route={route} filters={filters} onFilters={setFilters} results={results} />
      <main className="main">
        <header className="topbar">
          <div className="topbar__crumbs">
            <Link to="/" className="topbar__home">
              Home
            </Link>
            <span className="topbar__sep">/</span>
            <span className="topbar__current">{current}</span>
          </div>
          <div className="topbar__right">
            <span className="topbar__stat" title="Packages that come with this version">
              {stats.counts.packagesTotal} parts
            </span>
            <span className="topbar__stat" title="Parts that are on and working">
              {stats.counts.enabled} on
            </span>
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </header>
        <div className="main__scroll">
          {route === '/' && <Dashboard />}
          {route === '/plugins' && <Plugins results={sortForReader(results)} filters={filters} onFilters={setFilters} />}
          {route.startsWith('/plugins/') && <PluginDetail name={pluginName} />}
          {route === '/glossary' && <Glossary />}
          {route === '/presets' && <Presets />}
          {route === '/composition' && <Composition />}
          {route === '/guides' && <Guides />}
        </div>
      </main>
    </div>
  );
}
