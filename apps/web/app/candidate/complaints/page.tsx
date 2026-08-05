'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ComplaintStatus, ComplaintView } from '../../lib/types';

const STATUS_TONE: Record<ComplaintStatus, BadgeTone> = {
  open: 'info',
  acknowledged: 'warning',
  resolved: 'success',
};

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });
}

function ComplaintForm({ onCreated }: { onCreated: () => void }): React.JSX.Element {
  const [subject, setSubject] = useState('');
  const [detail, setDetail] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; detail?: string }>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const next: { subject?: string; detail?: string } = {};
    if (subject.trim() === '') next.subject = 'Enter a subject.';
    if (detail.trim().length < 10) next.detail = 'Add a few more details (10+ characters).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setFormError(null);
    try {
      await apiClient.createComplaint(subject.trim(), detail.trim());
      setDone(true);
      setSubject('');
      setDetail('');
      onCreated();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not submit your complaint.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label="Raise a complaint">
      <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Raise a complaint</h2>
      <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        Tell us if something went wrong with your assessment or how your data was handled. Every
        complaint is reviewed by a person.
      </p>
      {done ? (
        <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
          Thanks — your complaint has been logged and we will respond by email.
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
          <Field label="Subject" required error={errors.subject}>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                value={subject}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
          </Field>
          <Field label="What happened?" required error={errors.detail}>
            {({ id, invalid, describedBy }) => (
              <textarea
                id={id}
                value={detail}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onChange={(e) => setDetail(e.target.value)}
                rows={5}
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
              {busy ? 'Submitting…' : 'Submit complaint'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function ComplaintList({ data }: { data: Collection<ComplaintView> }): React.JSX.Element {
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
          <Card as="article" aria-label={item.subject}>
            <div
              style={{
                display: 'flex',
                gap: 'calc(var(--space-unit) * 2)',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.subject}</h3>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Submitted {formatDate(item.submittedAt)}
                </p>
              </div>
              <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusBadge>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function ComplaintsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getComplaints(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Complaints"
        headingId={headingId}
        description="Raise a concern and follow its progress. A person reviews every complaint."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
        <ComplaintForm onCreated={reload} />
        <AsyncBoundary
          state={state}
          onRetry={reload}
          label="your complaints"
          isEmpty={(data) => data.items.length === 0}
          emptyTitle="No complaints raised"
          emptyBody="If you raise a complaint it will be listed here with its status."
        >
          {(data) => <ComplaintList data={data} />}
        </AsyncBoundary>
      </div>
    </section>
  );
}
