'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AuditEventView, Collection } from '../../lib/types';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function AuditPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getAuditEvents(), []);
  const { state, reload } = useAsync<Collection<AuditEventView>>(load);
  const [exported, setExported] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Audit trail"
        description="Immutable, append-only record of material events. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="audit events"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No events"
        emptyBody="No audit events have been recorded."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  Events are read-only and cannot be edited or deleted.
                </p>
                <Button variant="secondary" onClick={() => setExported(true)}>
                  Export filtered events
                </Button>
              </div>
              {exported ? (
                <p role="status" style={{ margin: '12px 0 0', color: 'var(--color-sage)' }}>
                  Export prepared. A signed download would be issued in the full platform.
                </p>
              ) : null}
            </Card>
            {data.items.map((e) => (
              <Card key={e.id} as="article" aria-label={e.action}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{e.action}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {e.actor} → {e.target}
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    {fmt(e.at)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
