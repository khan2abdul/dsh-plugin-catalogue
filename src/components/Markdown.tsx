import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

interface Props {
  markdown: string;
  className?: string;
}

/**
 * Renders first-party package documentation. Content comes from the shipped
 * `app.asar`, so it is trusted; in-page `#anchor` links are intercepted so they
 * scroll instead of replacing the route hash.
 */
export function Markdown({ markdown, className }: Props) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  return (
    <div
      className={className ? `md ${className}` : 'md'}
      onClick={(event) => {
        const anchor = (event.target as HTMLElement).closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') ?? '';
        if (href.startsWith('#')) {
          event.preventDefault();
          const id = href.slice(1);
          const target =
            document.getElementById(id) ??
            (document.querySelector(`[name="${CSS.escape(id)}"]`) as HTMLElement | null);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            const el = document.querySelector(href);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
        if (href.startsWith('http')) {
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noreferrer noopener');
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
