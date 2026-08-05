import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly title: string;
  readonly headingId: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}

/** Consistent page title block; the h1 is targeted by each route's landmark region. */
export function PageHeader({
  title,
  headingId,
  description,
  actions,
}: PageHeaderProps): React.JSX.Element {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'calc(var(--space-unit) * 3)',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBlockEnd: 'calc(var(--space-unit) * 5)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
        <h1 id={headingId} style={{ margin: 0, fontSize: '1.5rem' }}>
          {title}
        </h1>
        {description ? (
          <p style={{ margin: 0, color: 'var(--color-muted)', maxWidth: '60ch' }}>{description}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 'var(--space-unit)' }}>{actions}</div> : null}
    </header>
  );
}
