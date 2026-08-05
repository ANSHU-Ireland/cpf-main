'use client';

import { useCallback, useId, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { CandidateRecordView } from '../../../../lib/types';

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

export default function MergeCandidatePage(): React.JSX.Element {
  const headingId = useId();
  const dupId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const load = useCallback(() => apiClient.getEmployerCandidate(id), [id]);
  const { state, reload } = useAsync<CandidateRecordView>(load);
  const [duplicateId, setDuplicateId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function merge(): Promise<void> {
    if (duplicateId.trim().length === 0) {
      setError('Enter the duplicate candidate id to merge.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm — merging cannot be undone.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.mergeCandidate(id, duplicateId.trim());
      router.push(`/employer/candidates/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not merge these records.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Merge duplicate candidate"
        description="Combine a duplicate record into this one. This is irreversible, so confirm carefully."
      />
      <AsyncBoundary state={state} onRetry={reload} label="candidate">
        {(c) => (
          <Card>
            <p style={{ margin: '0 0 16px', color: 'var(--color-muted)' }}>
              Merging into <strong>{c.reference}</strong>.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <label htmlFor={dupId} style={{ fontWeight: 600 }}>
                  Duplicate candidate id
                </label>
                <input
                  id={dupId}
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I understand this merge cannot be undone.
              </label>
              {error ? (
                <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              <div>
                <Button variant="danger" disabled={busy} onClick={() => void merge()}>
                  {busy ? 'Merging…' : 'Merge records'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
