'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ScheduleSlotView } from '../../lib/types';

function formatWindow(slot: ScheduleSlotView): string {
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt);
  const day = start.toLocaleDateString('en-GB', { dateStyle: 'full' });
  const startTime = start.toLocaleTimeString('en-GB', { timeStyle: 'short' });
  const endTime = end.toLocaleTimeString('en-GB', { timeStyle: 'short' });
  return `${day}, ${startTime}–${endTime} (${slot.timezone})`;
}

function SlotList({
  data,
  onChanged,
}: {
  data: Collection<ScheduleSlotView>;
  onChanged: (next: Collection<ScheduleSlotView>) => void;
}): React.JSX.Element {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function select(slotId: string): Promise<void> {
    setPendingId(slotId);
    setError(null);
    try {
      const next = await apiClient.selectSlot(slotId);
      onChanged(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not book that slot.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : null}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'calc(var(--space-unit) * 3)',
        }}
      >
        {data.items.map((slot) => (
          <li key={slot.id}>
            <Card as="article" aria-label={slot.assessmentTitle}>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{slot.assessmentTitle}</h2>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                    {formatWindow(slot)}
                  </p>
                  <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    {slot.mode === 'supervised_desktop'
                      ? 'Supervised desktop environment'
                      : 'Remote proctored'}
                  </p>
                </div>
                {slot.selected ? (
                  <StatusBadge tone="success">Booked</StatusBadge>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={pendingId !== null}
                    onClick={() => void select(slot.id)}
                  >
                    {pendingId === slot.id ? 'Booking…' : 'Choose this slot'}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SchedulePage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getSchedule(), []);
  const { state, reload, setData } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Scheduling"
        headingId={headingId}
        description="Choose when you will sit your assessment. You can change your slot until it begins."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="available time slots"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No slots offered yet"
        emptyBody="When scheduling opens for your assessment, available times will appear here."
      >
        {(data) => <SlotList data={data} onChanged={setData} />}
      </AsyncBoundary>
    </section>
  );
}
