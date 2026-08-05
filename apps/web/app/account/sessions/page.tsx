'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, SessionView } from '../../lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function SessionList({
  data,
  onChanged,
}: {
  data: Collection<SessionView>;
  onChanged: () => void;
}): React.JSX.Element {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string): Promise<void> {
    setRevokingId(id);
    setError(null);
    try {
      await apiClient.revokeSession(id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not revoke that session.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : null}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'calc(var(--space-unit) * 3)',
        }}
      >
        {data.items.map((session) => (
          <li key={session.id}>
            <Card padded={false} style={{ padding: 'calc(var(--space-unit) * 4)' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(var(--space-unit) * 3)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
                  <span style={{ fontWeight: 600, display: 'flex', gap: 'var(--space-unit)' }}>
                    {session.device}
                    {session.current ? <StatusBadge tone="success">This device</StatusBadge> : null}
                  </span>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                    {session.location} · last active {formatDate(session.lastSeenAt)}
                  </span>
                </div>
                {session.current ? null : (
                  <Button
                    variant="danger"
                    disabled={revokingId === session.id}
                    onClick={() => void revoke(session.id)}
                  >
                    {revokingId === session.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SessionsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getSessions(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Sessions"
        headingId={headingId}
        description="Devices currently signed in to your account. Revoke any you don’t recognise."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="your sessions"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No active sessions"
        emptyBody="You’re not signed in on any other devices."
      >
        {(data) => <SessionList data={data} onChanged={reload} />}
      </AsyncBoundary>
    </section>
  );
}
