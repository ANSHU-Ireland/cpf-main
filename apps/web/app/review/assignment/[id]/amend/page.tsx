'use client';

import { useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { apiClient, ApiError } from '../../../../lib/api-client';

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
  resize: 'vertical',
};

export default function AmendPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(): Promise<void> {
    if (reason.trim().length < 3) {
      setError('A reason for the amendment is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.amendReview(id, reason.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open an amendment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Review amendment"
        description="Request a controlled correction to a submitted review. The reason is recorded in the audit trail and must be approved before the locked scorecard can change."
      />
      <Card>
        {done ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--space-unit) * 3)',
            }}
          >
            <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
              The amendment request has been recorded. The scorecard remains locked until an
              authorised approver accepts the request.
            </p>
          </div>
        ) : (
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
              <label htmlFor={reasonId} style={{ fontWeight: 600 }}>
                Reason for amendment
              </label>
              <textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? 'Submitting…' : 'Submit amendment'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
