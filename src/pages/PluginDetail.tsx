import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Markdown } from '../components/Markdown';
import {
  AUDIENCE_LABEL,
  EFFORT_HINT,
  EFFORT_LABEL,
  bestForOf,
  byName,
  effortOf,
  formatBytes,
  friendlyName,
  groups,
  loadReadme,
  oneLiner,
  plainStatus,
  shortName,
} from '../lib/data';
import { Link } from '../lib/router';
import { Icon } from './Plugins';

interface Props {
  name: string;
}

const PRESET_LABEL: Record<string, string> = {
  standard: 'Everyday work',
  ptc: 'Code-style tools',
  minimal: 'Bare minimum',
  cordis: 'Tool building',
};

export function PluginDetail({ name }: Props) {
  const plugin = byName.get(name);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMarkdown(null);
    setMissing(false);
    if (!plugin) return;
    const promise = loadReadme(plugin.name);
    if (!promise) {
      setMissing(true);
      return;
    }
    let alive = true;
    promise.then(
      (text) => alive && setMarkdown(text),
      () => alive && setMissing(true),
    );
    return () => {
      alive = false;
    };
  }, [plugin?.name]);

  const siblings = useMemo(
    () => (plugin ? (groups.find((g) => g.group === plugin.group)?.plugins ?? []).filter((p) => p.name !== plugin.name) : []),
    [plugin],
  );

  if (!plugin) {
    return (
      <div className="page">
        <section className="hero">
          <h1 className="hero__title">We could not find that one</h1>
          <p className="hero__lead">
            There is no plugin called <code>{name}</code> in this version.
          </p>
          <p>
            <Link to="/plugins">See all 287 parts →</Link>
          </p>
        </section>
      </div>
    );
  }

  const plain = plugin.plain;
  const status = plainStatus(plugin);
  const effort = effortOf(plugin);
  const isLibrary = plain?.kind === 'library';
  const presetsUsing = [...new Set(plugin.presets.map((x) => x.preset))];

  return (
    <div className="page">
      <section className="detail-head">
        <div className="detail-head__main">
          <div className="detail-head__eyebrow">
            {plain?.kind === 'plugin' && <Icon name={plain.icon} />}
            <span className="tag">{plugin.group}</span>
          </div>
          <h1 className="detail-head__title">{plain?.headline || friendlyName(plugin)}</h1>
          {/* The reader came here to learn what a thing is called. */}
          <div className="detail-head__pkg">
            <span className="detail-head__pkg-label">called</span>
            <code>{shortName(plugin.name)}</code>
            <span className="muted">version {plugin.version}</span>
          </div>
          <p className="detail-head__lead">
            {plain ? (plain.kind === 'plugin' ? plain.whatItDoes : plain.whatItDoes) : oneLiner(plugin)}
          </p>
          {/* Every label lives in its own wrapping row: identity above, status here.
              Putting them in the eyebrow row clipped the later badges out of view. */}
          <div className="detail-head__badges">
            <Badge tone={status.tone}>{status.label}</Badge>
            {effort && <Badge tone="outline">{EFFORT_LABEL[effort]}</Badge>}
            {plain?.safeToIgnore && <Badge tone="muted">safe to ignore</Badge>}
            {isLibrary && !plain?.isPack && <Badge tone="neutral">internal part</Badge>}
            {isLibrary && plain?.isPack && <Badge tone="outline">add-on pack</Badge>}
            {bestForOf(plugin).map((audience) => (
              <Badge key={audience} tone="outline">
                {AUDIENCE_LABEL[audience]}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          {plain && plain.kind === 'plugin' && (
            <>
              <section className="panel panel--why">
                <h2 className="panel__title">Why you would care</h2>
                <p className="why__text">{plain.whyYoudCare}</p>
              </section>

              <div className="proscons">
                <section className="panel panel--pros">
                  <h2 className="panel__title">
                    <span className="pc-dot pc-dot--pro" aria-hidden /> Good things
                  </h2>
                  <ul className="pclist">
                    {plain.pros.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="panel panel--cons">
                  <h2 className="panel__title">
                    <span className="pc-dot pc-dot--con" aria-hidden /> Things to know
                  </h2>
                  <ul className="pclist">
                    {plain.cons.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="whenwhen">
                <section className="panel">
                  <h2 className="panel__title">Use it when</h2>
                  <ul className="whenlist whenlist--yes">
                    {plain.useWhen.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="panel">
                  <h2 className="panel__title">Skip it when</h2>
                  <ul className="whenlist whenlist--no">
                    {plain.skipWhen.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              {effort && (
                <section className="panel panel--effort">
                  <h2 className="panel__title">What it takes to use</h2>
                  <p className="effort__line">
                    <strong>{EFFORT_LABEL[effort]}.</strong> {EFFORT_HINT[effort]}
                  </p>
                  {bestForOf(plugin).length > 0 && (
                    <p className="effort__audience">
                      Best for: {bestForOf(plugin).map((a) => AUDIENCE_LABEL[a]).join(', ').toLowerCase()}.
                    </p>
                  )}
                </section>
              )}
            </>
          )}

          {isLibrary && (
            <section className="panel">
              <h2 className="panel__title">
                {plain?.isPack ? 'Should you install this?' : 'Do I need to do anything?'}
              </h2>
              <p className="panel__lead">
                {plain?.isPack
                  ? 'This is an add-on pack: installing it adds a group of related abilities at once. It is not installed in your setup, so there is nothing to configure right now, and nothing breaks if you leave it alone. Installing one is a deliberate choice, and it runs code from the pack inside the assistant.'
                  : 'No. This is one of the internal building blocks the assistant uses to run itself. It cannot be switched on or off by you, it has no settings worth changing, and nothing will break if you ignore it. It is listed here only so the full picture is complete — the technical description is below.'}
              </p>
            </section>
          )}

          <details className="technical">
            <summary>
              <span>Technical details</span>
              <span className="technical__hint">the exact settings, and the makers' own reference</span>
            </summary>
            <div className="technical__body">
              <section className="panel">
                <h2 className="panel__title">
                  How it is switched on <span className="panel__count">{plugin.rows.length}</span>
                </h2>
                {plugin.rows.length === 0 ? (
                  <p className="panel__lead">
                    Nothing in this version's settings switches this part on directly. It is either an
                    internal building block, or a part that an add-on pack would install.
                  </p>
                ) : (
                  <div className="rowcards">
                    {plugin.rows.map((row) => (
                      <article key={row.id} className="rowcard">
                        <header className="rowcard__head">
                          <code className="rowcard__id">{row.id}</code>
                          <Badge tone={row.state === 'enabled' ? 'success' : row.state === 'disabled' ? 'muted' : 'warn'}>
                            {row.state.replace(' (!!js)', '')}
                          </Badge>
                          {row.disabledExpr && <code className="rowcard__expr">only when {row.disabledExpr}</code>}
                        </header>
                        <div className="rowcard__meta">
                          <span>
                            set by: <strong>{row.layer}</strong>
                          </span>
                          <span>{row.hasConfig ? 'has settings' : 'no settings'}</span>
                        </div>
                        {row.rationale.length > 0 && (
                          <div className="rowcard__rationale">
                            {row.rationale.map((text, i) => (
                              <div key={i} className="rationale">
                                <div className="rationale__label">
                                  the note the makers left above this line in the settings file
                                </div>
                                <pre className="rationale__text">{text}</pre>
                              </div>
                            ))}
                          </div>
                        )}
                        {row.config !== null && row.config !== undefined && (
                          <details className="disclose">
                            <summary>Show the settings for this line</summary>
                            <pre className="code">{JSON.stringify(row.config, null, 2)}</pre>
                          </details>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel">
                <h2 className="panel__title">The makers' reference</h2>
                <p className="panel__lead">
                  This is the original documentation that ships with the plugin, written for engineers.
                  It is the source for everything on this page.
                </p>
                {markdown ? (
                  <div className="reference reference--single">
                    <Markdown markdown={markdown} />
                  </div>
                ) : missing ? (
                  <p className="panel__lead">This part ships without a written reference.</p>
                ) : (
                  <p className="panel__lead">Loading…</p>
                )}
              </section>
            </div>
          </details>
        </div>

        <aside className="detail-aside">
          <section className="aside-card">
            <h3 className="aside-card__title">At a glance</h3>
            <dl className="facts">
              <dt>Status</dt>
              <dd>{status.label}</dd>
              {effort && (
                <>
                  <dt>What it takes</dt>
                  <dd>{EFFORT_LABEL[effort]}</dd>
                </>
              )}
              {bestForOf(plugin).length > 0 && (
                <>
                  <dt>Best for</dt>
                  <dd>{bestForOf(plugin).map((a) => AUDIENCE_LABEL[a]).join(', ')}</dd>
                </>
              )}
              <dt>Category</dt>
              <dd>{plugin.group}</dd>
              <dt>Type</dt>
              <dd>{isLibrary ? 'internal building block' : 'usable part'}</dd>
            </dl>
          </section>

          {presetsUsing.length > 0 && (
            <section className="aside-card">
              <h3 className="aside-card__title">Available in</h3>
              <ul className="plainlist">
                {presetsUsing.map((id) => (
                  <li key={id}>
                    <Link to="/presets" className="plainlist__link">
                      {PRESET_LABEL[id] ?? id}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="aside-card__note">
                Different chats get different sets of tools. This one appears in the sessions listed
                above.
              </p>
            </section>
          )}

          <section className="aside-card">
            <h3 className="aside-card__title">Same category</h3>
            <ul className="plainlist">
              {siblings.slice(0, 20).map((p) => (
                <li key={p.name}>
                  <Link to={`/plugins/${p.name}`} className="plainlist__link">
                    {p.plain?.headline || friendlyName(p)}
                  </Link>
                </li>
              ))}
              {siblings.length === 0 && <li className="muted">Nothing else in this category.</li>}
            </ul>
          </section>

          <section className="aside-card">
            <h3 className="aside-card__title">For engineers</h3>
            <dl className="facts">
              <dt>Package</dt>
              <dd>
                <code>{plugin.pkg}</code>
              </dd>
              <dt>Reference size</dt>
              <dd>{plugin.readme ? formatBytes(plugin.readme.bytes) : 'none'}</dd>
              <dt>Settings lines</dt>
              <dd>{plugin.rows.length}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
