'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, JobStatus, JobView } from '../../lib/types';

const TONE: Record<JobStatus, BadgeTone> = {
  queued: 'info',
  running: 'info',
  partial: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  complete: 'success',
};

export default function JobsPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getJobs(), []);
  const { state, reload, setData } = useAsync<Collection<JobView>>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    current: Collection<JobView>,
    id: string,
    action: 'retry' | 'cancel',
  ): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.actOnJob(id, action);
      setData({
        items: current.items.map((j) => (j.id === updated.id ? updated : j)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the job.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Background jobs"
        description="Inspect, retry or cancel asynchronous work with idempotency. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="jobs"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No jobs"
        emptyBody="There is no asynchronous work to show."
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
            {data.items.map((j) => {
              const canRetry = j.status === 'failed' || j.status === 'partial';
              const canCancel = j.status === 'queued' || j.status === 'running';
              return (
                <Card key={j.id} as="article" aria-label={j.name}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 2)',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: '1 1 260px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{j.name}</h2>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        {j.attempts} attempt(s)
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge tone={TONE[j.status]}>{j.status}</StatusBadge>
                      {canRetry ? (
                        <Button
                          variant="secondary"
                          disabled={busyId === j.id}
                          onClick={() => void act(data, j.id, 'retry')}
                        >
                          {busyId === j.id ? 'Working…' : 'Retry'}
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button
                          variant="danger"
                          disabled={busyId === j.id}
                          onClick={() => void act(data, j.id, 'cancel')}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
