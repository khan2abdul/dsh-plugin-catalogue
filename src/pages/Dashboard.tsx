import { Badge } from '../components/Badge';
import { Icon } from './Plugins';
import {
  AUDIENCE_LABEL,
  EFFORT_LABEL,
  STATE_HINT,
  STATE_LABEL,
  STATE_SHORT,
  STATE_TONE,
  bestForOf,
  byName,
  effortOf,
  hostRows,
  installState,
  oneLiner,
  plugins,
  presets,
  shortName,
  stateCounts,
  stats,
} from '../lib/data';
import { Link } from '../lib/router';
import type { InstallState } from '../lib/data';
import type { Plugin } from '../lib/types';

function byState(state: InstallState): Plugin[] {
  const wanted = plugins.filter((p) => installState(p) === state);
  // Working-now lists the user-facing parts first, then the plumbing.
  if (state !== 'working') return wanted.sort((a, b) => a.name.localeCompare(b.name));
  return wanted.sort((a, b) => {
    const ai = a.plain?.kind === 'plugin' ? 1 : 0;
    const bi = b.plain?.kind === 'plugin' ? 1 : 0;
    return bi - ai || a.name.localeCompare(b.name);
  });
}

/** A dense, named list: the plugin's real name plus what it does. */
function Inventory({ state, limit }: { state: InstallState; limit?: number }) {
  const all = byState(state);
  const shown = limit ? all.slice(0, limit) : all;
  return (
    <>
      <div className="inventory">
        {shown.map((p) => (
          <Link key={p.name} to={`/plugins/${p.name}`} className="inv">
            <span className="inv__top">
              {p.plain?.kind === 'plugin' && <Icon name={p.plain.icon} />}
              <code className="inv__name">{shortName(p.name)}</code>
            </span>
            <span className="inv__headline">{p.plain?.headline ?? oneLiner(p)}</span>
            <span className="inv__line">{oneLiner(p)}</span>
          </Link>
        ))}
      </div>
      {limit && all.length > limit && (
        <p className="panel__note">
          {all.length - limit} more in this group.{' '}
          <Link to="/plugins">Open the full list and filter by “{STATE_SHORT[state]}”</Link>.
        </p>
      )}
    </>
  );
}

function StateHeading({ state, blurb }: { state: InstallState; blurb: string }) {
  return (
    <div className="stateblock__head">
      <h3 className="stateblock__title">
        {STATE_LABEL[state]}
        <span className="panel__count">{stateCounts[state]}</span>
      </h3>
      <p className="stateblock__blurb">{blurb}</p>
    </div>
  );
}

export function Dashboard() {
  const c = stats.counts;
  const disabledRows = hostRows.filter((r) => r.state === 'disabled');
  const conditionalRows = hostRows.filter((r) => r.state === 'conditional');
  const maxGroup = Math.max(...Object.values(stats.groupCounts));
  const sortedGroups = Object.entries(stats.groupCounts)
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__eyebrow">Start here</div>
        <h1 className="hero__title">What you have, what it does, and what it is called</h1>
        <p className="hero__lead">
          Below is every part that comes with this version of DeepSeek Harness — {c.packagesTotal} of
          them — split into what is already running for you, what is installed and could be switched
          on, and what this version does not include. Each one shows its name and a plain description,
          so you can find it again later.
        </p>
        <div className="hero__meta">
          <Badge tone="success">{stateCounts.working} working now</Badge>
          <Badge tone="warn">{stateCounts.off} you can switch on</Badge>
          <Badge tone="muted">{stateCounts.absent} not in this version</Badge>
          <Badge tone="neutral">{stateCounts.internal} internal parts</Badge>
        </div>
      </section>

      {/* ── the inventory: the answer to "what do I have?" ─────────────────── */}
      <section className="panel panel--inventory">
        <h2 className="panel__title">Your plugins, by state</h2>
        <p className="panel__lead">
          Names shown are the technical ones you will see in settings and on the plugin pages. Click
          any of them for the full explanation: what it does, when to use it, its good points and the
          things to know.
        </p>

        <div className="jumpbar">
          {(['working', 'off', 'absent', 'internal'] as InstallState[]).map((s) => (
            <a key={s} href={`#state-${s}`} className={`jump jump--${s}`}>
              <span className="jump__count">{stateCounts[s]}</span>
              <span className="jump__label">{STATE_SHORT[s]}</span>
            </a>
          ))}
        </div>

        <div className="stateblock" id="state-working">
          <StateHeading
            state="working"
            blurb="Already switched on and doing their job in your sessions. You do not need to do anything about these — they are listed so you know what you have."
          />
          <Inventory state="working" limit={40} />
        </div>

        <div className="stateblock" id="state-off">
          <StateHeading
            state="off"
            blurb="These are on your computer but not running. This is the group worth your attention: to use one, it has to be switched on in settings or by the session's setup. Each page says what it needs."
          />
          <Inventory state="off" />
        </div>

        <div className="stateblock" id="state-absent">
          <StateHeading
            state="absent"
            blurb="Parts that exist in the harness but are not included in this version. Nothing to switch on here — they are listed so the picture is complete and so you can recognise the name."
          />
          <Inventory state="absent" limit={18} />
        </div>

        <div className="stateblock" id="state-internal">
          <StateHeading
            state="internal"
            blurb="Building blocks the assistant uses to run itself. You cannot switch these on or off, and nothing breaks if you ignore them."
          />
          <Inventory state="internal" limit={12} />
        </div>
      </section>

      <section className="panel panel--lead">
        <h2 className="panel__title">How to read the states</h2>
        <ul className="startlist">
          {(['working', 'off', 'absent', 'internal'] as InstallState[]).map((s) => (
            <li key={s}>
              <strong>{STATE_LABEL[s]}.</strong> {STATE_HINT[s]}{' '}
              <Link to="/plugins">Show only these →</Link>
            </li>
          ))}
        </ul>
        <p className="panel__note">
          Confused by any word on this site? <Link to="/glossary">Words explained</Link> defines every
          one of them in plain English.
        </p>
      </section>

      <section className="stats-grid">
        <div className="stat" title="Parts in this version">
          <div className="stat__value">{c.packagesTotal}</div>
          <div className="stat__label">parts in total</div>
        </div>
        <div className="stat stat--success" title="Switched on right now">
          <div className="stat__value">{stateCounts.working}</div>
          <div className="stat__label">working now</div>
        </div>
        <div className="stat stat--warn" title="Installed but not running">
          <div className="stat__value">{stateCounts.off}</div>
          <div className="stat__label">you can switch on</div>
        </div>
        <div className="stat" title="Not included in this version">
          <div className="stat__value">{stateCounts.absent}</div>
          <div className="stat__label">not in this version</div>
        </div>
        <div className="stat" title="Building blocks you cannot switch on">
          <div className="stat__value">{stateCounts.internal}</div>
          <div className="stat__label">internal parts</div>
        </div>
        <div className="stat" title="Different chats can get different sets of tools">
          <div className="stat__value">{c.presets}</div>
          <div className="stat__label">session setups</div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">How your setup is built up</h2>
        <p className="panel__lead">
          Think of it as layers of a cake. Each layer is applied on top of the previous one, and if two
          layers disagree about the same part, the lower layer wins. That is why your setup differs
          slightly from somebody else's even with the same app installed.
        </p>
        <ol className="layers">
          {[
            { name: 'The shared foundation', detail: 'The parts almost everything else needs: talking to the AI service, saving your chats, safety limits, the basic tools. The largest layer.' },
            { name: 'The window you are looking at', detail: 'Everything that draws the interface: the sidebar, the chat view, settings pages, and the buttons connecting them to the foundation.' },
            { name: 'Session setups', detail: 'Four ready-made sets of tools. Each new chat picks one, which is why two chats can behave differently.' },
            { name: 'Your own changes', detail: 'Anything you change yourself is applied last, so it always wins. This layer is currently empty in your installation.' },
            { name: 'Temporary overrides', detail: 'Extra changes passed when starting the app. Rare, and nothing is set here at the moment.' },
          ].map((layer, i) => (
            <li key={layer.name} className="layer">
              <span className="layer__index">{i + 1}</span>
              <div className="layer__body">
                <div className="layer__name">{layer.name}</div>
                <div className="layer__detail">{layer.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2 className="panel__title">Session setups</h2>
        <p className="panel__lead">
          A setup decides which tools one chat gets. This is the main reason two conversations can
          behave differently — one might be able to run commands while another can only read.
        </p>
        <div className="cards">
          {presets.map((p) => (
            <Link key={p.id} to="/presets" className="card">
              <div className="card__head">
                <span className="card__title">
                  {p.id === 'standard' ? 'Everyday work' : p.id === 'ptc' ? 'Code-style tools' : p.id === 'minimal' ? 'Bare minimum' : 'Tool building'}
                </span>
                {p.id === 'standard' && <Badge tone="business">the default</Badge>}
              </div>
              <div className="card__meta">{p.flatCount} tools available</div>
              <div className="card__desc">
                {p.id === 'standard'
                  ? 'The one you are using. Reading and writing files, running commands, searching the web, planning, and delegating to helpers.'
                  : p.id === 'ptc'
                    ? 'Same abilities, but the assistant writes short programs that call the tools instead of calling them one at a time.'
                    : p.id === 'minimal'
                      ? 'A deliberately tiny set, for when you want speed and predictability over capability.'
                      : 'For inspecting and extending the harness itself.'}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2 className="panel__title">
            Installed but switched off <span className="panel__count">{disabledRows.length} settings lines</span>
          </h2>
          <p className="panel__lead">
            The raw count behind the “you can switch on” group above, one line per part. A session
            setup normally decides these, so a chat can have a tool another chat does not.
          </p>
          <ul className="rowlist">
            {disabledRows.map((r) => {
              const p = byName.get(r.name);
              return (
                <li key={r.id}>
                  <Link to={`/plugins/${p?.name ?? ''}`} className="rowlist__id">
                    {p ? shortName(p.name) : r.name}
                  </Link>
                  <span className="rowlist__row">{p ? oneLiner(p).slice(0, 70) : r.id}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h2 className="panel__title">
            Depends on your computer <span className="panel__count">{conditionalRows.length}</span>
          </h2>
          <p className="panel__lead">
            These switch themselves on only in the right situation — on Windows rather than Mac, or
            only in the desktop app. You never choose; they appear where they apply.
          </p>
          <ul className="rowlist">
            {conditionalRows.map((r) => {
              const p = byName.get(r.name);
              return (
                <li key={r.id}>
                  <Link to={`/plugins/${p?.name ?? ''}`} className="rowlist__id">
                    {p ? shortName(p.name) : r.name}
                  </Link>
                  <span className="rowlist__row">
                    {r.disabledExpr.includes('win32')
                      ? 'Windows only'
                      : r.disabledExpr.includes('darwin')
                        ? 'Mac or Windows only'
                        : r.disabledExpr.includes('desktop')
                          ? 'Desktop app only'
                          : 'Only in certain setups'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel__title">What the parts are grouped by</h2>
        <p className="panel__lead">
          {sortedGroups.length} categories, largest first. The biggest by far is the interface itself —
          a modern app window is made of dozens of small pieces.
        </p>
        <div className="bars">
          {sortedGroups.map((g) => (
            <Link key={g.group} to="/plugins" className="bar">
              <span className="bar__label">{g.group}</span>
              <span className="bar__track">
                <span className="bar__fill" style={{ width: `${(g.count / maxGroup) * 100}%` }} />
              </span>
              <span className="bar__value">{g.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">Where this information comes from</h2>
        <p className="panel__lead">
          Nothing here was written from memory. Every explanation, every option and every stated
          drawback was read out of the app you have installed — the packages' own documentation, the
          settings files, and the notes the engineers wrote beside each line. If a drawback is not
          documented by the makers, this site says so instead of inventing one.
        </p>
        <p className="panel__lead">
          Each plugin page also shows a badge for its state: {(['working', 'off', 'absent', 'internal'] as InstallState[])
            .map((s) => `${STATE_LABEL[s]} (${STATE_TONE[s]})`)
            .join(', ')}
          . {''}
          For the engineering view, <Link to="/composition">Under the hood</Link> lists all{' '}
          {c.hostRows} settings lines; <Link to="/guides">Build your own</Link> is the developer guide.
        </p>
        <p className="panel__note">
          Spot-checked example: <code>dsh-tool-web</code> is {EFFORT_LABEL[effortOf(byName.get('dsh-tool-web')!) ?? 'one setting'].toLowerCase()} and best for{' '}
          {bestForOf(byName.get('dsh-tool-web')!).map((a) => AUDIENCE_LABEL[a].toLowerCase()).join(', ')} —{' '}
          <Link to="/plugins/dsh-tool-web">open its page</Link>.
        </p>
      </section>
    </div>
  );
}
