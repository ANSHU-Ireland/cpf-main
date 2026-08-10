'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';

function AssignmentTabs({ id, pathname }: { id: string; pathname: string }): React.JSX.Element {
  const base = `/review/assignment/${id}`;
  const tabs: readonly { href: string; label: string }[] = [
    { href: base, label: 'Overview' },
    { href: `${base}/respond`, label: 'Respond' },
    { href: `${base}/evidence`, label: 'Evidence' },
    { href: `${base}/scorecard`, label: 'Scorecard' },
    { href: `${base}/observations`, label: 'AI observations' },
    { href: `${base}/integrity`, label: 'Integrity' },
    { href: `${base}/clarification`, label: 'Clarification' },
    { href: `${base}/submit`, label: 'Submit' },
    { href: `${base}/amend`, label: 'Amend' },
  ];
  return (
    <nav
      aria-label="Assignment sections"
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

export default function AssignmentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const loader = useCallback(() => apiClient.getAssignment(id), [id]);
  const { state } = useAsync(loader);
  const pathname = usePathname();

  if (pathname === `/review/assignment/${id}/scorecard`) return <>{children}</>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'calc(var(--space-unit) * 3)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{state.status === 'ready' ? state.data.assessmentTitle : 'Assignment'}</strong>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
            {state.status === 'ready'
              ? `${state.data.candidateRef} · evidence-first · you score independently`
              : 'Evidence-first review'}
          </span>
        </div>
        <Link href="/review" style={{ fontSize: '0.85rem' }}>
          Back to queue
        </Link>
      </header>
      <AssignmentTabs id={id} pathname={pathname} />
      <main>{children}</main>
    </div>
  );
}
