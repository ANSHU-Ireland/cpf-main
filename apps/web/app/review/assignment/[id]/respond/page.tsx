'use client';

import { useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { apiClient, ApiError } from '../../../../lib/api-client';
import type { ReviewResponseKind } from '../../../../lib/types';

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

const OPTIONS: readonly { value: ReviewResponseKind; label: string; needsNote: boolean }[] = [
  { value: 'accept', label: 'Accept the assignment', needsNote: false },
  { value: 'decline', label: 'Decline (capacity or scope)', needsNote: true },
  { value: 'conflict', label: 'Report a conflict of interest', needsNote: true },
];

export default function RespondPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const noteId = useId();
  const [kind, setKind] = useState<ReviewResponseKind>('accept');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selected = OPTIONS.find((o) => o.value === kind);
  const needsNote = selected?.needsNote ?? false;

  async function confirm(): Promise<void> {
    if (needsNote && note.trim().length < 3) {
      setError('Please give a brief reason.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.respondToAssignment(id, kind, note.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record your response.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Accept, decline or conflict"
        description="Declaring a conflict of interest protects the fairness of the assessment. It is always recorded."
      />
      <Card>
        {done ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
            Your response has been recorded and added to the audit trail.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--space-unit) * 4)',
            }}
          >
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: 'calc(var(--space-unit) * 2)' }}>
                Your response
              </legend>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                {OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 2)',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="radio"
                      name="respond"
                      value={o.value}
                      checked={kind === o.value}
                      onChange={() => setKind(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {needsNote ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <label htmlFor={noteId} style={{ fontWeight: 600 }}>
                  Reason
                </label>
                <textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  style={fieldStyle}
                />
              </div>
            ) : null}
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div>
              <Button disabled={busy} onClick={() => void confirm()}>
                {busy ? 'Recording…' : 'Confirm response'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
