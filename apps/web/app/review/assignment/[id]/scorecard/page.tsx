'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, CriterionView } from '../../../../lib/types';

const STATE_TONE: Record<CriterionView['state'], BadgeTone> = {
  draft: 'neutral',
  saved: 'success',
  submitted: 'purple',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  boxSizing: 'border-box',
};

export default function ScorecardPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getScorecard(id), [id]);
  const { state, reload, setData } = useAsync<Collection<CriterionView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Criterion scorecard"
        description="You author every score and rationale. Scores are human-only — no AI number is ever suggested here."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="criteria"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No criteria"
        emptyBody="This assessment has no scoring criteria configured."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {data.items.map((criterion) => (
              <CriterionCard
                key={criterion.id}
                assignmentId={id}
                criterion={criterion}
                onSaved={(next) =>
                  setData({
                    items: data.items.map((c) => (c.id === next.id ? next : c)),
                    total: data.total,
                  })
                }
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

function CriterionCard({
  assignmentId,
  criterion,
  onSaved,
}: {
  assignmentId: string;
  criterion: CriterionView;
  onSaved: (next: CriterionView) => void;
}): React.JSX.Element {
  const scoreId = useId();
  const rationaleId = useId();
  const [score, setScore] = useState(criterion.score === null ? '' : String(criterion.score));
  const [rationale, setRationale] = useState(criterion.rationale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    const numeric = Number(score);
    if (score === '' || Number.isNaN(numeric) || numeric < 0 || numeric > criterion.maxScore) {
      setError(`Enter a score between 0 and ${String(criterion.maxScore)}.`);
      return;
    }
    if (rationale.trim().length < 3) {
      setError('A rationale is required for every score.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.saveCriterion(
        assignmentId,
        criterion.id,
        numeric,
        rationale.trim(),
      );
      onSaved(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save this criterion.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label={criterion.label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'calc(var(--space-unit) * 2)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>{criterion.label}</h2>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              {criterion.descriptor}
            </p>
          </div>
          <StatusBadge tone={STATE_TONE[criterion.state]}>
            {criterion.state === 'draft'
              ? 'Not scored'
              : criterion.state === 'saved'
                ? 'Saved'
                : 'Submitted'}
          </StatusBadge>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 3)',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
          >
            <label htmlFor={scoreId} style={{ fontWeight: 600 }}>
              Score (0–{criterion.maxScore})
            </label>
            <input
              id={scoreId}
              type="number"
              min={0}
              max={criterion.maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              style={{ ...fieldStyle, width: '6rem' }}
            />
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={rationaleId} style={{ fontWeight: 600 }}>
            Rationale
          </label>
          <textarea
            id={rationaleId}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            style={{ ...fieldStyle, width: '100%', resize: 'vertical' }}
          />
        </div>
        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        <div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save criterion'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
