'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { apiClient, ApiError } from '../../../../lib/api-client';
import type { AssessmentVersionView } from '../../../../lib/types';

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

const STEPS = ['Basics', 'Configuration', 'Review', 'Confirm'] as const;

export default function AssessmentVersionPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const labelId = useId();
  const scopeId = useId();
  const dateId = useId();
  const rationaleId = useId();
  const noteId = useId();
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [rationale, setRationale] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AssessmentVersionView | null>(null);

  async function saveDraft(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.saveAssessmentVersion(id, label.trim(), rationale.trim());
      setSaved(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the draft version.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment version builder"
        description="Draft an immutable version before validation and activation. No AI output on this surface."
      />
      <div>
        <Link href={`/admin/assessments/${id}`} style={linkStyle}>
          Back to assessment
        </Link>
      </div>
      <Card as="section" aria-label="Steps">
        <ol
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 3)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            flexWrap: 'wrap',
          }}
        >
          {STEPS.map((s, i) => (
            <li
              key={s}
              style={{
                color: i === 0 ? 'var(--color-ink)' : 'var(--color-muted)',
                fontWeight: 600,
              }}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </Card>
      {saved ? (
        <Card as="section" aria-label="Draft saved">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} role="status">
            <StatusBadge tone="success">Draft saved</StatusBadge>
            <span>Version {saved.label} saved. Resolve validation before it can be activated.</span>
          </div>
          <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
            <Link href={`/admin/assessments/${id}/validation`} style={linkStyle}>
              Go to validation
            </Link>
          </div>
        </Card>
      ) : (
        <Card as="section" aria-label="Basics and configuration">
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={labelId} style={{ fontWeight: 600 }}>
                Display name
              </label>
              <input
                id={labelId}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. v3"
                style={fieldStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={scopeId} style={{ fontWeight: 600 }}>
                Scope / category
              </label>
              <input
                id={scopeId}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={dateId} style={{ fontWeight: 600 }}>
                Effective date
              </label>
              <input
                id={dateId}
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={rationaleId} style={{ fontWeight: 600 }}>
                Rationale
              </label>
              <textarea
                id={rationaleId}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                style={fieldStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor={noteId} style={{ fontWeight: 600 }}>
                Governance note
              </label>
              <textarea
                id={noteId}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
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
                disabled={busy || label.trim().length < 1 || rationale.trim().length < 4}
                onClick={() => void saveDraft()}
              >
                {busy ? 'Saving…' : 'Save draft'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
