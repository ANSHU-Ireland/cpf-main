'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AccommodationStatus, AccommodationView, Collection } from '../../lib/types';

const STATUS_TONE: Record<AccommodationStatus, BadgeTone> = {
  requested: 'info',
  in_review: 'warning',
  approved: 'success',
  declined: 'danger',
};

const STATUS_LABEL: Record<AccommodationStatus, string> = {
  requested: 'Requested',
  in_review: 'In review',
  approved: 'Approved',
  declined: 'Declined',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });
}

function AccommodationRequestForm({ onCreated }: { onCreated: () => void }): React.JSX.Element {
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [errors, setErrors] = useState<{ category?: string; summary?: string }>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const summaryId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const next: { category?: string; summary?: string } = {};
    if (category.trim() === '') next.category = 'Choose a category.';
    if (summary.trim().length < 5) next.summary = 'Add a little more detail (5+ characters).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setFormError(null);
    try {
      await apiClient.createAccommodation(category.trim(), summary.trim());
      setDone(true);
      setCategory('');
      setSummary('');
      onCreated();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label="Request an adjustment">
      <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Request an adjustment</h2>
      <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        Adjustment requests are treated as sensitive. Only the operational adjustment needed to sit
        your assessment is ever shared with the people running it — never the underlying details you
        provide here.
      </p>
      {done ? (
        <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
          Thanks — your request has been received and will be reviewed privately.
        </p>
      ) : (
        <form
          onSubmit={(e) => void onSubmit(e)}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
        >
          {formError ? (
            <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
              {formError}
            </p>
          ) : null}
          <Field label="Category" required error={errors.category}>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                value={category}
                invalid={invalid}
                aria-describedby={describedBy}
                placeholder="e.g. Extra time, Rest breaks, Assistive technology"
                onChange={(e) => setCategory(e.target.value)}
              />
            )}
          </Field>
          <Field label="What do you need?" required error={errors.summary}>
            {({ id, invalid, describedBy }) => (
              <textarea
                id={id ?? summaryId}
                value={summary}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                style={{
                  borderRadius: 'var(--radius-control)',
                  border: `1px solid ${invalid ? 'var(--color-red)' : 'var(--color-line)'}`,
                  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  color: 'var(--color-ink)',
                  background: 'var(--color-paper)',
                  resize: 'vertical',
                }}
              />
            )}
          </Field>
          <div>
            <Button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function AccommodationList({ data }: { data: Collection<AccommodationView> }): React.JSX.Element {
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
      {data.items.map((item) => (
        <li key={item.id}>
          <Card as="article" aria-label={item.category}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 2)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 2)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.category}</h3>
                <StatusBadge tone={STATUS_TONE[item.status]}>
                  {STATUS_LABEL[item.status]}
                </StatusBadge>
              </div>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                Submitted {formatDate(item.submittedAt)}
              </p>
              <p style={{ margin: 0 }}>{item.summary}</p>
              {item.status === 'approved' && item.adjustment ? (
                <p style={{ margin: 0 }}>
                  <strong>Approved adjustment:</strong> {item.adjustment}
                </p>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function AccommodationsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAccommodations(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Accommodations"
        headingId={headingId}
        description="Ask for reasonable adjustments and track the ones you have already requested."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
        <AccommodationRequestForm onCreated={reload} />
        <AsyncBoundary
          state={state}
          onRetry={reload}
          label="your adjustment requests"
          isEmpty={(data) => data.items.length === 0}
          emptyTitle="No requests yet"
          emptyBody="Adjustments you request will be listed here with their status."
        >
          {(data) => <AccommodationList data={data} />}
        </AsyncBoundary>
      </div>
    </section>
  );
}
