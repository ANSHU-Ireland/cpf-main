'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ObservationsView } from '../../../../lib/types';

export default function ObservationsPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getObservations(id), [id]);
  const { state, reload, setData } = useAsync<ObservationsView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.revealObservations(id);
      setData(next);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Observations can only be revealed after you have scored independently.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="AI observations"
        description="AI observations are descriptive only and never contain a score, rank or recommendation. They stay hidden until you have scored every criterion yourself, to protect your independent judgement."
      />
      <AsyncBoundary state={state} onRetry={reload} label="observations">
        {(observations) =>
          observations.revealState === 'concealed' ? (
            <Card>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <StatusBadge tone="neutral">Concealed</StatusBadge>
                {observations.scoringComplete ? (
                  <>
                    <p style={{ margin: 0 }}>
                      You have scored every criterion. You may now reveal the AI observations to
                      cross-check your reasoning. Your scores remain yours to change.
                    </p>
                    {error ? (
                      <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                        {error}
                      </p>
                    ) : null}
                    <div>
                      <Button disabled={busy} onClick={() => void reveal()}>
                        {busy ? 'Revealing…' : 'Reveal observations'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                    Complete your independent scoring of every criterion first. Until then, AI
                    observations remain hidden.
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 3)',
              }}
            >
              <StatusBadge tone="purple">Revealed — for cross-checking only</StatusBadge>
              {observations.items.map((item) => (
                <Card key={item.id} as="article">
                  <p style={{ margin: 0 }}>{item.body}</p>
                  <p
                    style={{
                      margin: 'calc(var(--space-unit) * 2) 0 0',
                      color: 'var(--color-muted)',
                      fontSize: '0.8rem',
                    }}
                  >
                    Provenance {item.provenanceRef}
                  </p>
                </Card>
              ))}
            </div>
          )
        }
      </AsyncBoundary>
    </div>
  );
}
