'use client';

import { useCallback, useId } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
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

function Artifacts({ initial }: { initial: Collection<ArtifactView> }): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
      <Card as="article" aria-label="Attach an artifact">
        <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Uploads remain unavailable until signed object storage and malware scanning are
          configured. Existing persisted artifacts remain visible below.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 3)',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: '1 1 240px' }}>
            <Field label="File name">
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="solution.zip"
                  disabled
                />
              )}
            </Field>
          </div>
          <Button type="button" disabled>
            Upload unavailable
          </Button>
        </div>
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
        {(data) => <Artifacts initial={data} />}
      </AsyncBoundary>
    </section>
  );
}
