import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warn'
  | 'error'
  | 'business'
  | 'muted'
  | 'outline';

interface Props {
  tone?: BadgeTone;
  children: ReactNode;
  title?: string;
  mono?: boolean;
}

export function Badge({ tone = 'neutral', children, title, mono }: Props) {
  return (
    <span className={`badge badge--${tone}${mono ? ' badge--mono' : ''}`} title={title}>
      {children}
    </span>
  );
}

const STATE_TONE: Record<string, BadgeTone> = {
  enabled: 'success',
  disabled: 'muted',
  conditional: 'warn',
  group: 'business',
};

const STATE_LABEL: Record<string, string> = {
  enabled: 'enabled',
  disabled: 'disabled',
  conditional: 'conditional',
  group: 'group',
};

export function StateBadge({ state, expression }: { state: string; expression?: string }) {
  const tone = STATE_TONE[state] ?? 'neutral';
  const label = STATE_LABEL[state] ?? state;
  return (
    <Badge tone={tone} title={expression ? `disabled: !!js ${expression}` : undefined}>
      {label}
    </Badge>
  );
}
