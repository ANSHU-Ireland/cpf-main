'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AdminSupportCaseView, Collection, SupportCaseStatus } from '../../lib/types';

const TONE: Record<SupportCaseStatus, BadgeTone> = {
  new: 'info',
  assigned: 'warning',
  in_progress: 'warning',
  resolved: 'success',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  minWidth: '200px',
  boxSizing: 'border-box',
};

export default function SupportPage(): React.JSX.Element {
  const headingId = useId();
  const { state, reload, setData } = useAsync<Collection<AdminSupportCaseView>>(
    useCallback(() => apiClient.getSupportCases(), []),
  );
  const [assignee, setAssignee] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(current: Collection<AdminSupportCaseView>, id: string): Promise<void> {
    const who = (assignee[id] ?? '').trim();
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.assignSupportCase(id, who);
      setData({
        items: current.items.map((c) => (c.id === updated.id ? updated : c)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not assign the case.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Support oversight"
        description="Route support cases without silent impersonation. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="support cases"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No open cases"
        emptyBody="There are no support cases to route."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            {data.items.map((c) => (
              <Card key={c.id} as="article" aria-label={c.subject}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{c.subject}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {c.tenantName} · {c.priority} priority
                      {c.assignee !== null ? ` · ${c.assignee}` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[c.status]}>{c.status.replace('_', ' ')}</StatusBadge>
                </div>
                <div
                  style={{
                    marginTop: 'calc(var(--space-unit) * 3)',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <input
                    aria-label={`Assignee for ${c.subject}`}
                    value={assignee[c.id] ?? ''}
                    onChange={(e) => setAssignee((a) => ({ ...a, [c.id]: e.target.value }))}
                    placeholder="Assignee user UUID"
                    style={fieldStyle}
                  />
                  <Button
                    variant="secondary"
                    disabled={
                      busyId === c.id ||
                      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                        (assignee[c.id] ?? '').trim(),
                      )
                    }
                    onClick={() => void assign(data, c.id)}
                  >
                    {busyId === c.id ? 'Assigning…' : 'Assign case'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
