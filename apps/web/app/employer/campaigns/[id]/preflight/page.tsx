'use client';

import { useCallback, useId, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, PreflightCheckView, PreflightSeverity } from '../../../../lib/types';

const TONE: Record<PreflightSeverity, BadgeTone> = {
  blocker: 'danger',
  warning: 'warning',
  ok: 'success',
};

export default function PreflightPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getPreflight(id), [id]);
  const { state, reload, setData } = useAsync<Collection<PreflightCheckView>>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(current: Collection<PreflightCheckView>, checkId: string): Promise<void> {
    setBusyId(checkId);
    setError(null);
    try {
      const updated = await apiClient.resolvePreflight(id, checkId);
      setData({
        items: current.items.map((c) => (c.id === updated.id ? updated : c)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resolve this check.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Preflight checks"
        description="Every blocker must be resolved before this campaign can be activated. This is a governance gate."
      />
      <AsyncBoundary state={state} onRetry={reload} label="preflight checks">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            {data.items.map((check) => (
              <Card key={check.id} as="article" aria-label={check.label}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{check.label}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {check.detail}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge tone={TONE[check.severity]}>
                      {check.resolved ? 'Resolved' : check.severity}
                    </StatusBadge>
                    {!check.resolved && check.severity !== 'ok' ? (
                      <Button
                        variant="secondary"
                        disabled={busyId === check.id}
                        onClick={() => void resolve(data, check.id)}
                      >
                        {busyId === check.id ? 'Resolving…' : 'Mark resolved'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
