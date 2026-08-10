'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AutosaveState } from '../../../lib/types';
import { RuntimeTimer } from '../components/RuntimeTimer';

function AutosaveBadge({ state }: { state: AutosaveState }): React.JSX.Element {
  const map: Record<AutosaveState, { label: string; color: string }> = {
    idle: { label: 'All changes saved', color: 'var(--color-muted)' },
    saving: { label: 'Saving…', color: 'var(--color-amber)' },
    saved: { label: 'All changes saved', color: 'var(--color-sage)' },
    error: { label: 'Save failed — retrying', color: 'var(--color-red)' },
  };
  const { label, color } = map[state];
  return (
    <span role="status" style={{ color, fontSize: '0.85rem' }}>
      {label}
    </span>
  );
}

function RuntimeTabs({ id, pathname }: { id: string; pathname: string }): React.JSX.Element {
  const base = `/candidate/attempt/${id}`;
  const tabs: readonly { href: string; label: string }[] = [
    { href: base, label: 'Overview' },
    { href: `${base}/task/document`, label: 'Document' },
    { href: `${base}/task/code`, label: 'Code' },
    { href: `${base}/task/sheet`, label: 'Spreadsheet' },
    { href: `${base}/ai`, label: 'AI panel' },
    { href: `${base}/plugin`, label: 'Plugin' },
    { href: `${base}/artifacts`, label: 'Artifacts' },
    { href: `${base}/controls`, label: 'Flags & break' },
    { href: `${base}/submit`, label: 'Submit' },
  ];
  return (
    <nav
      aria-label="Assessment sections"
      style={{ borderBlockEnd: '1px solid var(--color-line)', background: 'var(--color-paper)' }}
    >
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: '0 calc(var(--space-unit) * 3)',
          display: 'flex',
          gap: 'calc(var(--space-unit) * 1)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minBlockSize: 'var(--target-min)',
                  paddingInline: 'calc(var(--space-unit) * 3)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  color: active ? 'var(--color-blue)' : 'var(--color-ink)',
                  borderBlockEnd: `2px solid ${active ? 'var(--color-blue)' : 'transparent'}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function AttemptLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state } = useAsync(loader);
  const pathname = usePathname();

  if (pathname === `/candidate/attempt/${id}`) return <>{children}</>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'calc(var(--space-unit) * 3)',
          flexWrap: 'wrap',
          padding: 'calc(var(--space-unit) * 3) calc(var(--space-unit) * 4)',
          background: 'var(--color-paper)',
          borderBlockEnd: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>
            {state.status === 'ready' ? state.data.assessmentTitle : 'Assessment attempt'}
          </strong>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
            Supervised · server-timed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--space-unit) * 4)' }}>
          {state.status === 'ready' ? (
            <>
              <AutosaveBadge state={state.data.autosave} />
              <RuntimeTimer
                deadlineAt={state.data.deadlineAt}
                serverNow={state.data.serverNow}
                status={state.data.status}
              />
            </>
          ) : null}
          <Link href={`/candidate/attempt/${id}/recovery`} style={{ fontSize: '0.85rem' }}>
            Connection issue?
          </Link>
        </div>
      </header>
      <RuntimeTabs id={id} pathname={pathname} />
      <main
        id="main"
        style={{
          flex: 1,
          padding: 'calc(var(--space-unit) * 5) calc(var(--space-unit) * 4)',
          maxWidth: '1100px',
          width: '100%',
          marginInline: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}
