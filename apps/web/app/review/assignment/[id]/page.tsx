'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AssignmentView } from '../../../lib/types';

export default function AssignmentDetailPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getAssignment(id), [id]);
  const { state, reload, setData } = useAsync<AssignmentView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.respondToAssignment(id, 'accept', '');
      setData(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not accept this assignment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Assignment detail"
        description="Review the scope, then accept to begin. You will review evidence and score every criterion yourself."
      />
      <AsyncBoundary state={state} onRetry={reload} label="assignment">
        {(assignment) => (
          <Card>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 4)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 'calc(var(--space-unit) * 2)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>{assignment.assessmentTitle}</h2>
                  <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                    {assignment.candidateRef}
                  </p>
                </div>
                <StatusBadge tone="info">{assignment.status}</StatusBadge>
              </div>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 'calc(var(--space-unit) * 3)',
                  margin: 0,
                }}
              >
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Criteria</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{assignment.criterionCount}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Evidence</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{assignment.evidenceCount}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Due</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>
                    {new Date(assignment.dueAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </dd>
                </div>
              </dl>

              {error ? (
                <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}

              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}
              >
                {assignment.status === 'offered' ? (
                  <Button disabled={busy} onClick={() => void accept()}>
                    {busy ? 'Accepting…' : 'Accept assignment'}
                  </Button>
                ) : null}
                <Link
                  href={`/review/assignment/${id}/respond`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 'var(--target-min)',
                    padding: '0 calc(var(--space-unit) * 4)',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--color-line)',
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                  }}
                >
                  Decline or report a conflict
                </Link>
                <Link
                  href={`/review/assignment/${id}/evidence`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 'var(--target-min)',
                    padding: '0 calc(var(--space-unit) * 4)',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--color-blue)',
                    color: 'var(--color-blue)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Start with evidence
                </Link>
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
