'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AssignmentBoardItemView, AssignmentBoardStatus, Collection } from '../../lib/types';

const TONE: Record<AssignmentBoardStatus, BadgeTone> = {
  unassigned: 'warning',
  assigned: 'info',
  in_review: 'purple',
  submitted: 'success',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
};

export default function AssignmentsPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getAssignmentBoard(), []);
  const { state, reload, setData } = useAsync<Collection<AssignmentBoardItemView>>(load);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(current: Collection<AssignmentBoardItemView>, id: string): Promise<void> {
    const reviewerName = (drafts[id] ?? '').trim();
    if (reviewerName.length < 2) {
      setError('Enter a reviewer name to assign.');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.assignReviewer(id, reviewerName);
      setData({
        items: current.items.map((a) => (a.id === updated.id ? updated : a)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not assign the reviewer.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assignment board"
        description="Assign reviewers to candidate reviews. Reviewers author their own independent scores."
      />
      <AsyncBoundary state={state} onRetry={reload} label="assignments">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            {data.items.map((a) => (
              <Card key={a.id} as="article" aria-label={a.candidateRef}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{a.candidateRef}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {a.campaignName}
                      {a.reviewerName !== null ? ` · ${a.reviewerName}` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[a.status]}>{a.status}</StatusBadge>
                </div>
                {a.status === 'unassigned' ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 3)',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginTop: 'calc(var(--space-unit) * 3)',
                    }}
                  >
                    <input
                      aria-label={`Reviewer for ${a.candidateRef}`}
                      placeholder="Reviewer name"
                      value={drafts[a.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                      style={fieldStyle}
                    />
                    <Button disabled={busyId === a.id} onClick={() => void assign(data, a.id)}>
                      Assign
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
