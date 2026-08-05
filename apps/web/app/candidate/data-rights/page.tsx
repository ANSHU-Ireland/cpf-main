'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type {
  Collection,
  DataRightsRequestView,
  DataRightsStatus,
  DataRightsType,
} from '../../lib/types';

const TYPE_LABEL: Record<DataRightsType, string> = {
  export: 'Export my data',
  rectification: 'Correct my data',
  erasure: 'Erase my data',
  restriction: 'Restrict processing',
};

const STATUS_TONE: Record<DataRightsStatus, BadgeTone> = {
  received: 'info',
  in_progress: 'warning',
  completed: 'success',
  refused: 'danger',
};

const STATUS_LABEL: Record<DataRightsStatus, string> = {
  received: 'Received',
  in_progress: 'In progress',
  completed: 'Completed',
  refused: 'Refused',
};

const TYPES: readonly DataRightsType[] = ['export', 'rectification', 'erasure', 'restriction'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });
}

function DataRightsForm({ onCreated }: { onCreated: () => void }): React.JSX.Element {
  const [type, setType] = useState<DataRightsType>('export');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const typeId = useId();
  const noteId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await apiClient.createDataRightsRequest(type, note.trim());
      setDone(true);
      setNote('');
      onCreated();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label="Make a data request">
      <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Make a data request</h2>
      <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        You can ask us to export, correct, erase or restrict the personal data we hold about you. We
        will respond within the statutory timeframe.
      </p>
      {done ? (
        <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
          Your request has been logged. We will keep you updated by email.
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
            <label htmlFor={typeId} style={{ fontWeight: 600 }}>
              Request type
            </label>
            <select
              id={typeId}
              value={type}
              onChange={(e) => setType(e.target.value as DataRightsType)}
              style={{
                minBlockSize: 'var(--target-min)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-line)',
                padding: '0 calc(var(--space-unit) * 3)',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
            <label htmlFor={noteId} style={{ fontWeight: 600 }}>
              Anything to add? (optional)
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-line)',
                padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
                resize: 'vertical',
              }}
            />
          </div>
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

function DataRightsList({ data }: { data: Collection<DataRightsRequestView> }): React.JSX.Element {
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
          <Card as="article" aria-label={TYPE_LABEL[item.type]}>
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
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{TYPE_LABEL[item.type]}</h3>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  Submitted {formatDate(item.submittedAt)}
                  {item.note ? ` · ${item.note}` : ''}
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

export default function DataRightsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getDataRights(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Data & privacy"
        headingId={headingId}
        description="Exercise your rights over the personal data we hold and track your requests."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
        <DataRightsForm onCreated={reload} />
        <AsyncBoundary
          state={state}
          onRetry={reload}
          label="your data requests"
          isEmpty={(data) => data.items.length === 0}
          emptyTitle="No requests yet"
          emptyBody="Any data requests you make will be listed here with their status."
        >
          {(data) => <DataRightsList data={data} />}
        </AsyncBoundary>
      </div>
    </section>
  );
}
