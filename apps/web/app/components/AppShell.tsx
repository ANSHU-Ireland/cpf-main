'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AppWindow, List, X } from '@phosphor-icons/react';
import { SidebarNav, type NavItem } from './SidebarNav';

export interface AppShellProps {
  readonly navLabel: string;
  readonly navItems: readonly NavItem[];
  readonly children: ReactNode;
  readonly homeHref?: string;
  readonly workspaceLabel?: string;
}

/**
 * Role-aware application chrome: a top bar with the product mark plus a responsive sidebar/main
 * layout. Collapses to a single column below the medium breakpoint via CSS grid + media query
 * embedded here (kept local to the shell so the token variables remain the only shared styling).
 */
export function AppShell({
  navLabel,
  navItems,
  children,
  homeHref = '/account/profile',
  workspaceLabel = 'Workspace',
}: AppShellProps): React.JSX.Element {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .cpf-shell { display: grid; grid-template-columns: 1fr; gap: 0; }
            .cpf-shell__header { position: sticky; inset-block-start: 0; z-index: 30; }
            .cpf-shell__aside { display: none; border-block-end: 1px solid var(--color-line); }
            .cpf-shell__aside[data-open='true'] { display: flex; }
            .cpf-shell__date, .cpf-shell__workspace, .cpf-shell__switch { display: none; }
            .cpf-shell__menu { display: inline-flex; }
            .cpf-shell__mobile-switch { display: inline-flex; }
            .cpf-shell__main { padding: calc(var(--space-unit) * 4); }
            @media (min-width: 768px) {
              .cpf-shell { grid-template-columns: 196px minmax(0, 1fr); }
              .cpf-shell__aside {
                display: flex;
                border-block-end: none;
                border-inline-end: 1px solid var(--color-line);
                position: sticky;
                inset-block-start: 68px;
                block-size: calc(100vh - 68px);
                overflow-y: auto;
              }
              .cpf-shell__date, .cpf-shell__workspace, .cpf-shell__switch { display: inline-flex; }
              .cpf-shell__menu, .cpf-shell__mobile-switch { display: none; }
              .cpf-shell__main { padding: calc(var(--space-unit) * 4) calc(var(--space-unit) * 6); }
            }
          `,
        }}
      />
      <header
        className="cpf-shell__header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'calc(var(--space-unit) * 3)',
          minHeight: 68,
          padding: 'calc(var(--space-unit) * 3) calc(var(--space-unit) * 5)',
          background: 'var(--color-paper)',
          borderBlockEnd: '1px solid var(--color-line)',
        }}
      >
        <Link
          href={homeHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--color-ink)',
            textDecoration: 'none',
          }}
        >
          <AppWindow size={32} weight="fill" color="var(--color-blue)" aria-hidden />
          <span style={{ display: 'grid', lineHeight: 1.1 }}>
            <strong>CPF</strong>
            <small style={{ marginTop: 5, color: 'var(--color-muted)' }}>Competency platform</small>
          </span>
        </Link>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <small
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'var(--color-amber-soft)',
              color: 'var(--color-amber)',
              fontWeight: 700,
            }}
          >
            Synthetic demo
          </small>
          <small className="cpf-shell__date" style={{ color: 'var(--color-muted)' }}>
            10 August 2026
          </small>
          <strong
            className="cpf-shell__workspace"
            style={{
              padding: '5px 10px',
              borderRadius: 999,
              background: 'var(--color-blue-soft)',
              color: 'var(--color-blue)',
              fontSize: 12,
            }}
          >
            {workspaceLabel}
          </strong>
          <Link
            className="cpf-shell__switch"
            href="/sign-in"
            style={{ color: 'var(--color-blue)', fontSize: 12, fontWeight: 650 }}
          >
            Switch workspace
          </Link>
          <button
            type="button"
            className="cpf-shell__menu"
            aria-expanded={navOpen}
            aria-controls="workspace-navigation"
            aria-label={navOpen ? 'Close workspace navigation' : 'Open workspace navigation'}
            onClick={() => setNavOpen((open) => !open)}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-control)',
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
            }}
          >
            {navOpen ? <X size={22} aria-hidden /> : <List size={22} aria-hidden />}
          </button>
        </span>
      </header>
      <div className="cpf-shell" style={{ flex: 1 }}>
        <aside
          id="workspace-navigation"
          className="cpf-shell__aside"
          data-open={navOpen ? 'true' : 'false'}
          style={{
            flexDirection: 'column',
            background: 'var(--color-nav)',
            padding: 'calc(var(--space-unit) * 3)',
          }}
        >
          <SidebarNav label={navLabel} items={navItems} onNavigate={() => setNavOpen(false)} />
          <div
            style={{
              marginTop: 'auto',
              padding: '18px 8px 4px',
              borderBlockStart: '1px solid var(--color-line)',
            }}
          >
            <small style={{ color: 'var(--color-muted)', fontWeight: 650 }}>Tenant</small>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 650 }}>Northstar Logistics</div>
            <Link
              href="/sign-in"
              className="cpf-shell__mobile-switch"
              onClick={() => setNavOpen(false)}
              style={{ marginTop: 14, color: 'var(--color-blue)', fontSize: 12, fontWeight: 650 }}
            >
              Switch workspace
            </Link>
          </div>
        </aside>
        <main
          id="main"
          className="cpf-shell__main"
          style={{
            maxWidth: '1150px',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
