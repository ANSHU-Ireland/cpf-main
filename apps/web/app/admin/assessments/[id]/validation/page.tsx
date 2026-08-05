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
import type { AssessmentValidationView, ValidationCheckStatus } from '../../../../lib/types';

const CHECK_TONE: Record<ValidationCheckStatus, BadgeTone> = {
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

export default function AssessmentValidationPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const outcomeId = useId();
  const rationaleId = useId();
  const load = useCallback(() => apiClient.getAssessmentValidation(id), [id]);
  const { state, reload, setData } = useAsync<AssessmentValidationView>(load);
  const [outcome, setOutcome] = useState('');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.resolveValidation(id, outcome.trim(), rationale.trim());
      setData(updated);
      setOutcome('');
      setRationale('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resolve validation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment validation"
        description="Decide, cite evidence and controls before a version can be activated. No AI output on this surface."
      />
      <div>
        <Link href={`/admin/assessments/${id}`} style={linkStyle}>
          Back to assessment
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
            A human validator decides the outcome and records a rationale with cited evidence. The
            version cannot be activated until validation is resolved.
          </p>
        </div>
      </Card>
      <AsyncBoundary state={state} onRetry={reload} label="validation">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Controls and checks">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Controls and checks</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                {data.checks.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{c.label}</span>
                    <StatusBadge tone={CHECK_TONE[c.status]}>{c.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
            {data.resolved ? (
              <Card as="section" aria-label="Decision and history">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} role="status">
                  <StatusBadge tone="success">Resolved</StatusBadge>
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
                      onClick={() => void resolve()}
                    >
                      {busy ? 'Resolving…' : 'Resolve validation'}
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
