import { useState } from 'react';
import { Badge } from '../components/Badge';
import { Markdown } from '../components/Markdown';
import { guides } from '../lib/data';

export function Guides() {
  const [active, setActive] = useState(0);
  const guide = guides[active];
  const skills = [...new Set(guides.map((g) => g.skill))];

  return (
    <div className="page">
      <section className="hero hero--compact">
        <div className="hero__eyebrow">Warning: this section is for developers</div>
        <h1 className="hero__title">Build your own</h1>
        <p className="hero__lead">
          The assistant ships its own instruction manual for people who want to add to it. Everything
          on this page is that manual, copied word for word — it is deliberately technical and it
          assumes you are comfortable writing JavaScript. If you only wanted to know what the plugins
          do, you are in the wrong place; try <strong>All plugins</strong> or{' '}
          <strong>Words explained</strong> instead.
        </p>
        <div className="hero__meta">
          {skills.map((s) => (
            <Badge key={s} tone="outline">
              {s}
            </Badge>
          ))}
        </div>
      </section>

      <div className="guides">
        <nav className="guides__nav">
          {guides.map((g, i) => (
            <button
              key={g.file}
              type="button"
              className={`guides__item${i === active ? ' guides__item--active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="guides__item-title">{g.title}</span>
              <span className="guides__item-note">{g.note}</span>
            </button>
          ))}
        </nav>
        <article className="guides__body panel">
          <div className="guides__body-head">
            <h2 className="panel__title">{guide.title}</h2>
            <code className="muted">
              {guide.skill}/{guide.file}
            </code>
          </div>
          {guide.description && <p className="panel__lead">{guide.description}</p>}
          <Markdown markdown={guide.markdown} />
        </article>
      </div>
    </div>
  );
}
