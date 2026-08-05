'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AvailabilityState, ReviewerAvailabilityView } from '../../lib/types';

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

const STATES: readonly { value: AvailabilityState; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'unavailable', label: 'Unavailable' },
];

export default function AvailabilityPage(): React.JSX.Element {
  const headingId = useId();
  const stateId = useId();
  const capId = useId();
  const noteId = useId();
  const load = useCallback(() => apiClient.getAvailability(), []);
  const { state, reload, setData } = useAsync<ReviewerAvailabilityView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Availability"
        description="Set how much review work you can take on. This never affects any candidate's outcome."
      />
      <AsyncBoundary state={state} onRetry={reload} label="availability">
        {(availability) => (
          <AvailabilityForm
            availability={availability}
            onSaved={setData}
            ids={{ stateId, capId, noteId }}
          />
        )}
      </AsyncBoundary>
    </div>
  );
}

function AvailabilityForm({
  availability,
  onSaved,
  ids,
}: {
  availability: ReviewerAvailabilityView;
  onSaved: (next: ReviewerAvailabilityView) => void;
  ids: { stateId: string; capId: string; noteId: string };
}): React.JSX.Element {
  const [avState, setAvState] = useState<AvailabilityState>(availability.state);
  const [capacity, setCapacity] = useState(String(availability.weeklyCapacity));
  const [note, setNote] = useState(availability.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAvState(availability.state);
    setCapacity(String(availability.weeklyCapacity));
    setNote(availability.note);
  }, [availability]);

  async function save(): Promise<void> {
    const cap = Number(capacity);
    if (Number.isNaN(cap) || cap < 0) {
      setError('Weekly capacity must be zero or more.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiClient.updateAvailability({
        state: avState,
        weeklyCapacity: cap,
        note,
      });
      onSaved(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your availability.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.stateId} style={{ fontWeight: 600 }}>
            Status
          </label>
          <select
            id={ids.stateId}
            value={avState}
            onChange={(e) => setAvState(e.target.value as AvailabilityState)}
            style={fieldStyle}
          >
            {STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.capId} style={{ fontWeight: 600 }}>
            Weekly capacity (reviews)
          </label>
          <input
            id={ids.capId}
            type="number"
            min={0}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.noteId} style={{ fontWeight: 600 }}>
            Note (optional)
          </label>
          <textarea
            id={ids.noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
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
            Availability saved.
          </p>
        ) : null}
        <div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
