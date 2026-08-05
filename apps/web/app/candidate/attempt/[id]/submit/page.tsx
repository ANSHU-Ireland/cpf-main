'use client';

import { useCallback, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { AttemptView } from '../../../../lib/types';

function SubmitPreview({
  attempt,
  onSubmitted,
}: {
  attempt: AttemptView;
  onSubmitted: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsaved = attempt.tasks.filter((t) => t.status === 'not_started' || t.savedAt === null);

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.submitAttempt(attempt.id);
      onSubmitted();
      router.push(`/candidate/attempt/${attempt.id}/receipt`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your assessment.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
      <Card as="article" aria-label="Completeness">
        <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Completeness</h2>
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
          {attempt.tasks.map((task) => {
            const complete = task.savedAt !== null;
            return (
              <li
                key={task.id}
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 2)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <span>{task.title}</span>
                <StatusBadge tone={complete ? 'success' : 'warning'}>
                  {complete ? 'Saved' : 'Not saved'}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card as="article" aria-label="Submit">
        <p style={{ marginBlockStart: 0 }}>
          Submitting is <strong>irreversible</strong>. After you submit you cannot change your
          responses. Your work will be reviewed by a person.
        </p>
        {unsaved.length > 0 ? (
          <p style={{ color: 'var(--color-amber)' }}>
            {unsaved.length} task{unsaved.length === 1 ? '' : 's'} not saved. You can still submit,
            but unsaved work will not be included.
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: '0 0 var(--space-unit)', color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        {confirming ? (
          <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Submitting…' : 'Confirm submission'}
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={() => setConfirming(false)}>
              Go back
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)}>Submit assessment</Button>
        )}
      </Card>
    </div>
  );
}

export default function SubmitPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const router = useRouter();
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Submission preview"
        headingId={headingId}
        description="Review completeness before you submit. Submission is final."
      />
      <AsyncBoundary state={state} onRetry={reload} label="submission preview">
        {(attempt) => {
          if (attempt.status === 'submitted') {
            return (
              <Card as="article">
                <p style={{ marginBlockStart: 0 }}>You have already submitted this assessment.</p>
                <Button onClick={() => router.push(`/candidate/attempt/${id}/receipt`)}>
                  View receipt
                </Button>
              </Card>
            );
          }
          if (attempt.status === 'expired' || attempt.status === 'voided') {
            return (
              <Card as="article">
                <p style={{ marginBlockStart: 0 }}>
                  This attempt is no longer available for submission.
                </p>
                <Button onClick={() => router.push(`/candidate/attempt/${id}/unavailable`)}>
                  See what happens next
                </Button>
              </Card>
            );
          }
          return <SubmitPreview attempt={attempt} onSubmitted={reload} />;
        }}
      </AsyncBoundary>
    </section>
  );
}
