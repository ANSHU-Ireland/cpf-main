'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ReviewSubmissionView } from '../../../../lib/types';

function Check({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return (
    <li
      style={{
        display: 'flex',
        gap: 'calc(var(--space-unit) * 2)',
        alignItems: 'center',
      }}
    >
      <StatusBadge tone={ok ? 'success' : 'warning'}>{ok ? 'Ready' : 'Needed'}</StatusBadge>
      <span>{label}</span>
    </li>
  );
}

export default function SubmitReviewPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getReviewSubmission(id), [id]);
  const { state, reload, setData } = useAsync<ReviewSubmissionView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.submitReview(id);
      setData(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Submit review"
        description="Submission is blocked until every criterion is scored, all evidence is reviewed, and no integrity flag is left open."
      />
      <AsyncBoundary state={state} onRetry={reload} label="submission readiness">
        {(submission) => {
          const canSubmit =
            submission.allCriteriaScored &&
            submission.evidenceAllReviewed &&
            submission.openIntegrityFlags === 0;
          if (submission.submittedAt !== null) {
            return (
              <Card>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 3)',
                  }}
                >
                  <StatusBadge tone="success">Submitted</StatusBadge>
                  <p style={{ margin: 0 }}>
                    Your review has been submitted. A receipt has been recorded.
                  </p>
                  <div>
                    <Link
                      href={`/review/assignment/${id}/receipt`}
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
                      View receipt
                    </Link>
                  </div>
                </div>
              </Card>
            );
          }
          return (
            <Card>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 4)',
                }}
              >
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 2)',
                  }}
                >
                  <Check ok={submission.allCriteriaScored} label="Every criterion scored" />
                  <Check ok={submission.evidenceAllReviewed} label="All evidence reviewed" />
                  <Check
                    ok={submission.openIntegrityFlags === 0}
                    label={`Integrity flags resolved (${String(submission.openIntegrityFlags)} open)`}
                  />
                </ul>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button disabled={busy || !canSubmit} onClick={() => void submit()}>
                    {busy ? 'Submitting…' : 'Submit review'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
