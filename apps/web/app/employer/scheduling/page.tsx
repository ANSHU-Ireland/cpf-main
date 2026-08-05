'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ScheduleWindowStatus, ScheduleWindowView } from '../../lib/types';

const TONE: Record<ScheduleWindowStatus, BadgeTone> = {
  open: 'success',
  full: 'warning',
  closed: 'neutral',
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SchedulingPage(): React.JSX.Element {
  const headingId = useId();
  const labelId = useId();
  const capId = useId();
  const load = useCallback(() => apiClient.getScheduleWindows(), []);
  const { state, reload, setData } = useAsync<Collection<ScheduleWindowView>>(load);
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(current: Collection<ScheduleWindowView>): Promise<void> {
    const cap = Number(capacity);
    if (label.trim().length < 2 || !Number.isInteger(cap) || cap < 1) {
      setError('A label and a positive capacity are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const win = await apiClient.addScheduleWindow(label.trim(), cap);
      setData({ items: [...current.items, win], total: current.total + 1 });
      setLabel('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the window.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Scheduling"
        description="Assessment windows and their capacity. (Note: the scheduling API contract is a known baseline gap.)"
      />
      <AsyncBoundary state={state} onRetry={reload} label="scheduling windows">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <label htmlFor={labelId} style={{ fontWeight: 600, display: 'block' }}>
                    Window label
                  </label>
                  <input
                    id={labelId}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '0 1 140px' }}>
                  <label htmlFor={capId} style={{ fontWeight: 600, display: 'block' }}>
                    Capacity
                  </label>
                  <input
                    id={capId}
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void add(data)}>
                  Add window
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((win) => (
              <Card key={win.id} as="article" aria-label={win.label}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{win.label}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {formatDate(win.startsAt)} · {win.booked}/{win.capacity} booked
                    </p>
                  </div>
                  <StatusBadge tone={TONE[win.status]}>{win.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
