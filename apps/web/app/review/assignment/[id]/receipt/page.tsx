'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ReviewSubmissionView } from '../../../../lib/types';

export default function ReceiptPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getReviewSubmission(id), [id]);
  const { state, reload } = useAsync<ReviewSubmissionView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Review receipt"
        description="A durable record that your review was submitted. Keep the reference for your records."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="receipt"
        isEmpty={(data) => data.receiptRef === null}
        emptyTitle="Not submitted yet"
        emptyBody="This review has not been submitted, so there is no receipt to show."
      >
        {(submission) => (
          <Card>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 3)',
              }}
            >
              <StatusBadge tone="success">Submitted</StatusBadge>
              <div>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Reference
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {submission.receiptRef}
                </p>
              </div>
              {submission.submittedAt ? (
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Submitted{' '}
                  {new Date(submission.submittedAt).toLocaleString('en-GB', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
              <div>
                <Link
                  href="/review"
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
                  Return to queue
                </Link>
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
