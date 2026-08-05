'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge, type BadgeTone } from '../components/StatusBadge';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { apiClient } from '../lib/api-client';
import { useAsync } from '../lib/useAsync';
import type { AssignmentStatus, AssignmentView, Collection } from '../lib/types';

const STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  offered: 'info',
  accepted: 'purple',
  declined: 'neutral',
  in_review: 'warning',
  submitted: 'success',
  amending: 'warning',
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  offered: 'Offered',
  accepted: 'Accepted',
  declined: 'Declined',
  in_review: 'In review',
  submitted: 'Submitted',
  amending: 'Amending',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ReviewQueuePage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getAssignments(), []);
  const { state, reload } = useAsync<Collection<AssignmentView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Review queue"
        description="Your assignments. You author every score yourself — AI observations stay hidden until you have scored independently."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="assignments"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No assignments"
        emptyBody="You have no review assignments right now. New offers will appear here."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {data.items.map((assignment) => (
              <Card
                key={assignment.id}
                as="article"
                aria-label={`${assignment.assessmentTitle} — ${assignment.candidateRef}`}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 3)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 2)',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                        {assignment.assessmentTitle}
                      </h2>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        {assignment.candidateRef} · {assignment.criterionCount} criteria ·{' '}
                        {assignment.evidenceCount} pieces of evidence
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[assignment.status]}>
                      {STATUS_LABEL[assignment.status]}
                    </StatusBadge>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    Due {formatDate(assignment.dueAt)}
                  </p>
                  <div>
                    <Link
                      href={`/review/assignment/${assignment.id}`}
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
                      Open assignment
                    </Link>
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
