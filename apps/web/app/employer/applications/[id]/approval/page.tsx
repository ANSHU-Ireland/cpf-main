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
import type { ApprovalStatus, DecisionApprovalView, DecisionOutcome } from '../../../../lib/types';

const TONE: Record<ApprovalStatus, BadgeTone> = {
  awaiting_review: 'neutral',
  awaiting_approval: 'warning',
  approved: 'success',
  issued: 'success',
  returned: 'danger',
};

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  advance: 'Advance',
  hold: 'Hold',
  reject: 'Reject',
};

function formatDate(iso: string | null): string {
  return iso === null
    ? '—'
    : new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ApprovalPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getApproval(id), [id]);
  const { state, reload, setData } = useAsync<DecisionApprovalView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'approve' | 'return'): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next =
        action === 'approve'
          ? await apiClient.approveDecision(id)
          : await apiClient.returnDecision(id);
      setData(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record the approval action.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Approve decision"
        description="Segregation of duties: the approver must be different from the person who drafted the decision."
      />
      <AsyncBoundary state={state} onRetry={reload} label="approval">
        {(a) => (
          <Card>
            <div
              style={{
                display: 'flex',
                gap: 'calc(var(--space-unit) * 2)',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{a.candidateRef}</h2>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  Drafted by {a.draftedBy}
                  {a.approver !== null ? ` · approved by ${a.approver}` : ''}
                </p>
              </div>
              <StatusBadge tone={TONE[a.status]}>{a.status.replace('_', ' ')}</StatusBadge>
            </div>
            <div style={{ marginTop: 'calc(var(--space-unit) * 4)' }}>
              <p style={{ margin: 0 }}>
                <strong>Outcome:</strong>{' '}
                {a.outcome !== null ? OUTCOME_LABEL[a.outcome] : 'Not yet drafted'}
              </p>
              <p style={{ margin: '8px 0 0', color: 'var(--color-muted)' }}>{a.rationale || '—'}</p>
              {a.issuedAt !== null ? (
                <p style={{ margin: '8px 0 0', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Issued {formatDate(a.issuedAt)}.
                </p>
              ) : null}
            </div>
            {error ? (
              <p role="alert" style={{ margin: '16px 0 0', color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            {a.status === 'awaiting_approval' ? (
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  marginTop: 'calc(var(--space-unit) * 4)',
                }}
              >
                <Button disabled={busy} onClick={() => void act('approve')}>
                  {busy ? 'Working…' : 'Approve & issue'}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => void act('return')}>
                  Return to drafter
                </Button>
              </div>
            ) : a.status === 'awaiting_review' ? (
              <p style={{ margin: '16px 0 0', color: 'var(--color-muted)' }}>
                No decision has been drafted for this application yet.
              </p>
            ) : null}
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
