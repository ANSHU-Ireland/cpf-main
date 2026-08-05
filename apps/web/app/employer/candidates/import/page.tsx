'use client';

import { useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { apiClient, ApiError } from '../../../lib/api-client';
import type { ImportResultView } from '../../../lib/types';

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

type Stage = 'upload' | 'validated' | 'complete';

export default function ImportCandidatesPage(): React.JSX.Element {
  const headingId = useId();
  const textId = useId();
  const [rowText, setRowText] = useState('');
  const [stage, setStage] = useState<Stage>('upload');
  const [result, setResult] = useState<ImportResultView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function validate(): Promise<void> {
    if (rowText.trim().length === 0) {
      setError('Paste at least one row (one email per line).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.validateImport(rowText);
      setResult(res);
      setStage('validated');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not validate the import.');
    } finally {
      setBusy(false);
    }
  }

  async function commit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.commitImport(rowText);
      setResult(res);
      setStage('complete');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not commit the import.');
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = (result?.errors.length ?? 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Import candidates"
        description="Paste one candidate email per line. We validate before committing so you can fix errors first."
      />
      <Card>
        {stage === 'upload' ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            <label htmlFor={textId} style={{ fontWeight: 600 }}>
              Candidate emails
            </label>
            <textarea
              id={textId}
              value={rowText}
              onChange={(e) => setRowText(e.target.value)}
              rows={8}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div>
              <Button disabled={busy} onClick={() => void validate()}>
                {busy ? 'Validating…' : 'Validate'}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === 'validated' && result ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            <p style={{ margin: 0 }}>
              {result.validRows} of {result.totalRows} rows are valid.
            </p>
            {hasErrors ? (
              <div>
                <p style={{ margin: '0 0 8px', color: 'var(--color-red)' }}>
                  Fix these rows before importing:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--color-red)' }}>
                  {result.errors.map((err) => (
                    <li key={err.row}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}>
              <Button variant="secondary" disabled={busy} onClick={() => setStage('upload')}>
                Back
              </Button>
              <Button disabled={busy || hasErrors} onClick={() => void commit()}>
                {busy ? 'Importing…' : 'Import valid rows'}
              </Button>
            </div>
          </div>
        ) : null}

        {stage === 'complete' && result ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
              Import complete — {result.validRows} candidate(s) added.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setStage('upload');
                  setRowText('');
                  setResult(null);
                }}
              >
                Import more
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
