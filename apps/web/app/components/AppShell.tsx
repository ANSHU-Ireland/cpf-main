import type { ReactNode } from 'react';
import Link from 'next/link';
import { SidebarNav, type NavItem } from './SidebarNav';

export interface AppShellProps {
  readonly navLabel: string;
  readonly navItems: readonly NavItem[];
  readonly children: ReactNode;
}

/**
 * Role-aware application chrome: a top bar with the product mark plus a responsive sidebar/main
 * layout. Collapses to a single column below the medium breakpoint via CSS grid + media query
 * embedded here (kept local to the shell so the token variables remain the only shared styling).
 */
export function AppShell({ navLabel, navItems, children }: AppShellProps): React.JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .cpf-shell { display: grid; grid-template-columns: 1fr; gap: 0; }
            .cpf-shell__aside { border-block-end: 1px solid var(--color-line); }
            @media (min-width: 768px) {
              .cpf-shell { grid-template-columns: 260px 1fr; }
              .cpf-shell__aside {
                border-block-end: none;
                border-inline-end: 1px solid var(--color-line);
                min-block-size: calc(100vh - 120px);
              }
            }
          `,
        }}
      />
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'calc(var(--space-unit) * 3)',
          padding: 'calc(var(--space-unit) * 3) calc(var(--space-unit) * 4)',
          background: 'var(--color-paper)',
          borderBlockEnd: '1px solid var(--color-line)',
        }}
      >
        <Link
          href="/account/profile"
          style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--color-ink)' }}
        >
          CPF <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>Workspace</span>
        </Link>
        <Link
          href="/sign-in"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minBlockSize: 'var(--target-min)',
            paddingInline: 'calc(var(--space-unit) * 3)',
            textDecoration: 'none',
            color: 'var(--color-ink)',
          }}
        >
          Sign out
        </Link>
      </header>
      <div className="cpf-shell" style={{ flex: 1 }}>
        <aside
          className="cpf-shell__aside"
          style={{ background: 'var(--color-nav)', padding: 'calc(var(--space-unit) * 3)' }}
        >
          <SidebarNav label={navLabel} items={navItems} />
        </aside>
        <main
          id="main"
          style={{
            padding: 'calc(var(--space-unit) * 6) calc(var(--space-unit) * 5)',
            maxWidth: '960px',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
