import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
  readonly children: ReactNode;
  readonly as?: 'section' | 'article' | 'div';
  readonly padded?: boolean;
  readonly style?: CSSProperties;
  readonly 'aria-labelledby'?: string;
  readonly 'aria-label'?: string;
}

/** Elevated surface using the token radius/line palette. */
export function Card({
  children,
  as = 'section',
  padded = true,
  style,
  ...aria
}: CardProps): React.JSX.Element {
  const Tag = as;
  return (
    <Tag
      {...aria}
      style={{
        background: 'var(--color-paper)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-surface)',
        padding: padded ? 'calc(var(--space-unit) * 5)' : 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
