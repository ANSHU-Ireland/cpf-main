'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { CandidateApplicationView, Collection, ScheduleSlotView } from '../../lib/types';

interface ScheduleData {
  readonly bookings: Collection<ScheduleSlotView>;
  readonly applications: Collection<CandidateApplicationView>;
}

function formatWindow(slot: ScheduleSlotView): string {
  const start = new Date(slot.startsAt);
  const end = new Date(slot.endsAt);
  const day = start.toLocaleDateString('en-GB', { dateStyle: 'full' });
  const startTime = start.toLocaleTimeString('en-GB', { timeStyle: 'short' });
  const endTime = end.toLocaleTimeString('en-GB', { timeStyle: 'short' });
  return `${day}, ${startTime}–${endTime} (${slot.timezone})`;
}

function BookingForm({
  applications,
  onChanged,
}: {
  readonly applications: Collection<CandidateApplicationView>;
  readonly onChanged: (bookings: Collection<ScheduleSlotView>) => void;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectId = useId();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const applicationId = String(data.get('applicationId') ?? '');
    const start = String(data.get('startAt') ?? '');
    const end = String(data.get('endAt') ?? '');
    if (applicationId === '' || start === '' || end === '') {
      setError('Choose an application and complete the start and end time.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      onChanged(
        await apiClient.selectSlot(
          applicationId,
          new Date(start).toISOString(),
          new Date(end).toISOString(),
          timezone,
        ),
      );
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not reserve that window.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label="Reserve an assessment window">
      <h2 style={{ marginBlockStart: 0, fontSize: '1.05rem' }}>Reserve a window</h2>
      <form
        onSubmit={(event) => void submit(event)}
        style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}
      >
        <div>
          <label htmlFor={selectId} style={{ display: 'block', fontWeight: 600 }}>
            Application
          </label>
          <select id={selectId} name="applicationId" required defaultValue="">
            <option value="" disabled>
              Choose an application
            </option>
            {applications.items
              .filter((application) => application.status !== 'withdrawn')
              .map((application) => (
                <option key={application.id} value={application.id}>
                  {application.assessmentTitle} — {application.employerName}
                </option>
              ))}
          </select>
        </div>
        <Field label="Start" required>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              name="startAt"
              type="datetime-local"
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Field label="End" required>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              name="endAt"
              type="datetime-local"
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={busy || applications.items.length === 0}>
            {busy ? 'Reserving…' : 'Reserve window'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function BookingList({ data }: { data: Collection<ScheduleSlotView> }): React.JSX.Element {
  if (data.items.length === 0) {
    return (
      <Card as="article">
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>
          No assessment window is currently booked.
        </p>
      </Card>
    );
  }
  return (
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
              </div>
              <StatusBadge tone={slot.selected ? 'success' : 'neutral'}>
                {slot.selected ? 'Booked' : 'Inactive'}
              </StatusBadge>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function SchedulePage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(async (): Promise<ScheduleData> => {
    const [bookings, applications] = await Promise.all([
      apiClient.getSchedule(),
      apiClient.getApplications(),
    ]);
    return { bookings, applications };
  }, []);
  const { state, reload, setData } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Scheduling"
        headingId={headingId}
        description="Reserve and review your persisted assessment start window."
      />
      <AsyncBoundary state={state} onRetry={reload} label="assessment scheduling">
        {(data) => (
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
            <BookingForm
              applications={data.applications}
              onChanged={(bookings) => setData({ ...data, bookings })}
            />
            <BookingList data={data.bookings} />
          </div>
        )}
      </AsyncBoundary>
    </section>
  );
}
