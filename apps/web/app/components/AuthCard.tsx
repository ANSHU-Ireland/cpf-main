import type { ReactNode } from 'react';
import { Card } from './Card';

export interface AuthCardProps {
  readonly title: string;
  readonly headingId: string;
  readonly intro?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/** Centred single-column container for unauthenticated flows (sign-in, MFA, recovery). */
export function AuthCard({
  title,
  headingId,
  intro,
  children,
  footer,
}: AuthCardProps): React.JSX.Element {
  return (
    <main
      id="main"
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'calc(var(--space-unit) * 10) calc(var(--space-unit) * 4)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '420px' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
            <h1 id={headingId} style={{ margin: 0, fontSize: '1.4rem' }}>
              {title}
            </h1>
            {intro ? <p style={{ margin: 0, color: 'var(--color-muted)' }}>{intro}</p> : null}
          </header>
          {children}
          {footer ? (
            <footer style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{footer}</footer>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
