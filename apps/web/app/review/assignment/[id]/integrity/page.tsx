'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, IntegrityFlagView } from '../../../../lib/types';

const STATUS_TONE: Record<IntegrityFlagView['status'], BadgeTone> = {
  open: 'warning',
  dismissed: 'neutral',
  upheld: 'danger',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
};

export default function IntegrityPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getIntegrityFlags(id), [id]);
  const { state, reload, setData } = useAsync<Collection<IntegrityFlagView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Integrity review"
        description="Integrity signals are advisory. A person decides every resolution and records the reasoning. Open flags must be resolved before you submit."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="integrity flags"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No integrity flags"
        emptyBody="No integrity signals were raised for this assignment."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {data.items.map((flag) => (
              <FlagCard
                key={flag.id}
                assignmentId={id}
                flag={flag}
                onResolved={(next) =>
                  setData({
                    items: data.items.map((f) => (f.id === next.id ? next : f)),
                    total: data.total,
                  })
                }
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

function FlagCard({
  assignmentId,
  flag,
  onResolved,
}: {
  assignmentId: string;
  flag: IntegrityFlagView;
  onResolved: (next: IntegrityFlagView) => void;
}): React.JSX.Element {
  const resolutionId = useId();
  const [resolution, setResolution] = useState(flag.resolution);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: 'dismissed' | 'upheld'): Promise<void> {
    if (resolution.trim().length < 3) {
      setError('A written resolution is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.resolveIntegrityFlag(
        assignmentId,
        flag.id,
        status,
        resolution.trim(),
      );
      onResolved(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record this resolution.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'calc(var(--space-unit) * 2)',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0 }}>{flag.summary}</p>
          <StatusBadge tone={STATUS_TONE[flag.status]}>{flag.status}</StatusBadge>
        </div>
        {flag.status === 'open' ? (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 2)',
              }}
            >
              <label htmlFor={resolutionId} style={{ fontWeight: 600 }}>
                Resolution
              </label>
              <textarea
                id={resolutionId}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={2}
                style={fieldStyle}
              />
            </div>
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
              <Button variant="secondary" disabled={busy} onClick={() => void resolve('dismissed')}>
                Dismiss flag
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => void resolve('upheld')}>
                Uphold flag
              </Button>
            </div>
          </>
        ) : flag.resolution ? (
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Resolution: {flag.resolution}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
