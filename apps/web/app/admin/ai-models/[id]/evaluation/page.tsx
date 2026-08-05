'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { AiEvaluationView, ValidationCheckStatus } from '../../../../lib/types';

const DIMENSION_TONE: Record<ValidationCheckStatus, BadgeTone> = {
  pass: 'success',
  fail: 'danger',
  pending: 'warning',
};

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
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--target-min)',
  padding: '0 calc(var(--space-unit) * 4)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-blue)',
  color: 'var(--color-blue)',
  textDecoration: 'none',
  fontWeight: 600,
};

export default function AiEvaluationPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const outcomeId = useId();
  const rationaleId = useId();
  const load = useCallback(() => apiClient.getAiEvaluation(id), [id]);
  const { state, reload, setData } = useAsync<AiEvaluationView>(load);
  const [outcome, setOutcome] = useState('');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function record(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.recordEvaluation(id, outcome.trim(), rationale.trim());
      setData(updated);
      setOutcome('');
      setRationale('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record evaluation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="AI evaluation"
        description="Review task, safety, bias, drift and human-impact evidence. No AI output on this surface."
      />
      <div>
        <Link href={`/admin/ai-models/${id}`} style={linkStyle}>
          Back to model
        </Link>
      </div>
      <Card as="section" aria-label="Human authority checkpoint">
        <div
          style={{
            borderLeft: '3px solid var(--color-amber)',
            paddingLeft: 'calc(var(--space-unit) * 3)',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Human authority checkpoint</h2>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            A human evaluator reviews evidence across all dimensions and records an outcome with a
            cited rationale. The model cannot be activated until evaluation is recorded and the
            required number of approvals is obtained.
          </p>
        </div>
      </Card>
      <AsyncBoundary state={state} onRetry={reload} label="evaluation">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Evaluation dimensions">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Evaluation dimensions</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                {data.dimensions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{d.label}</span>
                    <StatusBadge tone={DIMENSION_TONE[d.status]}>{d.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
            {data.recorded ? (
              <Card as="section" aria-label="Decision and history">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} role="status">
                  <StatusBadge tone="success">Recorded</StatusBadge>
                  <span>Outcome: {data.outcome}</span>
                </div>
                <p style={{ margin: '12px 0 0', color: 'var(--color-muted)' }}>{data.rationale}</p>
              </Card>
            ) : (
              <Card as="section" aria-label="Decision">
                <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Decision</h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={outcomeId} style={{ fontWeight: 600 }}>
                      Outcome
                    </label>
                    <input
                      id={outcomeId}
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      placeholder="e.g. Approved for activation"
                      style={fieldStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={rationaleId} style={{ fontWeight: 600 }}>
                      Rationale and cited evidence
                    </label>
                    <textarea
                      id={rationaleId}
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      rows={3}
                      style={fieldStyle}
                    />
                  </div>
                  {error ? (
                    <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                      {error}
                    </p>
                  ) : null}
                  <div>
                    <Button
                      disabled={busy || outcome.trim().length < 2 || rationale.trim().length < 12}
                      onClick={() => void record()}
                    >
                      {busy ? 'Recording…' : 'Record evaluation'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
