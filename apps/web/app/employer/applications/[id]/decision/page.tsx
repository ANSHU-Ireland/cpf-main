'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { DecisionDraftView, DecisionOutcome } from '../../../../lib/types';

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--color-blue)',
  fontWeight: 600,
  textDecoration: 'none',
};

export default function DecisionPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getDecision(id), [id]);
  const { state, reload, setData } = useAsync<DecisionDraftView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Draft decision"
        description="You author this decision. The platform never scores, ranks or decides. A separate approver must issue it."
      />
      <AsyncBoundary state={state} onRetry={reload} label="decision">
        {(draft) => <DecisionForm id={id} draft={draft} onSaved={setData} />}
      </AsyncBoundary>
    </div>
  );
}

const OUTCOME_TONE: Record<DecisionOutcome, BadgeTone> = {
  advance: 'success',
  hold: 'warning',
  reject: 'neutral',
};

function DecisionForm({
  id,
  draft,
  onSaved,
}: {
  id: string;
  draft: DecisionDraftView;
  onSaved: (next: DecisionDraftView) => void;
}): React.JSX.Element {
  const outcomeId = useId();
  const rationaleId = useId();
  const [outcome, setOutcome] = useState<DecisionOutcome | ''>(draft.outcome ?? '');
  const [rationale, setRationale] = useState(draft.rationale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setOutcome(draft.outcome ?? '');
    setRationale(draft.rationale);
  }, [draft]);

  async function save(): Promise<void> {
    if (outcome === '') {
      setError('Choose an outcome.');
      return;
    }
    if (rationale.trim().length < 10) {
      setError('A written rationale of at least 10 characters is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiClient.saveDecision(id, outcome, rationale.trim());
      onSaved(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit the decision.');
    } finally {
      setBusy(false);
    }
  }

  if (!draft.reviewComplete) {
    return (
      <Card>
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>
          Review must be complete before a decision can be drafted for {draft.candidateRef}.
        </p>
      </Card>
    );
  }

  if (draft.status === 'submitted') {
    return (
      <Card>
        <div
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 2)',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{draft.candidateRef}</h2>
            <p style={{ margin: 0, color: 'var(--color-muted)' }}>{draft.rationale}</p>
          </div>
          {draft.outcome !== null ? (
            <StatusBadge tone={OUTCOME_TONE[draft.outcome]}>{draft.outcome}</StatusBadge>
          ) : null}
        </div>
        <p style={{ margin: '16px 0 0' }}>
          This decision is now awaiting approval.{' '}
          <Link href={`/employer/applications/${id}/approval`} style={linkStyle}>
            Go to approval
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p style={{ margin: '0 0 16px', color: 'var(--color-muted)' }}>
        {draft.candidateRef} · {draft.campaignName}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={outcomeId} style={{ fontWeight: 600 }}>
            Outcome
          </label>
          <select
            id={outcomeId}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as DecisionOutcome | '')}
            style={fieldStyle}
          >
            <option value="">Select…</option>
            <option value="advance">Advance</option>
            <option value="hold">Hold</option>
            <option value="reject">Reject</option>
          </select>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={rationaleId} style={{ fontWeight: 600 }}>
            Rationale (required)
          </label>
          <textarea
            id={rationaleId}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </div>
        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
            Decision submitted for approval.
          </p>
        ) : null}
        <div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
