'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type {
  AccommodationDecisionStatus,
  AccommodationRequestView,
  Collection,
} from '../../lib/types';

const TONE: Record<AccommodationDecisionStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  declined: 'neutral',
  more_info: 'info',
};

export default function AccommodationsPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getEmployerAccommodations(), []);
  const { state, reload, setData } = useAsync<Collection<AccommodationRequestView>>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(
    current: Collection<AccommodationRequestView>,
    id: string,
    status: 'approved' | 'declined' | 'more_info',
  ): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.decideAccommodation(id, status);
      setData({
        items: current.items.map((a) => (a.id === updated.id ? updated : a)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record the decision.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Accommodation requests"
        description="Only the operational adjustment is shown. Clinical or medical detail is segregated and never surfaced here."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="accommodation requests"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No requests"
        emptyBody="There are no accommodation requests awaiting a decision."
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
            {data.items.map((req) => (
              <Card key={req.id} as="article" aria-label={`${req.candidateRef} ${req.category}`}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                      {req.candidateRef} · {req.category}
                    </h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {req.adjustmentSummary}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[req.status]}>{req.status}</StatusBadge>
                </div>
                {req.status === 'pending' ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 3)',
                      flexWrap: 'wrap',
                      marginTop: 'calc(var(--space-unit) * 3)',
                    }}
                  >
                    <Button
                      disabled={busyId === req.id}
                      onClick={() => void decide(data, req.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === req.id}
                      onClick={() => void decide(data, req.id, 'more_info')}
                    >
                      Request more info
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === req.id}
                      onClick={() => void decide(data, req.id, 'declined')}
                    >
                      Decline
                    </Button>
                  </div>
                ) : req.decidedBy !== null ? (
                  <p
                    style={{ margin: '12px 0 0', color: 'var(--color-muted)', fontSize: '0.85rem' }}
                  >
                    Decided by {req.decidedBy}.
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
