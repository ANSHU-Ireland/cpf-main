'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';

export default function UnavailablePage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Attempt unavailable"
        headingId={headingId}
        description="This attempt has reached a terminal state. Your records are preserved and a review route remains open."
      />
      <AsyncBoundary state={state} onRetry={reload} label="attempt status">
        {(attempt) => {
          const voided = attempt.status === 'voided';
          const expired = attempt.status === 'expired';
          return (
            <Card as="article" aria-label="Terminal state">
              <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
                <div>
                  <StatusBadge tone="danger">
                    {voided ? 'Voided' : expired ? 'Expired' : attempt.status}
                  </StatusBadge>
                </div>
                <p style={{ margin: 0 }}>
                  {voided
                    ? 'This attempt was voided. All records are preserved for audit and you can request a human review.'
                    : expired
                      ? 'The assessment window closed before submission. Any saved work is preserved on the server.'
                      : 'This attempt is no longer active. Your saved work is preserved.'}
                </p>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  No automated decision has been made. If you believe this is an error, contact
                  support or request a human review.
                </p>
                <div
                  style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}
                >
                  <Link href="/candidate/complaints">Contact support</Link>
                  <Link href="/candidate/applications">Request human review</Link>
                </div>
              </div>
            </Card>
          );
        }}
      </AsyncBoundary>
    </section>
  );
}
