'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@cpf/ui';
import type { AsyncState } from '../lib/useAsync';

export interface AsyncBoundaryProps<T> {
  readonly state: AsyncState<T>;
  readonly onRetry: () => void;
  readonly children: (data: T) => ReactNode;
  /** Optional predicate + copy for the empty state (distinct from a load error). */
  readonly isEmpty?: (data: T) => boolean;
  readonly emptyTitle?: string;
  readonly emptyBody?: string;
  readonly label?: string;
}

function Panel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'calc(var(--space-unit) * 2)',
        padding: 'calc(var(--space-unit) * 8) calc(var(--space-unit) * 4)',
        textAlign: 'center',
        color: 'var(--color-muted)',
      }}
    >
      {children}
    </div>
  );
}

/** Renders the correct surface for each async state: loading, error (403/401/other), empty, ready. */
export function AsyncBoundary<T>({
  state,
  onRetry,
  children,
  isEmpty,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'There are no items to show right now.',
  label = 'content',
}: AsyncBoundaryProps<T>): React.JSX.Element {
  const pathname = usePathname() ?? '';
  const workspaceRole = [
    ['/employer', 'Employer'],
    ['/candidate', 'Candidate'],
    ['/review', 'Reviewer'],
    ['/governance', 'Governance'],
    ['/audit', 'Auditor'],
    ['/operations', 'Operations'],
    ['/support', 'Support'],
    ['/admin', 'Platform admin'],
  ].find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
  if (state.status === 'loading') {
    return (
      <Panel>
        <span
          aria-hidden="true"
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            border: '3px solid var(--color-line)',
            borderTopColor: 'var(--color-blue)',
            animation: 'cpf-pulse 1s ease-in-out infinite',
          }}
        />
        <p role="status" style={{ margin: 0 }}>
          Loading {label}…
        </p>
      </Panel>
    );
  }

  if (state.status === 'error') {
    const { status, message } = state.error;
    const denied = status === 401 || status === 403;
    return (
      <Panel>
        <h2 style={{ margin: 0, color: 'var(--color-ink)', fontSize: '1.1rem' }}>
          {status === 401
            ? 'Sign in to continue'
            : denied
              ? 'Your account cannot open this record'
              : 'Something went wrong'}
        </h2>
        <p role="alert" style={{ margin: 0, maxWidth: '48ch' }}>
          {message}
        </p>
        {denied ? (
          <>
            <p style={{ margin: 0, maxWidth: '48ch' }}>
              {status === 401
                ? 'Your session may have ended. Sign in again to continue.'
                : 'For the demo, choose the role for this workspace. The account must also have access to this organisation and record.'}
            </p>
            <Link
              href={
                workspaceRole ? `/sign-in?role=${encodeURIComponent(workspaceRole)}` : '/sign-in'
              }
              className="inline-flex min-h-target items-center rounded-control bg-blue px-5 py-3 font-semibold text-paper"
            >
              {workspaceRole ? `Sign in for ${workspaceRole}` : 'Sign in or switch workspace'}
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-target items-center text-sm font-semibold text-blue"
            >
              Return to the demo guide
            </Link>
          </>
        ) : (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Panel>
    );
  }

  if (isEmpty?.(state.data)) {
    return (
      <Panel>
        <h2 style={{ margin: 0, color: 'var(--color-ink)', fontSize: '1.1rem' }}>{emptyTitle}</h2>
        <p style={{ margin: 0, maxWidth: '48ch' }}>{emptyBody}</p>
      </Panel>
    );
  }

  return <>{children(state.data)}</>;
}
