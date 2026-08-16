'use client';

import { useCallback, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AttemptView } from '../../../lib/types';

const CHECKS: readonly { label: string; detail: string }[] = [
  { label: 'Identity confirmed', detail: 'Your invitation and account are verified.' },
  { label: 'Environment ready', detail: 'Browser and desktop companion checks passed.' },
  { label: 'Notices acknowledged', detail: 'Processing, monitoring and AI-use notices accepted.' },
  {
    label: 'Accommodations applied',
    detail: 'Any approved adjustments are in place for this sitting.',
  },
];

const DEMO_ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';

export default function ReadinessPage(): React.JSX.Element {
  const headingId = useId();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loader = useCallback(() => apiClient.getAttempt(DEMO_ATTEMPT_ID), []);
  const { state, reload } = useAsync(loader);

  async function start(attempt: AttemptView): Promise<void> {
    setStarting(true);
    setError(null);
    try {
      await apiClient.startAttempt(attempt.id);
      router.push(`/candidate/attempt/${attempt.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start your assessment.');
      setStarting(false);
    }
  }

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Assessment readiness"
        headingId={headingId}
        description="A few checks before you begin. Once you start, a server-authoritative timer runs and your work autosaves."
      />
      <AsyncBoundary state={state} onRetry={reload} label="assessment readiness">
        {(attempt) => (
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
            <Card as="article" aria-label="Pre-start checklist">
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                {CHECKS.map((check) => (
                  <li
                    key={check.label}
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 3)',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>{check.label}</strong>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        {check.detail}
                      </p>
                    </div>
                    <StatusBadge tone="success">Ready</StatusBadge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card as="article" aria-label="Start">
              <p style={{ marginBlockStart: 0 }}>
                Assessment: <strong>{attempt.assessmentTitle}</strong>. Your responses are your own
                work. Any AI help is clearly labelled and never produces a score about you.
              </p>
              {error ? (
                <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              <div style={{ marginBlockStart: 'calc(var(--space-unit) * 3)' }}>
                <Button disabled={starting} onClick={() => void start(attempt)}>
                  {starting ? 'Starting…' : 'Start assessment'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </section>
  );
}
