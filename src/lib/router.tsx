import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

/**
 * A deliberately small hash router: the catalogue is a handful of views and
 * hash routing keeps the built site working from any static host, or straight
 * from the filesystem.
 */
function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : '/';
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export function navigate(to: string): void {
  if (window.location.hash === `#${to}`) return;
  window.location.hash = to;
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={`#${to}`}
      onClick={(event) => {
        onClick?.(event);
        // Let the hash change drive the router, but avoid a full jump if the
        // route is unchanged.
        if (window.location.hash === `#${to}`) {
          event.preventDefault();
          scrollToTop();
        }
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
