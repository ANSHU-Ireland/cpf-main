'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ReceiptPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Submission receipt"
        headingId={headingId}
        description="Your immutable proof of submission. Submitting again is safe and will not duplicate your attempt."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your receipt">
        {(attempt) => {
          if (attempt.status !== 'submitted' || attempt.receiptRef === null) {
            return (
              <Card as="article">
                <p style={{ marginBlockStart: 0 }}>This attempt has not been submitted yet.</p>
                <Link href={`/candidate/attempt/${id}/submit`}>Go to submission</Link>
              </Card>
            );
          }
          return (
            <Card as="article" aria-label="Receipt">
              <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
                <div>
                  <StatusBadge tone="success">Submitted</StatusBadge>
                </div>
                <dl style={{ margin: 0, display: 'grid', gap: 'calc(var(--space-unit) * 2)' }}>
                  <div>
                    <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Assessment</dt>
                    <dd style={{ margin: 0 }}>{attempt.assessmentTitle}</dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      Receipt reference
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {attempt.receiptRef}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      Submitted at
                    </dt>
                    <dd style={{ margin: 0 }}>
                      {attempt.submittedAt ? formatDateTime(attempt.submittedAt) : '—'}
                    </dd>
                  </div>
                </dl>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  Keep this reference. A person will review your work; you will be notified when a
                  decision has been issued.
                </p>
                <div>
                  <Link href="/candidate/applications">Back to your applications</Link>
                </div>
              </div>
            </Card>
          );
        }}
      </AsyncBoundary>
    </section>
  );
}
