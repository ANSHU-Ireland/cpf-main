'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ArtifactStatus, ArtifactView, Collection } from '../../../../lib/types';

const STATUS_TONE: Record<ArtifactStatus, BadgeTone> = {
  uploaded: 'info',
  scanning: 'warning',
  clean: 'success',
  rejected: 'danger',
};

const STATUS_LABEL: Record<ArtifactStatus, string> = {
  uploaded: 'Uploaded',
  scanning: 'Scanning',
  clean: 'Clean',
  rejected: 'Rejected',
};

function Artifacts({
  attemptId,
  initial,
  onChanged,
}: {
  attemptId: string;
  initial: Collection<ArtifactView>;
  onChanged: () => void;
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (name.trim() === '') {
      setError('Enter a file name to attach.');
      return;
    }
    setBusy(true);
    setError(null);
    setFormError(null);
    try {
      const size = `${(Math.random() * 900 + 100).toFixed(0)} KB`;
      await apiClient.uploadArtifact(attemptId, name.trim(), size);
      setName('');
      onChanged();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not upload that artifact.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
      <Card as="article" aria-label="Attach an artifact">
        <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Uploaded files are scanned and versioned before they attach to your attempt (demo:
          simulated file name only).
        </p>
        <form
          onSubmit={(e) => void onSubmit(e)}
          noValidate
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 3)',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '1 1 240px' }}>
            <Field label="File name" required error={error ?? undefined}>
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  value={name}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="solution.zip"
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload artifact'}
          </Button>
        </form>
        {formError ? (
          <p role="alert" style={{ margin: 'var(--space-unit) 0 0', color: 'var(--color-red)' }}>
            {formError}
          </p>
        ) : null}
      </Card>

      {initial.items.length === 0 ? (
        <Card as="article">
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>No artifacts attached yet.</p>
        </Card>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(var(--space-unit) * 2)',
          }}
        >
          {initial.items.map((a) => (
            <li key={a.id}>
              <Card as="article" aria-label={a.name}>
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
                    <strong>{a.name}</strong>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      {a.sizeLabel}
                    </p>
                  </div>
                  <StatusBadge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</StatusBadge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ArtifactsPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getArtifacts(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Artifacts and uploads"
        headingId={headingId}
        description="Attach permitted files to your attempt. Each is scanned, versioned and recorded."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your artifacts">
        {(data) => <Artifacts attemptId={id} initial={data} onChanged={reload} />}
      </AsyncBoundary>
    </section>
  );
}
