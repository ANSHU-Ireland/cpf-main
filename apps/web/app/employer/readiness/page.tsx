'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ReadinessItemView, ReadinessSeverity } from '../../lib/types';

const TONE: Record<ReadinessSeverity, BadgeTone> = {
  blocker: 'danger',
  warning: 'warning',
  ready: 'success',
};

export default function ReadinessPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getReadiness(), []);
  const { state, reload, setData } = useAsync<Collection<ReadinessItemView>>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(current: Collection<ReadinessItemView>, itemId: string): Promise<void> {
    setBusyId(itemId);
    setError(null);
    try {
      const updated = await apiClient.resolveReadiness(itemId);
      setData({
        items: current.items.map((r) => (r.id === updated.id ? updated : r)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resolve this item.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Deployment readiness"
        description="A governance gate. All blockers — DPIA, human oversight — must be resolved before go-live."
      />
      <AsyncBoundary state={state} onRetry={reload} label="readiness items">
        {(data) => {
          const openBlockers = data.items.filter(
            (r) => r.severity === 'blocker' && !r.resolved,
          ).length;
          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 4)',
              }}
            >
              <Card>
                {openBlockers === 0 ? (
                  <p style={{ margin: 0, color: 'var(--color-sage)' }}>
                    All deployment blockers are resolved. This workspace is ready for go-live.
                  </p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--color-red)' }}>
                    {openBlockers} blocker(s) must be resolved before deployment.
                  </p>
                )}
              </Card>
              {error ? (
                <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              {data.items.map((item) => (
                <Card key={item.id} as="article" aria-label={item.label}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 2)',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 260px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{item.label}</h2>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        {item.detail}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge tone={TONE[item.severity]}>
                        {item.resolved ? 'Resolved' : item.severity}
                      </StatusBadge>
                      {!item.resolved ? (
                        <Button
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => void resolve(data, item.id)}
                        >
                          {busyId === item.id ? 'Resolving…' : 'Mark resolved'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
